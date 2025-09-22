// src/CachoOnline.tsx
import { useEffect, useMemo } from 'react';
import { useRoom } from './online/useRoom';
import GameBoard from './components/GameBoard';
import type { GameState, DiceValue } from './types';

// Import tolerante: funciona si el hook está exportado como default o nombrado
import * as GameHookMod from './hooks/useCachoGame';
const useCachoGameHook: any =
  (GameHookMod as any).default ?? (GameHookMod as any).useCachoGame;
if (!useCachoGameHook) {
  throw new Error(
    "No encontré el hook de juego. Asegúrate de exportarlo como 'export function useCachoGame()' o 'export default function useCachoGame()' en src/hooks/useCachoGame.ts"
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

export default function CachoOnline() {
  const { room, role, p } = useMemo(getParams, []);
  const isHost = role === 'host';

  // ===== 1) HOOK DEL JUEGO (solo lo usa el HOST) =====
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
    initialState: {} as GameState,
  });

  // ===== 3) HOST publica el estado =====
  useEffect(() => {
    if (!isHost) return;
    if (!hostState) return;
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
      // El hook actualiza hostState y el efecto de arriba lo publica
    });
    return () => unsub();
  }, [isHost, setDirection, placeBet, doubtBet, spotOnBet, salpicon, net]);

  // ===== 5) CLIENTE: usa estado remoto y envía acciones =====
  const clientState = (net.state as GameState) || ({} as GameState);

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

  const gameStateForBoard = isHost ? hostState : clientState;

  if (!gameStateForBoard) {
    return <div style={{ padding: 24 }}>Cargando estado de la partida…</div>;
  }

  return (
    <GameBoard
      gameState={gameStateForBoard}
      onSetDirection={handlers.onSetDirection}
      onPlaceBet={handlers.onPlaceBet}
      onDoubtBet={handlers.onDoubtBet}
      onSpotOnBet={handlers.onSpotOnBet}
      onSalpicon={handlers.onSalpicon}
    />
  );
}
