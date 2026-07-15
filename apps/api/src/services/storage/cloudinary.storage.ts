import { v2 as cloudinary } from 'cloudinary'
import { env } from '../../config/env'
import { IStorageService, UploadableFile, UploadResult } from './storage.service'

// Prod: files go to Cloudinary. storageKey is the Cloudinary public_id —
// the only handle needed to both build a delivery URL and delete the asset
// later, so nothing else about the asset needs to be persisted ourselves.
export class CloudinaryStorageService implements IStorageService {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    })
  }

  async upload(file: UploadableFile): Promise<UploadResult> {
    const result = await new Promise<{ public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'taskflow/attachments' },
        (err, res) => {
          if (err || !res) reject(err ?? new Error('Cloudinary upload returned no result'))
          else resolve(res)
        },
      )
      stream.end(file.buffer)
    })
    return { storageKey: result.public_id }
  }

  async delete(storageKey: string): Promise<void> {
    await cloudinary.uploader.destroy(storageKey, { resource_type: 'auto' })
  }

  getUrl(storageKey: string): string {
    return cloudinary.url(storageKey, { secure: true })
  }
}
