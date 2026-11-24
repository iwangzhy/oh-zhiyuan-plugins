import { App, PluginSettingTab, Setting } from "obsidian";
import type Explorer from "./quick-explorer";

const titles = { "qe-title-right": "右侧", "qe-title-center": "居中", "qe-title-hide": "隐藏" };
export function applyAppearance(plugin: Explorer, enabled = true) {
    const docs = new Set([document]);
    plugin.app.workspace.iterateAllLeaves(leaf => docs.add(leaf.view.containerEl.ownerDocument));
    for (const doc of docs) {
        for (const name of Object.keys(titles)) doc.body.classList.toggle(name, enabled && plugin.settings.title === name);
        doc.body.classList.toggle("qe-hide-breadcrumbs", enabled && plugin.settings.hideBreadcrumbs);
    }
}
export class ExplorerSettings extends PluginSettingTab {
    constructor(app: App, private explorer: Explorer) { super(app, explorer); }
    display() {
        this.containerEl.empty();
        const save = () => { applyAppearance(this.explorer); return this.explorer.saveData(this.explorer.settings); };
        new Setting(this.containerEl).setName("窗口标题位置").addDropdown(input =>
            input.addOptions(titles).setValue(this.explorer.settings.title).onChange(async value => {
                this.explorer.settings.title = value; await save();
            }));
        new Setting(this.containerEl).setName("隐藏独立路径栏").setDesc("仍可从标签页的路径菜单浏览文件。")
            .addToggle(input => input.setValue(this.explorer.settings.hideBreadcrumbs).onChange(async value => {
                this.explorer.settings.hideBreadcrumbs = value; await save();
            }));
    }
}
