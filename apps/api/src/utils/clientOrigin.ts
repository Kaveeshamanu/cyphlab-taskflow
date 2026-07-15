import { env } from '../config/env'

// CLIENT_URL may be a comma-separated allowlist (see cors config in app.ts);
// links embedded in outbound emails always point at the first entry.
export function clientOrigin(): string {
  return env.CLIENT_URL.split(',')[0].trim()
}
