import { randomUUID } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs/promises'
import { env } from '../../config/env'
import { IStorageService, UploadableFile, UploadResult } from './storage.service'

// Dev / Docker: files land on the local disk under UPLOAD_DIR, served back
// out by the static mount registered in app.ts. storageKey is just the
// filename — there's no bucket/public_id indirection to track.
export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string

  constructor() {
    this.uploadDir = path.resolve(env.UPLOAD_DIR)
  }

  async upload(file: UploadableFile): Promise<UploadResult> {
    await fs.mkdir(this.uploadDir, { recursive: true })
    const ext = path.extname(file.originalname)
    const storageKey = `${randomUUID()}${ext}`
    await fs.writeFile(path.join(this.uploadDir, storageKey), file.buffer)
    return { storageKey }
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(path.join(this.uploadDir, storageKey), { force: true })
  }

  getUrl(storageKey: string): string {
    // Relative, not absolute: these files are served by this API's own
    // static mount (app.ts), not by the frontend origin — the frontend
    // prefixes this with NEXT_PUBLIC_API_URL when rendering.
    return `/uploads/${storageKey}`
  }
}
