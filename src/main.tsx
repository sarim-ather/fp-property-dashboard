import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { ProfileProvider } from './context/ProfileContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </AppProvider>
  </StrictMode>
);
