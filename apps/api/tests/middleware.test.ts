import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import { randomUUID } from 'node:crypto'
import { Role } from '@taskflow/types'
import { prisma } from '../src/db/client'
import { requireAuth } from '../src/middlewares/auth'
import { requireRole } from '../src/middlewares/requireRole'
import { requireProjectAccess } from '../src/middlewares/projectAccess'
import { errorHandler } from '../src/middlewares/errorHandler'
import { signAccessToken } from '../src/utils/jwt'
import { ok } from '../src/utils/envelope'
import { uniqueEmail } from './helpers/factories'

function buildTestApp() {
  const app = express()
  app.get('/protected', requireAuth, (req, res) => ok(res, { userId: req.user?.id }))
  app.get('/admin-only', requireAuth, requireRole(Role.ADMIN), (_req, res) => ok(res, null))
  app.get(
    '/projects/:projectId/manage-only',
    requireAuth,
    requireProjectAccess('manage'),
    (_req, res) => ok(res, null),
  )
  app.get(
    '/projects/:projectId/member-only',
    requireAuth,
    requireProjectAccess('member'),
    (_req, res) => ok(res, null),
  )
  app.use(errorHandler)
  return app
}

describe('requireAuth', () => {
  it('rejects a request with no Authorization header', async () => {
    const res = await request(buildTestApp()).get('/protected')
    expect(res.status).toBe(401)
  })

  it('rejects a garbage token', async () => {
    const res = await request(buildTestApp())
      .get('/protected')
      .set('Authorization', 'Bearer not-a-real-token')
    expect(res.status).toBe(401)
  })

  it('accepts a valid access token and attaches req.user', async () => {
    const { token } = signAccessToken({ sub: 'user-1', role: Role.TEAM_MEMBER })
    const res = await request(buildTestApp()).get('/protected').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.userId).toBe('user-1')
  })
})

describe('requireRole', () => {
  it('rejects (403) a role outside the allowlist', async () => {
    const { token } = signAccessToken({ sub: 'user-1', role: Role.TEAM_MEMBER })
    const res = await request(buildTestApp()).get('/admin-only').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('allows an allowlisted role', async () => {
    const { token } = signAccessToken({ sub: 'user-1', role: Role.ADMIN })
    const res = await request(buildTestApp()).get('/admin-only').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
  })
})

describe('requireProjectAccess', () => {
  it('lets the manager and admin through, but blocks a non-member; a member reads but cannot manage', async () => {
    const manager = await prisma.user.create({
      data: { name: 'Manager', email: uniqueEmail('mgr'), passwordHash: 'x', role: Role.PROJECT_MANAGER },
    })
    const member = await prisma.user.create({
      data: { name: 'Member', email: uniqueEmail('mem'), passwordHash: 'x', role: Role.TEAM_MEMBER },
    })
    const outsider = await prisma.user.create({
      data: { name: 'Outsider', email: uniqueEmail('out'), passwordHash: 'x', role: Role.TEAM_MEMBER },
    })
    const project = await prisma.project.create({ data: { name: 'Test Project', managerId: manager.id } })
    await prisma.projectMember.create({ data: { projectId: project.id, userId: member.id } })

    const app = buildTestApp()
    const tokenFor = (sub: string, role: Role) => signAccessToken({ sub, role }).token

    const managerRes = await request(app)
      .get(`/projects/${project.id}/manage-only`)
      .set('Authorization', `Bearer ${tokenFor(manager.id, Role.PROJECT_MANAGER)}`)
    expect(managerRes.status).toBe(200)

    const memberManageRes = await request(app)
      .get(`/projects/${project.id}/manage-only`)
      .set('Authorization', `Bearer ${tokenFor(member.id, Role.TEAM_MEMBER)}`)
    expect(memberManageRes.status).toBe(403)

    const memberReadRes = await request(app)
      .get(`/projects/${project.id}/member-only`)
      .set('Authorization', `Bearer ${tokenFor(member.id, Role.TEAM_MEMBER)}`)
    expect(memberReadRes.status).toBe(200)

    const outsiderRes = await request(app)
      .get(`/projects/${project.id}/member-only`)
      .set('Authorization', `Bearer ${tokenFor(outsider.id, Role.TEAM_MEMBER)}`)
    expect(outsiderRes.status).toBe(403)

    const adminRes = await request(app)
      .get(`/projects/${project.id}/manage-only`)
      .set('Authorization', `Bearer ${tokenFor(randomUUID(), Role.ADMIN)}`)
    expect(adminRes.status).toBe(200)
  })

  it('returns 404 for a project that does not exist', async () => {
    const app = buildTestApp()
    const { token } = signAccessToken({ sub: randomUUID(), role: Role.PROJECT_MANAGER })
    const res = await request(app)
      .get('/projects/does-not-exist/manage-only')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
  })
})
