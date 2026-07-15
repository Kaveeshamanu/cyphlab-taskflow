import { NextFunction, Request, Response } from 'express'
import { Role } from '@taskflow/types'
import { prisma } from '../db/client'
import { AppError } from '../utils/envelope'

export type AccessLevel = 'member' | 'manage'

// Pure DB check shared by every guard variant below (param-based, body-based,
// or a task-scoped lookup that resolves its own projectId first). Kept
// Express-free so it can be awaited directly from a task/comment/attachment
// service instead of only from route middleware.
export async function checkProjectAccess(
  user: { id: string; role: Role },
  projectId: string,
  level: AccessLevel,
): Promise<void> {
  if (user.role === Role.ADMIN) return

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { managerId: true },
  })
  if (!project) throw new AppError('Project not found', 404)
  if (project.managerId === user.id) return
  if (level === 'manage') {
    throw new AppError('Only the project manager can perform this action', 403)
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  })
  if (!membership) throw new AppError('You do not have access to this project', 403)
}

// Fine-grained gate — hits the DB to verify ownership/membership. A PM with
// the right role but the wrong project is still rejected here, which is the
// check requireRole alone cannot express.
export function requireProjectAccess(level: AccessLevel, projectIdParam = 'projectId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    try {
      await checkProjectAccess(req.user, req.params[projectIdParam], level)
      next()
    } catch (err) {
      next(err)
    }
  }
}

// Same check, but for routes where the project id is in the request body
// rather than the URL — e.g. POST /tasks, which creates a task inside a
// project named by body.projectId. Must run after body validation.
export function requireProjectAccessFromBody(level: AccessLevel, bodyField = 'projectId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    try {
      await checkProjectAccess(req.user, req.body[bodyField], level)
      next()
    } catch (err) {
      next(err)
    }
  }
}
