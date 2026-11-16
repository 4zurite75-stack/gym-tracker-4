import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistence } from './db/db';
import './styles/base.css';
import './styles/components.css';
import './styles/workout.css';

// Para pruebas en navegador de escritorio: simula notch y barra inferior de iPhone.
if (new URLSearchParams(location.search).has('sim')) document.documentElement.classList.add('sim-iphone');

void requestPersistence();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
