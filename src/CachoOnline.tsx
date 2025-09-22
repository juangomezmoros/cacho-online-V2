// src/CachoOnline.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRoom } from './online/useRoom';
import GameBoard from './components/GameBoard';
import type { GameState, DiceValue } from './types';

// =====================
// Hook del juego (import tolerante: default o named)
// =====================
import * as GameHookMod from './hooks/useCachoGame';
const useCachoGameHook: any =
  (GameHookMod as any).default ?? (GameHookMod as any).useCachoGame;
if (!useCachoGameHook) {
  throw new Error(
    "No encontré el hook de juego. Expórtalo como 'export function useCachoGame()' o 'export default function useCachoGame()' en src/hooks/useCachoGame.ts"
  );
}

// =====================
// Tipos de acciones que los clientes envían al host
// =====================
type Action =
  | { type: 'SET_DIRECTION'; payload: { direction: 'RIGHT' | 'LEFT' } }
  | { type: 'PLACE_BET'; payload: { quantity: number; face: DiceValue } }
  | { type: 'DOUBT' }
  | { type: 'SPOT_ON' }
  | { type: 'SALPICON' };

// =====================
// Utilidades
// =====================
function getParams() {
  const sp = new URLSearchParams(location.search);
  return {
    room: sp.get('room') || 'demo',
    role: (sp.get('role') as 'host' | 'client') || 'host',
    p: sp.get('p') || '0',
    setup: sp.get('setup') === '1', // modo seguro para forzar panel de inicio
  };
}

// ¿El estado está “listo” para renderizar?
function isReadyState(s: any): s is GameState {
  return !!(s && Array.isArray(s.players) && s.players.length > 0 && typeof s.status !== 'undefined');
}

// Rellena nombres/id, corrige índices y bets huérfanas
function sanitizePlayers(players: any[] | undefined) {
  const arr = Array.isArray(players) ? players : [];
  return arr.map((p, i) => ({
    ...p,
    name: p?.name ?? `Jugador ${i + 1}`,
    id: typeof p?.id === 'number' ? p.id : i,
  }));
}
function clampIndex(idx: any, len: number) {
  const n = typeof idx === 'number' ? idx : 0;
  if (len <= 0) return 0;
  return Math.max(0, Math.min(n, len - 1));
}
function sanitizeState(s: any): any {
  if (!s || typeof s !== 'object') return s;
  const players = sanitizePlayers(s.players);
  const currentPlayerIndex = clampIndex(s.currentPlayerIndex, players.length);
  const roundStarterIndex =
    s.roundStarterIndex == null ? null : clampIndex(s.roundStarterIndex, players.length);

  const fixBet = (bet: any) => {
    if (!bet) return bet;
    const playerId = players.find((p) => p.id === bet.playerId)?.id ?? players[0]?.id ?? 0;
    return { ...bet, playerId };
  };

  return {
    ...s,
    players,
    currentPlayerIndex,
    roundStarterIndex,
    currentBet: fixBet(s.currentBet),
    previousBet: fixBet(s.previousBet),
    winner: s.winner ? { ...s.winner, name: s.winner.name ?? 'Jugador' } : s.winner,
  };
}

// =====================
// Componente principal
// =====================
export default function CachoOnline() {
  const { room, role, p, setup } = useMemo(getParams, []);
  const isHost = role === 'host';

  // 1) Hook del juego (solo lo usa el HOST)
  const game = useCachoGameHook() as {
    state: GameState;
    setDirection?: (dir: 'RIGHT' | 'LEFT') => void;
    placeBet?: (q: number, f: DiceValue) => void;
    doubtBet?: () => void;
    spotOnBet?: () => void;
    salpicon?: () => void;
    // posibles inicializadores (no sabemos el nombre exacto del hook)
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

  // 2) Red (Firestore)
  const net = useRoom({
    roomId: room,
    role,
    playerId: p,
    initialState: {} as GameState, // clientes empiezan vacío; host publica
  });

  // 3) HOST publica SOLO si el estado está listo
  useEffect(() => {
    if (!isHost) return;
    if (!isReadyState(hostState)) return;
    net.publishState(hostState);
  }, [isHost, hostState, net]);

  // 4) HOST procesa acciones de clientes
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
      // El hook actualiza hostState; si queda “listo”, el efecto de arriba lo publica
    });
    return () => unsub();
  }, [isHost, setDirection, placeBet, doubtBet, spotOnBet, salpicon, net]);

  // 5) Modo seguro: forzar panel de setup sin tocar estado del juego
  if (isHost && setup) {
    return <HostSetup room={room} game={game} />;
  }

  // 6) Seleccionar estado y sanitizar antes de renderizar tablero
  const rawEffective: GameState | null = isHost
    ? (isReadyState(hostState) ? hostState : null)
    : (isReadyState(net.state) ? (net.state as GameState) : null);

  const effectiveState: GameState | null = rawEffective
    ? (sanitizeState(rawEffective) as GameState)
    : null;

  // Loaders
  if (isHost && !effectiveState) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Sala “{room}”: preparando el estado del juego…
        </div>
        <div style={{ opacity: 0.8 }}>Inicia la partida desde el panel o espera a que se inicialice.</div>
      </div>
    );
  }
  if (!isHost && !effectiveState) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Conectando a la sala “{room}”…
        </div>
        <div style={{ opacity: 0.8 }}>Esperando el estado inicial del host…</div>
      </div>
    );
  }

  // 7) Handlers para GameBoard
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

  // 8) Render tablero real
  return (
    <GameBoard
      gameState={effectiveState as GameState}
      onSetDirection={handlers.onSetDirection}
      onPlaceBet={handlers.onPlaceBet}
      onDoubtBet={handlers.onDoubtBet}
      onSpotOnBet={handlers.onSpotOnBet}
      onSalpicon={handlers.onSalpicon}
    />
  );
}

// =====================
// Panel minimal para que el HOST inicie la partida y publique estado
// =====================
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
      // @ts-expect-error dinámica
      game[found](players, bots);
      setMsg(`Iniciando con ${players} jugadores (${bots} bots)…`);
    } catch (e: any) {
      setMsg(`Error al iniciar: ${e?.message || e}`);
    }
  }

  return (
    <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center' }}>
      <div style={{
        width: 'min(560px, 92vw)',
        background: 'rgba(17,24,39,.7)',
        border: '1px solid #374151',
        borderRadius: 14,
        padding: 20,
        color: '#eef2ff'
      }}>
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
          style={{ padding: 10, width: 140 }}
        />

        <label style={{ display: 'block', margin: '12px 0 4px' }}>Bots</label>
        <input
          type="number"
          min={0}
          max={4}
          value={bots}
          onChange={(e) => setBots(parseInt(e.target.value || '0', 10))}
          style={{ padding: 10, width: 140 }}
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
              background: '#ffd54f',
              color: '#1f2937'
            }}
          >
            Iniciar
          </button>
        </div>

        {msg && (
          <div style={{ marginTop: 12, color: '#cbd5e1' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
