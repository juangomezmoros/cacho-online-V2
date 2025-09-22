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
      <div
        className="app-shell"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            width: 'min(1100px, 95vw)',
            height: 'min(700px, 92vh)',
          }}
        >
          <div style={{
            position:'fixed', top:8, left:8, background:'#ffd',
            padding:'4px 8px', border:'1px solid #cc0', borderRadius:6, zIndex:9999, color:'#222'
          }}>
            APP vREAL
          </div>
          <CachoOnline />
        </div>
      </div>
    );
  }

  // Pantalla de compartir (sin room/role)
  return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', padding:24 }}>
      <div style={{ maxWidth:560 }}>
        <h1 style={{ margin:0, fontSize:28, fontWeight:800 }}>Compartir partida</h1>
        <p>Ejemplos de enlaces:</p>
        <code>?room=amigos&role=host&p=0</code>{'  '}o{'  '}
        <code>?room=amigos&role=client&p=1</code>
      </div>
    </div>
  );
}
