import { NextFunction, Request, Response } from 'express'
import { Role } from '@taskflow/types'
import { prisma } from '../db/client'
import { AppError } from '../utils/envelope'

type AccessLevel = 'member' | 'manage'

// Fine-grained gate — hits the DB to verify ownership/membership. A PM with
// the right role but the wrong project is still rejected here, which is the
// check requireRole alone cannot express.
export function requireProjectAccess(level: AccessLevel, projectIdParam = 'projectId') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    if (req.user.role === Role.ADMIN) {
      next()
      return
    }

    const projectId = req.params[projectIdParam]
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { managerId: true },
    })
    if (!project) {
      next(new AppError('Project not found', 404))
      return
    }
    if (project.managerId === req.user.id) {
      next()
      return
    }
    if (level === 'manage') {
      next(new AppError('Only the project manager can perform this action', 403))
      return
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    })
    if (!membership) {
      next(new AppError('You do not have access to this project', 403))
      return
    }
    next()
  }
}
