import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import type { Application } from 'express'
import { Role } from '@taskflow/types'
import { createApp } from '../src/app'
import { addProjectMember, authHeader, createProject, createTask, createUser } from './helpers/factories'

let app: Application
beforeEach(() => {
  app = createApp()
})

describe('RBAC — role-only gates', () => {
  it('403s a Team Member creating a task', async () => {
    const member = await createUser({ role: Role.TEAM_MEMBER })
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const project = await createProject(pm.id)

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', authHeader(member.id, Role.TEAM_MEMBER))
      .send({ title: 'Should not be created', projectId: project.id })

    expect(res.status).toBe(403)
  })

  it('403s a Team Member listing users', async () => {
    const member = await createUser({ role: Role.TEAM_MEMBER })

    const res = await request(app).get('/api/v1/users').set('Authorization', authHeader(member.id, Role.TEAM_MEMBER))

    expect(res.status).toBe(403)
  })
})

describe('RBAC — ownership gates', () => {
  it("403s a PM editing another PM's project", async () => {
    const pm1 = await createUser({ role: Role.PROJECT_MANAGER })
    const pm2 = await createUser({ role: Role.PROJECT_MANAGER })
    const pm2Project = await createProject(pm2.id)

    const res = await request(app)
      .patch(`/api/v1/projects/${pm2Project.id}`)
      .set('Authorization', authHeader(pm1.id, Role.PROJECT_MANAGER))
      .send({ name: 'Hijacked name' })

    expect(res.status).toBe(403)
  })

  it("403s a PM adding a member to a project they don't own", async () => {
    const pm1 = await createUser({ role: Role.PROJECT_MANAGER })
    const pm2 = await createUser({ role: Role.PROJECT_MANAGER })
    const outsider = await createUser({ role: Role.TEAM_MEMBER })
    const pm2Project = await createProject(pm2.id)

    const res = await request(app)
      .post(`/api/v1/projects/${pm2Project.id}/members`)
      .set('Authorization', authHeader(pm1.id, Role.PROJECT_MANAGER))
      .send({ userId: outsider.id })

    expect(res.status).toBe(403)
  })

  it('403s a Team Member moving a task not assigned to them', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const assignee = await createUser({ role: Role.TEAM_MEMBER })
    const bystander = await createUser({ role: Role.TEAM_MEMBER })
    const project = await createProject(pm.id)
    await addProjectMember(project.id, assignee.id)
    await addProjectMember(project.id, bystander.id)
    const task = await createTask(project.id, { assigneeId: assignee.id })

    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}/move`)
      .set('Authorization', authHeader(bystander.id, Role.TEAM_MEMBER))
      .send({ status: 'IN_PROGRESS' })

    expect(res.status).toBe(403)
  })

  it("403s a Team Member reading a task in a project they're not a member of", async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const outsider = await createUser({ role: Role.TEAM_MEMBER })
    const project = await createProject(pm.id)
    const task = await createTask(project.id)

    const res = await request(app)
      .get(`/api/v1/tasks/${task.id}`)
      .set('Authorization', authHeader(outsider.id, Role.TEAM_MEMBER))

    expect(res.status).toBe(403)
  })

  it('allows the assignee to move their own task', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const assignee = await createUser({ role: Role.TEAM_MEMBER })
    const project = await createProject(pm.id)
    await addProjectMember(project.id, assignee.id)
    const task = await createTask(project.id, { assigneeId: assignee.id })

    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}/move`)
      .set('Authorization', authHeader(assignee.id, Role.TEAM_MEMBER))
      .send({ status: 'IN_PROGRESS' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_PROGRESS')
  })
})

describe('RBAC — unauthenticated', () => {
  it('401s an unauthenticated request to a protected route', async () => {
    const routes = [
      ['get', '/api/v1/users'],
      ['get', '/api/v1/projects'],
      ['get', '/api/v1/tasks'],
      ['get', '/api/v1/notifications'],
      ['get', '/api/v1/dashboard'],
    ] as const

    for (const [method, url] of routes) {
      const res = await request(app)[method](url)
      expect(res.status).toBe(401)
    }
  })
})

describe('Validation — assignee must be a project member', () => {
  it('422s creating a task with an assignee outside the project', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const outsider = await createUser({ role: Role.TEAM_MEMBER })
    const project = await createProject(pm.id)

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
      .send({ title: 'Needs a valid assignee', projectId: project.id, assigneeId: outsider.id })

    expect(res.status).toBe(422)
    expect(res.body.errors[0].field).toBe('assigneeId')
  })

  it('201s creating a task with an assignee who is a project member', async () => {
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const member = await createUser({ role: Role.TEAM_MEMBER })
    const project = await createProject(pm.id)
    await addProjectMember(project.id, member.id)

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
      .send({ title: 'Valid assignee', projectId: project.id, assigneeId: member.id })

    expect(res.status).toBe(201)
    expect(res.body.data.assigneeId).toBe(member.id)
  })
})

describe('Soft delete + restore', () => {
  it('excludes a soft-deleted task from the list and restores it (admin only)', async () => {
    const admin = await createUser({ role: Role.ADMIN })
    const pm = await createUser({ role: Role.PROJECT_MANAGER })
    const project = await createProject(pm.id)
    const task = await createTask(project.id)

    const deleteRes = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
    expect(deleteRes.status).toBe(200)

    const listRes = await request(app)
      .get(`/api/v1/tasks?projectId=${project.id}`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
    expect(listRes.body.data.find((t: { id: string }) => t.id === task.id)).toBeUndefined()

    const nonAdminRestoreRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/restore`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
    expect(nonAdminRestoreRes.status).toBe(403)

    const restoreRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/restore`)
      .set('Authorization', authHeader(admin.id, Role.ADMIN))
    expect(restoreRes.status).toBe(200)

    const listAfterRestore = await request(app)
      .get(`/api/v1/tasks?projectId=${project.id}`)
      .set('Authorization', authHeader(pm.id, Role.PROJECT_MANAGER))
    expect(listAfterRestore.body.data.find((t: { id: string }) => t.id === task.id)).toBeDefined()
  })
})
