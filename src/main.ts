import { Notice, Plugin, PluginSettingTab, Setting, type App } from "obsidian";
import { catalog } from "./catalog";
import { type ModuleDefinition, ModulePlugin, ModuleStore } from "./modules";

interface Slot {
    definition: ModuleDefinition;
    instance?: ModulePlugin;
    pending: Promise<void>;
    error?: string;
}

export default class OhZhiyuan extends Plugin {
    store = new ModuleStore(this);
    slots: Slot[] = catalog.map(definition => ({ definition, pending: Promise.resolve() }));
    private stopped = false;

    async onload(): Promise<void> {
        this.stopped = false;
        await this.store.initialize(catalog);
        if (this.stopped) return;
        this.addSettingTab(new SuiteSettings(this.app, this));
        await Promise.all(this.slots.map(slot => this.refresh(slot)));
    }

    conflict(definition: ModuleDefinition): boolean {
        const manager = (this.app as App & { plugins: { enabledPlugins: Set<string> } }).plugins;
        return [definition.id, ...(definition.aliases ?? [])].some(id => manager.enabledPlugins.has(id));
    }

    refresh(slot: Slot): Promise<void> {
        const reconcile = async () => {
            const { definition } = slot;
            if (this.stopped || !this.store.values[definition.name].enabled || this.conflict(definition)) {
                slot.instance?.unload();
                slot.instance = undefined;
                return;
            }
            if (slot.instance) return;
            let instance: ModulePlugin | undefined;
            try {
                const Module = definition.create();
                // 沿用原命令前缀，库中已有的快捷键和面板布局可继续定位到同一个功能。
                instance = new Module(this.app, { ...this.manifest, id: definition.id, name: definition.name }, this.store);
                instance.load();
                await instance.ready;
                if (this.stopped) instance.unload();
                else slot.instance = instance;
                slot.error = undefined;
            } catch (error) {
                try { instance?.unload(); } catch (cleanup) { console.error(cleanup); }
                slot.error = String(error);
                console.error(definition.name, error);
                new Notice(definition.name + " 加载失败：" + slot.error);
            }
        };
        slot.pending = slot.pending.then(reconcile, reconcile);
        return slot.pending;
    }

    onunload(): void {
        this.stopped = true;
        for (const slot of this.slots) {
            slot.instance?.unload();
            slot.instance = undefined;
        }
    }
}

class SuiteSettings extends PluginSettingTab {
    private expanded = new Set<string>();
    private panels: PluginSettingTab[] = [];
    private revision = 0;
    constructor(app: App, private suite: OhZhiyuan) { super(app, suite); }

    hide(): void {
        this.revision++;
        for (const panel of this.panels.splice(0)) panel.hide();
    }
    display(): void {
        this.hide();
        this.containerEl.empty();
        const revision = this.revision;
        for (const slot of this.suite.slots) {
            const { name, description } = slot.definition;
            const group = this.containerEl.createEl("details", { cls: "oh-module" });
            group.open = this.expanded.has(name);
            group.addEventListener("toggle", () => {
                if (group.open) this.expanded.add(name);
                else this.expanded.delete(name);
            });
            const summary = group.createEl("summary");
            const heading = new Setting(summary).setName(name).setDesc(description);
            const pref = this.suite.store.values[name];
            heading.addToggle(toggle => {
                toggle.toggleEl.setAttribute("aria-label", "启用 " + name);
                toggle.toggleEl.addEventListener("click", event => event.stopPropagation());
                toggle.setValue(pref.enabled).onChange(async enabled => {
                    pref.enabled = enabled;
                    await this.suite.store.persist();
                    await this.suite.refresh(slot);
                    if (revision === this.revision) this.display();
                });
            });
            const body = group.createDiv({ cls: "oh-module-options" });
            const renderPanel = () => {
                if (revision !== this.revision || !body.isConnected) return;
                if (this.suite.conflict(slot.definition) && pref.enabled) {
                    body.createDiv({ text: "此功能正由独立插件提供。停用独立插件后，重新打开本页即可切换到合集。", cls: "setting-item-description" });
                } else if (slot.error && pref.enabled) {
                    body.createDiv({ text: "加载失败：" + slot.error, cls: "mod-warning" });
                } else if (slot.instance?.panel) {
                    const panel = slot.instance.panel;
                    this.panels.push(panel);
                    body.appendChild(panel.containerEl);
                    panel.display();
                }
            };
            void this.suite.refresh(slot).then(renderPanel);
        }
    }
}
