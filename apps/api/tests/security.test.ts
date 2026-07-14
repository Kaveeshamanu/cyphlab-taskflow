import { describe, it, expect, vi, afterEach } from 'vitest'
import request from 'supertest'

// Regression coverage for a real bug: helmet's default HSTS header made
// Safari force-upgrade every request on this origin to https://, and the
// local/Docker stack only speaks HTTP — every asset request failed with a
// TLS error and Swagger UI rendered blank. Caught by manual browser testing,
// not by curl or the existing suite, so it's worth pinning down here.
describe('Strict-Transport-Security', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    vi.resetModules()
  })

  it('is absent outside production, where the stack only speaks HTTP', async () => {
    const { createApp } = await import('../src/app')
    const res = await request(createApp()).get('/api/health')
    expect(res.headers['strict-transport-security']).toBeUndefined()
  })

  it('is present in production, where Render terminates TLS', async () => {
    vi.resetModules()
    process.env.NODE_ENV = 'production'
    const { createApp } = await import('../src/app')
    const res = await request(createApp()).get('/api/health')
    expect(res.headers['strict-transport-security']).toBeDefined()
  })
})
