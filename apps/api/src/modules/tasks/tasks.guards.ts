import { NextFunction, Request, Response } from 'express'
import { Role } from '@taskflow/types'
import { prisma } from '../../db/client'
import { AppError } from '../../utils/envelope'
import { checkProjectAccess, AccessLevel } from '../../middlewares/projectAccess'

// Task routes are keyed by task id, not project id, so requireProjectAccess
// (which reads req.params.projectId) doesn't apply directly — these guards
// load the task first to find its project, then defer to the same
// ownership/membership check.
export function requireTaskAccess(level: AccessLevel, taskIdParam = 'id') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    try {
      const task = await prisma.task.findFirst({
        where: { id: req.params[taskIdParam] },
        select: { projectId: true },
      })
      if (!task) throw new AppError('Task not found', 404)
      await checkProjectAccess(req.user, task.projectId, level)
      next()
    } catch (err) {
      next(err)
    }
  }
}

// PATCH /tasks/:id/move has its own permission shape, per the permission
// matrix: admin and the owning PM can move any task in their project; a
// Team Member may only move a task currently assigned to them (regardless
// of project membership otherwise). This is why /move is not gated by
// requireTaskAccess('manage') or ('member') — neither level expresses
// "assignee, even without manage rights."
export function requireTaskMoveAccess() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new AppError('Authentication required', 401))
      return
    }
    try {
      const task = await prisma.task.findFirst({
        where: { id: req.params.id },
        select: { projectId: true, assigneeId: true, project: { select: { managerId: true } } },
      })
      if (!task) throw new AppError('Task not found', 404)

      if (req.user.role === Role.ADMIN || task.project.managerId === req.user.id) {
        next()
        return
      }
      if (task.assigneeId === req.user.id) {
        next()
        return
      }
      next(new AppError('You can only move tasks assigned to you', 403))
    } catch (err) {
      next(err)
    }
  }
}
