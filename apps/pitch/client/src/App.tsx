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
  const [returning, setReturning] = useState(false);
  const [completionGreeting, setCompletionGreeting] = useState<string | null>(null);
  const [feeEarner, setFeeEarner] = useState<string | undefined>();
  const [clientEmail, setClientEmail] = useState<string | undefined>();
  const location = useLocation();

  useEffect(() => {
    if (!cidParam) return;
    const parts = cidParam.split('-');
    let cid = parts[0];
    setReturning(false);

    // If the URL contains a full instruction reference (HLX-XXXXX-XXXX)
    if (parts.length >= 3 && parts[0].toUpperCase() === 'HLX') {
      cid = parts[1];
      setInstructionRef(cidParam);
      setPasscode(parts[1]);
      setReturning(true);
      setShowIdAuth(false);
      setClientId(cid);
      return;
    }
    setClientId(cid);

    // If the URL contains a full instruction reference (e.g. HLX-12345-6789)
    // skip passcode validation and prefill from that record.
    if (parts.length >= 3) {
      setInstructionRef(cidParam);
      setPasscode('');
      setShowIdAuth(false);
      return;
    }

    const code = parts[1];
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
      // Only show the passcode modal if we don't already have a passcode from
      // the initial IDAuth step (e.g., when arriving via "/" route).
      setShowIdAuth(passcode === '');
    }
  }, [cidParam, navigate]);

  if (location.pathname === '/payment/result') {
    return <PaymentResult />;
  }

  const handleConfirm = () => {
    setShowIdAuth(false);
    navigate(`/${clientId}`);
  };

  const handleContactInfoChange = (info: { feeEarner?: string; email?: string }) => {
    setFeeEarner(info.feeEarner);
    setClientEmail(info.email);
  };

  return (
    <div className="app-page">
      <div className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-content-inner">
            <Header />
            <ClientDetails
              workType="—"
              stage={
                instructionConfirmed
                  ? "We've got your instructions."
                  : 'Confirmation of Instruction'
              }
              instructionRef={instructionRef}
              clientId={clientId}
              feeEarner={feeEarner}
              email={clientEmail}
              confirmed={instructionConfirmed}
              greeting={completionGreeting ?? undefined}
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
                  returning={returning}
                  onInstructionConfirmed={() => setInstructionConfirmed(true)}
                  onGreetingChange={setCompletionGreeting}
                  onContactInfoChange={handleContactInfoChange}
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