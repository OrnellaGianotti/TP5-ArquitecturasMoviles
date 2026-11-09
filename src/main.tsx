import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { MODO_API } from './api/cliente';
import { conectarWebSocket } from './api/tiempoReal';

// Service worker de la PWA: precachea la app para que abra sin conexión
// y se actualice sola cuando hay una versión nueva.
registerSW({ immediate: true });

// Tiempo real: WebSocket si hay backend real; si no, el motor de simulación.
if (MODO_API === 'real') {
  conectarWebSocket();
} else {
  void import('./api/simulado/motor').then((m) => m.iniciarMotor());
}

// Tema oscuro guardado por el vecino (o el del sistema).
try {
  const tema = localStorage.getItem('misanfra.tema');
  const oscuro = tema ? tema === 'oscuro' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle('ion-palette-dark', oscuro);
} catch {
  /* almacenamiento bloqueado: tema claro */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
