# 移植来源

这里保留了需要继续维护的上游源码。各目录中的 LICENSE 记录原许可，构建时会将上游许可和打包依赖的许可加入 main.js。

| 模块 | 基线 | 本项目的适配 |
| --- | --- | --- |
| Calendar | [1.5.10](https://github.com/liamcain/obsidian-calendar-plugin/tree/1.5.10)，MIT | 保留月历视图、日记与周记、统计标记和外部日历数据源。将本库的 URL 模板和周报排序改动移入笔记创建逻辑，按合集配置查找模板。 |
| Editor Syntax Highlight | [0.1.3](https://github.com/deathau/cm-editor-syntax-highlight-obsidian)，包声明 MIT | 沿用 CodeMirror 5.58.2 语法包、Elixir 扩展和原深色配色，通过 CodeMirror 6 给编辑器中的代码块着色。 |
| Open In New Tab | [1.0.9](https://github.com/patleeman/obsidian-open-in-new-tab/tree/1.0.9)，MIT | 保留文件列表与内部链接入口，按解析后的库内路径复用标签页。 |
| Quick Explorer | [0.2.8](https://github.com/pjeby/quick-explorer/tree/0.2.8)，ISC | 保留文件菜单、预览与导航命令，标题位置和路径栏可见性放在合集设置页。 |
| Quiet Outline | [0.3.25](https://github.com/guopenghui/obsidian-quiet-outline/tree/0.3.25)，MIT | 保留 Vue 大纲视图、层级、搜索、拖动、Canvas 和原配置；设置统一使用简体中文。 |
| Shiki Highlighter | [0.7.7](https://github.com/mProjectsCode/obsidian-shiki-plugin/tree/0.7.7)，MIT | 保留 Shiki、Expressive Code、编辑器扩展及自定义主题和语法设置。 |
| Show Current File Path | [0.5.2](https://github.com/ravimashru/obsidian-show-file-path/tree/0.5.2)，包声明 MIT | 状态栏和复制命令在本项目中实现，沿用三个原设置。 |
| Style Text | [0.1.0](https://github.com/juanjoarranz/style-text-obsidian-plugin/tree/0.1.0)，MIT | 沿用样式数据、顺序、命令 ID 与标记格式，设置和编辑操作由本项目实现。 |
