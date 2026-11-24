import { moment, normalizePath, Notice, requestUrl, TFile, TFolder } from "obsidian";
import type { Moment } from "moment";
import { get } from "svelte/store";
import { settings } from "./ui/stores";

type Period = "day" | "week";
const creating = new Map<string, Promise<TFile>>();
const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function options(period: Period) {
  const weekly = period === "week";
  const prefs = get(settings);
  const periodic = window.app.plugins.getPlugin("periodic-notes")?.settings?.[weekly ? "weekly" : "daily"];
  if (periodic?.enabled) {
    return { folder: periodic.folder?.trim() || "", template: periodic.template?.trim() || "",
      format: periodic.format || (weekly ? "gggg-[W]ww" : "YYYY-MM-DD") };
  }
  return {
    folder: (weekly ? prefs.weeklyNoteFolder : prefs.dailyNoteFolder).trim(),
    template: (weekly ? prefs.weeklyNoteTemplate : prefs.dailyNoteTemplate).trim(),
    format: (weekly ? prefs.weeklyNoteFormat : prefs.dailyNoteFormat) || (weekly ? "gggg-[W]ww" : "YYYY-MM-DD"),
  };
}
export const getDailyNoteSettings = () => options("day");
export const getWeeklyNoteSettings = () => options("week");
export const getDateUID = (date: Moment, period: Period = "day") => period + "-" + date.clone().startOf(period).format();
export const getDailyNote = (date: Moment, files: Record<string, TFile>) => files?.[getDateUID(date)] ?? null;
export const getWeeklyNote = (date: Moment, files: Record<string, TFile>) => files?.[getDateUID(date, "week")] ?? null;

function parseDate(basename: string, format: string, period: Period) {
  const date = moment(basename, format, true);
  if (!date.isValid()) return null;
  const tokens = format.replace(/\[[^\]]*\]/g, "");
  // 周报文件名可以同时包含月、日和周号。Moment 默认优先按月日解析，索引周报时必须按周归组。
  if (period === "week" && /w/i.test(tokens) && /[MD]/.test(tokens)) {
    return moment(basename, format.replace(/M{1,4}|D{1,4}/g, ""), false);
  }
  return date;
}
export function getDateFromFile(file: TFile, period: Period) {
  return file instanceof TFile ? parseDate(file.basename, options(period).format.split("/").pop()!, period) : null;
}
function indexNotes(period: Period) {
  const { folder, format } = options(period);
  const root = normalizePath(folder);
  const baseFormat = format.split("/").pop()!;
  const result: Record<string, TFile> = {};
  for (const file of window.app.vault.getMarkdownFiles()) {
    if (root && root !== "/" && !file.path.startsWith(root + "/")) continue;
    const date = parseDate(file.basename, baseFormat, period);
    if (date) result[getDateUID(date, period)] = file;
  }
  return result;
}
export const getAllDailyNotes = () => indexNotes("day");
export const getAllWeeklyNotes = () => indexNotes("week");

async function readTemplate(template: string): Promise<{ text: string; folds?: unknown }> {
  if (!template) return { text: "" };
  try {
    if (/^https?:\/\//i.test(template)) return { text: (await requestUrl(template)).text };
    const app = window.app;
    const file = app.metadataCache.getFirstLinkpathDest(normalizePath(template), "");
    if (!file) throw new Error("找不到模板文件");
    return { text: await app.vault.cachedRead(file), folds: app.foldManager?.load(file) };
  } catch (error) {
    // 现用 Calendar 在模板不可用时仍允许创建空笔记，便于用户继续记录。
    new Notice("读取模板失败，将创建空笔记。");
    console.warn("Calendar 模板读取失败", error);
    return { text: "" };
  }
}

export function renderTemplate(text: string, date: Moment, period: Period, format: string, now = moment()) {
  const title = date.format(format);
  let result = text.replace(/{{\s*title\s*}}/gi, () => title)
    .replace(/{{\s*(date|time)\s*(([+-]\d+)([yqmwdhs]))?\s*(:.+?)?}}/gi,
      (_, key: string, calc: string, amount: string, unit: moment.unitOfTime.DurationConstructor, pattern: string) => {
        if (period === "day" && !calc && !pattern && key.toLowerCase() === "time") return now.format("HH:mm");
        const target = date.clone().set({ hour: now.hour(), minute: now.minute(), second: now.second() });
        if (calc) target.add(Number(amount), unit);
        return target.format(pattern ? pattern.slice(1).trim() : format);
      });
  if (period === "day") {
    return result.replace(/{{\s*yesterday\s*}}/gi, () => date.clone().subtract(1, "day").format(format))
      .replace(/{{\s*tomorrow\s*}}/gi, () => date.clone().add(1, "day").format(format));
  }
  // 博客按较小的侧栏序号排在前面，因此越晚的周报取越小的值。
  result = result.replace(/{\s*{\s*sidebar_position\s*}\s*}/gi, String(366 - date.dayOfYear()));
  return result.replace(/{{\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*:(.*?)}}/gi,
    (_, day: string, pattern: string) => {
      const index = (weekdays.indexOf(day.toLowerCase()) - date.localeData().firstDayOfWeek() + 7) % 7;
      return date.clone().weekday(index).format(pattern.trim());
    });
}

async function openOrCreate(date: Moment, period: Period): Promise<TFile> {
  const { folder, format, template } = options(period);
  const filename = date.format(format);
  const path = normalizePath([folder, filename.endsWith(".md") ? filename : filename + ".md"].filter(Boolean).join("/"));
  const { vault } = window.app;
  const existing = vault.getAbstractFileByPath(path);
  if (existing instanceof TFile) return existing;
  const pending = creating.get(path);
  if (pending) return pending;
  const writing = (async () => {
    const { text, folds } = await readTemplate(template);
    const parent = path.slice(0, Math.max(0, path.lastIndexOf("/")));
    if (parent && !vault.getAbstractFileByPath(parent)) {
      try { await vault.createFolder(parent); }
      catch (error) { if (!(vault.getAbstractFileByPath(parent) instanceof TFolder)) throw error; }
    }
    // 下载模板时，另一个标签或同步工具也可能创建同名笔记。
    const concurrent = vault.getAbstractFileByPath(path);
    if (concurrent instanceof TFile) return concurrent;
    const file = await vault.create(path, renderTemplate(text, date, period, format));
    if (folds) window.app.foldManager?.save(file, folds);
    return file;
  })();
  creating.set(path, writing);
  try { return await writing; }
  finally { creating.delete(path); }
}
export const createDailyNote = (date: Moment) => openOrCreate(date, "day");
export const createWeeklyNote = (date: Moment) => openOrCreate(date, "week");
