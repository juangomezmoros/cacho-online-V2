// src/OnlineTest.tsx
import { useEffect, useRef } from 'react';
import { useRoom } from './online/useRoom';

function getParams() {
  const sp = new URLSearchParams(location.search);
  return {
    room: sp.get('room') || 'demo',
    role: (sp.get('role') as 'host' | 'client') || 'host',
    p: sp.get('p') || '0',
    bots: Math.max(0, Number(sp.get('bots') || '0') || 0), // <- cantidad de bots
  };
}

type GameState = {
  counter: number;
  log: Array<{ by: string | number | null; type: string; note?: string }>;
};

function normalize(s: any): GameState {
  const counter = typeof s?.counter === 'number' ? s.counter : 0;
  const log = Array.isArray(s?.log) ? s.log : [];
  return { counter, log };
}

export default function OnlineTest() {
  const { room, role, p, bots } = getParams();

  const net = useRoom({
    roomId: room,
    role,
    playerId: p,
    initialState: { counter: 0, log: [] } as GameState,
  });

  // HOST: procesa acciones entrantes y publica nuevo estado
  useEffect(() => {
    if (!net.isHost) return;
    const unsub = net.subscribeActions((a) => {
      const s = normalize(net.state);

      let next = s;
      if (a.type === 'PING') {
        next = { ...s, counter: s.counter + 1, log: [...s.log, { by: a.playerId ?? null, type: 'PING' }] };
      } else if (a.type === 'CANTAR') {
        next = { ...s, log: [...s.log, { by: a.playerId ?? null, type: 'CANTAR', note: JSON.stringify(a.payload ?? {}) }] };
      } else if (a.type === 'DUDAR') {
        next = { ...s, log: [...s.log, { by: a.playerId ?? null, type: 'DUDAR' }] };
      }

      net.publishState(next);
    });
    return () => unsub();
  }, [net.isHost, net.state, net]);

  const state = normalize(net.state);

  async function send(type: 'PING' | 'CANTAR' | 'DUDAR', payload?: any) {
    if (net.isHost) {
      // Host aplica local y publica
      const s = normalize(net.state);
      let next = s;
      if (type === 'PING') {
        next = { ...s, counter: s.counter + 1, log: [...s.log, { by: 'host', type: 'PING' }] };
      } else if (type === 'CANTAR') {
        next = { ...s, log: [...s.log, { by: 'host', type: 'CANTAR', note: JSON.stringify(payload ?? {}) }] };
      } else if (type === 'DUDAR') {
        next = { ...s, log: [...s.log, { by: 'host', type: 'DUDAR' }] };
      }
      await net.publishState(next);
    } else {
      // Cliente envía acción
      await net.sendAction({ type, payload: payload ?? null });
    }
  }

  // ====== BOTS (solo en el HOST) ======
  const botTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!net.isHost) return;
    if (bots <= 0) return;

    // Cada 3s un bot “hace algo” (en el demo: PING)
    const id = window.setInterval(() => {
      // Elegimos un bot "al azar": players bot tendrán ids 'bot-1', 'bot-2', ...
      const botId = 'bot-' + (1 + Math.floor(Math.random() * bots));
      // Simulamos que envía una acción que el host procesa:
      const s = normalize(net.state);
      const next = {
        ...s,
        counter: s.counter + 1,
        log: [...s.log, { by: botId, type: 'PING' }],
      };
      net.publishState(next);
    }, 3000);

    botTimer.current = id;
    return () => {
      if (botTimer.current) {
        clearInterval(botTimer.current);
        botTimer.current = null;
      }
    };
  }, [net.isHost, bots, net.state, net]);

  // ====== UI del demo ======
  return (
    <div style={{ padding: 24, background: '#f7fafc', color: '#1a202c', minHeight: '100vh' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Room: {room} — Role: {role} — Player: {p} {bots > 0 ? `— Bots: ${bots}` : ''}
      </h2>
      <p>Conectado: <b>{String(net.isConnected)}</b></p>

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          onClick={() => send('PING')}
          style={{ padding: '8px 16px', border: '1px solid #2d3748', borderRadius: 8, background: '#edf2f7' }}
        >
          PING (sube counter)
        </button>

        <button
          onClick={() => send('CANTAR', { cantidad: 3, numero: 6 })}
          style={{ padding: '8px 16px', border: '1px solid #2d3748', borderRadius: 8, background: '#edf2f7' }}
        >
          CANTAR (ejemplo 3x6)
        </button>

        <button
          onClick={() => send('DUDAR')}
          style={{ padding: '8px 16px', border: '1px solid #2d3748', borderRadius: 8, background: '#edf2f7' }}
        >
          DUDAR
        </button>
      </div>

      <div style={{ marginTop: 16 }}>
        <p>Counter: <b>{state.counter}</b></p>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontWeight: 700 }}>Log de acciones</h3>
        <ul style={{ marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          {state.log.slice(-12).map((entry, idx) => (
            <li key={idx}>
              <code>{String(entry.by)}:</code> {entry.type} {entry.note ? `→ ${entry.note}` : ''}
            </li>
          ))}
        </ul>
      </div>

      {net.lastError && (
        <pre style={{ color: '#c53030', background: '#fff5f5', padding: 12, marginTop: 12 }}>
          {net.lastError}
        </pre>
      )}
    </div>
  );
}
