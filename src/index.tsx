// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ensureAnonAuth } from './online/firebase';

const mount = () => {
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    throw new Error('No se encontró el elemento #root');
  }
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// 1) Autenticación anónima, luego montamos la app
ensureAnonAuth()
  .then((uid) => {
    console.log('Signed in anon as', uid);
    mount();
  })
  .catch((err) => {
    console.error('Auth error', err);
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.innerHTML =
        '<pre style="color:#ff6b6b;white-space:pre-wrap">Auth failed: ' +
        String(err) +
        '</pre>';
    }
  });
