import type { Socket } from 'socket.io-client';

import { getSocketUrl } from '@/config/env';
import { getAccessToken } from '@/lib/storage';
import { ClientSocketEvents } from '@/lib/socketEvents';

type IoFactory = (
  url: string,
  opts?: Record<string, unknown>,
) => Socket;

function getIoFactory(): IoFactory {
  // UMD bundle: module.exports is the io function (not .default)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('socket.io-client/dist/socket.io.js');
  const io = (typeof mod === 'function' ? mod : mod?.io ?? mod?.default) as IoFactory;
  if (typeof io !== 'function') {
    throw new Error('socket.io-client failed to load');
  }
  return io;
}

let socket: Socket | null = null;
let connectPromise: Promise<Socket> | null = null;

export function getSocketInstance(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  if (connectPromise) return connectPromise;

  connectPromise = (async () => {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');
    const io = getIoFactory();

    if (socket) {
      const existing = socket;
      existing.auth = { token };
      if (!existing.connected) {
        await new Promise<void>((resolve, reject) => {
          const onConnect = () => {
            existing.off('connect_error', onError);
            resolve();
          };
          const onError = (err: Error) => {
            existing.off('connect', onConnect);
            reject(err);
          };
          existing.once('connect', onConnect);
          existing.once('connect_error', onError);
          existing.connect();
        });
      }
      return existing;
    }

    socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
    });

    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        socket?.off('connect_error', onError);
        resolve();
      };
      const onError = (err: Error) => {
        socket?.off('connect', onConnect);
        reject(err);
      };
      socket?.once('connect', onConnect);
      socket?.once('connect_error', onError);
    });

    return socket;
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

export async function joinOrderRoom(orderId: string): Promise<void> {
  const s = await connectSocket();
  await new Promise<void>((resolve) => {
    const onJoined = (payload: { orderId?: string }) => {
      if (payload?.orderId === orderId) {
        s.off('joined_order', onJoined);
        resolve();
      }
    };
    s.on('joined_order', onJoined);
    s.emit(ClientSocketEvents.JOIN_ORDER, { orderId });
    setTimeout(() => {
      s.off('joined_order', onJoined);
      resolve();
    }, 3000);
  });
}

export function leaveOrderRoom(orderId: string) {
  socket?.emit(ClientSocketEvents.LEAVE_ORDER, { orderId });
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
