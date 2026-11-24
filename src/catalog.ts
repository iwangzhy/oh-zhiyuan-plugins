import type { ModuleDefinition } from "./modules";

// 延迟加载编辑器扩展和视图；未启用的模块无需初始化其界面库或语法库。
export const catalog: ModuleDefinition[] = [
    { name: "Calendar", id: "calendar", description: "从日历打开或创建日记和周记。", create: () => require("../vendor/calendar/main").default },
    { name: "Editor Syntax Highlight", id: "cm-editor-syntax-highlight-obsidian", description: "编辑笔记时为代码块中的关键字、字符串和注释着色。", create: () => require("./editor-syntax").default },
    { name: "Open In New Tab", id: "open-in-new-tab", description: "在新标签页打开文件和内部链接，已打开的文件复用原标签。", create: () => require("./new-tab").default },
    { name: "Quick Explorer", id: "quick-explorer", description: "通过路径菜单和键盘浏览文件夹、预览笔记。", create: () => require("../vendor/quick-explorer/quick-explorer").default },
    { name: "Quiet Outline", id: "obsidian-quiet-outline", description: "在侧栏搜索标题、切换展开层级并跳转到章节。", create: () => require("../vendor/quiet-outline/plugin").QuietOutline },
    { name: "Shiki Highlighter", id: "shiki-highlighter", description: "在阅读和编辑视图中渲染代码块及行内代码。", create: () => require("../vendor/shiki-highlighter/obsidian/src/main").default },
    { name: "Show Current File Path", id: "obsidian-show-file-path", description: "在状态栏显示当前路径，点击即可复制。", create: () => require("./file-path").default },
    { name: "Style Text", id: "style-text", description: "从命令面板或右键菜单为选中的文字应用样式。", create: () => require("./style-text").default },
    { name: "在终端中打开笔记目录", id: "open-note-folder-in-terminal", aliases: ["my-open-in-terminal"], description: "从笔记右上角在 macOS 默认终端中打开所在目录。", create: () => require("./terminal-module").default },
];
