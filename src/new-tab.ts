import { type OpenViewState, parseLinktext, TFile, type WorkspaceLeaf } from "obsidian";
import { around } from "monkey-around";
import { ModulePlugin } from "./modules";

export default class OpenInNewTab extends ModulePlugin {
    start(): void {
        const { workspace, metadataCache, vault } = this.app;
        const findOpen = (path: string) => {
            let found: WorkspaceLeaf | undefined;
            workspace.iterateAllLeaves(leaf => {
                if (!found && leaf.getViewState().state?.file === path) found = leaf;
            });
            return found;
        };
        this.register(around(workspace, {
            openLinkText(next) {
                return async function(this: typeof workspace, link: string, source: string, target?: Parameters<typeof next>[2], state?: OpenViewState) {
                    const { path, subpath } = parseLinktext(link);
                    const file = path && metadataCache.getFirstLinkpathDest(path, source);
                    // 同篇笔记的标题跳转和用户显式指定的分屏、窗口沿用原行为。
                    if (!path || (file && file.path === source) || target) return next.call(this, link, source, target, state);
                    const existing = file && findOpen(file.path);
                    if (existing) {
                        await workspace.revealLeaf(existing);
                        workspace.setActiveLeaf(existing, { focus: true });
                        if (!subpath) return;
                        return next.call(this, subpath, file.path, false, state);
                    }
                    return next.call(this, link, source, true, state);
                };
            },
        }));
        const listen = (doc: Document) => this.registerDomEvent(doc, "click", event => {
            if (event.button || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            const title = (event.target as Element)?.closest?.(".nav-file-title[data-path]");
            if (!title) return;
            const file = vault.getAbstractFileByPath(title.getAttribute("data-path")!);
            if (!(file instanceof TFile)) return;
            event.preventDefault();
            event.stopPropagation();
            const existing = findOpen(file.path);
            if (existing) {
                void workspace.revealLeaf(existing).then(() => workspace.setActiveLeaf(existing, { focus: true }));
                return;
            }
            const empty = workspace.getLeavesOfType("empty")[0];
            const leaf = empty ?? workspace.getLeaf("tab");
            void leaf.openFile(file, { active: true });
        }, true);
        const documents = new Set([document]);
        workspace.iterateAllLeaves(leaf => documents.add(leaf.view.containerEl.ownerDocument));
        documents.forEach(listen);
        this.registerEvent(workspace.on("window-open", (_leaf, win) => listen(win.document)));
    }
}
