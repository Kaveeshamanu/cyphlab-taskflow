import type { Server as HttpServer } from 'node:http'
import { Server as SocketIOServer } from 'socket.io'
import { JwtPayload } from '@taskflow/types'
import { verifyAccessToken } from '../utils/jwt'
import { env } from '../config/env'

// Server-side only (per PLAN.md): NotificationService emits events here so a
// second browser tab / device sees new notifications live, but there is no
// frontend socket client in this phase. Kept as its own module (rather than
// inline in server.ts) so notifications.service.ts can import emitToUser
// without depending on the HTTP listen entrypoint.
let io: SocketIOServer | null = null

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim())

  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  })

  // Auth handshake mirrors requireAuth: the same short-lived access token
  // used for REST calls, verified once at connect time. No refresh-on-socket
  // — a client whose access token expires simply reconnects after its next
  // silent HTTP refresh.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      next(new Error('Authentication required'))
      return
    }
    try {
      const payload = verifyAccessToken(token) as JwtPayload
      socket.data.userId = payload.sub
      next()
    } catch {
      next(new Error('Invalid or expired access token'))
    }
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string
    // Per-user room, not per-socket — a user with multiple tabs/devices gets
    // the event on all of them without the emitter needing to track sockets.
    void socket.join(`user:${userId}`)
  })

  return io
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload)
}
