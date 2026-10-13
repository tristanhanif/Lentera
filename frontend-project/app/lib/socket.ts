import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_BACKEND || 'http://localhost:8700';

let likeSocket: Socket | null = null;
let notifSocket: Socket | null = null;
let chatSocket: Socket | null = null;

export const getLikeSocket = (): Socket => {
  if (!likeSocket) {
    likeSocket = io(`${BASE_URL}/like`, {
      transports: ['websocket', 'polling'],
      auth: {
        token: Cookies.get('access_token'),
      },
    });
  }
  return likeSocket;
};

export const getNotifSocket = (): Socket => {
  if (!notifSocket) {
    notifSocket = io(`${BASE_URL}/notification`, {
      transports: ['websocket', 'polling'],
      auth: {
        token: Cookies.get('access_token'),
      },
    });
  }
  return notifSocket;
};

export const getSocket = getLikeSocket;

export const getChatSocket = (): Socket => {
  if (!chatSocket) {
    chatSocket = io(`${BASE_URL}/chat`, {
      transports: ['websocket', 'polling'],
      auth: {
        token: Cookies.get('access_token'),
      },
    });
  }
  return chatSocket;
};

export const disconnectSocket = () => {
  if (likeSocket) {
    likeSocket.disconnect();
    likeSocket = null;
  }
  if (notifSocket) {
    notifSocket.disconnect();
    notifSocket = null;
  }
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
};
