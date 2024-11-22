import type { Setter } from 'solid-js';
import type { WebSocketType } from '@groovybytes/backend/main.ts';

import { createSignal } from 'solid-js';
import { hc } from 'hono/client';

import { unparse } from './utils';

interface WebSocketClientOptions {
  serverUrl: string;
  reconnectInterval?: number; // Time in ms to attempt reconnection
}

// Create a WebSocket instance with reconnect logic
function connect(opts: WebSocketClientOptions, setIsConnected: Setter<boolean>) {
  console.log({
    opts
  })
  const client = hc<typeof WebSocketType>(opts.serverUrl);
  const ws: WebSocket = client.ws.$ws(0);

  // WebSocket event listeners
  ws.addEventListener('open', () => {
    setIsConnected(true);
    console.log('WebSocket connected.');
  });

  ws.addEventListener('close', () => {
    setIsConnected(false);
    console.warn('WebSocket closed. Attempting to reconnect...');
    setTimeout(() => connect(opts, setIsConnected), opts.reconnectInterval);
  });

  ws.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return ws;
}

export function createWebSocketClient(options: WebSocketClientOptions) {
  const { serverUrl, reconnectInterval = 5000 } = options;

  // Solid.js signal to track WebSocket connection state
  const [isConnected, setIsConnected] = createSignal(false);

  const ws = "WebSocket" in globalThis ? connect({
    serverUrl,
    reconnectInterval,
  }, setIsConnected) : null;

  // Return utility functions for interacting with the WebSocket
  return {
    socket: ws,
    isConnected,
    async send(message: unknown) {
      if (isConnected()) {
        const data = await unparse(message);
        ws?.send(data);
      } else {
        console.warn('WebSocket is not connected. Message not sent.');
      }
    },
    close() {
      ws?.close();
    },
  };
}
