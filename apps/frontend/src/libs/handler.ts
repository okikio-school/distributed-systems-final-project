import { onIceCandidate, onTrack, peerConnection, remoteAudioRef, send, setName, setPeer, startStream } from "./operations.ts";
import { parse } from "./utils.ts";

/**
 * Handles incoming WebSocket messages and routes them based on their type.
 * @param event - The WebSocket message event.
 */
export async function onMessageListener(event: MessageEvent) {
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

export async function handleLogin(success: boolean, _name?: string) {
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

export function handleLeave() {
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