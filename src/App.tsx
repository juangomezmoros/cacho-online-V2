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
    return <OnlineTest />; // pantalla de juego “full”
  }

  // Si NO trae room/role -> mostrar página para compartir
  const [room, setRoom] = useState('amigos');
  const [players, setPlayers] = useState(2);

  const base = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  const hostUrl = `${base}/?room=${encodeURIComponent(room)}&role=host&p=0`;
  const clientUrls = Array.from({ length: Math.max(0, players - 1) }).map((_, i) => {
    const p = i + 1;
    return `${base}/?room=${encodeURIComponent(room)}&role=client&p=${p}`;
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

      <label style={{ display: 'block', marginBottom: 8 }}>
        Cantidad de jugadores:
        <input
          type="number"
          min={2}
          max={6}
          value={players}
          onChange={(e) =>
            setPlayers(Math.max(2, Math.min(6, Number(e.target.value) || 2)))
          }
          style={{ marginLeft: 8, width: 60, padding: '6px 10px', border: '1px solid #cbd5e0', borderRadius: 8 }}
        />
      </label>

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
        Abre el enlace de Host y comparte los de Cliente. Todos usarán la sala <b>{room}</b>.
      </p>
    </div>
  );
}
