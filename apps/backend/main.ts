/// <reference lib="dom" />
import type { WSContext } from "hono/ws";

import { Hono } from 'hono'
import { upgradeWebSocket } from 'hono/deno'
import { parse, sendTo } from "@groovybytes/shared";

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})


//all connected to the server users 
const devices = new Map<string, WSContext<WebSocket>>();
const socketDevice = new WeakMap<WSContext<WebSocket>, string>();

const userDevices = new Map<string, Set<string>>();
const deviceUser = new Map<string, string>();

const activeDevice = new Map<string, string>();
const connections = new Map<string, string>(); 

export const WebSocketType = app.get(
  '/ws',
  upgradeWebSocket((c) => {
    return {
      onOpen(evt, ws) {
        console.log('Connection opened')
      },
      async onMessage(event, ws) {
        console.log(`Message from client: ${event.data}`)

        const data = await parse(event.data) as
          { type: "login", name: string, device: string } |
          { type: "transfer", name: string, device: string } |
          { type: "offer", name: string, device: string, offer: RTCSessionDescriptionInit } |
          { type: "answer", name: string, device: string, answer: RTCSessionDescriptionInit } |
          { type: "candidate", name: string, device: string, candidate: RTCIceCandidate } |
          { type: "leave", name: string, device: string };

        //switching type of the user message 
        switch (data.type) {
          //when a user tries to login 
          case "login": {
            console.log("User trying to login:", data.name);
            console.log("Users:", userDevices);

            //if anyone is logged in with this username then refuse 
            if (userDevices.get(data.name)?.has(data.device) && deviceUser.get(data.device) === data.name && devices.has(data.device)) {
              console.log('User already logged in:', data.name)
              await sendTo(ws, {
                type: "login",
                success: false
              });
            } else {
              console.log('User not logged in: ', data.name + ", Device: " + data.device);
              //save user connection on the server 
              devices.set(data.device, ws);
              socketDevice.set(ws, data.device);

              deviceUser.set(data.device, data.name);
              if (!userDevices.has(data.name)) {
                userDevices.set(data.name, new Set([data.device]));
                activeDevice.set(data.name, data.device);
              } else { 
                userDevices.get(data.name)?.add(data.device);
              }

              await sendTo(ws, {
                type: "login",
                success: true,
                name: data.name,
                device: data.device
              });
            }

            break;
          }

          case "transfer": {
            const oldActiveDevice = activeDevice.get(data.name);
            activeDevice.set(data.name, data.device);

            await sendTo(ws, {
              type: "transfer",
              success: true,
            });

            await sendTo(oldActiveDevice, {
              type: "transfer",
              success: false,
              device: data.device
            })
            break;
          }

          case "offer": {
            //for ex. UserA wants to call UserB 

            //if UserB exists then send him offer details 
            const deviceName = socketDevice.get(ws)!;
            const userName = deviceUser.get(deviceName)!;
            const peer = devices.get(data.device);

            console.log("Sending offer from: ", userName);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof deviceName === 'string' && deviceName.length > 0)
            ) {
              //setting that UserA connected with UserB 
              // connections.set(data.name, user);
              connections.set(data.name, userName);

              await sendTo(peer, {
                type: "offer",
                offer: data.offer,
                name: userName,
                device: deviceName
              });
            }

            break;
          }

          case "answer": {
            console.log("Sending answer to: ", data.name);
            //for ex. UserB answers UserA
            // const conn = users[data.name];
            const deviceName = socketDevice.get(ws)!;
            const userName = deviceUser.get(deviceName)!;
            const peer = devices.get(data.device);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof deviceName === 'string' && deviceName.length > 0)
            ) {
              connections.set(userName, data.name);

              await sendTo(peer, {
                type: "answer",
                answer: data.answer,
                device: deviceName
              });
            }

            break;
          }

          case "candidate": {
            console.log("Sending candidate to:", data.name);
            // var conn = users[data.name];
            // const user = socketDevice.get(ws);
            // const peer = devices.get(data.name);
            const deviceName = socketDevice.get(ws)!;
            const userName = deviceUser.get(deviceName)!;
            const peer = devices.get(data.device);

            if (
              (peer != null && peer !== undefined && peer != ws) &&
              (typeof deviceName === 'string' && deviceName.length > 0)
            ) {
              await sendTo(peer, {
                type: "candidate",
                candidate: data.candidate
              });
            }

            break;
          }

          case "leave": {
            console.log("Disconnecting from", data.name);
            // var conn = users[data.name];
            const user = socketDevice.get(ws);
            const peer = devices.get(data.name);

            if (typeof user === 'string' && user.length > 0)
              connections.delete(user);

            //notify the other user so he can disconnect his peer connection 
            if (
              (peer != null && peer !== undefined && peer != ws)) {
              await sendTo(peer, {
                type: "leave"
              });
            }

            break;
          }

          default: {
            await sendTo(ws, {
              type: "error",
              message: "Command not found: " + (data as { type: string })?.type
            });

            break;
          }
        }
      },
      async onClose(evt, ws) {
        console.log('Connection closed')

        const user1 = socketDevice.get(ws)
        if (user1) {
          devices.delete(user1)
          socketDevice.delete(ws)


          const user2 = connections.get(user1);
          if (user2) {
            console.log("Disconnecting from ", user2);

            const peer = devices.get(user2);
            connections.delete(user2);

            if (peer != null) {
              await sendTo(peer, {
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
