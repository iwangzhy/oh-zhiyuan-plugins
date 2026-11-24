import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import type { Range } from "@codemirror/state";
import { ModulePlugin } from "./modules";

interface Tokenizer {
    findModeByName(language: string): { mime: string } | undefined;
    findModeByExtension(language: string): { mime: string } | undefined;
    findModeByMIME(language: string): { mime: string } | undefined;
    runMode(text: string, mode: string, token: (part: string, style: string | null) => void): void;
}
const modes: Tokenizer = require("../vendor/editor-syntax-highlight/modes").default;
const aliases: Record<string, string> = {
    bash: "shell", zsh: "shell", sh: "shell", yml: "yaml", ts: "typescript", js: "javascript",
    dataviewjs: "javascript", dataview: "yaml", tracker: "yaml",
};
const fence = /^\s*(?:>\s*)*(?:(?:[-+*]|\d+[.)])\s+)?(`{3,}|~{3,})(.*)$/;
const marks = new Map<string, Decoration>();

function tokens(view: EditorView, covered?: (language: string) => boolean): DecorationSet {
    const doc = view.state.doc;
    const end = doc.lineAt(view.viewport.to).number;
    const ranges: Range<Decoration>[] = [];
    let block: { fence: string; language: string; from: number } | undefined;
    function paint(to: number) {
        if (!block || to <= block.from || to < view.viewport.from || covered?.(block.language)) return;
        const name = aliases[block.language] ?? block.language;
        const mode = modes.findModeByName(name) ?? modes.findModeByExtension(name) ?? modes.findModeByMIME(name);
        if (!mode) return;
        let at = block.from;
        modes.runMode(doc.sliceString(at, to), mode.mime, (part, style) => {
            const next = at + part.length;
            if (style && next > at && next > view.viewport.from && at < view.viewport.to) {
                let mark = marks.get(style);
                if (!mark) {
                    mark = Decoration.mark({ class: "oh-syntax-token " + style.split(/\s+/).map(token => "cm-" + token).join(" ") });
                    marks.set(style, mark);
                }
                ranges.push(mark.range(at, next));
            }
            at = next;
        });
    }
    for (let line = 1; line <= end; line++) {
        const current = doc.line(line);
        const match = fence.exec(current.text);
        if (!match) continue;
        if (!block) {
            block = { fence: match[1], language: match[2].trim().split(/\s+/)[0].toLowerCase(), from: current.to + 1 };
        } else if (match[1][0] === block.fence[0] && match[1].length >= block.fence.length && !match[2].trim()) {
            paint(current.from - 1);
            block = undefined;
        }
    }
    if (block) paint(doc.line(end).to);
    return Decoration.set(ranges);
}

export default class EditorSyntax extends ModulePlugin {
    start(): void {
        this.useStyles(require("../vendor/editor-syntax-highlight/styles.scss?inline").default);
        const store = this.store;
        // 旧版语法包只负责分词。光标、选区和编辑操作始终交给 Obsidian 的现代编辑器。
        this.registerEditorExtension(ViewPlugin.fromClass(class {
            covered = store.shikiHandles;
            decorations: DecorationSet;
            constructor(view: EditorView) { this.decorations = tokens(view, this.covered); }
            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged || this.covered !== store.shikiHandles) {
                    this.covered = store.shikiHandles;
                    this.decorations = tokens(update.view, this.covered);
                }
            }
        }, { decorations: item => item.decorations }));
    }
}
