import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
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
  const [instructionId, setInstructionId] = useState(params.get('eid') || '');
  const [confirmed, setConfirmed] = useState(() =>
    Boolean(params.get('pid') && params.get('eid'))
  );
  const [step1Reveal, setStep1Reveal] = useState(false);

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
          {/* 1. Your new payment callback route */}
          <Route path="/payment/result" element={<PaymentResult />} />

          {/* 2. Your existing catch-all route */}
          <Route
            path="/*"
            element={
              !confirmed ? (
                <IDAuth
                  clientId={clientId}
                  instructionId={instructionId}
                  setClientId={setClientId}
                  setInstructionId={setInstructionId}
                  onConfirm={() => setConfirmed(true)}
                />
              ) : (
                <HomePage step1Reveal={step1Reveal} />
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
