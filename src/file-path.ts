import { FileSystemAdapter, Notice, PluginSettingTab, Setting } from "obsidian";
import { ModulePlugin } from "./modules";

export default class FilePath extends ModulePlugin {
    settings = { showFileName: false, showIcons: true, copyAbsolutePath: false };
    private item!: HTMLElement;
    async start(): Promise<void> {
        Object.assign(this.settings, await this.loadData());
        await this.saveData(this.settings);
        this.item = this.addStatusBarItem();
        this.item.addClasses(["mod-clickable", "oh-file-path"]);
        this.item.setAttribute("aria-label", "复制当前路径");
        this.registerDomEvent(this.item, "click", () => void this.copy());
        this.registerEvent(this.app.workspace.on("file-open", () => this.render()));
        this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.render()));
        this.registerEvent(this.app.vault.on("rename", () => this.render()));
        this.addCommand({ id: "copy-file-path", name: "复制当前路径", callback: () => void this.copy() });
        this.addSettingTab(new PathSettings(this.app, this));
        this.render();
    }
    private path(): string | undefined {
        const file = this.app.workspace.getActiveFile();
        return file ? (this.settings.showFileName ? file.path : file.parent?.path ?? "/") : undefined;
    }
    render(): void {
        const path = this.path();
        this.item.empty();
        this.item.toggle(!!path);
        if (!path) return;
        const parts = path === "/" ? ["库根目录"] : path.split("/");
        this.item.setText(parts.map((name, index) => {
            if (!this.settings.showIcons) return name;
            return (this.settings.showFileName && index === parts.length - 1 ? "📄 " : "📁 ") + name;
        }).join(" » "));
    }
    private async copy(): Promise<void> {
        const path = this.path();
        if (!path) return;
        const { adapter } = this.app.vault;
        const text = this.settings.copyAbsolutePath && adapter instanceof FileSystemAdapter ? adapter.getFullPath(path) : path;
        try { await navigator.clipboard.writeText(text); new Notice("路径已复制"); }
        catch { new Notice("复制路径失败"); }
    }
}

class PathSettings extends PluginSettingTab {
    constructor(app: FilePath["app"], private feature: FilePath) { super(app, feature); }
    display(): void {
        this.containerEl.empty();
        for (const [key, label] of [
            ["showFileName", "路径中包含文件名"], ["showIcons", "显示文件和文件夹图标"], ["copyAbsolutePath", "复制系统绝对路径"],
        ] as const) {
            new Setting(this.containerEl).setName(label).addToggle(input => input.setValue(this.feature.settings[key])
                .onChange(async value => {
                    this.feature.settings[key] = value;
                    this.feature.render();
                    await this.feature.saveData(this.feature.settings);
                }));
        }
    }
}
