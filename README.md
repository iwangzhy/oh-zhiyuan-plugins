# Oh Zhiyuan

Open a Markdown note's folder in your default macOS terminal from the note header.

## 在终端中打开笔记目录

在 macOS 上打开 Markdown 笔记，点击笔记右上角的终端图标（`>_`），即可在系统当前的默认终端中打开该笔记所在的目录。分屏时，每个按钮对应所在面板的笔记。库根目录下的笔记会打开库根目录。

## 开发

```sh
npm ci
npm run dev
```

`npm run dev` 会监听源码变化并重新生成 `main.js`。`npm run build` 执行类型检查并生成构建产物，`npm test` 构建后运行功能测试。

## 本地安装

此功能适用于 macOS 上的 Obsidian 1.1.0 及以上版本。

从同一个 Release 下载 `main.js` 和 `manifest.json`，将它们复制到笔记库的 `.obsidian/plugins/oh-zhiyuan-plugins/` 目录，然后在 Obsidian 的「设置 → 第三方插件」中启用 **Oh Zhiyuan**。使用自定义配置文件夹时，请替换路径里的 `.obsidian`。 [GitHub Releases](https://github.com/iwangzhy/oh-zhiyuan-plugins/releases)

已安装 **My Open in Terminal** 的库可以先停用原插件，避免笔记标题栏显示两个终端按钮。

## 本机访问

点击终端图标时，插件调用 macOS 的 `/usr/bin/osascript`，通过 Launch Services 查询当前默认终端，然后检查笔记所在目录并将绝对路径交给 `/usr/bin/open`。查询和打开目录都在本机完成。

## 许可证

本项目采用 MIT 许可。终端功能迁自同作者的 My Open in Terminal，保留了原版权声明。 [MIT 许可证](LICENSE)
