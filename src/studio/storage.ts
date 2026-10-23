import type { WritingAsset, WritingDocument } from "./model";
import { studioConfig } from "@/data/studio";

let connection: Promise<IDBDatabase> | undefined;
function database() {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("yifan-writing-studio", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("documents");
      request.result.createObjectStore("assets");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("浏览器未允许保存本地草稿，请允许本站使用存储空间。"));
  });
  return connection;
}
const key = (id: string) => `${studioConfig.repository}:${id}`;

async function write(store: string, id: string, value?: unknown) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const collection = tx.objectStore(store);
    if (value === undefined) collection.delete(key(id));
    else collection.put(value, key(id));
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(new Error("草稿未能保存；请检查浏览器存储空间。"));
  });
}
export const saveDocument = (doc: WritingDocument) =>
  write("documents", doc.id, doc);
export const removeDocument = (id: string) => write("documents", id);
export const saveAsset = (asset: WritingAsset) =>
  write("assets", asset.path, asset);

export async function loadDocuments(): Promise<WritingDocument[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const store = db.transaction("documents").objectStore("documents");
    const request = store.openCursor();
    const docs: WritingDocument[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor)
        return resolve(
          docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        );
      if (String(cursor.key).startsWith(`${studioConfig.repository}:`))
        docs.push(cursor.value);
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadAsset(
  path: string
): Promise<WritingAsset | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction("assets")
      .objectStore("assets")
      .get(key(path));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
