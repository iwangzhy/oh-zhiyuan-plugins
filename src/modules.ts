import { type App, type DataAdapter, normalizePath, Plugin, type PluginManifest, type PluginSettingTab } from "obsidian";

export interface ModuleDefinition {
    name: string;
    id: string;
    description: string;
    aliases?: string[];
    create: () => typeof ModulePlugin;
}

type Options = Record<string, unknown>;
export type Preferences = Record<string, { enabled: boolean; options: Options }>;

function object(value: unknown): Options {
    return value && typeof value === "object" && !Array.isArray(value) ? value as Options : {};
}

async function readOptions(adapter: DataAdapter, path: string): Promise<Options> {
    return await adapter.exists(path) ? object(JSON.parse(await adapter.read(path))) : {};
}

export class ModuleStore {
    values: Preferences = {};
    shikiHandles?: (language: string) => boolean;
    private pending: Promise<void> = Promise.resolve();
    private saved = "";

    constructor(private owner: Plugin) {}

    async initialize(modules: ModuleDefinition[]): Promise<void> {
        const previous = object(await this.owner.loadData());
        this.saved = JSON.stringify(previous);
        const { adapter, configDir } = this.owner.app.vault;
        let imported = false;
        for (const module of modules) {
            if (Object.prototype.hasOwnProperty.call(previous, module.name)) {
                const saved = object(previous[module.name]);
                this.values[module.name] = { enabled: saved.enabled !== false, options: object(saved.options) };
                continue;
            }
            // 只在分组首次出现时导入。原插件以后写回的旧设置不应覆盖用户在合集中的修改。
            const options = await readOptions(adapter, normalizePath(configDir + "/plugins/" + module.id + "/data.json"));
            if (module.id === "calendar") {
                const daily = await readOptions(adapter, normalizePath(configDir + "/daily-notes.json"));
                options.dailyNoteFormat = daily.format ?? "";
                options.dailyNoteFolder = daily.folder ?? "";
                options.dailyNoteTemplate = daily.template ?? "";
            }
            this.values[module.name] = { enabled: true, options };
            imported = true;
        }
        if (imported) await this.persist();
    }

    persist(): Promise<void> {
        // 设置页的输入和多个模块可能同时保存，较早的一次写入不能最后落盘。
        const snapshot = JSON.stringify(this.values);
        const write = async () => {
            if (snapshot === this.saved) return;
            await this.owner.saveData(JSON.parse(snapshot));
            this.saved = snapshot;
        };
        this.pending = this.pending.then(write, write);
        return this.pending;
    }
}

export class ModulePlugin extends Plugin {
    ready: Promise<void> = Promise.resolve();
    panel?: PluginSettingTab;

    constructor(app: App, manifest: PluginManifest, protected store: ModuleStore) {
        super(app, manifest);
    }

    start(): void | Promise<void> {}
    onload(): Promise<void> {
        return this.ready = Promise.resolve().then(() => this.start());
    }
    async loadData(): Promise<any> {
        return structuredClone(this.store.values[this.manifest.name].options);
    }
    async saveData(options: Options): Promise<void> {
        const group = this.store.values[this.manifest.name];
        group.options = structuredClone(options);
        await this.store.persist();
    }
    useStyles(css: string): void {
        const styles = new Map<Document, HTMLStyleElement>();
        const install = (doc: Document) => {
            if (styles.has(doc)) return;
            const style = doc.createElement("style");
            style.dataset.ohModule = this.manifest.id;
            style.textContent = css;
            doc.head.appendChild(style);
            styles.set(doc, style);
        };
        install(document);
        this.app.workspace.iterateAllLeaves(leaf => install(leaf.view.containerEl.ownerDocument));
        this.registerEvent(this.app.workspace.on("window-open", (_leaf, win) => install(win.document)));
        this.registerEvent(this.app.workspace.on("window-close", (_leaf, win) => styles.delete(win.document)));
        this.register(() => { for (const style of styles.values()) style.remove(); styles.clear(); });
    }
    addSettingTab(tab: PluginSettingTab): void {
        // 每个模块仍拥有自己的控件和生命周期，设置入口由合集统一注册。
        this.panel = tab;
    }
}
