import { ModulePlugin } from "./modules";
import { registerOpenInTerminal } from "./open-in-terminal";

export default class OpenInTerminal extends ModulePlugin {
    start(): void { registerOpenInTerminal(this); }
}
