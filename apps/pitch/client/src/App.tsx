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
  const match = useMatch('/:code/*');
  const code = match?.params.code;
  const navigate = useNavigate();

  const [passcode, setPasscode] = useState(code || '');
  const [instructionRef, setInstructionRef] = useState('');
  const [instructionConfirmed, setInstructionConfirmed] = useState(false);
  const [step1Reveal, setStep1Reveal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!code) return;
    setPasscode(code);
    if (/^HLX-\d+-\d+$/.test(code)) {
      setInstructionRef(code);
      return;
    }
    fetch(`/api/generate-instruction-ref?passcode=${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.instructionRef) {
          setInstructionRef(data.instructionRef);
        } else if (import.meta.env.DEV) {
          const rand = Math.floor(Math.random() * 9000) + 1000;
          setInstructionRef(`HLX-${code}-${rand}`);
        }
      })
      .catch(err => {
        console.error('Failed to fetch instructionRef', err);
        if (import.meta.env.DEV) {
          const rand = Math.floor(Math.random() * 9000) + 1000;
          setInstructionRef(`HLX-${code}-${rand}`);
        }
      });
  }, [code]);

  if (location.pathname === '/payment/result') {
    return <PaymentResult />;
  }

  const handleConfirm = () => {
    navigate(`/${passcode}`);
  };

  return (
    <div className="app-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-content-inner">
            <Header />
            <ClientDetails
              workType="—"
              stage={instructionConfirmed ? 'Instruction Confirmed' : 'Confirmation of Instruction'}
              instructionRef={instructionRef}
              confirmed={instructionConfirmed}
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
                passcode={passcode}
                setPasscode={setPasscode}
                setInstructionRef={setInstructionRef}
                onConfirm={handleConfirm}
              />
            }
          />
          <Route
            path="/:code/*"
            element={
              <HomePage
                step1Reveal={step1Reveal}
                passcode={passcode}
                instructionRef={instructionRef}
                onInstructionConfirmed={() => setInstructionConfirmed(true)}
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
