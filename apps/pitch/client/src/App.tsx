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
  const cidParam = match?.params.cid;
  const navigate = useNavigate();

  const [clientId, setClientId] = useState('');
  const [passcode, setPasscode] = useState('');
  // Determines whether the IDAuth modal should be displayed on the /:cid route
  const [showIdAuth, setShowIdAuth] = useState(false);
  const [instructionRef, setInstructionRef] = useState('');
  const [instructionConfirmed, setInstructionConfirmed] = useState(false);
  const [step1Reveal, setStep1Reveal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!cidParam) return;
    const [cid, code] = cidParam.split('-');
    setClientId(cid);
    if (code) {
      setPasscode(code);
      setShowIdAuth(false);
      // Auto-generate instruction reference when both values supplied
      fetch(`/api/generate-instruction-ref?cid=${cid}&passcode=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.instructionRef) {
            setInstructionRef(data.instructionRef);
            navigate(`/${cid}`);
          }
        })
        .catch(err => console.error('auto generate error', err));
    } else {
      setShowIdAuth(true);
    }
  }, [cidParam, navigate]);

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
                clientId={clientId}
                setClientId={setClientId}
                passcode={passcode}
                setPasscode={setPasscode}
                setInstructionRef={setInstructionRef}
                onConfirm={handleConfirm}
                showClientId={true}
              />
            }
          />
          <Route
            path="/:cid/*"
            element={
              <>
                {showIdAuth && (
                  <IDAuth
                    clientId={clientId}
                    setClientId={setClientId}
                    passcode={passcode}
                    setPasscode={setPasscode}
                    setInstructionRef={setInstructionRef}
                    onConfirm={handleConfirm}
                    showClientId={false}
                  />
                )}
                <HomePage
                  step1Reveal={step1Reveal}
                  clientId={clientId}
                  passcode={passcode}
                  instructionRef={instructionRef}
                  onInstructionConfirmed={() => setInstructionConfirmed(true)}
                />
              </>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
};

export default App;