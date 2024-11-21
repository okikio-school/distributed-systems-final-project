import { createSignal, onMount } from "solid-js";
import { createWebSocketClient } from "../libs/client.ts";

export function Message() {
  const [client, setClient] = createSignal<ReturnType<typeof createWebSocketClient> | null>(null);
  onMount(() => {
    console.log('Message component mounted');
    const _client = createWebSocketClient({
      serverUrl: 'ws://localhost:3000/ws',
    })
    setClient(_client);
  });
  return (
    <div>
      <h1>Message</h1>
      <p>Message component</p>
    </div>
  );
}