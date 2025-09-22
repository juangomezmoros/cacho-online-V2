// src/CachoOnline.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRoom } from './online/useRoom';
import GameBoard from './components/GameBoard';
import type { GameState, DiceValue } from './types';

// ⬇️ Import tolerante: sirve si exportaste default o named
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
  const game = useCachoGameHook() as {
    state: GameState;
    setDirection?: (dir: 'RIGHT' | 'LEFT') => void;
    placeBet?: (q: number, f: DiceValue) => void;
    doubtBet?: () => void;
    spotOnBet?: () => void;
    salpicon?: () => void;
    // posibles inicializadores (no sabemos el nombre exacto)
    startGame?: (players: number, bots?: number) => void;
    newGame?: (players: number, bots?: number) => void;
    initGame?: (players: number, bots?: number) => void;
    createGame?: (players: number, bots?: number) => void;
  };

  const {
    state: hostState,
    setDirection,
    placeBet,
    doubtBet,
    spotOnBet,
    salpicon,
  } = game;

  // ===== 2) RED (Firestore) =====
  const net = useRoom({
    roomId: room,
    role,
    playerId: p,
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
      // Cuando el hook actualice, la publicación ocurre arriba si está listo
    });
    return () => unsub();
  }, [isHost, setDirection, placeBet, doubtBet, spotOnBet, salpicon, net]);

  // ===== 5) Si el host aún no tiene estado listo, mostrar SETUP RÁPIDO =====
  if (isHost && !isReadyState(hostState)) {
    return <HostSetup room={room} game={game} />;
  }

  // ===== 6) CLIENTE: espera estado listo =====
  const effectiveState: GameState | null = isHost
    ? (isReadyState(hostState) ? hostState : null)
    : (isReadyState(net.state) ? (net.state as GameState) : null);

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

  // ===== 7) Handlers para GameBoard =====
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

/** Panel minimal para que el HOST inicie la partida y publique estado */
function HostSetup({
  room,
  game,
}: {
  room: string;
  game: any;
}) {
  const [players, setPlayers] = useState(2);
  const [bots, setBots] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  function tryStart() {
    setMsg(null);
    const fns = ['startGame', 'newGame', 'initGame', 'createGame'] as const;
    const found = fns.find((k) => typeof game?.[k] === 'function');
    if (!found) {
      setMsg(
        "No encontré una función para iniciar (startGame/newGame/initGame/createGame). Si me pasas las primeras líneas de src/hooks/useCachoGame.ts te lo adapto en 1 minuto."
      );
      return;
    }
    try {
      // @ts-expect-error dinámico
      game[found](players, bots);
      setMsg(`Iniciando con ${players} jugadores (${bots} bots)…`);
    } catch (e: any) {
      setMsg(`Error al iniciar: ${e?.message || e}`);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560, margin: '40px auto' }}>
      <div style={{ marginBottom: 8, fontWeight: 800, fontSize: 18 }}>
        Sala: “{room}”
      </div>
      <div style={{ marginBottom: 12 }}>Configura la partida y pulsa <b>Iniciar</b>.</div>

      <label style={{ display: 'block', margin: '8px 0 4px' }}>Número de jugadores</label>
      <input
        type="number"
        min={2}
        max={6}
        value={players}
        onChange={(e) => setPlayers(parseInt(e.target.value || '2', 10))}
        style={{ padding: 8, width: 120 }}
      />

      <label style={{ display: 'block', margin: '12px 0 4px' }}>Bots</label>
      <input
        type="number"
        min={0}
        max={4}
        value={bots}
        onChange={(e) => setBots(parseInt(e.target.value || '0', 10))}
        style={{ padding: 8, width: 120 }}
      />

      <div>
        <button
          onClick={tryStart}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #888',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Iniciar
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 12, color: '#444' }}>
          {msg}
        </div>
      )}
    </div>
  );
}
