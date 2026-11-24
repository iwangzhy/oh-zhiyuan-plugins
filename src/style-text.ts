import { type Command, type Editor, PluginSettingTab, Setting } from "obsidian";
import { ModulePlugin } from "./modules";

interface TextStyle { name: string; css: string; contextMenu: boolean }
const defaultRules: [string, string, boolean][] = [
    ["超大文字", "font-size: 28px;", true], ["超大黄色高亮", "font-size: 28px; background-color: #fff88f; color: black", false],
    ["大号文字", "font-size: 24px", false], ["大号绿色高亮", "font-size: 24px; background-color: #1EFF00; color: black", true],
    ["放大文字", "font-size: 20px", false], ["放大黄色文字", "font-size: 20px; color: yellow", false],
    ["放大橙色文字", "font-size: 20px; color: orange", true], ["放大红色文字", "font-size: 20px; color: red", false],
    ["绿色高亮", "background-color: #1EFF00; color: black", true], ["黄色高亮", "background-color: #fff88f; color: black", true],
];

export default class StyleText extends ModulePlugin {
    styles: TextStyle[] = [];
    private commands: Command[] = [];
    async start(): Promise<void> {
        const saved = await this.loadData();
        this.styles = Array.isArray(saved.styles) ? saved.styles : defaultRules.map(([name, css, contextMenu]) => ({ name, css, contextMenu }));
        await this.saveData({ styles: this.styles });
        this.addCommand({ id: "remove-style", name: "移除样式", editorCallback: editor => this.clearStyle(editor) });
        this.updateCommands();
        this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
            menu.addItem(item => item.setTitle("移除样式").setIcon("eraser").onClick(() => this.clearStyle(editor)));
            for (const style of this.styles.filter(style => style.contextMenu)) {
                menu.addItem(item => item.setTitle(style.name).setIcon("highlighter").onClick(() => this.applyStyle(editor, style)));
            }
        }));
        this.addSettingTab(new StyleSettings(this.app, this));
    }
    private clearStyle(editor: Editor): void {
        const selected = editor.getSelection();
        if (selected) editor.replaceSelection(new DOMParser().parseFromString(selected, "text/html").body.textContent ?? "");
    }
    private applyStyle(editor: Editor, style: TextStyle): void {
        const tag = style.css.includes("background-color") ? "mark" : "span";
        const css = style.css.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        editor.replaceSelection("<" + tag + ' style="' + css + '">' + editor.getSelection() + "</" + tag + ">");
    }
    private updateCommands(): void {
        while (this.commands.length > this.styles.length) {
            this.removeCommand("style" + this.commands.length);
            this.commands.pop();
        }
        this.styles.forEach((style, index) => {
            const name = style.name || "未命名样式";
            // 原快捷键按样式位置绑定。改名和排序时更新原命令，以免每输入一个字就重新注册。
            if (this.commands[index]) this.commands[index].name = this.manifest.name + ": " + name;
            else this.commands.push(this.addCommand({
                id: "style" + (index + 1), name, editorCallback: editor => this.applyStyle(editor, this.styles[index]),
            }));
        });
    }
    async saveStyles(): Promise<void> {
        this.updateCommands();
        await this.saveData({ styles: this.styles });
    }
}

class StyleSettings extends PluginSettingTab {
    constructor(app: StyleText["app"], private feature: StyleText) { super(app, feature); }
    display(): void {
        const el = this.containerEl;
        const { styles } = this.feature;
        el.empty();
        const redraw = async () => { await this.feature.saveStyles(); this.display(); };
        styles.forEach((style, i) => {
            const row = new Setting(el).setName("样式名称").addText(text => text.setValue(style.name).onChange(async value => {
                style.name = value; await this.feature.saveStyles();
            }));
            for (const [icon, title, delta] of [["arrow-up","上移",-1],["arrow-down","下移",1]] as const) {
                row.addExtraButton(btn => btn.setIcon(icon).setTooltip(title).setDisabled(!styles[i + delta]).onClick(async () => {
                    [styles[i], styles[i + delta]] = [styles[i + delta], styles[i]]; await redraw();
                }));
            }
            row.addExtraButton(btn => btn.setIcon("trash").setTooltip("删除样式").onClick(async () => { styles.splice(i, 1); await redraw(); }));
            new Setting(el).setName("样式规则").setDesc("填写应用到选中文字的 CSS 属性。").addTextArea(input =>
                input.setValue(style.css).onChange(async value => { style.css = value; await this.feature.saveStyles(); }));
            new Setting(el).setName("显示在右键菜单").addToggle(toggle => toggle.setValue(style.contextMenu).onChange(async value => {
                style.contextMenu = value; await this.feature.saveStyles();
            }));
        });
        new Setting(el).addButton(button => button.setButtonText("添加样式").onClick(async () => {
            styles.push({ name: "新样式", css: "", contextMenu: true }); await redraw();
        }));
    }
}
