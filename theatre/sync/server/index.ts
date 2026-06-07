/**
 * Theatre WebSocket sync relay server.
 *
 * Broadcasts every incoming message to all OTHER connected clients.
 * No business logic — role filtering happens in the browser clients.
 *
 * Usage — run from the repo root (tsx is already in node_modules/.bin):
 *   npx tsx theatre/sync/server/index.ts
 *   PORT=9000 npx tsx theatre/sync/server/index.ts
 */

import {WebSocketServer, WebSocket} from 'ws'

interface ConnectedUser {
  userID: string
  socket: WebSocket
}

const PORT = Number(process.env['PORT'] ?? 8080)
const users = new Map<string, ConnectedUser>()
const server = new WebSocketServer({port: PORT})
let totalUsers = 0

function createUser(ws: WebSocket): ConnectedUser {
  const userID = `user_${totalUsers++}`
  const user: ConnectedUser = {userID, socket: ws}
  users.set(userID, user)
  console.log(`[sync] Connected:    ${userID} | total: ${users.size}`)
  return user
}

server.on('connection', (ws: WebSocket) => {
  const user = createUser(ws)

  ws.on('message', (raw: Buffer) => {
    const data = raw.toString()
    users.forEach((other) => {
      if (
        other.userID !== user.userID &&
        other.socket.readyState === WebSocket.OPEN
      ) {
        other.socket.send(data)
      }
    })
  })

  ws.on('close', () => {
    users.delete(user.userID)
    console.log(
      `[sync] Disconnected: ${user.userID} | remaining: ${users.size}`,
    )
  })

  ws.on('error', (err) => {
    console.error(`[sync] Socket error for ${user.userID}:`, err.message)
  })
})

server.on('error', (err) => {
  console.error('[sync] Server error:', err)
})

console.log(`[sync] Relay server listening on ws://localhost:${PORT}`)
