// src/App.tsx
import React from 'react';
import CachoOnline from './CachoOnline';

function getQP(name: string) {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

export default function App() {
  const hasRoom = !!getQP('room');
  const hasRole = !!getQP('role');

  if (hasRoom && hasRole) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            background: '#ffd',
            padding: '4px 8px',
            border: '1px solid #cc0',
            borderRadius: 6,
            zIndex: 9999,
          }}
        >
          APP vREAL
        </div>
        <CachoOnline />
      </>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Compartir partida</h1>
      <p>Ejemplos:</p>
      <code>?room=amigos&role=host&p=0</code> {'  '}o{'  '}
      <code>?room=amigos&role=client&p=1</code>
    </div>
  );
}
