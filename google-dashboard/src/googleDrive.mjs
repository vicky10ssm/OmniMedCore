import { google } from "googleapis";
import { isSnapshotId } from "./manifest.mjs";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

async function listAll(drive, params) {
  const files = [];
  let pageToken;
  do {
    const response = await drive.files.list({
      ...params,
      pageToken,
      pageSize: 1000,
      fields:
        "nextPageToken, files(id,name,mimeType,size,modifiedTime,trashed,parents)",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    files.push(...(response.data.files ?? []));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}

export function createDriveSource(folderId, logger = console) {
  const auth = new google.auth.GoogleAuth({ scopes: [READONLY_SCOPE] });
  const drive = google.drive({ version: "v3", auth });

  return {
    kind: "drive",
    folderId,

    async listSnapshots() {
      const folders = await listAll(drive, {
        q: `'${folderId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      });
      const snapshots = [];
      for (const folder of folders) {
        if (!isSnapshotId(folder.name)) continue;
        const children = await listAll(drive, {
          q: `'${folder.id}' in parents and trashed = false`,
        });
        const manifestFile = children.find(
          (file) => file.name === "_manifest.json"
        );
        if (!manifestFile) {
          logger.warn?.(`Ignoring ${folder.name}: no _manifest.json`);
          continue;
        }
        try {
          const text = await this.readFile({ folderId: folder.id }, "_manifest.json");
          snapshots.push({
            id: folder.name,
            folderId: folder.id,
            manifest: JSON.parse(text),
            files: children,
            source: "drive",
          });
        } catch (error) {
          logger.warn?.(`Ignoring ${folder.name}: ${error.message}`);
        }
      }
      return snapshots;
    },

    async readFile(snapshot, fileName) {
      const children = snapshot.files ?? [];
      let match = children.find((file) => file.name === fileName);
      if (!match) {
        const listed = await listAll(drive, {
          q: `'${snapshot.folderId}' in parents and trashed = false`,
        });
        match = listed.find((file) => file.name === fileName);
        if (!match) {
          throw new Error(`Could not find ${fileName} in ${snapshot.folderId}`);
        }
      }
      const response = await drive.files.get(
        { fileId: match.id, alt: "media", supportsAllDrives: true },
        { responseType: "text" }
      );
      return typeof response.data === "string"
        ? response.data
        : JSON.stringify(response.data);
    },
  };
}
