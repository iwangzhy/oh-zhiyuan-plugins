# Oh Zhiyuan

从 Markdown 笔记标题栏，在 macOS 默认终端中打开笔记所在目录。

[English](README.md)

## 使用

点击 Markdown 笔记标题栏的终端图标。分屏时，每栏的按钮打开该栏笔记所在的目录。库根目录下的笔记会打开库根目录。插件每次点击都会查询系统当前的默认终端。

## 安装

适用于 macOS 上的 Obsidian 1.1.0 及以上版本。

1. 从同一版本下载 `main.js` 和 `manifest.json`。 [GitHub Releases](https://github.com/iwangzhy/oh-zhiyuan-plugins/releases)
2. 将两个文件复制到笔记库的 `.obsidian/plugins/oh-zhiyuan-plugins/`。使用自定义配置目录时，请替换路径里的 `.obsidian`。
3. 重新加载 Obsidian，在「设置 → 第三方插件」中启用 **Oh Zhiyuan**。

更新时，替换这两个文件并重新加载插件。

## 本机访问

点击图标时，插件调用 `/usr/bin/osascript`，通过 macOS Launch Services 查询默认终端。插件检查笔记所在目录，再把绝对路径交给 `/usr/bin/open`。这些操作都在本机完成。

## 开发

本地建议使用与 CI 一致的 Node.js 22。

```sh
npm ci
npm test
```

`npm test` 会构建插件并测试生成的 `main.js`。使用 `npm run dev` 可在源码变动时自动重建。 [贡献指南](CONTRIBUTING.md)

## 许可证

本项目采用 MIT 许可。 [LICENSE](LICENSE)
