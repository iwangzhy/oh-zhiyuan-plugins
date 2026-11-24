# Oh Zhiyuan

一个桌面版 Obsidian 插件，整合日历、文件导航、大纲、代码高亮、文字样式和 macOS 终端入口。

[English](README.md)

## 安装与迁移

1. 使用 Obsidian 1.10.0 或以上版本。在现有库中，先停用准备接管的独立插件，保留它们的设置目录。
2. 将同一版本的 `main.js`、`manifest.json` 和 `styles.css` 放入库内的 `.obsidian/plugins/oh-zhiyuan-plugins/`，在「设置 → 第三方插件」中启用 **Oh Zhiyuan**。使用自定义配置目录时请替换 `.obsidian`。
3. 打开「设置 → Oh Zhiyuan」。每组沿用原插件名，点击组名展开选项，右侧开关控制启停。

首次加载会导入当前库中对应独立插件的设置。之后各模块的开关和选项都保存在 Oh Zhiyuan 的 `data.json`，顶层按原插件名分组。仍启用的独立插件会优先提供对应功能。停用它后重新打开合集设置页即可接管。原命令 ID 用于识别已有快捷键。

| 模块 | 操作 |
| --- | --- |
| Calendar | 点击日期打开日记，点击周号打开周记。日记和周记可以分别设置目录、文件名格式，以及本地 Markdown 或 HTTP / HTTPS 模板。周记支持 `{{sidebar_position}}`，按当年日期倒序排列。 |
| Editor Syntax Highlight | 在编辑视图为代码块着色。与 Shiki 同时启用时，Shiki 优先处理它支持的语言。 |
| Open In New Tab | 点击文件或内部链接时使用新标签页，已打开的文件复用原标签。 |
| Quick Explorer | 从路径栏或命令面板浏览当前目录和全库，支持键盘导航和预览。 |
| Quiet Outline | 在侧栏搜索标题、调整展开层级、定位章节或拖动标题。 |
| Shiki Highlighter | 在阅读和编辑视图渲染代码，支持主题、行号、行内代码和自定义语法。 |
| Show Current File Path | 在底部查看当前文件的路径，点击可复制。 |
| Style Text | 从命令面板或编辑器右键菜单应用、移除自定义文字样式。 |
| 在终端中打开笔记目录 | 在 macOS 上点击笔记右上角的终端图标，在系统当前默认终端中进入这篇笔记的文件夹。分屏时按钮对应所在面板。 |

Calendar 初次导入核心「日记」的设置，之后从合集的 Calendar 分组读取。若启用了 Periodic Notes 的日记或周记设置，对应周期沿用其配置。从日历创建笔记时才下载 URL 模板。下载失败时会提示并按原有行为创建空笔记。

## 本机访问

点击终端图标时，插件通过 macOS Launch Services 查询当前默认终端，检查目录后交给系统打开。配置了远程模板时，Calendar 会在创建对应笔记时请求该地址。

## 开发

使用 Node.js 22.18 或以上版本。运行 `npm ci` 安装锁定的依赖，`npm run dev` 监听源码，`npm run build` 生成发布文件，`npm test` 构建并执行测试。

## 许可

本项目自有代码使用 MIT 许可。移植代码和依赖保留各自的版权声明。[本项目许可](LICENSE) · [上游来源](vendor/README.md)
