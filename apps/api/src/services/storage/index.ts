import { env } from '../../config/env'
import { IStorageService } from './storage.service'
import { LocalStorageService } from './local.storage'
import { CloudinaryStorageService } from './cloudinary.storage'

function build(): IStorageService {
  if (env.STORAGE_DRIVER === 'cloudinary') {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error(
        'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET',
      )
    }
    return new CloudinaryStorageService()
  }
  return new LocalStorageService()
}

export const storageService: IStorageService = build()
export type { IStorageService, UploadableFile, UploadResult } from './storage.service'
