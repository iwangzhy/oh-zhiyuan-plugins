const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");
const { buildSync } = require("esbuild");
const moment = require("moment");

const obsidian = {
    Plugin: class { constructor(app, manifest) { this.app = app; this.manifest = manifest; } },
    PluginSettingTab: class {},
    normalizePath: value => value.replace(/^\/+|\/+$/g, ""),
    moment,
};

function loadSource(source, api = obsidian, window = {}) {
    const bundle = buildSync({
        stdin: { contents: source, resolveDir: path.resolve(__dirname, "..") },
        bundle: true, platform: "node", packages: "external", format: "cjs", write: false,
    });
    const mod = { exports: {} };
    runInNewContext(bundle.outputFiles[0].text, {
        module: mod, exports: mod.exports, structuredClone, window, console,
        require: name => name === "obsidian" ? api : require(name),
    });
    return mod.exports;
}

const { ModuleStore, ModulePlugin } = loadSource('export { ModuleStore, ModulePlugin } from "./src/modules"');
const modules = [
    { name: "Calendar", id: "calendar" }, { name: "Style Text", id: "style-text" },
    { name: "Open In New Tab", id: "open-in-new-tab" },
];

test("first import groups existing settings and the core day template, then leaves later changes intact", async () => {
    const files = {
        "custom/plugins/calendar/data.json": { weeklyNoteTemplate: "https://example.invalid/week", wordsPerDot: 500 },
        "custom/daily-notes.json": { template: "https://example.invalid/day", format: "YYYY-MM-DD", folder: "日记" },
        "custom/plugins/style-text/data.json": { styles: [{ name: "蓝色", css: "color:blue", contextMenu: true }] },
    };
    let saved;
    const owner = {
        app: { vault: { configDir: "custom", adapter: {
            exists: async file => Object.hasOwn(files, file),
            read: async file => JSON.stringify(files[file]),
        } } },
        loadData: async () => saved,
        saveData: async data => { saved = structuredClone(data); },
    };
    const store = new ModuleStore(owner);
    await store.initialize(modules);
    assert.deepEqual(Object.keys(saved), modules.map(item => item.name));
    assert.equal(saved.Calendar.options.dailyNoteTemplate, files["custom/daily-notes.json"].template);
    assert.equal(saved.Calendar.options.weeklyNoteTemplate, files["custom/plugins/calendar/data.json"].weeklyNoteTemplate);
    assert.deepEqual(saved["Style Text"].options.styles, files["custom/plugins/style-text/data.json"].styles);
    assert.deepEqual(saved["Open In New Tab"], { enabled: true, options: {} });
    store.values.Calendar.enabled = false;
    const calendar = new ModulePlugin(owner.app, modules[0], store);
    const prefs = await calendar.loadData();
    prefs.dailyNoteTemplate = "模板/我的日记";
    await calendar.saveData(prefs);
    files["custom/daily-notes.json"].template = "模板/已过时";
    const reopened = new ModuleStore(owner);
    await reopened.initialize(modules);
    assert.equal(reopened.values.Calendar.enabled, false);
    assert.equal(reopened.values.Calendar.options.dailyNoteTemplate, "模板/我的日记");
});

test("interleaved saves keep the latest options and a failed write can be retried with the same value", async () => {
    const writes = [];
    let fail = false;
    const owner = {
        app: { vault: { configDir: ".obsidian", adapter: { exists: async () => false } } },
        loadData: async () => null,
        saveData: async data => {
            if (fail) { fail = false; throw new Error("write failed"); }
            await new Promise(resolve => setTimeout(resolve, data.Calendar.options.wordsPerDot === 1 ? 10 : 0));
            writes.push(structuredClone(data));
        },
    };
    const store = new ModuleStore(owner);
    await store.initialize(modules);
    const calendar = new ModulePlugin(owner.app, modules[0], store);
    const styles = new ModulePlugin(owner.app, modules[1], store);
    await Promise.all([calendar.saveData({ wordsPerDot: 1 }), styles.saveData({ styles: [] }), calendar.saveData({ wordsPerDot: 2 })]);
    assert.equal(writes.at(-1).Calendar.options.wordsPerDot, 2);
    assert.deepEqual(writes.at(-1)["Style Text"].options, { styles: [] });
    fail = true;
    await assert.rejects(calendar.saveData({ wordsPerDot: 3 }), /write failed/);
    await calendar.saveData({ wordsPerDot: 3 });
    const count = writes.length;
    await calendar.saveData({ wordsPerDot: 3 });
    assert.equal(writes.length, count);
    assert.equal(writes.at(-1).Calendar.options.wordsPerDot, 3);
});

test("Calendar shares local and URL loading across periods, creates once and preserves weekly sorting", async t => {
    class TFile { constructor(path, text) { this.path = path; this.text = text; } }
    class TFolder {}
    const template = new TFile("模板/日记.md", "{{title}} {{tomorrow}}");
    const files = new Map([[template.path, template]]);
    const fetches = [], notices = [];
    const app = {
        plugins: { getPlugin: () => undefined },
        vault: {
            getAbstractFileByPath: name => files.get(name),
            createFolder: async name => files.set(name, new TFolder()),
            cachedRead: async file => file.text,
            create: async (name, text) => {
                assert.equal(files.has(name), false);
                const file = new TFile(name, text);
                files.set(name, file);
                return file;
            },
        },
        metadataCache: { getFirstLinkpathDest: name => files.get(name) },
    };
    const notes = loadSource('export * from "./vendor/calendar/notes"; export {settings} from "./vendor/calendar/ui/stores"', {
        ...obsidian, TFile, TFolder, Notice: class { constructor(message) { notices.push(message); } },
        requestUrl: async url => {
            fetches.push(url);
            if (url.endsWith("missing")) throw new Error("fixture 404");
            return { text: "{{title}} {{ date:YYYY-MM-DD }} {{ sidebar_position }}" };
        },
    }, { app });
    notes.settings.update(opts => ({ ...opts, dailyNoteFolder: "日", weeklyNoteFolder: "周", dailyNoteTemplate: template.path,
        weeklyNoteFormat: "GGGG-[W]WW", weeklyNoteTemplate: "https://example.invalid/week" }));
    const date = moment("2024-12-31");
    assert.equal((await notes.createDailyNote(date)).text, "2024-12-31 2025-01-01");
    notes.settings.update(opts => ({ ...opts, dailyNoteTemplate: "https://example.invalid/day" }));
    const next = date.clone().add(1, "day");
    const [a, b] = await Promise.all([notes.createDailyNote(next), notes.createDailyNote(next)]);
    assert.equal(a, b);
    assert.match(a.text, /2025-01-01/);
    assert.equal(await notes.createDailyNote(next), a);
    assert.equal((await notes.createWeeklyNote(date)).text, "2025-W01 2024-12-31 0");
    assert.deepEqual(fetches, ["https://example.invalid/day", "https://example.invalid/week"]);
    notes.settings.update(opts => ({ ...opts, dailyNoteTemplate: "https://example.invalid/missing" }));
    const warning = t.mock.method(console, "warn", () => {});
    assert.equal((await notes.createDailyNote(next.clone().add(1, "day"))).text, "");
    assert.equal(notices.length, 1);
    assert.match(warning.mock.calls[0].arguments[0], /模板读取失败/);
});
