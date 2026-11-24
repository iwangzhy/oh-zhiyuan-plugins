import { build, context } from "esbuild";
import { bundledLicenses } from "./scripts/bundled-licenses.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compile as compileSass } from "sass";
import { compile as compileSvelte } from "svelte/compiler";
import { parse, compileScript } from "@vue/compiler-sfc";
import { ExpressiveCodeEngine } from "@expressive-code/core";
import { createCssVariableThemeBundle, createEcEngineConfig, EC_VIRTUAL_SETTINGS } from "./vendor/shiki-highlighter/ec-core/src/Config.ts";
import { OBSIDIAN_THEME } from "./vendor/shiki-highlighter/ec-core/src/ObsidianTheme.ts";

const cssTheme = createCssVariableThemeBundle(OBSIDIAN_THEME);
const engine = new ExpressiveCodeEngine(createEcEngineConfig({
    theme: cssTheme.theme, customLanguages: [], settings: EC_VIRTUAL_SETTINGS, usingObsidianTheme: true,
}));

const pluginAssets = {
    name: "module-assets",
    setup(builder) {
        builder.onResolve({ filter: /\?(inline|style)$/ }, args => {
            const [file, kind] = args.path.split("?");
            return { path: path.resolve(args.resolveDir, file), namespace: kind };
        });
        builder.onLoad({ filter: /.*/, namespace: "inline" }, async args => ({
            contents: args.path.endsWith(".scss") ? compileSass(args.path, { style: "compressed" }).css : await readFile(args.path, "utf8"),
            loader: "text", watchFiles: [args.path],
        }));
        builder.onLoad({ filter: /\.vue$/, namespace: "style" }, async args => {
            const { descriptor } = parse(await readFile(args.path, "utf8"));
            return { contents: descriptor.styles.map(style => style.content).join("\n"), loader: "text", watchFiles: [args.path] };
        });
        builder.onLoad({ filter: /\.vue$/, namespace: "file" }, async args => {
            const { descriptor } = parse(await readFile(args.path, "utf8"), { filename: args.path });
            const script = compileScript(descriptor, { id: "quiet-outline", inlineTemplate: true, isProd: true });
            return { contents: script.content, loader: "ts", resolveDir: path.dirname(args.path) };
        });
        builder.onLoad({ filter: /\.svelte$/ }, async args => ({
            contents: compileSvelte(await readFile(args.path, "utf8"), { filename: args.path }).js.code,
            loader: "js", resolveDir: path.dirname(args.path),
        }));
        builder.onResolve({ filter: /^virtual:ec-/ }, args => ({ path: args.path, namespace: "ec" }));
        builder.onLoad({ filter: /.*/, namespace: "ec" }, async args =>
            args.path.endsWith("css")
                ? { contents: cssTheme.restoreCssVariables(await engine.getBaseStyles()), loader: "text" }
                : { contents: (await engine.getJsModules()).join("\n"), loader: "js" });
    },
};

const options = {
    entryPoints: ["src/main.ts"], bundle: true,
    external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
    // Quick Explorer 的窗口组件要先收到构造参数，再初始化依赖窗口的字段。
    tsconfigRaw: { compilerOptions: { useDefineForClassFields: false } },
    mainFields: ["module", "main"], jsxFactory: "el",
    define: { __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", "process.env.NODE_ENV": '"production"' },
    metafile: true, plugins: [pluginAssets, bundledLicenses], format: "cjs", platform: "node", target: "es2022", outfile: "main.js",
    legalComments: "eof", minify: true,
};
if (process.argv.includes("--watch")) {
    const development = await context({ ...options, logLevel: "info", minify: false, sourcemap: "inline" });
    await development.watch();
} else {
    await build(options);
}
