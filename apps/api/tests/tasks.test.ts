import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import type { Application } from 'express'
import { Role } from '@taskflow/types'
import { createApp } from '../src/app'
import { prisma, prismaUnfiltered } from '../src/db/client'
import { addProjectMember, authHeader, createProject, createTask, createUser } from './helpers/factories'

let app: Application
beforeEach(() => {
  app = createApp()
})

describe('Task lifecycle', () => {
  it('create → assign → notification created → status update via /move → activity logged', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const member = await createUser({ role: Role.TEAM_MEMBER, name: 'Alex Rivera' })
    const project = await createProject(pm.id)
    await addProjectMember(project.id, member.id)

    const createRes = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
      .send({ title: 'Ship the release notes', projectId: project.id, assigneeId: member.id })

    expect(createRes.status).toBe(201)
    const taskId = createRes.body.data.id as string

    const assignedNotification = await prisma.notification.findFirst({
      where: { userId: member.id, type: 'TASK_ASSIGNED', entityId: taskId },
    })
    expect(assignedNotification).not.toBeNull()

    const moveRes = await request(app)
      .patch(`/api/v1/tasks/${taskId}/move`)
      .set('Authorization', authHeader(member.id, Role.TEAM_MEMBER))
      .send({ status: 'IN_PROGRESS' })

    expect(moveRes.status).toBe(200)
    expect(moveRes.body.data.status).toBe('IN_PROGRESS')

    const statusChangedLog = await prismaUnfiltered.activityLog.findFirst({
      where: { entityType: 'task', entityId: taskId, action: 'STATUS_CHANGED' },
    })
    expect(statusChangedLog).not.toBeNull()
    expect(statusChangedLog?.metadata).toMatchObject({ from: 'TODO', to: 'IN_PROGRESS' })

    const createdLog = await prismaUnfiltered.activityLog.findFirst({
      where: { entityType: 'task', entityId: taskId, action: 'CREATED' },
    })
    expect(createdLog).not.toBeNull()
  })

  it('reorders within a column using position-only /move', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const project = await createProject(pm.id)
    const task = await createTask(project.id, { position: 1000 })

    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}/move`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
      .send({ position: 500 })

    expect(res.status).toBe(200)
    expect(res.body.data.position).toBe(500)
    expect(res.body.data.status).toBe('TODO')
  })

  it('422s a /move call with neither status nor position', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const project = await createProject(pm.id)
    const task = await createTask(project.id)

    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}/move`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
      .send({})

    expect(res.status).toBe(422)
  })
})

describe('Comments and @mentions', () => {
  it('notifies a @mentioned project member', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const author = await createUser({ role: Role.TEAM_MEMBER, name: 'Author Person' })
    const mentioned = await createUser({ role: Role.TEAM_MEMBER, name: 'Jordan Blake' })
    const project = await createProject(pm.id)
    await addProjectMember(project.id, author.id)
    await addProjectMember(project.id, mentioned.id)
    const task = await createTask(project.id)

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set('Authorization', authHeader(author.id, Role.TEAM_MEMBER))
      .send({ body: 'Hey @jordan can you take a look?' })

    expect(res.status).toBe(201)
    expect(res.body.data.mentionedUserIds).toContain(mentioned.id)

    const mentionNotification = await prisma.notification.findFirst({
      where: { userId: mentioned.id, type: 'MENTION' },
    })
    expect(mentionNotification).not.toBeNull()
  })
})
