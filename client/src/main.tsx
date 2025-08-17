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

// Report that the client bundle executed. This uses the injected reporter
// from the mock server (if present) to push a small beacon so we can tell
// whether the JS runs in the browser (helps diagnose blank-screen issues).
try {
  if (typeof (window as any).__reportClientError === 'function') {
    (window as any).__reportClientError({ message: 'client bundle executed', type: 'boot' });
  }
} catch (e) { /* ignore */ }
