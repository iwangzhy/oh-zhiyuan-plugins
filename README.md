# Oh Zhiyuan

An Obsidian desktop plugin for calendars, file navigation, outlines, syntax highlighting, text styles, and the default macOS terminal.

[简体中文](README.zh-CN.md) · [![CI](https://github.com/iwangzhy/oh-zhiyuan-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/iwangzhy/oh-zhiyuan-plugins/actions/workflows/ci.yml)

## Installation

Requires Obsidian desktop 1.10.0 or later. The terminal action requires macOS.

1. Disable the standalone plugins you want the suite to take over. Keep their settings directories for the initial import.
2. Copy `main.js`, `manifest.json`, and `styles.css` from the same build into `.obsidian/plugins/oh-zhiyuan-plugins/` inside your vault. Substitute your configuration folder if it has a different name.
3. Reload Obsidian and enable **Oh Zhiyuan** under **Settings → Community plugins**. Open the suite's settings to enable individual modules. Each group uses its original plugin name and has Chinese controls and descriptions.

On first load, the suite imports each original plugin's options into a group in its own `data.json`. Subsequent changes are saved there. Original command IDs preserve existing hotkey bindings. If a standalone plugin is still enabled, its module will start after you disable the standalone plugin and reopen the suite's settings.

## Modules

| Module | Use |
| --- | --- |
| Calendar | Open or create daily and weekly notes from the calendar. Configure a vault file or HTTP(S) template for each period. Weekly notes support the custom `{{sidebar_position}}` placeholder. |
| Editor Syntax Highlight | Apply syntax colors in the Markdown editor. Shiki takes priority for languages it handles when both modules are enabled. |
| Open In New Tab | Open files and links in new tabs and return to the existing tab when the file is already open. |
| Quick Explorer | Browse folders from the path menu using the mouse or keyboard. |
| Quiet Outline | Search, expand, reorder and navigate headings in the sidebar. |
| Shiki Highlighter | Highlight code blocks and inline code with themes, custom grammars, and Expressive Code frames. |
| Show Current File Path | Display and copy the active note's path from the status bar. |
| Style Text | Apply saved CSS styles to selected text from the command palette or context menu. |
| 在终端中打开笔记目录 | Open the current Markdown pane's folder in the default macOS terminal using its note header button. |

Calendar imports its daily settings from the core Daily notes plugin. When Periodic Notes manages daily or weekly notes, Calendar uses its configuration for that period. Remote templates are fetched when Calendar creates a note. A failed download shows a notice and creates an empty note.

## Local access

On each terminal click, the plugin queries the default terminal through macOS Launch Services with `/usr/bin/osascript`. It checks the note's parent folder through Obsidian's vault adapter, then passes the absolute path to `/usr/bin/open`. Both programs receive separate arguments.

## Development

Use Node.js 22.18 or later. Run `npm ci` to install dependencies and `npm test` to build the plugin and run the tests. Use `npm run dev` to rebuild on source changes. [Contributing](CONTRIBUTING.md)

## License

Project code is MIT licensed. The build includes the notices for the bundled plugins and their dependencies. [LICENSE](LICENSE) · [Upstream sources](vendor/README.md)
