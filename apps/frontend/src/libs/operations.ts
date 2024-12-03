import { createSignal } from "solid-js";
import { createWebSocketClient } from "./client.ts";
import { unparse } from "./utils.ts";

export const [client, setClient] = createSignal<ReturnType<typeof createWebSocketClient> | null>(null);

// Signals for managing state
export const [name, setName] = createSignal<string | null>(null); // Tracks the username of the current user
export const [peer, setPeer] = createSignal<string | null>(null); // Tracks the name of the peer being contacted

// Audio element references
export const [localAudioRef, setLocalAudioRef] = createSignal<HTMLAudioElement | null>(null);
export const [remoteAudioRef, setRemoteAudioRef] = createSignal<HTMLAudioElement | null>(null);

// Media streams for local and remote audio
export const [localStream, setLocalStream] = createSignal<MediaStream | null>(null);
export const [remoteStream, setRemoteStream] = createSignal<MediaStream | null>(null);

export const [contactName, setContactName] = createSignal<string>("");  // Tracks the contact name entered by the user

// ICE server configuration for WebRTC
export const servers = {
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

// Initialize the WebRTC PeerConnection
export const peerConnection = "RTCPeerConnection" in globalThis ? new RTCPeerConnection(servers) : null;

/**
 * Sends a message to the peer via the WebSocket connection.
 * @param message - The message object to be sent.
 */
export async function send(message: { type?: string, name?: string, offer?: any, answer?: any, candidate?: any, success?: boolean, message?: string }) {
  let msg = message;
  const peerName = peer();
  if (peerName) msg.name = peerName;
  console.log({ msg })

  const data = await unparse(msg);
  await client()?.send(data);
}

/**
 * Starts the local audio stream and sets up the peer connection for WebRTC communication.
 */
export async function startStream() {
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

  // Request access to the user's microphone
  const _localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
  const _remoteStream = new MediaStream();

  setLocalStream(_localStream);
  setRemoteStream(_remoteStream);

  // Add audio tracks to the peer connection
  _localStream.getAudioTracks().forEach(track => peerConnection.addTrack(track, _localStream));

  peerConnection.addEventListener('track', onTrack);
  peerConnection.addEventListener('icecandidate', onIceCandidate);

  // Bind audio streams to audio elements
  localAudioEl.srcObject = _localStream;
  remoteAudioEl.srcObject = _remoteStream;

  console.log("Stream started");
}


export function onTrack(event: RTCTrackEvent) {
  const _remoteStream = remoteStream();
  if (!_remoteStream) {
    console.log("No remote stream");
    return;
  }
  event.streams[0].getTracks().forEach(track => _remoteStream.addTrack(track));
}

export async function onIceCandidate(event: RTCPeerConnectionIceEvent) {
  if (event.candidate) {
    await send({
      type: "candidate",
      candidate: event.candidate.toJSON(),
    });
  }
}

export function onErrorListener(err: Event) {
  console.error('Error:', err);
}