import { createSignal, onCleanup, onMount, createEffect, Show } from "solid-js";
import { createWebSocketClient } from "../libs/client.ts";
import { parse, unparse, sendTo } from "@groovybytes/shared/utils.ts";
import { setConstantValue } from "typescript";

const client = createWebSocketClient({
  serverUrl: 'https://480d-192-197-54-31.ngrok-free.app/' // 'http://localhost:8000',
});

const [name, setName] = createSignal<string | null>(null);
const [peer, setPeer] = createSignal<string | null>(null);

const [localAudioRef, setLocalAudioRef] = createSignal<HTMLAudioElement | null>(null);
const [remoteAudioRef, setRemoteAudioRef] = createSignal<HTMLAudioElement | null>(null);

const [localStream, setLocalStream] = createSignal<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = createSignal<MediaStream | null>(null);

const [contactName, setContactName] = createSignal<string>("");

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.l.google.com:5349" },
    { urls: "stun:stun1.l.google.com:3478" },
    { urls: "stun:stun1.l.google.com:5349" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:5349" },
    { urls: "stun:stun3.l.google.com:3478" },
    { urls: "stun:stun3.l.google.com:5349" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:5349" }
  ],
  iceCandidatePoolSize: 10
}
const peerConnection = "RTCPeerConnection" in globalThis ? new RTCPeerConnection(servers) : null;

async function startStream() {
  const localAudioEl = localAudioRef()
  const remoteAudioEl = remoteAudioRef()
  if (!localAudioEl || !remoteAudioEl) {
    console.log("No audio elements");
    return;
  }

  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  const _localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
  const _remoteStream = new MediaStream();

  setLocalStream(_localStream);
  setRemoteStream(_remoteStream);

  _localStream.getAudioTracks().forEach(track => peerConnection.addTrack(track, _localStream));

  peerConnection.addEventListener('track', onTrack);
  peerConnection.addEventListener('icecandidate', onIceCandidate);

  localAudioEl.srcObject = _localStream;
  remoteAudioEl.srcObject = _remoteStream;

  console.log("Stream started");
}

async function callUser() {
  const _contactName = contactName();
  if (!_contactName) return;
  if (_contactName.trim().length <= 0) return;
  console.log({
    _contactName
  })
  setPeer(_contactName);


  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    console.log({
      offer
    })

    await send({
      type: "offer",
      offer,
    });
  } catch (e) { 
    console.error(e);
  }
}

async function send(message: { type?: string, name?: string, offer?: any, answer?: any, candidate?: any, success?: boolean, message?: string }) {
  let msg = message;
  const peerName = peer();
  if (peerName) msg.name = peerName;
  console.log({ msg })

  const data = await unparse(msg);
  await client.send(data);
}

async function onMessageListener(event: MessageEvent) {
  console.log('Message received:', event.data);

  const data = await parse(event.data) as
    { type: "login", success: false } |
    { type: "login", success: true, name: string } |
    { type: "offer", name: string, offer: RTCSessionDescriptionInit } |
    { type: "answer", name: string, answer: RTCSessionDescriptionInit } |
    { type: "candidate", name: string, candidate: RTCIceCandidate } |
    { type: "leave", name: string };

  switch (data.type) {
    case "login": {
      handleLogin(data.success, (data as { name: string }).name);
      break;
    }
    //when somebody wants to call us 
    case "offer": {
      handleOffer(data.offer, data.name);
      break;
    }
    case "answer": {
      handleAnswer(data.answer);
      break;
    }
    //when a remote peer sends an ice candidate to us 
    case "candidate": {
      handleCandidate(data.candidate);
      break;
    }
    case "leave": {
      handleLeave();
      break;
    }
    default: {
      break;
    }
  }
}

async function handleLogin(success: boolean, _name?: string) {
  if (!success) {
    alert('Oops...try a different username!');
  } else {
    if (!_name) return;
    if (_name.trim().length <= 0) return;
    setName(_name);

    await startStream();
  }
}

async function handleOffer(offer: RTCSessionDescriptionInit, name: string) {
  setPeer(name);
  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  await send({
    type: "answer",
    answer,
  });
}

async function handleAnswer(answer: RTCSessionDescriptionInit) {
  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate: RTCIceCandidate) {
  if (!peerConnection) {
    console.log("No peer connection");
    return;
  }

  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleLeave() {
  setPeer(null);

  const _remoteAudioRef = remoteAudioRef();
  if (_remoteAudioRef) {
    _remoteAudioRef.srcObject = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection.removeEventListener('track', onTrack);
    peerConnection.removeEventListener('icecandidate', onIceCandidate);
  }
}

function onTrack(event: RTCTrackEvent) {
  const _remoteStream = remoteStream();
  if (!_remoteStream) {
    console.log("No remote stream");
    return;
  }
  event.streams[0].getTracks().forEach(track => _remoteStream.addTrack(track));
}

async function onIceCandidate(event: RTCPeerConnectionIceEvent) {
  if (event.candidate) {
    await send({
      type: "candidate",
      candidate: event.candidate.toJSON(),
    });
  }
}

function onErrorListener(err: Event) {
  console.error('Error:', err);
}

function onDecline() {
  send({
    type: "leave",
  });
  handleLeave();
}

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
    })
  }

}

export function Contacts() {
  onMount(() => {
    console.log('Message component mounted');

    // const name = localStorage.getItem('username');
    // setName(name);
  });

  createEffect(() => {

    if (client.isConnected()) {
      const ws = client.socket;
      ws?.addEventListener('message', onMessageListener);
      ws?.addEventListener('error', onErrorListener);

      onCleanup(() => {
        ws?.removeEventListener('message', onMessageListener);
        ws?.removeEventListener('error', onErrorListener);
        ws?.close();
      });
    }
  });

  // createEffect(() => {
  //   const _name = name();
  //   if (_name) {
  //     if (_name.trim().length > 0) {
  //       localStorage.setItem('username', _name);
  //     }
  //   } else {
  //     localStorage.removeItem('username');
  //   }
  // });

  return (
    <div class="bg-gray-100 text-gray-800">
      <Show when={name() === null}>
        <Login client={client} />
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
          <label for="email" class="block text-lg/6 font-medium text-gray-200">Who do you want to call?</label>
          <div class="mt-2">
            <input id="contact" name="contact" onChange={e => setContactName(e.target.value)} type="text" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6" />
          </div>
        </div>


        <div class="flex gap-2">

          <div class="text-left">
            Local audio: <audio ref={setLocalAudioRef} controls autoplay muted></audio>
          </div>

          <div class="text-left">
            Remote audio: <audio ref={setRemoteAudioRef} controls autoplay></audio>
          </div>

        </div>

        <div class="flex space-x-4 mt-10">
          <button
            class="flex items-center justify-center w-16 h-16 bg-red-500 rounded-full shadow-lg hover:bg-red-600 focus:outline-none"
            onClick={onDecline}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-8 h-8 text-white">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14L2 6m8 8l8-8M2 6h20" />
            </svg>
          </button>

          <button
            class="flex items-center justify-center w-16 h-16 bg-green-500 rounded-full shadow-lg hover:bg-green-600 focus:outline-none"
            onClick={callUser}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-8 h-8 text-white">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14L20 4M4 20l16-16" />
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


export function Login(props: { client: ReturnType<typeof createWebSocketClient> }) {
  return (
    <div class="flex flex-col justify-center py-4 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-3 text-center text-2xl/9 font-semibold tracking-tight text-gray-600">Choose Username</h2>
      </div>

      <div class="mt-2 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div class="bg-white px-6 py-4 shadow sm:rounded-lg sm:px-6">
          <form class="space-y-3" action="/call" method="post" onSubmit={onSubmit}>
            <div>
              <label for="email" class="block text-sm/6 font-medium text-gray-900">Username</label>
              <div class="mt-2">
                <input id="name" name="name" type="text" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6" />
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                <label for="remember-me" class="ml-3 block text-sm/6 text-gray-900">Remember me</label>
              </div>
            </div>

            <div>
              <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign in</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}