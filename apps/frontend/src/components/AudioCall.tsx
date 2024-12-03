import { onCleanup, onMount, createEffect, Show } from "solid-js";
import { createWebSocketClient } from "../libs/client.ts";

import {
  client,
  setClient,
  contactName,
  onErrorListener,
  peerConnection,
  send,
  setContactName,
  setLocalAudioRef,
  name,
  setName,
  setPeer,
  setRemoteAudioRef,
  startStream,
} from "../libs/operations.ts";
import { handleLeave, onMessageListener } from "../libs/handler.ts";

import { Login } from "./Login.tsx";

/**
 * Calls a specified user by sending a WebRTC offer.
 */
export async function callUser() {
  const _contactName = contactName();
  if (!_contactName || _contactName.trim().length <= 0) {
    console.log("Invalid contact name");
    return;
  }

  console.log({
    _contactName,
  });
  setPeer(_contactName);

  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log("Sending offer:", offer);

    await send({
      type: "offer",
      offer,
    });
  } catch (e) {
    console.error(e);
  }
}

function onDecline() {
  send({
    type: "leave",
  });
  handleLeave();
}

// On Login form submission
async function onSubmit(e: SubmitEvent) {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  if (!form) return;
  const formData = new FormData(form);
  const name = formData.get("name") as string;

  if (name.length > 0) {
    await send({
      type: "login",
      name,
    });
  }
}

export function AudioCall(props: { serverUrl?: string }) {
  onMount(() => {
    console.log("Message component mounted");

    setClient(
      createWebSocketClient({
        serverUrl: props.serverUrl ?? "http://localhost:8000", 
      })
    );
  });

  createEffect(() => {
    if (client()?.isConnected()) {
      const ws = client()!.socket;
      ws?.addEventListener("message", onMessageListener);
      ws?.addEventListener("error", onErrorListener);

      onCleanup(() => {
        ws?.removeEventListener("message", onMessageListener);
        ws?.removeEventListener("error", onErrorListener);
        ws?.close();
      });
    }
  });

  return (
    <div class="bg-gray-100 text-gray-800">
      <Show when={name() === null}>
        <Login onSubmit={onSubmit} />
      </Show>

      <header class="bg-blue-500 text-white py-4">
        <div class="container mx-auto text-center">
          <Show when={name() !== null}>
            <button
              class="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
              onClick={() => setName(null)}
            >
              Logout
            </button>
          </Show>
        </div>
      </header>

      <main class="flex flex-col gap-4 py-8 items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 text-white">
        <div class="text-center">
          <h1 class="text-3xl font-semibold mb-2">Welcome, {name()}</h1>
        </div>

        <div>
          <label for="email" class="block text-lg/6 font-medium text-gray-200">
            Who do you want to call?
          </label>
          <div class="mt-2">
            <input
              id="contact"
              name="contact"
              onChange={(e) => setContactName(e.target.value)}
              type="text"
              autocomplete="email"
              required
              class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6"
            />
          </div>
        </div>

        <div class="flex gap-2">
          <div class="text-left">
            Local audio:{" "}
            <audio ref={setLocalAudioRef} controls autoplay muted></audio>
          </div>

          <div class="text-left">
            Remote audio:{" "}
            <audio ref={setRemoteAudioRef} controls autoplay></audio>
          </div>
        </div>

        <div class="flex space-x-4 mt-10">
          <button
            class="flex items-center justify-center w-16 h-16 bg-red-500 rounded-full shadow-lg hover:bg-red-600 focus:outline-none"
            onClick={onDecline}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="w-8 h-8 text-white"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14L2 6m8 8l8-8M2 6h20"
              />
            </svg>
          </button>

          <button
            class="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full shadow-lg hover:bg-green-600 focus:outline-none"
            onClick={callUser}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="w-8 h-8 text-white"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 14L20 4M4 20l16-16"
              />
            </svg>
          </button>

          <button
            class="flex items-center justify-center px-4 py-2 bg-blue-500 rounded-full shadow-lg hover:bg-green-600 focus:outline-none"
            onClick={startStream}
          >
            Start Stream
          </button>
        </div>
      </main>
    </div>
  );
}
