import { createServer } from 'node:http'
import { createApp } from './app'
import { env } from './config/env'
import { initSocketServer } from './socket/socket.server'

const app = createApp()
const httpServer = createServer(app)
initSocketServer(httpServer)

httpServer.listen(env.PORT, () => {
  console.log(`🚀 API listening on port ${env.PORT} [${env.NODE_ENV}]`)
})
