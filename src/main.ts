import { Plugin } from "obsidian";
import { registerOpenInTerminal } from "./open-in-terminal";

export default class MyObsidianPlugins extends Plugin {
    onload(): void {
        registerOpenInTerminal(this);
    }
}
