import type { Setter } from 'solid-js';
import type { WebSocketType } from 'backend/main.ts';

import { createSignal } from 'solid-js';
import { hc } from 'hono/client';

interface WebSocketClientOptions {
  serverUrl: string;
  reconnectInterval?: number; // Time in ms to attempt reconnection
}

// Create a WebSocket instance with reconnect logic
function connect(opts: WebSocketClientOptions, setIsConnected: Setter<boolean>) {
  const client = hc<typeof WebSocketType>(opts.serverUrl);
  const ws = client.ws.$ws(0);

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

  const ws = connect({
    serverUrl,
    reconnectInterval,
  }, setIsConnected);

  // Return utility functions for interacting with the WebSocket
  return {
    get isConnected() {
      return isConnected();
    },
    send(data: string | ArrayBuffer | Blob) {
      if (isConnected()) {
        ws.send(data);
      } else {
        console.warn('WebSocket is not connected. Message not sent.');
      }
    },
    close() {
      ws.close();
    },
  };
}
