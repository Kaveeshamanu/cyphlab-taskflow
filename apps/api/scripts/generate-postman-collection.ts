// Regenerates postman_collection.json from the same OpenAPI spec object
// served at /api/docs.json, so the two never drift. Run after adding or
// changing an endpoint's @openapi JSDoc annotation:
//   pnpm --filter @taskflow/api generate:postman
import fs from 'node:fs'
import path from 'node:path'
import { swaggerSpec } from '../src/openapi/swagger'

interface JsonSchema {
  type?: string
  format?: string
  example?: unknown
  properties?: Record<string, JsonSchema>
}

interface OpenApiOperation {
  tags?: string[]
  summary?: string
  description?: string
  requestBody?: { content?: Record<string, { schema?: JsonSchema }> }
  responses?: Record<string, { description?: string }>
}

interface OpenApiSpec {
  paths?: Record<string, Record<string, OpenApiOperation>>
}

function placeholderFor(key: string, schema: JsonSchema | undefined): unknown {
  if (schema?.format === 'email') return 'user@example.com'
  if (schema?.format === 'password') return 'Password123'
  if (schema?.type === 'number' || schema?.type === 'integer') return 0
  if (schema?.type === 'boolean') return false
  return `<${key}>`
}

function exampleFromSchema(schema: JsonSchema | undefined): unknown {
  if (!schema) return undefined
  if (schema.example !== undefined) return schema.example
  if (schema.type === 'object' && schema.properties) {
    const obj: Record<string, unknown> = {}
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      obj[key] = exampleFromSchema(propSchema) ?? placeholderFor(key, propSchema)
    }
    return obj
  }
  return undefined
}

function toPostmanPath(openApiPath: string): { postmanPath: string; pathVariables: string[] } {
  const pathVariables: string[] = []
  const postmanPath = openApiPath.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    pathVariables.push(name)
    return `:${name}`
  })
  return { postmanPath, pathVariables }
}

function buildRequestItem(rawPath: string, method: string, operation: OpenApiOperation) {
  const { postmanPath, pathVariables } = toPostmanPath(rawPath)
  const segments = postmanPath.split('/').filter(Boolean)

  const jsonSchema = operation.requestBody?.content?.['application/json']?.schema
  const example = exampleFromSchema(jsonSchema)

  const responseSummary = Object.entries(operation.responses ?? {})
    .map(([status, res]) => `${status} — ${res.description ?? ''}`)
    .join('\n')

  return {
    name: operation.summary ?? `${method.toUpperCase()} ${rawPath}`,
    request: {
      method: method.toUpperCase(),
      // None of the auth endpoints require a bearer token today — every one
      // is public by design (register/login/refresh/etc). The collection's
      // top-level `auth` still defines {{accessToken}} so Phase 3's
      // authenticated endpoints inherit it without redefinition.
      auth: { type: 'noauth' },
      header: example ? [{ key: 'Content-Type', value: 'application/json' }] : [],
      ...(example
        ? { body: { mode: 'raw', raw: JSON.stringify(example, null, 2), options: { raw: { language: 'json' } } } }
        : {}),
      url: {
        raw: `{{baseUrl}}${postmanPath}`,
        host: ['{{baseUrl}}'],
        path: segments,
        ...(pathVariables.length
          ? { variable: pathVariables.map((name) => ({ key: name, value: '' })) }
          : {}),
      },
      description: [operation.description, responseSummary].filter(Boolean).join('\n\n'),
    },
    response: [],
  }
}

function generate(): void {
  const spec = swaggerSpec as OpenApiSpec
  const paths = spec.paths ?? {}

  const itemsByTag = new Map<string, unknown[]>()
  for (const [rawPath, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const tag = operation.tags?.[0] ?? 'General'
      if (!itemsByTag.has(tag)) itemsByTag.set(tag, [])
      itemsByTag.get(tag)?.push(buildRequestItem(rawPath, method, operation))
    }
  }

  const collection = {
    info: {
      name: 'TaskFlow API',
      description:
        'Generated from the OpenAPI spec served at /api/docs.json — run `pnpm --filter @taskflow/api generate:postman` after changing an endpoint.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }],
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:3001/api/v1', type: 'string' },
      { key: 'accessToken', value: '', type: 'string' },
    ],
    item: Array.from(itemsByTag.entries()).map(([tag, items]) => ({ name: tag, item: items })),
  }

  const outPath = path.join(__dirname, '../../../postman_collection.json')
  fs.writeFileSync(outPath, `${JSON.stringify(collection, null, 2)}\n`)
  console.log(`Wrote ${outPath} (${paths ? Object.keys(paths).length : 0} paths)`)
}

generate()
