import { Role } from '@taskflow/types'
import type { AttachmentDto } from '@taskflow/types'
import { prisma } from '../../db/client'
import { env } from '../../config/env'
import { AppError } from '../../utils/envelope'
import { checkProjectAccess } from '../../middlewares/projectAccess'
import { logActivity } from '../../utils/activityLog'
import { storageService } from '../../services/storage'

type AuthedUser = { id: string; role: Role }

interface AttachmentRecord {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  storageKey: string
  taskId: string
  uploaderId: string
  createdAt: Date
}

function toAttachmentDto(a: AttachmentRecord): AttachmentDto {
  return {
    id: a.id,
    filename: a.filename,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    taskId: a.taskId,
    uploaderId: a.uploaderId,
    url: storageService.getUrl(a.storageKey),
    createdAt: a.createdAt.toISOString(),
  }
}

export async function list(taskId: string): Promise<AttachmentDto[]> {
  const attachments = await prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } })
  return attachments.map(toAttachmentDto)
}

export async function upload(
  user: AuthedUser,
  taskId: string,
  file: Express.Multer.File,
): Promise<AttachmentDto> {
  const task = await prisma.task.findFirst({ where: { id: taskId }, select: { id: true } })
  if (!task) throw new AppError('Task not found', 404)

  const { storageKey } = await storageService.upload({
    buffer: file.buffer,
    originalname: file.originalname,
    mimetype: file.mimetype,
  })

  const attachment = await prisma.attachment.create({
    data: {
      filename: storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
      storageDriver: env.STORAGE_DRIVER,
      taskId,
      uploaderId: user.id,
    },
  })
  await logActivity('attachment', attachment.id, 'CREATED', { originalName: file.originalname, taskId })
  return toAttachmentDto(attachment)
}

async function assertCanDelete(user: AuthedUser, attachment: { uploaderId: string; projectId: string }) {
  if (user.role === Role.ADMIN) return
  if (attachment.uploaderId === user.id) return
  try {
    await checkProjectAccess(user, attachment.projectId, 'manage')
  } catch {
    throw new AppError('You do not have permission to delete this attachment', 403)
  }
}

export async function remove(user: AuthedUser, id: string): Promise<void> {
  const attachment = await prisma.attachment.findFirst({
    where: { id },
    include: { task: { select: { projectId: true } } },
  })
  if (!attachment) throw new AppError('Attachment not found', 404)

  await assertCanDelete(user, { uploaderId: attachment.uploaderId, projectId: attachment.task.projectId })

  await storageService.delete(attachment.storageKey)
  await prisma.attachment.delete({ where: { id } })
  await logActivity('attachment', id, 'DELETED', { originalName: attachment.originalName })
}
