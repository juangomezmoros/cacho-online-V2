// src/App.tsx
import React, { useMemo, useState } from 'react';
import OnlineTest from './OnlineTest';

function getQP(name: string) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function App() {
  // Si la URL ya trae room y role -> mostrar directamente el juego
  const hasRoom = !!getQP('room');
  const hasRole = !!getQP('role');
  if (hasRoom && hasRole) {
    return <OnlineTest />; // pantalla de juego “full” (por ahora el demo)
  }

  // Pantalla para compartir (cuando NO hay room/role)
  const [room, setRoom] = useState('amigos');
  const [players, setPlayers] = useState(2);
  const [bots, setBots] = useState(0);

  const base = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  const hostUrl = `${base}/?room=${encodeURIComponent(room)}&role=host&p=0${
    bots > 0 ? `&bots=${bots}` : ''
  }`;

  const clientUrls = Array.from({ length: Math.max(0, players - 1) }).map((_, i) => {
    const p = i + 1;
    return `${base}/?room=${encodeURIComponent(room)}&role=client&p=${p}${
      bots > 0 ? `&bots=${bots}` : ''
    }`;
  });

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copiado ✅');
    } catch {
      alert('No se pudo copiar, hazlo manualmente.');
    }
  }

  return (
    <div style={{ padding: 24, background: '#f7fafc', color: '#1a202c', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
        Cacho online — Compartir partida
      </h1>

      <label style={{ display: 'block', marginBottom: 8 }}>
        Nombre de sala:
        <input
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="amigos"
          style={{ marginLeft: 8, padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 8 }}
        />
      </label>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label>
          Jugadores:
          <input
            type="number"
            min={2}
            max={6}
            value={players}
            onChange={(e) =>
              setPlayers(Math.max(2, Math.min(6, Number(e.target.value) || 2)))
            }
            style={{ marginLeft: 8, width: 64, padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 8 }}
          />
        </label>

        <label>
          Bots:
          <input
            type="number"
            min={0}
            max={4}
            value={bots}
            onChange={(e) =>
              setBots(Math.max(0, Math.min(4, Number(e.target.value) || 0)))
            }
            style={{ marginLeft: 8, width: 64, padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 8 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <h3 style={{ marginBottom: 8, fontWeight: 700 }}>Enlace Host</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <a href={hostUrl} target="_blank" rel="noreferrer">{hostUrl}</a>
          <button onClick={() => copy(hostUrl)} style={{ padding: '6px 10px', border: '1px solid #2d3748', borderRadius: 8 }}>
            Copiar
          </button>
        </div>

        <h3 style={{ margin: '12px 0 8px', fontWeight: 700 }}>Enlaces Cliente</h3>
        {clientUrls.map((u, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <span>Cliente {idx + 1}:</span>
            <a href={u} target="_blank" rel="noreferrer">{u}</a>
            <button onClick={() => copy(u)} style={{ padding: '6px 10px', border: '1px solid #2d3748', borderRadius: 8 }}>
              Copiar
            </button>
          </div>
        ))}
      </div>

      <p style={{ marginTop: 16 }}>
        Abre el enlace de Host y comparte los de Cliente. Todos usarán la sala <b>{room}</b>{' '}
        {bots > 0 ? `(con ${bots} bot${bots === 1 ? '' : 's'})` : ''}.
      </p>
    </div>
  );
}
