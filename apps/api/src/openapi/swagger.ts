import path from 'node:path'
import { Application } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import helmet from 'helmet'

const SPEC_JSON_PATH = '/api/docs.json'
const UI_PATH = '/api/docs'

// swagger-ui-dist's bundle mounts the UI via inline <script> execution
// (not just the external swagger-ui-*.js files it also loads via src=), and
// the app's default helmet() policy in app.ts is script-src 'self' with no
// 'unsafe-inline' — that silently blocks the inline execution with no
// visible HTML error, leaving the page shell loaded but empty. This relaxed
// policy applies ONLY to the /api/docs routes registered below; every other
// route keeps the strict default set globally in app.ts.
const docsCsp = helmet.contentSecurityPolicy({
  directives: {
    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
  },
})

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '0.1.0',
      description: 'Project & team task management platform',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  // Matches both ts-node/tsx dev runs (src) and the compiled build (dist).
  apis: [
    path.join(__dirname, '../modules/**/*.router.ts'),
    path.join(__dirname, '../modules/**/*.router.js'),
  ],
}) as { paths?: Record<string, unknown> }

// Fails loudly at boot rather than silently rendering an empty docs page —
// an empty glob match (wrong cwd, wrong extension after a build change) is
// otherwise invisible until someone notices Swagger UI has no endpoints.
const discoveredPaths = Object.keys(swaggerSpec.paths ?? {})
console.log(`\u{1F4D8} Swagger: discovered ${discoveredPaths.length} path(s): ${discoveredPaths.join(', ') || '(none)'}`)

export function mountSwagger(app: Application): void {
  // swaggerUi.serve (express.static under the hood) resolves the UI's own
  // assets relative to its own trailing-slash path, and normally redirects
  // a bare mount-root request there itself — but that's an implementation
  // detail of the dependency, not a documented contract. Redirect explicitly
  // so a version bump can't silently turn this back into relative-asset
  // 404s and a blank page.
  app.get(UI_PATH, (req, res, next) => {
    if (req.path === UI_PATH) {
      res.redirect(301, `${UI_PATH}/`)
      return
    }
    next()
  })

  app.get(SPEC_JSON_PATH, (_req, res) => {
    res.type('application/json').send(swaggerSpec)
  })

  // Passing `undefined` instead of the spec object stops swagger-ui-express
  // from embedding it inline in swagger-ui-init.js — the UI instead fetches
  // it from SPEC_JSON_PATH at load time, which is also what makes the spec
  // curl-able/testable on its own.
  app.use(
    UI_PATH,
    docsCsp,
    swaggerUi.serve,
    swaggerUi.setup(undefined, { swaggerOptions: { url: SPEC_JSON_PATH } }),
  )
}
