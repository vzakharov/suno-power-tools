import { SunoManager } from "./src/manager";

declare global {
  interface Window {
    suno: SunoManager,
  }
}