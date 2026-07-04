import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ProfileProvider } from './context/ProfileContext';
import './index.css';

// Force SW to activate new version immediately and reload the page
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      }
    });
    reg.update();
  });
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
