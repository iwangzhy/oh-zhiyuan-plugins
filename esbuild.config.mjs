import { build, context } from "esbuild";

const options = {
    entryPoints: ["src/main.ts"],
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
