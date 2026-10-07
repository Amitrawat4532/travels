import "server-only";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { AppError } from "@/lib/errors";

/**
 * File storage abstraction. Local disk for dev / single server; swap with an
 * S3 / R2 / GCS implementation of the same interface for production.
 * Files are NEVER served from /public — only via /api/files with auth checks.
 */
export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
}

const ROOT = path.resolve(process.env.STORAGE_DIR ?? "./storage");

function resolveKey(key: string): string {
  const full = path.resolve(ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return full;
}

class LocalDiskStorage implements StorageProvider {
  async put(key: string, data: Buffer) {
    const full = resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async get(key: string) {
    try {
      return await readFile(resolveKey(key));
    } catch {
      return null;
    }
  }
  async remove(key: string) {
    await unlink(resolveKey(key)).catch(() => undefined);
  }
}

export const storage: StorageProvider = new LocalDiskStorage();

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Magic-byte sniffing so a renamed .exe can't pass as a PDF. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buf.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

export type StoredFile = { key: string; fileName: string; mimeType: string; sizeBytes: number };

export async function saveUpload(
  file: File,
  prefix: string,
  opts: { imagesOnly?: boolean } = {},
): Promise<StoredFile> {
  if (!file || file.size === 0) throw new AppError("Please choose a file.");
  if (file.size > MAX_UPLOAD_BYTES) throw new AppError("File is too large — maximum 5 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buf);
  if (!mime || !(ALLOWED_UPLOAD_TYPES as readonly string[]).includes(mime)) {
    throw new AppError("Upload a JPG, PNG, WEBP or PDF file.");
  }
  if (opts.imagesOnly && !mime.startsWith("image/")) throw new AppError("Upload a JPG, PNG or WEBP photo.");
  const key = `${prefix}/${randomUUID()}.${EXT[mime]}`;
  await storage.put(key, buf, mime);
  return { key, fileName: file.name.slice(0, 120) || `upload.${EXT[mime]}`, mimeType: mime, sizeBytes: file.size };
}

export function mimeForKey(key: string): string {
  const ext = key.split(".").pop() ?? "";
  return Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
}
