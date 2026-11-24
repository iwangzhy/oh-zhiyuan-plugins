import { App, moment, PluginSettingTab, Setting } from "obsidian";
import type CalendarPlugin from "./main";

export const defaultSettings = {
  shouldConfirmBeforeCreate: true, weekStart: "locale", wordsPerDot: 250, showWeeklyNote: false,
  dailyNoteFormat: "", dailyNoteFolder: "", dailyNoteTemplate: "",
  weeklyNoteFormat: "", weeklyNoteFolder: "", weeklyNoteTemplate: "", localeOverride: "system-default",
};
export type ISettings = typeof defaultSettings;
export function appHasPeriodicNotesPluginLoaded(): boolean {
  return !!window.app.plugins.getPlugin("periodic-notes")?.settings?.weekly?.enabled;
}
export class CalendarSettingsTab extends PluginSettingTab {
  constructor(app: App, private calendar: CalendarPlugin) { super(app, calendar); }
  display(): void {
    const el = this.containerEl;
    el.empty();
    const prefs = this.calendar.options;
    const save = (key: keyof ISettings, value: string | boolean | number) => this.calendar.writeOptions(() => ({ [key]: value }));
    new Setting(el).setName("每个圆点代表的字数").setDesc("日期下方的圆点表示当天的写作量。").addText(input => {
      input.inputEl.type = "number";
      input.inputEl.min = "0";
      input.setValue(String(prefs.wordsPerDot)).onChange(value => {
        if (value && Number.isInteger(+value) && +value >= 0) void save("wordsPerDot", +value);
      });
    });
    new Setting(el).setName("每周起始日").addDropdown(input => input.addOptions({
      locale: "跟随地区设置", sunday: "星期日", monday: "星期一", tuesday: "星期二", wednesday: "星期三",
      thursday: "星期四", friday: "星期五", saturday: "星期六",
    }).setValue(prefs.weekStart).onChange(value => save("weekStart", value)));
    new Setting(el).setName("创建前确认").addToggle(input => input.setValue(prefs.shouldConfirmBeforeCreate)
      .onChange(value => save("shouldConfirmBeforeCreate", value)));
    new Setting(el).setName("显示周号").setDesc("点击周号可打开或创建周记。").addToggle(input => input.setValue(prefs.showWeeklyNote)
      .onChange(value => save("showWeeklyNote", value)));
    for (const [prefix, label] of [["daily", "日记"], ["weekly", "周记"]] as const) {
      new Setting(el).setName(label).setHeading();
      const external = window.app.plugins.getPlugin("periodic-notes")?.settings?.[prefix]?.enabled;
      if (external) el.createEl("p", { cls: "setting-item-description", text: "当前使用 Periodic Notes 中的" + label + "设置。" });
      for (const [suffix, name, description, placeholder] of [
        ["NoteFormat", "文件名格式", "按笔记对应的日期生成文件名。", prefix === "daily" ? "YYYY-MM-DD" : "gggg-[W]ww"],
        ["NoteFolder", "保存目录", "填写库内相对路径，留空表示库根目录。", ""],
        ["NoteTemplate", "模板", "填写库内 Markdown 模板路径或 HTTP / HTTPS 地址。", ""],
      ] as const) {
        const key = (prefix + suffix) as keyof ISettings;
        new Setting(el).setName(label + name).setDesc(description).addText(input => input.setPlaceholder(placeholder)
          .setValue(String(prefs[key])).setDisabled(!!external).onChange(value => save(key, value)));
      }
    }
    new Setting(el).setName("日历语言和地区").addDropdown(input => {
      input.addOption("system-default", "跟随系统");
      for (const locale of moment.locales()) input.addOption(locale, locale);
      input.setValue(prefs.localeOverride).onChange(value => save("localeOverride", value));
    });
  }
}
