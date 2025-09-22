// src/ErrorBoundary.tsx
import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    // opcional: log a un servicio
    console.error('💥 ErrorBoundary atrapó un error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'grid', placeItems: 'center',
          padding: 24, color: '#fff', background: '#111827'
        }}>
          <div style={{
            maxWidth: 720, background: '#1f2937', border: '1px solid #374151',
            borderRadius: 12, padding: 20
          }}>
            <h2 style={{ margin: 0 }}>Se produjo un error en la interfaz</h2>
            <p style={{ opacity: .85, marginTop: 8 }}>
              Si puedes, copia la primera línea roja de la consola y me la pegas aquí.
            </p>
            <pre style={{
              whiteSpace: 'pre-wrap', background: '#111827', padding: 12,
              borderRadius: 8, marginTop: 12, overflowX: 'auto'
            }}>
              {String(this.state.error?.message || this.state.error || 'Error desconocido')}
            </pre>
            <button
              onClick={() => location.reload()}
              style={{
                marginTop: 12, padding: '10px 16px', borderRadius: 8,
                background: '#2563eb', color: '#fff', border: 0, cursor: 'pointer'
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
