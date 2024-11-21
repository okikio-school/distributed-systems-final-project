import type { SendOptions, WSContext, WSMessageReceive } from "hono/ws";

export async function parse<T extends Record<PropertyKey, unknown>>(message: WSMessageReceive): Promise<T | {}> {
  try {
    let data = message;

    if (ArrayBuffer.isView(message)) data = new TextDecoder().decode(message);
    else if (message instanceof Blob) data = await message.text();

    return JSON.parse(data as string);
  } catch (e) {
    console.error('Invalid JSON:', message);
    return {};
  }
}

export async function unparse(message: unknown) {
  let data = message;

  if (ArrayBuffer.isView(message)) data = message;
  else if (message instanceof Blob) data = await message.arrayBuffer();
  else if (typeof message === 'object') data = JSON.stringify(message);

  return data as string | ArrayBuffer | Uint8Array;
}

export async function sendTo(connection: WSContext<WebSocket>, message: unknown, opts?: SendOptions) {
  const data = await unparse(message);
  return connection.send(data, opts);
}