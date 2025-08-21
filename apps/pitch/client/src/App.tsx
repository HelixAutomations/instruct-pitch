import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, useMatch } from 'react-router-dom';
import { StripeProvider } from './context/StripeContext';
import { useClient } from './context/ClientContext';
import Header from './structure/Header';
import Footer from './structure/Footer';
import IDAuth from './structure/IDAuth';
import HomePage from './structure/HomePage';
import PremiumHomePage from './structure/PremiumHomePage';
import ClientDetails from './structure/ClientDetails';
import PaymentResult from './structure/PaymentResult';
import PremiumSuccessPage from './structure/PremiumSuccessPage';
import PremiumFailurePage from './structure/PremiumFailurePage';
import PaymentLayoutTest from './components/PaymentLayoutTest';
import PaymentV2Demo from './structure/PaymentV2Demo';
import './styles/App.css';

const App: React.FC = () => {
  const match = useMatch('/:param/*');
  const cidParam = match?.params.param;
  const navigate = useNavigate();

  // Use ClientContext for shared state
  const { clientId, setClientId, instructionRef, setInstructionRef, setDealData } = useClient();

  const [passcode, setPasscode] = useState('');
  const [showIdAuth, setShowIdAuth] = useState(true);
  const [instructionConfirmed, setInstructionConfirmed] = useState(false);
  const [step1Reveal, setStep1Reveal] = useState(false);
  const [returning, setReturning] = useState(false);
  const [completionGreeting, setCompletionGreeting] = useState<string | null>(null);
  const [feeEarner, setFeeEarner] = useState<string | undefined>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [usePremiumLayout, setUsePremiumLayout] = useState(false);
  const location = useLocation();

  // Produce a canonical path form (cid-passcode). We prefer to *replace* the
  // URL only when we started from a raw passcode form to avoid a visible
  // flicker caused by a push + re-render sequence.
  const canonicalPath = (cid: string, code: string) => `/${cid}-${code}`;

  useEffect(() => {
    // Helper function to complete initialization
    const completeInitialization = () => {
      setIsInitializing(false);
    };

    // Check if we should use premium layout (for all new flows)
    // Use premium layout by default - it's backwards compatible
    setUsePremiumLayout(true);

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
            // Only replace the URL if we are currently on a pure passcode path
            // (e.g. /20200) to prevent a visible flicker. Use history *replace*
            // so we don't add an extra entry.
            const target = canonicalPath(String(injectedCid), String(injectedPasscode));
            if (/^\/(\d+)$/.test(location.pathname)) {
              if (location.pathname !== target) {
                navigate(target, { replace: true });
              }
            }
          }
        })
        .catch(() => { /* ignore */ })
        .finally(completeInitialization);
      return;
    }
    
    if (!cidParam) {
      completeInitialization();
      return;
    }
    
    // Check if this might be a passcode that needs lookup
    if (/^\d+$/.test(cidParam)) {
      console.log('Detected passcode in URL:', cidParam);
      // It's just a number, could be a passcode - try lookup
      fetch(`/api/getDealByPasscodeIncludingLinked?passcode=${encodeURIComponent(cidParam)}`)
        .then(res => res.json())
        .then(data => {
          console.log('Passcode lookup result:', data);
          console.log('Deal data type:', typeof data);
          console.log('Deal data Amount:', data.Amount);
          console.log('Deal data Amount type:', typeof data.Amount);
          if (data.ProspectId) {
            // Store the deal data for Stripe
            console.log('🎯 Setting deal data for Stripe:', data);
            setDealData(data);
            console.log('✅ Deal data has been set in ClientContext');
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
            // If we started from a pure passcode (e.g. /20200) replace it with
            // canonical cid-passcode to allow refresh/bookmark without a second
            // network lookup on reload. Using replace avoids flicker.
            if (/^\/(\d+)$/.test(location.pathname)) {
              const prospectId = data?.ProspectId || clientId;
              if (prospectId) {
                const target = canonicalPath(String(prospectId), String(passcode || cidParam));
                if (target && location.pathname !== target && /-/.test(target)) {
                  navigate(target, { replace: true });
                }
              }
            }
            console.log('Successfully set up instruction (canonical path applied if needed)');
          }
        })
        .catch(() => {
          // If lookup fails, treat as regular client ID
          setClientId(cidParam);
          setShowIdAuth(true);
        })
        .finally(completeInitialization);
      return;
    }
    
    // Handle canonical cid-passcode format like "27367-20200"
    if (/^\d+-\d+$/.test(cidParam)) {
      const [clientIdPart, passcodePart] = cidParam.split('-');
      
      // Fetch deal data for Stripe using the passcode
      fetch(`/api/getDealByPasscodeIncludingLinked?passcode=${encodeURIComponent(passcodePart)}`)
        .then(res => res.json())
        .then(data => {
          if (data.ProspectId) {
            setDealData(data);
          }
        })
        .catch(error => {
          console.error('Error fetching deal data for canonical format:', error);
        });
      
      // Set up the client ID and passcode directly
      setClientId(clientIdPart);
      setPasscode(passcodePart);
      setShowIdAuth(false);
      
      // Generate instruction ref
      fetch(`/api/generate-instruction-ref?cid=${encodeURIComponent(clientIdPart)}&passcode=${encodeURIComponent(passcodePart)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.instructionRef) {
            setInstructionRef(data.instructionRef);
          }
        })
        .catch(error => {
          console.error('Error generating instruction ref for canonical format:', error);
        })
        .finally(completeInitialization);
      return;
    }
    
    // Handle malformed URLs like /-20200 by treating as pure passcode
    if (cidParam.startsWith('-') && /^-\d+$/.test(cidParam)) {
      const passcodeOnly = cidParam.substring(1); // Remove leading dash
      console.log('Detected malformed URL with leading dash, treating as passcode:', passcodeOnly);
      // Redirect to clean passcode URL
      navigate(`/${passcodeOnly}`, { replace: true });
      completeInitialization();
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
      completeInitialization();
      return;
    }
    setClientId(cid);

    if (parts.length >= 3) {
      setInstructionRef(cidParam);
      setPasscode('');
      setShowIdAuth(false);
      completeInitialization();
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
            // Replace (not push) only if current path is *not* already canonical
            const target = canonicalPath(cid, code);
            if (location.pathname !== target) {
              navigate(target, { replace: true });
            }
          }
        })
        .catch(err => console.error('auto generate error', err))
        .finally(completeInitialization);
    } else if (!code) {
      setShowIdAuth(passcode === '');
      completeInitialization();
    } else {
      completeInitialization();
    }
  // include location.pathname so conditional navigation can evaluate current path
  }, [cidParam, navigate, location.pathname]);

  if (location.pathname === '/payment/result') {
    return <PaymentResult />;
  }

  // Premium payment success route
  if (location.pathname.match(/^\/[^\/]+\/success$/)) {
    return <PremiumSuccessPage />;
  }

  // Premium payment failure route  
  if (location.pathname.match(/^\/[^\/]+\/failure$/)) {
    return <PremiumFailurePage />;
  }

  // Test route for premium payment layout
  if (location.pathname === '/test/premium-layout' || location.pathname === '/pitch/test/premium-layout') {
    return <PaymentLayoutTest />;
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
          {isInitializing ? (
            <div className="loading-state">
              {/* Show a subtle loading indicator instead of the modal flicker */}
            </div>
          ) : (
            <Routes>
              <Route
                path="/payment-v2-demo"
                element={<PaymentV2Demo />}
              />
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
                    {usePremiumLayout ? (
                      <PremiumHomePage
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
                    ) : (
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
                    )}
                  </>
                }
              />
            </Routes>
          )}
        </main>

        <Footer />
      </div>
    </StripeProvider>
  );
};

export default App;
