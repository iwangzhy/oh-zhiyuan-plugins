const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const { stat } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { runInNewContext } = require("node:vm");

const entry = require.resolve("../main.js");
const bundle = readFileSync(entry, "utf8");

async function fixture(t, { isMacOS = true, language = "en", legacyLocale = false } = {}) {
    const root = mkdtempSync(join(tmpdir(), "note-terminal-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const views = [];
    const notices = [];
    const events = new Map();
    const opened = [];
    const system = { terminal: "com.apple.Terminal", failures: new Map() };

    class FileSystemAdapter {
        getBasePath() { return root; }
        getFullPath(path) { return join(root, path); }
        async stat(path) {
            try {
                const info = await stat(this.getFullPath(path));
                return { type: info.isDirectory() ? "folder" : "file" };
            } catch (error) {
                if (error.code === "ENOENT") return null;
                throw error;
            }
        }
    }
    const app = {
        plugins: { enabledPlugins: new Set() },
        vault: { adapter: new FileSystemAdapter(), configDir: ".obsidian" },
        workspace: {
            getLeavesOfType: () => views.map(view => ({ view })),
            on: (name, handler) => events.set(name, handler),
            onLayoutReady: handler => events.set("ready", handler),
        },
    };
    class MarkdownView {
        constructor(path) {
            this.app = app;
            this.file = { parent: { path, isRoot: () => path === "/" } };
            this.actions = new Set();
        }
        addAction(icon, title, click) {
            const action = {
                title, click,
                toggleAttribute() {},
                setAttribute() {},
                remove: () => this.actions.delete(action),
            };
            this.actions.add(action);
            return action;
        }
    }
    const obsidian = {
        Plugin: class {
            #cleanup = [];
            constructor(app, manifest) { this.app = app; this.manifest = manifest; }
            load() { this.onload(); }
            addSettingTab() {}
            async loadData() {
                const names = ["Calendar", "Quick Explorer", "Quiet Outline", "Open In New Tab", "Style Text",
                    "Editor Syntax Highlight", "Shiki Highlighter", "Show Current File Path", "在终端中打开笔记目录"];
                return Object.fromEntries(names.map(name => [name, { enabled: name === "在终端中打开笔记目录", options: {} }]));
            }
            registerEvent() {}
            register(callback) { this.#cleanup.push(callback); }
            unload() {
                this.onunload?.();
                for (const callback of this.#cleanup.splice(0)) callback();
            }
        },
        PluginSettingTab: class {},
        Notice: class { constructor(message) { notices.push(message); } },
        Platform: { isDesktopApp: true, isMacOS },
        FileSystemAdapter, MarkdownView,
        requireApiVersion: version => {
            assert.equal(version, "1.8.7");
            return !legacyLocale;
        },
        getLanguage: legacyLocale ? undefined : () => language,
        moment: { locale: () => language },
    };
    const execFile = t.mock.fn((command, args, options, done) => {
        assert.equal(options.encoding, "utf8");
        assert.equal(options.shell, false);
        const failure = system.failures.get(command);
        if (failure) return done(new Error("Command failed"), "", failure);
        if (command === "/usr/bin/osascript") return done(null, system.terminal, "");
        assert.equal(command, "/usr/bin/open");
        opened.push(Array.from(args));
        done(null, "", "");
    });
    const pluginModule = { exports: {} };
    runInNewContext(bundle, {
        module: pluginModule, structuredClone,
        require(name) {
            if (name === "obsidian") return obsidian;
            if (name === "node:child_process") return { execFile };
            return require(name);
        },
    }, { filename: entry });
    const plugin = new pluginModule.exports.default();
    plugin.app = app;
    await plugin.onload();
    function addPane(path) {
        const view = new MarkdownView(path);
        views.push(view);
        events.get("layout-change")?.();
        return view;
    }
    return { root, views, notices, opened, system, events, plugin, addPane };
}

test("each pane opens its own folder and reads the current default terminal on click", async t => {
    const { root, addPane, opened, system } = await fixture(t);
    const subfolder = "Sam's notes & 草稿";
    mkdirSync(join(root, subfolder));
    const left = addPane("/");
    const right = addPane(subfolder);
    const [openLeft] = left.actions;
    const [openRight] = right.actions;
    await openRight.click();
    system.terminal = "com.googlecode.iterm2";
    await openLeft.click();
    left.file = right.file;
    await openLeft.click();
    assert.deepEqual(opened, [
        ["-b", "com.apple.Terminal", join(root, subfolder) + "/"],
        ["-b", "com.googlecode.iterm2", root + "/"],
        ["-b", "com.googlecode.iterm2", join(root, subfolder) + "/"],
    ]);
});

test("a deleted folder or a file in its place never reaches the terminal", async t => {
    const { root, addPane, opened, notices } = await fixture(t);
    const [button] = addPane("Drafts").actions;
    await button.click();
    writeFileSync(join(root, "Drafts"), "draft");
    await button.click();
    assert.match(notices[0], /Folder not found/);
    assert.match(notices[1], /no longer a folder/);
    assert.deepEqual(opened, []);
});

test("an unconfigured terminal shows a localized notice on older Obsidian versions", async t => {
    const { addPane, opened, notices, system } = await fixture(t, { language: "zh-cn", legacyLocale: true });
    system.terminal = "\n";
    const [button] = addPane("/").actions;
    assert.equal(button.title, "在终端中打开笔记所在目录");
    await button.click();
    assert.match(notices[0], /默认终端/);
    assert.deepEqual(opened, []);
});

test("terminal lookup and launch failures report command error output", async t => {
    const { addPane, notices, opened, system } = await fixture(t);
    const [button] = addPane("/").actions;
    system.failures.set("/usr/bin/osascript", "Launch Services unavailable\n");
    await button.click();
    system.failures.delete("/usr/bin/osascript");
    system.failures.set("/usr/bin/open", "Terminal launch failed\n");
    await button.click();
    assert.match(notices[0], /Could not find the default macOS terminal: Launch Services unavailable$/);
    assert.match(notices[1], /The default terminal could not open .*: Terminal launch failed$/);
    assert.deepEqual(opened, []);
});

test("refresh, pane removal and plugin unload clean up header actions", async t => {
    const { addPane, views, events, plugin } = await fixture(t);
    const left = addPane("/");
    const right = addPane("/");
    events.get("file-open")();
    assert.equal(left.actions.size, 1);
    views.pop();
    events.get("layout-change")();
    assert.equal(right.actions.size, 0);
    plugin.unload();
    events.get("ready")();
    assert.equal(left.actions.size, 0);
});

test("other desktop platforms have no header action or workspace listeners", async t => {
    const { addPane, events } = await fixture(t, { isMacOS: false });
    assert.equal(addPane("/").actions.size, 0);
    assert.equal(events.size, 0);
});
