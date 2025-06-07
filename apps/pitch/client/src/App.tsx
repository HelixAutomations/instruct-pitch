import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, useMatch } from 'react-router-dom';
import Header from './structure/Header';
import Footer from './structure/Footer';
import IDAuth from './structure/IDAuth';
import HomePage from './structure/HomePage';
import ClientDetails from './structure/ClientDetails';
import PaymentResult from './structure/PaymentResult';  // ← make sure this import is here
import './styles/App.css';

const App: React.FC = () => {
  const match = useMatch('/:cid/*');
  const cid = match?.params.cid;
  const navigate = useNavigate();

  const [clientId, setClientId] = useState(cid || '');
  const [instructionRef, setInstructionRef] = useState(() => {
    if (!cid) return '';
    const now  = new Date();
    const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
    return `HLX-${cid}-${ddmm}`;
  });
  const [step1Reveal, setStep1Reveal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (cid) {
      const now  = new Date();
      const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(
        now.getMonth() + 1
      ).padStart(2, '0')}`;
      setClientId(cid);
      setInstructionRef(`HLX-${cid}-${ddmm}`);
    }
  }, [cid]);

  if (location.pathname === '/payment/result') {
    return <PaymentResult />;
  }

  const handleConfirm = () => {
    navigate(`/${clientId}`);
  };

  return (
    <div className="app-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-content-inner">
            <Header />
            <ClientDetails
              workType="—"
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
          <Route
            path="/"
            element={
              <IDAuth
                clientId={clientId}
                setClientId={setClientId}
                setInstructionRef={setInstructionRef}
                onConfirm={handleConfirm}
              />
            }
          />
          <Route
            path="/:cid/*"
            element={
              <HomePage
                step1Reveal={step1Reveal}
                clientId={clientId}
                instructionRef={instructionRef}
              />
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;
