import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { promisify } from "node:util";
import { FileSystemAdapter, MarkdownView, Notice, Platform, getLanguage, moment, type Plugin } from "obsidian";

const run = promisify(execFile);

// iTerm2 的「设为默认终端」修改的是 Shell 角色，同一文件类型还可以单独关联编辑器。
const defaultTerminalQuery = `function run() {
    ObjC.import("CoreServices");
    const handler = $.LSCopyDefaultRoleHandlerForContentType($("public.unix-executable"), $.kLSRolesShell);
    if (!handler) return "";
    const identifier = ObjC.castRefToObject(handler);
    return identifier.isNil() ? "" : ObjC.unwrap(identifier);
}`;

function uiText(english: string, chinese: string): string {
    // 1.8.7 以前没有 getLanguage()，旧版沿用 Obsidian 配置的日期语言。
    const language = getLanguage?.() ?? moment.locale();
    return language.startsWith("zh") ? chinese : english;
}

function commandErrorMessage(error: unknown): string {
    const failure = error as Error & { stderr?: string };
    return failure?.stderr?.trim() || failure?.message || String(error);
}

async function openNoteFolder(view: MarkdownView): Promise<void> {
    // 同一个标签可以换笔记，分屏时另一栏也可能有焦点，所以点击时才从这个视图取文件。
    const parent = view.file?.parent;
    if (!parent) return;

    const adapter = view.app.vault.adapter;
    if (!(adapter instanceof FileSystemAdapter)) {
        new Notice(uiText("This vault has no local folder.", "无法获取此仓库在本机的目录。"));
        return;
    }

    let bundleId: string;
    try {
        const { stdout } = await run("/usr/bin/osascript", ["-l", "JavaScript", "-e", defaultTerminalQuery]);
        bundleId = stdout.trim();
    } catch (error) {
        const reason = commandErrorMessage(error);
        new Notice(uiText(`Could not find the default macOS terminal: ${reason}`, `无法读取 macOS 的默认终端：${reason}`));
        return;
    }
    if (!bundleId) {
        new Notice(uiText(
            "Set a default terminal in your terminal app, then try again.",
            "macOS 未返回默认终端。请在常用终端应用中将它设为默认后重试。",
        ));
        return;
    }

    let directory = parent.path;
    try {
        directory = parent.isRoot() ? adapter.getBasePath() : adapter.getFullPath(parent.path);
        // 查找默认终端可能需要一点时间，在打开前再检查，避免把同名文件交给终端。
        if (!(await stat(directory)).isDirectory()) {
            new Notice(uiText(`This path is no longer a folder: ${directory}`, `笔记所在的路径已不是目录：${directory}`));
            return;
        }
    } catch (error) {
        const failure = error as NodeJS.ErrnoException;
        const reasons: Record<string, string | undefined> = {
            ENOENT: uiText("Folder not found", "目录不存在"),
            ENOTDIR: uiText("Part of the path is not a folder", "路径中有一项不是目录"),
            EACCES: uiText("Permission denied", "没有访问权限"),
            EPERM: uiText("Permission denied", "没有访问权限"),
        };
        const reason = reasons[failure?.code ?? ""] ?? failure?.message ?? String(error);
        new Notice(uiText(`Cannot access “${directory}”: ${reason}`, `无法访问「${directory}」：${reason}`));
        return;
    }

    try {
        const folderPath = directory.endsWith("/") ? directory : `${directory}/`;
        await run("/usr/bin/open", ["-b", bundleId, folderPath]);
    } catch (error) {
        const reason = commandErrorMessage(error);
        new Notice(uiText(
            `The default terminal could not open “${directory}”: ${reason}`,
            `默认终端无法打开「${directory}」：${reason}`,
        ));
    }
}

export function registerOpenInTerminal(plugin: Plugin): void {
    if (!Platform.isDesktopApp || !Platform.isMacOS) return;

    let buttons: Map<MarkdownView, HTMLElement> | null = new Map();
    const { workspace } = plugin.app;

    const refresh = () => {
        // 布局就绪回调可能晚于插件停用。
        if (!buttons) return;

        const views = new Set<MarkdownView>();
        for (const { view } of workspace.getLeavesOfType("markdown")) {
            // 恢复工作区时，后台标签可能还是占位视图，等笔记真正加载后再加按钮。
            if (!(view instanceof MarkdownView)) continue;
            views.add(view);

            let button = buttons.get(view);
            if (!button) {
                const title = uiText("Open note folder in terminal", "在终端中打开笔记所在目录");
                button = view.addAction("terminal", title, () => openNoteFolder(view));
                buttons.set(view, button);
            }
            const disabled = !view.file?.parent;
            button.toggleAttribute("disabled", disabled);
            button.setAttribute("aria-disabled", String(disabled));
        }

        for (const [view, button] of buttons) {
            if (!views.has(view)) {
                button.remove();
                buttons.delete(view);
            }
        }
    };

    plugin.registerEvent(workspace.on("active-leaf-change", refresh));
    plugin.registerEvent(workspace.on("file-open", refresh));
    plugin.registerEvent(workspace.on("layout-change", refresh));
    plugin.register(() => {
        if (!buttons) return;
        for (const button of buttons.values()) button.remove();
        buttons = null;
    });
    workspace.onLayoutReady(refresh);
}
