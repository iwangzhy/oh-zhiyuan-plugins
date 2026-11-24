import { debounce, loadPrism, MarkdownView, Plugin, TFile } from 'obsidian';
import { CodeBlock } from './CodeBlock';
import { createCm6Plugin } from './codemirror/Cm6_ViewPlugin';
import { DEFAULT_SETTINGS, type Settings } from './settings/Settings';
import { ShikiSettingsTab } from './settings/SettingsTab';
import { CodeHighlighter } from './Highlighter';
import { InlineCodeBlock } from './InlineCodeBlock';

import { ModulePlugin } from '../../../../src/modules';
import blockCss from './styles.css?inline';
import ecCss from 'virtual:ec-styles.css';
import 'virtual:ec-runtime';

export const SHIKI_INLINE_REGEX = /^\{([^\s]+)\} (.*)/i; // format: `{lang} code`

class LanguageProcessors extends Plugin {}

export default class ShikiPlugin extends ModulePlugin {
	highlighter!: CodeHighlighter;
	activeCodeBlocks!: Map<string, (CodeBlock | InlineCodeBlock)[]>;
	settings!: Settings;
	readonly editors = new Set<() => Promise<void>>();
	private processors?: LanguageProcessors;
	private registeredLanguages = new Set<string>();
	private reload = Promise.resolve();
	private stopped = false;

	async start(): Promise<void> {
		this.useStyles(blockCss + ecCss);
		await this.loadSettings();
		await this.saveSettings();
		this.addSettingTab(new ShikiSettingsTab(this));

		this.highlighter = new CodeHighlighter(this);
		await this.highlighter.load();

		this.activeCodeBlocks = new Map();

		this.register(() => { this.store.shikiHandles = undefined; });
		this.registerInlineCodeProcessor();
		this.registerCodeBlockProcessors();

		this.registerEditorExtension([createCm6Plugin(this)]);

		// this is a workaround for the fact that obsidian does not rerender the code block
		// when the start line with the language changes, and we need that for the EC meta string
		this.registerEvent(
			this.app.vault.on('modify', async file => {
				// sleep 0 so that the code block context is updated before we rerender
				await sleep(100);

				if (file instanceof TFile) {
					if (this.activeCodeBlocks.has(file.path)) {
						for (const codeBlock of this.activeCodeBlocks.get(file.path)!) {
							void codeBlock.rerenderOnNoteChange();
						}
					}
				}
			}),
		);

		const debouncedReload = debounce(
			() => {
				void this.reloadHighlighter();
			},
			500,
			true,
		);
		this.register(() => debouncedReload.cancel());

		this.registerEvent(
			this.app.workspace.on('css-change', () => {
				debouncedReload();
			}),
		);

		this.addCommand({
			id: 'reload-highlighter',
			name: '重新加载高亮器',
			callback: () => {
				void this.reloadHighlighter();
			},
		});

		await this.registerPrismPlugin();
	}

	async reloadHighlighter(): Promise<void> {
		const rebuild = async () => {
			if (this.stopped) return;
			// 先构建替代实例，编辑器和阅读视图在加载主题期间仍可使用当前语法库。
			const next = new CodeHighlighter(this);
			try {
				await next.load();
			} catch (error) {
				await next.unload();
				throw error;
			}
			if (this.stopped) { await next.unload(); return; }
			const previous = this.highlighter;
			this.highlighter = next;
			this.registerCodeBlockProcessors();
			for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
				if (leaf.view instanceof MarkdownView) leaf.view.previewMode.rerender(true);
			}
			await Promise.all(Array.from(this.editors, update => update()));
			await previous.unload();
		};
		this.reload = this.reload.then(rebuild, rebuild);
		return this.reload;
	}

	async registerPrismPlugin(): Promise<void> {
		const prism = await loadPrism();
		const key = 'before-all-elements-highlight';
		const filter = (env: { elements: Element[] }) => {
			env.elements = env.elements.filter(el => !el.matches('div.expressive-code pre code'));
		};
		prism.hooks.add(key, filter);
		this.register(() => {
			const hooks = prism.hooks.all[key];
			const index = hooks.indexOf(filter);
			if (index >= 0) hooks.splice(index, 1);
		});
	}

	registerCodeBlockProcessors(): void {
		const languages = this.highlighter.obsidianSafeLanguageNames();
		if (this.processors && languages.length === this.registeredLanguages.size &&
			languages.every(language => this.registeredLanguages.has(language))) return;
		// 注册项随子组件一起卸载，新增自定义语言或禁用语言后，阅读视图也能立即切换。
		if (this.processors) this.removeChild(this.processors);
		this.processors = this.addChild(new LanguageProcessors(this.app, this.manifest));
		this.registeredLanguages = new Set(languages);
		this.store.shikiHandles = language => this.registeredLanguages.has(language);

		for (const language of languages) {
			try {
				this.processors.registerMarkdownCodeBlockProcessor(
					language,
					async (source, el, ctx) => {
						// we need to avoid making the hidden frontmatter code block visible
						if (el.parentElement?.classList.contains('mod-frontmatter')) {
							return;
						}

						const codeBlock = new CodeBlock(this, el, source, language, ctx);

						ctx.addChild(codeBlock);
					},
					1000,
				);
			} catch (e) {
				console.warn(`Failed to register code block processor for ${language}.`, e);
			}
		}
	}

	registerInlineCodeProcessor(): void {
		this.registerMarkdownPostProcessor(async (el, ctx) => {
			if (!this.highlighter.settings.inlineHighlighting) return;
			const inlineCodes = el.findAll(':not(pre) > code');
			for (const codeElm of inlineCodes) {
				const match = SHIKI_INLINE_REGEX.exec(codeElm.textContent ?? ''); // format: `{lang} code`
				if (!match || !this.registeredLanguages.has(match[1].toLowerCase())) {
					continue;
				}

				const codeBlock = new InlineCodeBlock(this, codeElm, match[2], match[1], ctx);

				ctx.addChild(codeBlock);
			}
		});
	}

	onunload(): void {
		this.stopped = true;
		void this.highlighter?.unload();
	}

	addActiveCodeBlock(codeBlock: CodeBlock | InlineCodeBlock): void {
		const filePath = codeBlock.ctx.sourcePath;

		if (!this.activeCodeBlocks.has(filePath)) {
			this.activeCodeBlocks.set(filePath, [codeBlock]);
		} else {
			this.activeCodeBlocks.get(filePath)!.push(codeBlock);
		}
	}

	removeActiveCodeBlock(codeBlock: CodeBlock | InlineCodeBlock): void {
		const filePath = codeBlock.ctx.sourcePath;

		if (this.activeCodeBlocks.has(filePath)) {
			const index = this.activeCodeBlocks.get(filePath)!.indexOf(codeBlock);
			if (index !== -1) {
				this.activeCodeBlocks.get(filePath)!.splice(index, 1);
			}
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as Settings;

		// migrate the theme to darkTheme and lightTheme
		if (this.settings.theme !== undefined) {
			this.settings.darkTheme = this.settings.theme;
			this.settings.lightTheme = this.settings.theme;
			this.settings.theme = undefined;
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
