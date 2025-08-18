import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, useMatch } from 'react-router-dom';
import { StripeProvider } from './context/StripeContext';
import Header from './structure/Header';
import Footer from './structure/Footer';
import IDAuth from './structure/IDAuth';
import HomePage from './structure/HomePage';
import ClientDetails from './structure/ClientDetails';
import PaymentResult from './structure/PaymentResult';
import './styles/App.css';

const App: React.FC = () => {
  const match = useMatch('/:param/*');
  const cidParam = match?.params.param;
  const navigate = useNavigate();

  const [clientId, setClientId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showIdAuth, setShowIdAuth] = useState(true);
  const [instructionRef, setInstructionRef] = useState('');
  const [instructionConfirmed, setInstructionConfirmed] = useState(false);
  const [step1Reveal, setStep1Reveal] = useState(false);
  const [returning, setReturning] = useState(false);
  const [completionGreeting, setCompletionGreeting] = useState<string | null>(null);
  const [feeEarner, setFeeEarner] = useState<string | undefined>();
  const location = useLocation();

  useEffect(() => {
    // If server injected a passcode/cid (for /pitch/<passcode>), use that first
    const injectedPasscode = (window as any).helixOriginalPasscode;
    const injectedCid = (window as any).helixCid;
    if (injectedPasscode && injectedCid) {
      setClientId(String(injectedCid));
      setPasscode(String(injectedPasscode));
  // Hide the ID/passcode modal when the server has injected a passcode
  // (we'll still attempt to auto-generate an instructionRef below).
  setShowIdAuth(false);
      // attempt to auto-generate instructionRef
      fetch(`/api/generate-instruction-ref?cid=${encodeURIComponent(String(injectedCid))}&passcode=${encodeURIComponent(String(injectedPasscode))}`)
        .then(res => res.json())
        .then(data => {
          if (data.instructionRef) {
            setInstructionRef(data.instructionRef);
            // keep the passcode visible in the URL so the app can be reloaded
            // into the same state (use cid-passcode form)
            navigate(`/${injectedCid}-${injectedPasscode}`);
          }
        })
        .catch(() => { /* ignore */ });
      return;
    }
    if (!cidParam) return;
    
    // Check if this might be a passcode that needs lookup
    if (/^\d+$/.test(cidParam)) {
      console.log('Detected passcode in URL:', cidParam);
      // It's just a number, could be a passcode - try lookup
      fetch(`/api/getDealByPasscodeIncludingLinked?passcode=${encodeURIComponent(cidParam)}`)
        .then(res => res.json())
        .then(data => {
          console.log('Passcode lookup result:', data);
          if (data.ProspectId) {
            // Found a match! Use the ProspectId as clientId and the original as passcode
            console.log('Setting clientId:', data.ProspectId, 'passcode:', cidParam);
            setClientId(String(data.ProspectId));
            setPasscode(cidParam);
            setShowIdAuth(false);
            console.log('Hiding ID auth form');
            // Generate instruction ref with the mapped client ID using the ProspectId from response
            return fetch(`/api/generate-instruction-ref?cid=${encodeURIComponent(String(data.ProspectId))}&passcode=${encodeURIComponent(cidParam)}`);
          } else {
            // No match found, treat as regular client ID
            console.log('No match found, treating as client ID');
            setClientId(cidParam);
            setShowIdAuth(true);
          }
        })
        .then(res => {
          if (res) {
            return res.json();
          }
        })
        .then(data => {
          if (data && data.instructionRef) {
            console.log('Setting instruction ref:', data.instructionRef);
            setInstructionRef(data.instructionRef);
            // Don't navigate - stay on the current URL to avoid loops
            console.log('Successfully set up instruction, staying on current URL');
          }
        })
        .catch(() => {
          // If lookup fails, treat as regular client ID
          setClientId(cidParam);
          setShowIdAuth(true);
        });
      return;
    }
    
    const parts = cidParam.split('-');
    let cid = parts[0];
    setReturning(false);

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

    if (parts.length >= 3) {
      setInstructionRef(cidParam);
      setPasscode('');
      setShowIdAuth(false);
      return;
    }

    const code = parts[1];
    if (code && cid) {  // Add cid check to prevent empty calls
      setPasscode(code);
      setShowIdAuth(false);
      fetch(`/api/generate-instruction-ref?cid=${cid}&passcode=${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.instructionRef) {
            setInstructionRef(data.instructionRef);
            // keep passcode in the path so the user can bookmark/refresh the
            // same entry point (cid-passcode form)
            navigate(`/${cid}-${code}`);
          }
        })
        .catch(err => console.error('auto generate error', err));
    } else if (!code) {
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

  const handleContactInfoChange = (info: { feeEarner?: string }) => {
    setFeeEarner(info.feeEarner);
  };

  return (
    <StripeProvider>
      <div className="app-page">
        <div className="page-hero">
          <div className="page-hero-content">
            <div className="page-hero-content-inner">
              <Header />
              <ClientDetails
                stage={
                  instructionConfirmed
                    ? "We've got your instructions."
                    : 'Confirmation of Instruction'
                }
                instructionRef={instructionRef}
                confirmed={instructionConfirmed}
                greeting={completionGreeting ?? undefined}
                onAnimationEnd={() => {
                  setTimeout(() => setStep1Reveal(true), 550);
                }}
                showHelp={!returning}
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
              path="/:param/*"
              element={
                <>
                  {showIdAuth && !instructionRef && (
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
                    feeEarner={feeEarner}
                  />
                </>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </StripeProvider>
  );
};

export default App;
