import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './structure/Header';
import Footer from './structure/Footer';
import IDAuth from './structure/IDAuth';
import HomePage from './structure/HomePage';
import ClientDetails from './structure/ClientDetails';
import PaymentResult from './structure/PaymentResult';  // ← make sure this import is here
import './styles/App.css';

const params = new URLSearchParams(window.location.search);

const App: React.FC = () => {
  const [clientId, setClientId] = useState(params.get('pid') || '');
  const [instructionId, setInstructionId] = useState(() => {
    const pid = params.get('pid');
    if (!pid) return '';
    const now = new Date();
    const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    return `HLX-${pid}-${ddmm}`;
  });
  const [confirmed, setConfirmed] = useState(() => Boolean(params.get('pid')));
  const [step1Reveal, setStep1Reveal] = useState(false);
  const location = useLocation();

  if (location.pathname === '/payment/result') {
    return <PaymentResult />;
  }

  return (
    <div className="app-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-content-inner">
            <Header />
            <ClientDetails
              workType="—"
              clientId={clientId}
              instructionId={instructionId}
              stage="Confirmation of Instruction"
              onAnimationEnd={() => {
                setTimeout(() => setStep1Reveal(true), 550);
              }}
            />
          </div>
        </div>
      </div>

      <main className="app-container">
        <Routes>
          {/* Catch-all routes */}
          <Route
            path="/*"
            element={
              !confirmed ? (
                <IDAuth
                  clientId={clientId}
                  setClientId={setClientId}
                  setInstructionId={setInstructionId}
                  onConfirm={() => setConfirmed(true)}
                />
              ) : (
                <HomePage
                  step1Reveal={step1Reveal}
                  clientId={clientId}
                  instructionId={instructionId}
                />
              )
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
