import type { WSContext } from "hono/ws";

import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/deno'
import { parse, sendTo } from "shared";

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})


//all connected to the server users 
const users = new Map<string, WSContext<WebSocket>>();
const sockets = new WeakMap<WSContext<WebSocket>, string>();

const connections = new Map<string, string>();

export const WebSocketType = app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onOpen: (evt, ws) => {
        console.log('Connection opened')
        ws.send('Hello from server!')
      },
      async onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`)
        ws.send('Hello from server!')

        const data = await parse(event.data) as
          { type: "login", name: string } |
          { type: "offer", name: string, offer: RTCSessionDescriptionInit } |
          { type: "answer", name: string, answer: RTCSessionDescriptionInit } |
          { type: "candidate", name: string, candidate: RTCIceCandidate } |
          { type: "leave", name: string };

        //switching type of the user message 
        switch (data.type) {
          //when a user tries to login 
          case "login": {
            console.log("User logged:", data.name);

            //if anyone is logged in with this username then refuse 
            if (users.has(data.name)) {
              sendTo(ws, {
                type: "login",
                success: false
              });
            } else {
              //save user connection on the server 
              users.set(data.name, ws);
              sockets.set(ws, data.name);

              sendTo(ws, {
                type: "login",
                success: true
              });
            }

            break;
          }

          case "offer": {
            //for ex. UserA wants to call UserB 
            console.log("Sending offer to: ", data.name);

            //if UserB exists then send him offer details 
            const user = sockets.get(ws);
            const peer = users.get(data.name);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof user === 'string' && user.length > 0)
            ) {
              //setting that UserA connected with UserB 
              // connections.set(data.name, user);
              connections.set(user, data.name);

              sendTo(peer, {
                type: "offer",
                offer: data.offer,
                name: user
              });
            }

            break;
          }

          case "answer": {
            console.log("Sending answer to: ", data.name);
            //for ex. UserB answers UserA
            // const conn = users[data.name];
            const user = sockets.get(ws);
            const peer = users.get(data.name);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof user === 'string' && user.length > 0)
            ) {
              connections.set(user, data.name);

              sendTo(peer, {
                type: "answer",
                answer: data.answer
              });
            }

            break;
          }

          case "candidate": {
            console.log("Sending candidate to:", data.name);
            // var conn = users[data.name];
            const user = sockets.get(ws);
            const peer = users.get(data.name);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof user === 'string' && user.length > 0)
            ) {
              sendTo(peer, {
                type: "candidate",
                candidate: data.candidate
              });
            }

            break;
          }

          case "leave": {
            console.log("Disconnecting from", data.name);
            // var conn = users[data.name];
            const user = sockets.get(ws);
            const peer = users.get(data.name);

            if (typeof user === 'string' && user.length > 0)
              connections.delete(user);

            //notify the other user so he can disconnect his peer connection 
            if (
              (peer != null && peer !== undefined && peer != ws)) {
              sendTo(peer, {
                type: "leave"
              });
            }

            break;
          }

          default: {
            sendTo(ws, {
              type: "error",
              message: "Command no found: " + (data as { type: string })?.type
            });

            break;
          }
        }
      },
      onClose: (evt, ws) => {
        console.log('Connection closed')

        const user1 = sockets.get(ws)
        if (user1) {
          users.delete(user1)
          sockets.delete(ws)


          const user2 = connections.get(user1);
          if (user2) {
            console.log("Disconnecting from ", user2);

            const peer = users.get(user2);
            connections.delete(user2);

            if (peer != null) {
              sendTo(peer, {
                type: "leave"
              });
            }

          }
        }
      },
    }
  })
)

Deno.serve(app.fetch)
