import multer from 'multer'
import { AppError } from '../../utils/envelope'
import { ALLOWED_ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_SIZE_BYTES } from './attachments.constants'

// Memory storage: the buffer is handed straight to IStorageService.upload(),
// which is the only place that knows whether it lands on disk or Cloudinary.
export const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError(`Unsupported file type: ${file.mimetype}`, 422))
      return
    }
    cb(null, true)
  },
})
