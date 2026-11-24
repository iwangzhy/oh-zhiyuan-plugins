import type { Moment } from "moment";
import { Notice, type TFile } from "obsidian";
import {
  createWeeklyNote,
  getWeeklyNoteSettings,
} from "../notes";

import type { ISettings } from "../settings";
import { createConfirmationDialog } from "../ui/modal";

/**
 * Create a Weekly Note for a given date.
 */
export async function tryToCreateWeeklyNote(
  date: Moment,
  inNewSplit: boolean,
  settings: ISettings,
  cb?: (file: TFile) => void
): Promise<void> {
  const { workspace } = window.app;
  const { format } = getWeeklyNoteSettings();
  const filename = date.format(format);

  const writeAndOpen = async () => {
    const dailyNote = await createWeeklyNote(date);
    const leaf = inNewSplit
      ? workspace.splitActiveLeaf()
      : workspace.getUnpinnedLeaf();

    await leaf.openFile(dailyNote);
    cb?.(dailyNote);
  };

  const createFile = () => writeAndOpen().catch(error => new Notice("创建笔记失败：" + error.message));
  if (settings.shouldConfirmBeforeCreate) {
    createConfirmationDialog({
      cta: "创建",
      onAccept: createFile,
      text: `是否创建「${filename}」？`,
      title: "新建周记",
    });
  } else {
    await createFile();
  }
}
