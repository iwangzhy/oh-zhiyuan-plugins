import { PluginSettingTab, Setting, Platform, Notice, normalizePath } from 'obsidian';
import type ShikiPlugin from '../main';
import { StringSelectModal } from './StringSelectModal';
import { bundledThemesInfo } from 'shiki';
import { OBSIDIAN_THEME_IDENTIFIER } from '../themes/ThemeMapper';
import { FrameType } from './Settings';

export class ShikiSettingsTab extends PluginSettingTab {
	plugin: ShikiPlugin;

	constructor(plugin: ShikiPlugin) {
		super(plugin.app, plugin);

		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();

		const customThemes = Object.fromEntries(this.plugin.highlighter.customThemes.map(theme => [theme.name, `${theme.displayName} (${theme.type === 'dark' ? '深色' : theme.type === 'light' ? '浅色' : '通用'})`]));
		const builtInThemes = Object.fromEntries(bundledThemesInfo.map(theme => [theme.id, `${theme.displayName} (${theme.type === 'dark' ? '深色' : theme.type === 'light' ? '浅色' : '通用'})`]));
		const themes = {
			[OBSIDIAN_THEME_IDENTIFIER]: '跟随 Obsidian 主题',
			...customThemes,
			...builtInThemes,
		};

		new Setting(this.containerEl).setName('应用当前设置').addButton(button => {
			button
				.setCta()
				.setButtonText('重新加载高亮器')
				.onClick(async () => {
					button.setDisabled(true);
					await this.plugin.reloadHighlighter();
					button.setDisabled(false);
				});
		});

		new Setting(this.containerEl)
			.setName('行内代码高亮')
			.setDesc('用「{语言} 代码」指定行内代码的语言。')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.inlineHighlighting).onChange(async value => {
					this.plugin.settings.inlineHighlighting = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl).setName('代码块默认样式').setHeading();

		new Setting(this.containerEl)
			.setName('显示行号')
			.setDesc('为代码块显示行号。')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.ecDefaultShowLineNumbers).onChange(async value => {
					this.plugin.settings.ecDefaultShowLineNumbers = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl)
			.setName('自动换行')
			.setDesc('长代码行随可用宽度换行。')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.ecDefaultWrap).onChange(async value => {
					this.plugin.settings.ecDefaultWrap = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl)
			.setName('边框样式')
			.setDesc('选择代码块的默认外观。')
			.addDropdown(dropdown => {
				dropdown.addOptions({
					[FrameType.Code]: '代码',
					[FrameType.Terminal]: '终端',
					[FrameType.None]: '无',
					[FrameType.Auto]: '自动',
				});
				dropdown.setValue(this.plugin.settings.ecDefaultFrame).onChange(async value => {
					this.plugin.settings.ecDefaultFrame = value as FrameType;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl).setName('主题').setHeading();

		new Setting(this.containerEl)
			.setName('深色主题')
			.setDesc("深色模式下使用的代码配色。")
			.addDropdown(dropdown => {
				dropdown.addOptions(themes);
				dropdown.setValue(this.plugin.settings.darkTheme).onChange(async value => {
					this.plugin.settings.darkTheme = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl)
			.setName('浅色主题')
			.setDesc("浅色模式下使用的代码配色。")
			.addDropdown(dropdown => {
				dropdown.addOptions(themes);
				dropdown.setValue(this.plugin.settings.lightTheme).onChange(async value => {
					this.plugin.settings.lightTheme = value;
					await this.plugin.saveSettings();
				});
			});

		const customThemeFolderSetting = new Setting(this.containerEl)
			.setName('自定义主题目录')
			.setDesc('填写存放 JSON 主题文件的库内相对路径。')
			.addText(textbox => {
				textbox
					.setValue(this.plugin.settings.customThemeFolder)
					.onChange(async value => {
						this.plugin.settings.customThemeFolder = value;
						await this.plugin.saveSettings();
					})
					.then(textbox => {
						textbox.inputEl.addClass('shiki-custom-theme-folder');
					});
			});

		new Setting(this.containerEl)
			.setName('优先使用代码主题配色')
			.setDesc('背景等颜色优先取自代码主题。')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.preferThemeColors).onChange(async value => {
					this.plugin.settings.preferThemeColors = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl).setHeading().setName('语言');

		const customLanguageFolderSetting = new Setting(this.containerEl)
			.setName('自定义语言目录')
			.setDesc('填写存放 JSON 语法文件的库内相对路径。')
			.addText(textbox => {
				textbox
					.setValue(this.plugin.settings.customLanguageFolder)
					.onChange(async value => {
						this.plugin.settings.customLanguageFolder = value;
						await this.plugin.saveSettings();
					})
					.then(textbox => {
						textbox.inputEl.addClass('shiki-custom-language-folder');
					});
			});

		new Setting(this.containerEl)
			.setName('排除语言')
			.setDesc('这些语言保留原有的显示方式。')
			.addButton(button => {
				button.setButtonText('添加语言').onClick(() => {
					const modal = new StringSelectModal(this.plugin, this.plugin.highlighter.supportedLanguages, language => {
						this.plugin.settings.disabledLanguages.push(language);
						void this.plugin.saveSettings();
						this.display();
					});
					modal.open();
				});
			});

		for (const language of this.plugin.settings.disabledLanguages) {
			new Setting(this.containerEl).setName(language).addButton(button => {
				button
					.setIcon('trash')
					.setWarning()
					.onClick(() => {
						this.plugin.settings.disabledLanguages = this.plugin.settings.disabledLanguages.filter(x => x !== language);
						void this.plugin.saveSettings();
						this.display();
					});
			});
		}

		if (Platform.isDesktopApp) {
			customThemeFolderSetting.addExtraButton(button => {
				button
					.setIcon('folder-open')
					.setTooltip('打开自定义主题目录')
					.onClick(async () => {
						const themeFolder = normalizePath(this.plugin.settings.customThemeFolder);
						if (await this.app.vault.adapter.exists(themeFolder)) {
							this.plugin.app.openWithDefaultApp(themeFolder);
						} else {
							new Notice(`无法打开自定义主题目录： ${themeFolder}`, 5000);
						}
					});
			});

			customLanguageFolderSetting.addExtraButton(button => {
				button
					.setIcon('folder-open')
					.setTooltip('打开自定义语言目录')
					.onClick(async () => {
						const languageFolder = normalizePath(this.plugin.settings.customLanguageFolder);
						if (await this.app.vault.adapter.exists(languageFolder)) {
							this.plugin.app.openWithDefaultApp(languageFolder);
						} else {
							new Notice(`无法打开自定义语言目录： ${languageFolder}`, 5000);
						}
					});
			});
		}
	}
}
