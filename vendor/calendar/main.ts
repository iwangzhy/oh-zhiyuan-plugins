import type { Moment, WeekSpec } from "moment";
import { App, WorkspaceLeaf } from "obsidian";

import { VIEW_TYPE_CALENDAR } from "./constants";
import { settings } from "./ui/stores";
import {
  defaultSettings,
  appHasPeriodicNotesPluginLoaded,
  CalendarSettingsTab,
  ISettings,
} from "./settings";
import CalendarView from "./view";

declare global {
  interface Window {
    app: App;
    moment: () => Moment;
    _bundledLocaleWeekSpec: WeekSpec;
  }
}

import { ModulePlugin } from "../../src/modules";

export default class CalendarPlugin extends ModulePlugin {
  public options: ISettings;

  onunload(): void {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_CALENDAR)
      .forEach((leaf) => leaf.detach());
  }

  async start(): Promise<void> {
    this.register(
      settings.subscribe((value) => {
        this.options = value;
      })
    );

    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf)
    );

    this.addCommand({
      id: "show-calendar-view",
      name: "打开日历",
      callback: async () => {
        const leaf = await this.initLeaf();
        if (leaf) await this.app.workspace.revealLeaf(leaf);
      },
    });

    this.addCommand({
      id: "open-weekly-note",
      name: "打开本周周记",
      checkCallback: (checking) => {
        if (checking) {
          return !appHasPeriodicNotesPluginLoaded();
        }
        void this.getView().then(view => view?.openOrCreateWeeklyNote(window.moment(), false));
      },
    });

    this.addCommand({
      id: "reveal-active-note",
      name: "在日历中定位当前笔记",
      callback: async () => {
        const view = await this.getView();
        if (view) {
          await this.app.workspace.revealLeaf(view.leaf);
          view.revealActiveNote();
        }
      },
    });

    await this.loadOptions();

    this.addSettingTab(new CalendarSettingsTab(this.app, this));

    if (this.app.workspace.layoutReady) {
      await this.initLeaf();
    } else {
      this.registerEvent(
        this.app.workspace.on("layout-ready", this.initLeaf.bind(this))
      );
    }
  }

  private async initLeaf(): Promise<WorkspaceLeaf | null> {
    const workspace = this.app.workspace;
    const existing = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];
    if (existing) return existing;
    const leaf = workspace.getRightLeaf(false);
    if (leaf) await leaf.setViewState({ type: VIEW_TYPE_CALENDAR });
    return leaf;
  }

  private async getView(): Promise<CalendarView | undefined> {
    const leaf = await this.initLeaf();
    // 折叠的侧栏可能只有占位视图，命令仍需能直接创建周记。
    await leaf?.loadIfDeferred();
    return leaf?.view instanceof CalendarView ? leaf.view : undefined;
  }

  async loadOptions(): Promise<void> {
    const options = await this.loadData();
    settings.update((old) => {
      return {
        ...defaultSettings,
        ...(options || {}),
      };
    });

    await this.saveData(this.options);
  }

  async writeOptions(
    changeOpts: (settings: ISettings) => Partial<ISettings>
  ): Promise<void> {
    settings.update((old) => ({ ...old, ...changeOpts(old) }));
    await this.saveData(this.options);
  }
}
