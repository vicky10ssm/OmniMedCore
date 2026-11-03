// Desktop-only lifecycle: flush the SQLite file before the window closes.
//
// The browser fires `beforeunload`, but a WebView window close can terminate
// before an async IndexedDB/file write completes. Tauri's close-requested event
// lets us stop the close, flush, then destroy the window deliberately.

import { getCurrentWindow } from "@tauri-apps/api/window";
import { getDb } from "../db";
import { isTauriRuntime } from "../db/tauriStorage";

let installed = false;

export function installDesktopLifecycle(): void {
  if (installed || !isTauriRuntime()) return;
  installed = true;

  const appWindow = getCurrentWindow();
  void appWindow.onCloseRequested(async (event) => {
    event.preventDefault();
    try {
      const db = await getDb();
      await db.flush();
      await appWindow.destroy();
    } catch (error) {
      console.error("Could not flush the local database before closing", error);
      alert(
        "MediCore could not save the local database before closing. Keep this window open and contact support."
      );
    }
  });
}
