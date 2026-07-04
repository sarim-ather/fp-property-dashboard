import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ProfileProvider } from './context/ProfileContext';
import './index.css';

// One-time cache nuke: unregister all SWs + clear caches, then reload fresh
const CACHE_VERSION = 'v4';
if (localStorage.getItem('fp_cache_cleared') !== CACHE_VERSION) {
  localStorage.setItem('fp_cache_cleared', CACHE_VERSION);
  (async () => {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    window.location.reload();
  })();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </AppProvider>
  </StrictMode>
);
