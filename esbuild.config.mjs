import { readFile } from "node:fs/promises";
import { build, context } from "esbuild";

// 社区目录会单独分发 main.js，版权声明随构建产物一起交付。
const license = await readFile(new URL("./LICENSE", import.meta.url), "utf8");
const options = {
    entryPoints: ["src/main.ts"],
    banner: { js: `/*!\n${license.trimEnd()}\n*/` },
    bundle: true,
    external: ["obsidian"],
    format: "cjs",
    platform: "node",
    target: "es2021",
    outfile: "main.js",
};

if (process.argv.includes("--watch")) {
    const development = await context({
        ...options,
        logLevel: "info",
        sourcemap: "inline",
    });
    await development.watch();
} else {
    await build(options);
}
