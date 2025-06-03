import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ClientProvider } from './context/ClientContext'; // 🆕
import './styles/global.css';
import { CompletionProvider } from './context/CompletionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/pitch">
      <CompletionProvider>
        <ClientProvider>
          <App />
        </ClientProvider>
      </CompletionProvider>
    </BrowserRouter>
  </StrictMode>
);
