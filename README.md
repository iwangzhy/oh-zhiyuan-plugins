# Oh Zhiyuan

Open the folder containing a Markdown note in your default macOS terminal from the note header.

[简体中文](README.zh-CN.md) · [![CI](https://github.com/iwangzhy/oh-zhiyuan-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/iwangzhy/oh-zhiyuan-plugins/actions/workflows/ci.yml)

## Usage

Click the terminal icon in a Markdown note's header. In split view, each pane opens the folder for its own note. A note at the vault root opens the vault folder. The plugin checks the current default terminal on every click.

## Installation

Requires macOS and Obsidian 1.1.0 or later.

1. Download `main.js` and `manifest.json` from the same version. [GitHub Releases](https://github.com/iwangzhy/oh-zhiyuan-plugins/releases)
2. Put both files in `.obsidian/plugins/oh-zhiyuan-plugins/` inside your vault. If you use a custom configuration folder, substitute it for `.obsidian`.
3. Reload Obsidian and enable **Oh Zhiyuan** under **Settings → Community plugins**.

To update a manual installation, replace both files and reload the plugin.

## Local access

On each click, the plugin queries the default terminal through macOS Launch Services using `/usr/bin/osascript`. It checks the note's parent folder through Obsidian's vault adapter, then passes the absolute path to `/usr/bin/open`. The plugin launches these two system programs directly with separate arguments. These operations run locally.

## Development

Use Node.js 22 to match CI.

```sh
npm ci
npm test
```

`npm test` builds the plugin and exercises the generated `main.js`. Use `npm run dev` to rebuild on source changes. [Contributing](CONTRIBUTING.md)

## License

Released under the MIT License. [LICENSE](LICENSE)
