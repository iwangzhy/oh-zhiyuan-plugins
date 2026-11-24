import {MenuItem, Plugin, TFolder} from "./obsidian";
import {use, command, addCommands, isLeafAttached} from "@ophidian/core";
import {Explorer, hoverSource} from "./Explorer";

import "./redom-jsx";
import css from "./styles.scss?inline";
import { ModulePlugin } from "../../src/modules";
import { ExplorerSettings, applyAppearance } from "./settings";
import { navigateFile } from "./file-info";

declare module "obsidian" {
    interface Workspace {
        registerHoverLinkSource(source: string, info: {display: string, defaultMod?: boolean}): void
        unregisterHoverLinkSource(source: string): void
    }
    interface Menu {
        sections: string[]
    }
}

export default class QE extends ModulePlugin {
    statusbarItem: HTMLElement

    use = use.plugin(this);
    explorers = this.use(Explorer).watch();
    settings = { title: "qe-title-right", hideBreadcrumbs: false };

    updateCurrent(leaf = this.app.workspace.activeLeaf, file = this.app.workspace.getActiveFile()) {
        if (isLeafAttached(leaf)) this.explorers.forLeaf(leaf).update(file);
    }

    async start() {
        this.settings = { ...this.settings, ...await this.loadData() };
        await this.saveData(this.settings);
        this.useStyles(css);
        const update = () => applyAppearance(this);
        this.registerEvent(this.app.workspace.on("window-open", update));
        this.addSettingTab(new ExplorerSettings(this.app, this));
        update();
        this.register(() => applyAppearance(this, false));
        this.app.workspace.registerHoverLinkSource(hoverSource, {
            display: 'Quick Explorer', defaultMod: true
        });

        this.registerEvent(this.app.workspace.on("file-open", () => this.updateCurrent()));
        this.registerEvent(this.explorers.onLeafChange(leaf => this.updateCurrent(leaf)));

        this.addCommand({ id: "browse-vault",   name: "Browse vault",          callback: () => { this.explorers.forWindow()?.browseVault(); }, });
        this.addCommand({ id: "browse-current", name: "Browse current folder", callback: () => { this.explorers.forWindow()?.browseCurrent(); }, });

        addCommands(this);

        this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source) => {
            let item: MenuItem
            if (source !== "quick-explorer") menu.addItem(i => {
                i.setIcon("folder").setTitle("Show in Quick Explorer").onClick(e => { this.explorers.forDom(item.dom)?.browseFile(file); });
                item = i;
                item.setSection?.("view");
            })
            if (item) {
                const revealFile = i18next.t(`plugins.file-explorer.action-reveal-file`);
                const idx = menu.items.findIndex(i => i.titleEl?.textContent === revealFile);
                if (idx > -1) {
                    // Remove this once 0.15.3+ is required
                    if (!menu.sections) (menu.dom as HTMLElement).insertBefore(item.dom, menu.items[idx].dom);
                    menu.items.remove(item);
                    menu.items.splice(idx, 0, item);
                }
            }
        }));

        // 新版已经为文件夹提供 basename；只撤销本模块自己补上的属性。
        if (!("basename" in TFolder.prototype)) {
            Object.defineProperty(TFolder.prototype, "basename", {get(){ return this.name; }, configurable: true});
            this.register(() => Reflect.deleteProperty(TFolder.prototype, "basename"));
        }
    }

    [command("go-next",  "Go to next file in folder")]     () { return this.goFile( 1, true); }
    [command("go-prev",  "Go to previous file in folder")] () { return this.goFile(-1, true); }
    [command("go-first", "Go to first file in folder")]    () { return this.goFile(-1, false); }
    [command("go-last",  "Go to last file in folder")]     () { return this.goFile( 1, false); }

    goFile(dir: number, relative: boolean) {
        return () => {
            const curFile = app.workspace.getActiveFile();
            const goFile = curFile && navigateFile(curFile, dir, relative);
            if (goFile && goFile !== curFile) app.workspace.activeLeaf.openFile(goFile);
        }
    }

    onunload() {
        this.app.workspace.unregisterHoverLinkSource(hoverSource);
    }

}
