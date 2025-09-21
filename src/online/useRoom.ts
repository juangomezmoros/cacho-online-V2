// src/online/useRoom.ts
// Sincronización simple de sala usando Firestore.
// El host es la autoridad: publica el estado; los clientes envían acciones.

import { useEffect, useState } from 'react';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export type Role = 'host' | 'client';

export type NetAction = {
  type: string;
  payload?: any | null;     // Usamos null en lugar de undefined
  playerId?: string | number | null;
  ts?: any;                 // Firestore timestamp
  id?: string;              // doc id
};

export type UseRoomOptions = {
  roomId: string;
  role: Role;
  playerId?: string | number;
  initialState?: any;       // estado inicial cuando el host crea la sala
};

export type UseRoomReturn = {
  state: any;
  publishState: (next: any) => Promise<void>; // host
  sendAction: (a: NetAction | { type: string; payload?: any | null }) => Promise<void>;
  subscribeActions: (handler: (a: NetAction) => void) => () => void;
  isHost: boolean;
  isConnected: boolean;
  lastError?: string;
};

export function useRoom(opts: UseRoomOptions): UseRoomReturn {
  const { roomId, role, playerId } = opts;
  const [state, setState] = useState<any>(null);
  const [isConnected, setConnected] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>(undefined);

  const actionsColRef = collection(db, 'rooms', roomId, 'actions');
  const stateDocRef = doc(db, 'rooms', roomId);

  // Cargar/subscribirse al estado de la sala
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      try {
        if (role === 'host') {
          const snap = await getDoc(stateDocRef);
          if (!snap.exists()) {
            await setDoc(
              stateDocRef,
              {
                state: opts.initialState ?? null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        }

        unsub = onSnapshot(
          stateDocRef,
          (s) => {
            if (s.exists()) {
              const data = s.data();
              setState(data?.state ?? null);
              setConnected(true);
            } else {
              setState(null);
            }
          },
          (err) => setLastError(String(err))
        );
      } catch (e: any) {
        setLastError(String(e));
      }
    })();

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, role]);

  // Host publica el estado autorizado
  async function publishState(next: any) {
    if (role !== 'host') return;
    await setDoc(
      stateDocRef,
      { state: next, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  // Cualquier jugador puede enviar una acción (host la procesa)
  async function sendAction(a: NetAction | { type: string; payload?: any | null }) {
    // Forzar valores válidos: nada de undefined en Firestore
    const safePayload = (a as any).payload === undefined ? null : (a as any).payload;
    const safePlayer = playerId === undefined ? null : playerId;

    const action: NetAction = {
      type: a.type,
      payload: safePayload,
      playerId: safePlayer,
      ts: serverTimestamp(),
    };
    await addDoc(actionsColRef, action as any);
  }

  // Host consume acciones (realtime). Sin orderBy para evitar problemas con serverTimestamp.
  function subscribeActions(handler: (a: NetAction) => void) {
    const unsub = onSnapshot(
      actionsColRef,
      async (snap) => {
        for (const ch of snap.docChanges()) {
          if (ch.type === 'added') {
            const d = ch.doc;
            const data = d.data() as NetAction;
            handler({ ...data, id: d.id });

            if (role === 'host') {
              try {
                await deleteDoc(d.ref);
              } catch {
                // noop
              }
            }
          }
        }
      },
      (err) => setLastError(String(err))
    );
    return unsub;
  }

  return {
    state,
    publishState,
    sendAction,
    subscribeActions,
    isHost: role === 'host',
    isConnected,
    lastError,
  };
}
