# Feature Report

> This file is a Phase 6 deliverable (full table: Feature | Required/Extra | Status | Notes,
> mapping every graded criterion). Started early here to record one note before it's lost —
> Phase 6 will expand this into the complete table.

## API documentation

OpenAPI 3.0 spec served at `/api/docs.json`; Postman collection provided at
`postman_collection.json` (repo root), generated from the same spec via
`pnpm --filter @taskflow/api generate:postman`. Swagger UI's HTML renderer
(`/api/docs`) has an asset-loading issue in Safari — the spec itself is complete and
importable into any OpenAPI client (Postman, Insomnia, VS Code REST client, etc.).
