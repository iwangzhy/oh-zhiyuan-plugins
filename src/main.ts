import { Plugin } from "obsidian";
import { registerOpenInTerminal } from "./open-in-terminal";

export default class OhZhiyuanPlugin extends Plugin {
    onload(): void {
        registerOpenInTerminal(this);
    }
}
