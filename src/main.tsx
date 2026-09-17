import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { api } from './lib/api';

window.addEventListener('beforeunload', () => {
  api.stopAudio();
});

async function bootstrap() {
  try {
    await api.stopAudio();
  } catch {}

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();