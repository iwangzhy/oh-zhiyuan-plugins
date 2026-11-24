# My Obsidian Plugins

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

将 `main.js` 和 `manifest.json` 复制到测试库的 `.obsidian/plugins/oh-zhiyuan-plugins/` 目录，然后在 Obsidian 的「设置 → 第三方插件」中启用 **My Obsidian Plugins**。

已安装 **My Open in Terminal** 的库可以先停用原插件，避免笔记标题栏显示两个终端按钮。

提交官方社区目录前，需要调整插件显示名称以符合命名要求。 [Obsidian 插件命名规则](https://docs.obsidian.md/Reference/Manifest)

终端功能沿用原插件的 MIT 许可。 [原插件许可证](LICENSE.my-open-in-terminal)
