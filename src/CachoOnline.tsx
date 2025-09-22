// src/CachoOnline.tsx
import { useEffect, useMemo } from 'react';
import { useRoom } from './online/useRoom';
import GameBoard from './components/GameBoard';
import type { GameState, DiceValue } from './types';

// Import tolerante: default o named export
import * as GameHookMod from './hooks/useCachoGame';
const useCachoGameHook: any =
  (GameHookMod as any).default ?? (GameHookMod as any).useCachoGame;
if (!useCachoGameHook) {
  throw new Error(
    "No encontré el hook de juego. Expórtalo como 'export function useCachoGame()' o 'export default function useCachoGame()' en src/hooks/useCachoGame.ts"
  );
}

type Action =
  | { type: 'SET_DIRECTION'; payload: { direction: 'RIGHT' | 'LEFT' } }
  | { type: 'PLACE_BET'; payload: { quantity: number; face: DiceValue } }
  | { type: 'DOUBT' }
  | { type: 'SPOT_ON' }
  | { type: 'SALPICON' };

function getParams() {
  const sp = new URLSearchParams(location.search);
  return {
    room: sp.get('room') || 'demo',
    role: (sp.get('role') as 'host' | 'client') || 'host',
    p: sp.get('p') || '0',
  };
}

// Estado listo = tiene players[] y status definido
function isReadyState(s: any): s is GameState {
  return !!(s && Array.isArray(s.players) && s.players.length > 0 && typeof s.status !== 'undefined');
}

export default function CachoOnline() {
  const { room, role, p } = useMemo(getParams, []);
  const isHost = role === 'host';

  // ===== 1) HOOK DEL JUEGO (solo HOST) =====
  const {
    state: hostState,
    setDirection,
    placeBet,
    doubtBet,
    spotOnBet,
    salpicon,
  } = useCachoGameHook() as {
    state: GameState;
    setDirection: (dir: 'RIGHT' | 'LEFT') => void;
    placeBet: (q: number, f: DiceValue) => void;
    doubtBet: () => void;
    spotOnBet: () => void;
    salpicon: () => void;
  };

  // ===== 2) RED (Firestore) =====
  const net = useRoom({
    roomId: room,
    role,
    playerId: p,
    // Los clientes arrancan vacío; el host publicará el estado real
    initialState: {} as GameState,
  });

  // ===== 3) HOST publica SOLO si el estado está listo =====
  useEffect(() => {
    if (!isHost) return;
    if (!isReadyState(hostState)) return;
    net.publishState(hostState);
  }, [isHost, hostState, net]);

  // ===== 4) HOST procesa acciones de clientes =====
  useEffect(() => {
    if (!isHost) return;
    const unsub = net.subscribeActions((a) => {
      const act = a as unknown as Action;
      switch (act.type) {
        case 'SET_DIRECTION':
          setDirection?.(act.payload.direction);
          break;
        case 'PLACE_BET':
          placeBet?.(act.payload.quantity, act.payload.face);
          break;
        case 'DOUBT':
          doubtBet?.();
          break;
        case 'SPOT_ON':
          spotOnBet?.();
          break;
        case 'SALPICON':
          salpicon?.();
          break;
        default:
          break;
      }
      // El hook actualiza hostState; y el efecto de arriba lo republica cuando esté listo
    });
    return () => unsub();
  }, [isHost, setDirection, placeBet, doubtBet, spotOnBet, salpicon, net]);

  // ===== 5) Elegir estado a renderizar con guardas =====
  const effectiveStateHost = isHost && isReadyState(hostState) ? hostState : null;
  const effectiveStateClient = !isHost && isReadyState(net.state) ? (net.state as GameState) : null;
  const effectiveState = (effectiveStateHost || effectiveStateClient) as GameState | null;

  // Loader mientras no hay estado listo (especialmente en cliente al entrar)
  if (!effectiveState) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Conectando a la sala “{room}”…
        </div>
        <div style={{ opacity: 0.8 }}>
          {isHost ? 'Preparando el estado del juego…' : 'Esperando el estado inicial del host…'}
        </div>
      </div>
    );
  }

  // ===== 6) Handlers que GameBoard necesita =====
  const handlers = {
    onSetDirection: (direction: 'RIGHT' | 'LEFT') => {
      if (isHost) setDirection?.(direction);
      else net.sendAction({ type: 'SET_DIRECTION', payload: { direction } });
    },
    onPlaceBet: (quantity: number, face: DiceValue) => {
      if (isHost) placeBet?.(quantity, face);
      else net.sendAction({ type: 'PLACE_BET', payload: { quantity, face } });
    },
    onDoubtBet: () => {
      if (isHost) doubtBet?.();
      else net.sendAction({ type: 'DOUBT' });
    },
    onSpotOnBet: () => {
      if (isHost) spotOnBet?.();
      else net.sendAction({ type: 'SPOT_ON' });
    },
    onSalpicon: () => {
      if (isHost) salpicon?.();
      else net.sendAction({ type: 'SALPICON' });
    },
  };

  return (
    <GameBoard
      gameState={effectiveState}
      onSetDirection={handlers.onSetDirection}
      onPlaceBet={handlers.onPlaceBet}
      onDoubtBet={handlers.onDoubtBet}
      onSpotOnBet={handlers.onSpotOnBet}
      onSalpicon={handlers.onSalpicon}
    />
  );
}
