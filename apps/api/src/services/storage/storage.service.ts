// Swapping storage backends is a config change (STORAGE_DRIVER), not a code
// change — every call site depends only on this interface, never on
// LocalStorageService or CloudinaryStorageService directly.
export interface UploadableFile {
  buffer: Buffer
  originalname: string
  mimetype: string
}

export interface UploadResult {
  storageKey: string
}

export interface IStorageService {
  upload(file: UploadableFile): Promise<UploadResult>
  delete(storageKey: string): Promise<void>
  getUrl(storageKey: string): string
}
