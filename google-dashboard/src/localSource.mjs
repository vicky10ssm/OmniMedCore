import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { isSnapshotId } from "./manifest.mjs";

function inside(base, candidate) {
  const root = resolve(base) + sep;
  return resolve(candidate).startsWith(root);
}

export function createLocalSource(folder, logger = console) {
  const root = resolve(folder);

  return {
    kind: "local",
    root,

    async listSnapshots() {
      const entries = await readdir(root, { withFileTypes: true });
      const snapshots = [];
      for (const entry of entries) {
        if (!entry.isDirectory() || !isSnapshotId(entry.name)) continue;
        const folderPath = join(root, entry.name);
        try {
          const manifestPath = join(folderPath, "_manifest.json");
          const text = await readFile(manifestPath, "utf8");
          const manifest = JSON.parse(text);
          snapshots.push({
            id: entry.name,
            folderId: folderPath,
            manifest,
            source: "local",
          });
        } catch (error) {
          logger.warn?.(`Ignoring ${entry.name}: ${error.message}`);
        }
      }
      return snapshots;
    },

    async readFile(snapshot, fileName) {
      const path = join(snapshot.folderId, fileName);
      if (!inside(snapshot.folderId, path)) {
        throw new Error(`Refusing to read outside the snapshot: ${fileName}`);
      }
      const info = await stat(path);
      if (!info.isFile()) throw new Error(`${fileName} is not a file`);
      return readFile(path, "utf8");
    },
  };
}
