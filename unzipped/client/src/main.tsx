import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ClientProvider } from './context/ClientContext'; // 🆕
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/pitch">
      <ClientProvider> {/* 🆕 wrap App */}
        <App />
      </ClientProvider>
    </BrowserRouter>
  </StrictMode>
);
