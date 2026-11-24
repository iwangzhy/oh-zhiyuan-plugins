import { appendFile, readFile, readdir } from "node:fs/promises";
import path from "node:path";

// 用户安装时只复制发布文件，因此被打进 main.js 的第三方代码也要带上原许可。
export const bundledLicenses = {
    name: "bundled-licenses",
    setup(builder) {
        builder.onEnd(async result => {
            if (result.errors.length) return;
            const vendors = await readdir("vendor", { withFileTypes: true });
            const folders = new Set([".", ...vendors.filter(entry => entry.isDirectory()).map(entry => "vendor/" + entry.name)]);
            for (const file of Object.keys(result.metafile.inputs)) {
                const match = file.match(/^(.*\bnode_modules\/(?:@[^/]+\/)?[^/]+)\//);
                if (match) folders.add(match[1]);
            }
            const notices = new Map();
            for (const folder of [...folders].sort()) {
                const names = await readdir(folder);
                for (const name of names.filter(file => /^(licen[cs]e|copying|notice)(\.|$)/i.test(file))) {
                    const body = (await readFile(path.join(folder, name), "utf8")).trim();
                    if (!notices.has(body)) notices.set(body, []);
                    notices.get(body).push(folder);
                }
            }
            const text = [...notices].map(([body, names]) => names.join(", ") + "\n" + body).join("\n\n");
            await appendFile("main.js", "\n/*!\n" + text.replaceAll("*/", "* /") + "\n*/\n");
        });
    },
};
