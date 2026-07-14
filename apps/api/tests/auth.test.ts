import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import type { Application } from 'express'
import { uniqueEmail } from './helpers/factories'

vi.mock('../src/services/email/email.service', () => ({
  sendVerifyEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

import { createApp } from '../src/app'
import { prisma } from '../src/db/client'
import { sendVerifyEmail, sendPasswordResetEmail } from '../src/services/email/email.service'

const PASSWORD = 'Password123'

// Fresh app per test: express-rate-limit's MemoryStore lives on the app
// instance created inside createApp(), so this keeps the login/forgot-password
// limiters from tripping across unrelated tests in this file.
let app: Application
beforeEach(() => {
  app = createApp()
  vi.mocked(sendVerifyEmail).mockClear()
  vi.mocked(sendPasswordResetEmail).mockClear()
})

async function registerUser(email: string, name = 'Test User') {
  return request(app).post('/api/v1/auth/register').send({ name, email, password: PASSWORD })
}

// login() now blocks unverified accounts, so any test that needs a working
// login (not just testing register itself) must go through this instead of
// registerUser directly.
async function registerAndVerify(email: string, name = 'Test User') {
  await registerUser(email, name)
  const verifyUrl = vi.mocked(sendVerifyEmail).mock.calls.at(-1)?.[2]
  if (!verifyUrl) throw new Error('sendVerifyEmail was not called')
  const token = verifyUrl.split('/verify-email/')[1]
  await request(app).get(`/api/v1/auth/verify-email/${token}`)
}

function extractRefreshCookie(res: request.Response): string {
  const raw = (res.headers['set-cookie'] as unknown as string[] | undefined)?.[0]
  const match = raw?.match(/refreshToken=([^;]+)/)
  if (!match) throw new Error('Response did not set a refreshToken cookie')
  return `refreshToken=${match[1]}`
}

describe('POST /auth/register', () => {
  it('registers a new user and emails a verification link', async () => {
    const email = uniqueEmail('register')
    const res = await registerUser(email)

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.email).toBe(email)
    expect(res.body.data.passwordHash).toBeUndefined()
    expect(sendVerifyEmail).toHaveBeenCalledWith(email, 'Test User', expect.stringContaining('/verify-email/'))
  })

  it('rejects a duplicate email with 409', async () => {
    const email = uniqueEmail('dup')
    await registerUser(email)
    const res = await registerUser(email)

    expect(res.status).toBe(409)
    expect(res.body.errors[0].field).toBe('email')
  })

  it('rejects an invalid payload with 422 field errors', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })

    expect(res.status).toBe(422)
    expect(res.body.errors.length).toBeGreaterThan(0)
  })
})

describe('POST /auth/login', () => {
  it('logs in with correct credentials and sets the refresh cookie', async () => {
    const email = uniqueEmail('login')
    await registerAndVerify(email)

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeTruthy()
    expect(res.body.data.user.email).toBe(email)
    expect(extractRefreshCookie(res)).toContain('refreshToken=')
  })

  it('blocks login for an unverified account with 403', async () => {
    const email = uniqueEmail('unverified')
    await registerUser(email)

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })

    expect(res.status).toBe(403)
    expect(res.body.message).toBe('Please verify your email before logging in')
  })

  it('allows login once the email has been verified', async () => {
    const email = uniqueEmail('nowverified')
    await registerAndVerify(email)

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })

    expect(res.status).toBe(200)
    expect(res.body.data.user.isEmailVerified).toBe(true)
  })

  it('rejects the wrong password with a generic 401', async () => {
    const email = uniqueEmail('wrongpw')
    await registerUser(email)

    const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('rejects an unknown email with the same generic 401 (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('unknown'), password: PASSWORD })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Invalid email or password')
  })

  it('rate limits after 5 attempts within the window', async () => {
    const email = uniqueEmail('ratelimit')
    await registerUser(email)

    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1' })
      expect(res.status).toBe(401)
    }

    const sixth = await request(app).post('/api/v1/auth/login').send({ email, password: 'WrongPassword1' })
    expect(sixth.status).toBe(429)
  })
})

describe('POST /auth/refresh', () => {
  it('rejects a request with no refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh')
    expect(res.status).toBe(401)
  })

  it('rotates the refresh token and rejects reuse of the rotated-out one', async () => {
    const email = uniqueEmail('rotate')
    await registerAndVerify(email)
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })
    const firstCookie = extractRefreshCookie(loginRes)

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie)
    expect(refreshRes.status).toBe(200)
    const secondCookie = extractRefreshCookie(refreshRes)
    expect(secondCookie).not.toBe(firstCookie)

    // Reuse of the token that was just rotated out must be rejected...
    const reuseRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', firstCookie)
    expect(reuseRes.status).toBe(401)
    expect(reuseRes.body.message).toContain('reuse detected')

    // ...and detecting that reuse revokes the whole session set, including
    // the token that legitimately replaced it.
    const secondUseRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', secondCookie)
    expect(secondUseRes.status).toBe(401)
  })
})

describe('POST /auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const email = uniqueEmail('logout')
    await registerAndVerify(email)
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })
    const cookie = extractRefreshCookie(loginRes)

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)
    expect(logoutRes.status).toBe(200)

    const refreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)
    expect(refreshRes.status).toBe(401)
  })
})

describe('POST /auth/forgot-password + /auth/reset-password', () => {
  it('always returns a generic success message, whether or not the email exists', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: uniqueEmail('noaccount') })

    expect(res.status).toBe(200)
    expect(res.body.message).toMatch(/if that email exists/i)
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('rate limits after 5 attempts within the window', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: uniqueEmail('fp') })
      expect(res.status).toBe(200)
    }

    const sixth = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: uniqueEmail('fp') })
    expect(sixth.status).toBe(429)
  })

  it('resets the password with a valid token and revokes existing sessions', async () => {
    const email = uniqueEmail('reset')
    await registerAndVerify(email)
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })
    const cookie = extractRefreshCookie(loginRes)

    await request(app).post('/api/v1/auth/forgot-password').send({ email })
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1)
    const resetUrl = vi.mocked(sendPasswordResetEmail).mock.calls[0][2]
    const token = resetUrl.split('/reset-password/')[1]

    const newPassword = 'NewPassword456'
    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({ token, password: newPassword })
    expect(resetRes.status).toBe(200)

    const staleRefreshRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)
    expect(staleRefreshRes.status).toBe(401)

    const oldLoginRes = await request(app).post('/api/v1/auth/login').send({ email, password: PASSWORD })
    expect(oldLoginRes.status).toBe(401)

    const newLoginRes = await request(app).post('/api/v1/auth/login').send({ email, password: newPassword })
    expect(newLoginRes.status).toBe(200)
  })

  it('rejects reset-password with an invalid or unknown token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bogus-token', password: 'Whatever123' })
    expect(res.status).toBe(400)
  })

  it('rejects reusing the same reset token a second time', async () => {
    const email = uniqueEmail('reset-reuse')
    await registerAndVerify(email)

    await request(app).post('/api/v1/auth/forgot-password').send({ email })
    const resetUrl = vi.mocked(sendPasswordResetEmail).mock.calls[0][2]
    const token = resetUrl.split('/reset-password/')[1]

    const firstUse = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'FirstNewPass1' })
    expect(firstUse.status).toBe(200)

    const secondUse = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'SecondNewPass1' })
    expect(secondUse.status).toBe(400)
  })
})

describe('GET /auth/verify-email/:token', () => {
  it('verifies the email using the token from registration', async () => {
    const email = uniqueEmail('verify')
    await registerUser(email)
    const verifyUrl = vi.mocked(sendVerifyEmail).mock.calls[0][2]
    const token = verifyUrl.split('/verify-email/')[1]

    const res = await request(app).get(`/api/v1/auth/verify-email/${token}`)
    expect(res.status).toBe(200)

    const user = await prisma.user.findFirst({ where: { email } })
    expect(user?.isEmailVerified).toBe(true)
  })

  it('rejects an invalid verification token', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email/not-a-real-token')
    expect(res.status).toBe(400)
  })

  it('rejects reusing the same verification token a second time', async () => {
    const email = uniqueEmail('verify-reuse')
    await registerUser(email)
    const verifyUrl = vi.mocked(sendVerifyEmail).mock.calls[0][2]
    const token = verifyUrl.split('/verify-email/')[1]

    const firstUse = await request(app).get(`/api/v1/auth/verify-email/${token}`)
    expect(firstUse.status).toBe(200)

    const secondUse = await request(app).get(`/api/v1/auth/verify-email/${token}`)
    expect(secondUse.status).toBe(400)
  })
})
