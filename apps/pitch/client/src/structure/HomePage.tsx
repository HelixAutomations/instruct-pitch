declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test' | string
  }
}

declare global {
  interface Window {
    helixPrefillData?: {
      First_Name?: string;
      Last_Name?: string;
      activeTeam?: string[];
      [key: string]: any;
    };
  }
}

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { scrollIntoViewIfNeeded } from '../utils/scroll';
import { useCompletion } from '../context/CompletionContext';
import {
// (Icons removed with old summary/review UI)
} from 'react-icons/fa';
import ProofOfId from './ProofOfId';
import DocumentUpload from './DocumentUpload';
import '../styles/HomePage.css';
import '../styles/modern-checkout.css';
import { ProofData } from '../context/ProofData';
import { PaymentDetails } from '../context/PaymentDetails';
// Removed summary/review dependencies
import PremiumCheckout from '../components/premium/PremiumCheckout';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import ClientHub from './ClientHub';

const ALLOWED_FIELDS = [
  'isCompanyClient',
  'idType',
  'companyName',
  'companyNumber',
  'companyHouseNumber',
  'companyStreet',
  'companyCity',
  'companyCounty',
  'companyPostcode',
  'companyCountry',
  'title',
  'firstName',
  'lastName',
  'nationality',
  'houseNumber',
  'street',
  'city',
  'county',
  'postcode',
  'country',
  'dob',
  'gender',
  'phone',
  'email',
  'idNumber',
  'helixContact',
  'agreement',
  'nationalityCode',
  'countryCode',
  'companyCountryCode',
  'aliasId',
  'orderId',
  'shaSign',
  'paymentAmount',
  'paymentProduct',
];

interface HomePageProps {
  step1Reveal?: boolean;
  clientId: string;
  passcode: string;
  instructionRef: string;
  returning?: boolean;
  feeEarner?: string;
  onContactInfoChange?: (info: { feeEarner?: string }) => void;
  onInstructionConfirmed?: () => void;
  onGreetingChange?: (greeting: string | null) => void;
}

const HomePage: React.FC<HomePageProps> = ({
  step1Reveal,
  clientId,
  passcode,
  instructionRef,
  returning,
  feeEarner,
  onContactInfoChange,
  onInstructionConfirmed,
  onGreetingChange,
}) => {
  // --- STATE & STEP HANDLING (simplified after sidebar removal) ---
  const [currentCheckoutStep, setCurrentCheckoutStep] = useState<'identity'|'documents'|'payment'>('identity');
  const paymentsDisabled = passcode !== '20200';
  const [instructionReady, setInstructionReady] = useState(false);
  // instruction declared later; use a ref pattern by deferring showPaymentStep calculation
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const checkoutSteps = useMemo(() => {
    const base: { key: 'identity'|'documents'|'payment'; label: string }[] = [
      { key: 'identity', label: 'Identity Verification' },
      { key: 'documents', label: 'Document Upload' },
    ];
    if (showPaymentStep) base.push({ key: 'payment', label: 'Payment' });
    return base;
  }, [showPaymentStep]);

  const getCurrentStepIndex = () => checkoutSteps.findIndex(s => s.key === currentCheckoutStep);
  const nextStep = () => {
    const idx = getCurrentStepIndex();
    if (idx < checkoutSteps.length - 1) setCurrentCheckoutStep(checkoutSteps[idx + 1].key);
  };
  const prevStep = () => {
    const idx = getCurrentStepIndex();
    if (idx > 0) setCurrentCheckoutStep(checkoutSteps[idx - 1].key);
  };
  const goToStep = (stepKey: 'identity' | 'documents' | 'payment') => setCurrentCheckoutStep(stepKey);

  useEffect(() => { if (onGreetingChange) onGreetingChange(null); }, [onGreetingChange]);

  const step1Ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Steps are always visible in the new layout
  }, []);

  const [proofData, setProofData] = useState<ProofData>({
    idStatus: 'first-time',
    isCompanyClient: false,
    idType: 'passport',
    companyName: '',
    companyNumber: '',
    companyHouseNumber: '',
    companyStreet: '',
    companyCity: '',
    companyCounty: '',
    companyPostcode: '',
    companyCountry: '',
    companyCountryCode: undefined,
    title: '',
    titleId: undefined,
    firstName: '',
    lastName: '',
    nationality: '',
    nationalityCode: undefined,
    houseNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: '',
    countryCode: undefined,
    dob: '',
    gender: '',
    genderId: undefined,
    phone: '',
    email: '',
    idNumber: '',
    helixContact: '',
  });

  // --- Instruction & payment state (restored after refactor) ---
  interface InstructionState {
    instructionRef: string;
    amount: number;
    product: string;
    workType: string;
    pitchedAt?: string;
    matterId?: string;
  }
  const [instruction, setInstruction] = useState<InstructionState>({
    instructionRef,
    amount: 0,
    product: '',
    workType: '',
    pitchedAt: undefined,
  });
  const [instructionCompleted, setInstructionCompleted] = useState(false);

  // Uploaded files type (lightweight)
  interface UploadedFile { file: File; uploaded: boolean; }

  useEffect(() => {
    if (onContactInfoChange) {
      onContactInfoChange({
        feeEarner: proofData.helixContact,
      });
    }
  }, [proofData.helixContact, onContactInfoChange]);

  const saveInstruction = useCallback(async (stage: string) => {
    if (!instruction.instructionRef) return Promise.resolve();
    try {
      let payload: any = { instructionRef: instruction.instructionRef, stage };
      if (stage !== 'initialised') {
        const allowed: Partial<ProofData> = {} as Partial<ProofData>;
        for (const key of ALLOWED_FIELDS) {
          if (key in proofData) (allowed as any)[key] = (proofData as any)[key];
        }
        payload = { ...payload, ...allowed };
      } else {
        payload.internalStatus = 'pitch';
      }
      const res = await fetch('/api/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data) {
        if (data.completed) {
          setInstructionCompleted(true);
        }
        setInstruction(prev => ({
          ...prev,
          amount: data.PaymentAmount != null ? Number(data.PaymentAmount) : prev.amount,
          product: data.PaymentProduct ?? prev.product,
          workType: data.WorkType ?? prev.workType,
        }));
      }
      return data;
    } catch (err) {
      console.error('Failed to save instruction', err);
      throw err;
    }
  }, [instruction.instructionRef]);

  useEffect(() => {
    if (instructionCompleted) {
      goToStep('identity');
    }
  }, [instructionCompleted]);

  // Prefill basic contact info when arriving with a Client ID.
  // If the server injected window.helixPrefillData we use that
  // otherwise fall back to calling the legacy fetch endpoint.

  useEffect(() => {
    async function maybeFetchPrefill() {
      const apply = (prefill: any) => {
        setProofData(prev => ({
          ...prev,
          firstName: prefill.First_Name ?? prev.firstName,
          lastName: prefill.Last_Name ?? prev.lastName,
          email: prefill.Email ?? prev.email,
          phone: prefill.Phone_Number ?? prev.phone,
          helixContact: prefill.Point_of_Contact ?? prev.helixContact,
        }));
        if (instruction.instructionRef) {
          saveInstruction('initialised').then(() => setInstructionReady(true));
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Prefilled data loaded');
        }
      };

      const existing = window.helixPrefillData;
      if (existing) {
        apply(existing);
        return;
      }

      if (!clientId) return;

      try {
        const res = await fetch(
          `/api/internal/fetch-instruction-data?cid=${encodeURIComponent(clientId)}`
        );
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        (window as any).helixPrefillData = data;
        apply(data);
      } catch (err) {
        console.error('prefill fetch error', err);
      }
    }

    maybeFetchPrefill();
  
    if (process.env.NODE_ENV !== 'production') {
      console.log('[HomePage] prefill data available');
    }
  }, [clientId]);

  // TODO: Add Stripe payment preloading here when implementing Stripe integration
  
  // TODO: Add Stripe payment preloading here when implementing Stripe integration


  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [] = useState<PaymentDetails>({ cardNumber: '', expiry: '', cvv: '' });
  const [isUploadSkipped, setUploadSkipped] = useState(false);

  // instructionReady declared earlier (moved up)
  const [instructionError] = useState<string | null>(null);

  // Debug: log payment visibility state to help diagnose missing step 2
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[HomePage] payment debug', {
        passcode,
        paymentsDisabled: passcode !== '20200',
        instructionRef: instruction.instructionRef,
        instructionAmount: instruction.amount,
        hasDeal: instruction.amount > 0,
        prefetchPayment: !((passcode !== '20200')) && instruction.amount > 0,
        instructionReady,
      });
    } catch (e) {
      // swallow logging errors
    }
  }, [passcode, instruction.instructionRef, instruction.amount, instructionReady]);

  const [isIdReviewDone, setIdReviewDone] = useState(false);
  const [isUploadDone, setUploadDone] = useState(false);
  const [isPaymentDone, setPaymentDone] = useState(false);
  const [expiryText, setExpiryText] = useState('');
  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const { summaryComplete, setSummaryComplete } = useCompletion();

  // Debounce timer ref for API calls
  const saveTimeoutRef = useRef<number | null>(null);

  // Debounced save function to prevent API spam
  const debouncedSaveInstruction = useCallback((stage: string, delay: number = 1000) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveInstruction(stage);
    }, delay);
  }, [saveInstruction]);

  // Memoized function to check if ID info is complete
  const isIdInfoComplete = useCallback(() => {
    return [
      proofData.idStatus,
      proofData.title,
      proofData.firstName,
      proofData.lastName,
      proofData.nationality,
      proofData.idNumber,
    ].every((f) => f && f.toString().trim());
  }, [proofData.idStatus, proofData.title, proofData.firstName, proofData.lastName, proofData.nationality, proofData.idNumber]);

  // Handle payment state when payments are disabled
  useEffect(() => {
    if (paymentsDisabled) {
      setPaymentDone(true);
    }
  }, [paymentsDisabled]);

  const idExpiry = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-GB');
  }, []);

  // Steps are considered locked once the final banner is shown or the
  // instruction is marked completed server-side. At this stage we no
  // longer want users editing earlier steps.
  const stepsLocked = instructionCompleted || showFinalBanner;

  // Track editing state and whether any changes have been made
  // Removed editing/review state

  const formatAmount = (amt: number) => {
    const hasDecimals = Math.floor(amt) !== amt;
    return amt.toLocaleString('en-GB', {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    });
  };

  useEffect(() => {
    if (!instruction.pitchedAt) return;
    const pitchDate = new Date(instruction.pitchedAt);
    const expiry = new Date(pitchDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const update = () => {
      const now = new Date();
      let diff = expiry.getTime() - now.getTime();
      if (diff < 0) diff = 0;
      const days = Math.floor(diff / (24 * 60 * 60 * 1000));
      const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      setExpiryText(`${days}d ${hours}h`);
    };

    update();
    const timer = setInterval(update, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [instruction.pitchedAt]);


  // Clear any persisted progress on first load so refreshing starts clean
  useEffect(() => {
    sessionStorage.removeItem('paymentDone');
    sessionStorage.removeItem(`uploadedDocs-${passcode}-${instructionRef}`);
  }, [passcode, instructionRef]);

  useEffect(() => {
    if (localStorage.getItem('paymentSuccess') === 'true') {
      setPaymentDone(true);
      sessionStorage.setItem('paymentDone', 'true');
      localStorage.removeItem('paymentSuccess');
    }
  }, []);

  // Once ID details are marked complete, keep the state unless the user
  // explicitly clears required fields and tries to proceed again.
  useEffect(() => {
    const isComplete = isIdInfoComplete();
    if (!isIdReviewDone && isComplete) {
      setIdReviewDone(true);
      // Auto-save proof of ID completion when Step 1 is complete - debounced to prevent spam
      debouncedSaveInstruction('proof-of-id-complete', 2000);
    }
  }, [isIdReviewDone, isIdInfoComplete, debouncedSaveInstruction]);

  // handleEdit removed (legacy review)

  useEffect(() => {
    const isComplete = uploadedFiles.some(f => f.uploaded);
    setUploadDone(isComplete);
  }, [uploadedFiles]);

  useEffect(() => {
    if (
      !returning &&
      (isUploadDone || isUploadSkipped) &&
      currentCheckoutStep === 'documents' &&
      !showFinalBanner
    ) {
      setShowFinalBanner(true);
    }
  }, [isUploadDone, isUploadSkipped, showFinalBanner, currentCheckoutStep, returning]);

  useEffect(() => {
    if (currentCheckoutStep === 'documents') {
      setShowFinalBanner(false);
    }
  }, [currentCheckoutStep]);

  useEffect(() => {
    if (showFinalBanner) {
      goToStep('identity');
    }
  }, [showFinalBanner]);

  useEffect(() => {
    if (showFinalBanner && !instructionCompleted && instruction.instructionRef) {
      fetch('/api/instruction/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructionRef: instruction.instructionRef }),
      })
        .then(() => setInstructionCompleted(true))
        .catch(err => console.error('Failed to mark instruction completed', err));
    }
  }, [showFinalBanner, instructionCompleted, instruction.instructionRef]);

  useEffect(() => {
    if (showFinalBanner && !instructionCompleted && instruction.instructionRef) {
      fetch('/api/instruction/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructionRef: instruction.instructionRef }),
      })
        .then(() => setInstructionCompleted(true))
        .catch(err => console.error('Failed to mark instruction completed', err));
    }
  }, [showFinalBanner, instructionCompleted, instruction.instructionRef]);

  useEffect(() => {
    if ((instructionCompleted || showFinalBanner) && onInstructionConfirmed) {
      onInstructionConfirmed();
    }
  }, [instructionCompleted, showFinalBanner, onInstructionConfirmed]);

  useEffect(() => {
    if (instructionCompleted) {
      setIdReviewDone(true);
      // Always set payment and upload done for completed instructions
      setPaymentDone(true);
      setUploadDone(true);
      setSummaryComplete(true);
    }
  }, [instructionCompleted, setSummaryComplete]);


  // edit session watcher removed

  useEffect(() => {
    // Only auto-open Step 1 for new arrivals when steps are not locked
    if (step1Reveal && !returning && !stepsLocked && currentCheckoutStep === 'identity') {
      goToStep('identity');
    }
  }, [step1Reveal, returning, currentCheckoutStep]);

  useEffect(() => {
    // Auto-scroll to current step (simplified for new checkout flow)
    if (currentCheckoutStep === 'identity') {
      scrollIntoViewIfNeeded(step1Ref.current);
    }
  }, [currentCheckoutStep]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Responsive state removed (isMobile no longer used)

  // Removed summary formatting helpers (no longer rendered)

  // Removed legacy proofSummary UI
  // Recompute payment step flag when instruction or passcode changes
  useEffect(() => {
    setShowPaymentStep(!paymentsDisabled && instruction.amount > 0);
  }, [paymentsDisabled, instruction.amount]);

  // Removed paymentData tracking effect (paymentData no longer in scope)

  // If payment step disappears (e.g. amount becomes 0) and we're on it, go back
  useEffect(() => {
    if (currentCheckoutStep === 'payment' && !showPaymentStep) {
      setCurrentCheckoutStep('documents');
    }
  }, [currentCheckoutStep, showPaymentStep]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="home-page">
      <main className="main-content">
        <div className="modern-checkout-container">
          {returning && (
            <ClientHub
              instructionRef={instructionRef}
              clientId={clientId}
              feeEarner={feeEarner}
              idExpiry={idExpiry}
              idVerified={summaryComplete}
              matterRef={instruction.matterId || undefined}
            />
          )}

          <CheckoutHeader
            currentIndex={getCurrentStepIndex()}
            total={checkoutSteps.length}
            steps={checkoutSteps}
            instructionRef={instruction.instructionRef}
            amount={instruction.amount}
            contact={proofData.helixContact || undefined}
          />

          {/* Step Content */}
          <div className="checkout-content">
            {/* Identity Verification */}
            {currentCheckoutStep === 'identity' && (
              <div className="checkout-step identity-step">
                <div className="step-header">
                  <h1>Verify your identity</h1>
                  <p>We need to confirm who you are to proceed with your legal services</p>
                </div>
                
                <div className="typeform-container">
                  <ProofOfId
                    value={proofData}
                    onUpdate={setProofData}
                    setIsComplete={setIdReviewDone}
                    onNext={() => { if (isIdReviewDone) nextStep(); }}
                  />
                </div>

                <div className="step-navigation">
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={nextStep}
                    disabled={!isIdReviewDone}
                  >
                    Continue to Documents
                  </button>
                </div>
              </div>
            )}

            {/* Document Upload */}
            {currentCheckoutStep === 'documents' && (
              <div className="checkout-step documents-step">
                <div className="step-header">
                  <h1>Upload documents</h1>
                  <p>Upload any supporting documents for your case (optional)</p>
                </div>

                <DocumentUpload
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  setIsComplete={setUploadDone}
                  onBack={prevStep}
                  onNext={() => {
                    if (showPaymentStep) {
                      nextStep();
                    } else {
                      // Skip to completion if no payment needed
                      setShowFinalBanner(true);
                    }
                  }}
                  setUploadSkipped={setUploadSkipped}
                  isUploadSkipped={isUploadSkipped}
                  clientId={clientId}
                  passcode={passcode}
                  instructionRef={instruction.instructionRef}
                  instructionReady={instructionReady}
                  instructionError={instructionError}
                />

                <div className="step-navigation">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={prevStep}
                  >
                    Back to Identity
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => {
                      if (showPaymentStep) {
                        nextStep();
                      } else {
                        setShowFinalBanner(true);
                      }
                    }}
                  >
                    {showPaymentStep ? 'Continue to Payment' : 'Complete'}
                  </button>
                </div>
              </div>
            )}

            {/* Payment */}
            {currentCheckoutStep === 'payment' && showPaymentStep && (
              <div className="checkout-step payment-step">
                <div className="step-header">
                  <h1>Complete payment</h1>
                  <p>Secure payment for your legal services</p>
                </div>

                {!isPaymentDone && (
                  <div className="service-summary-box">
                    <div className="summary-grid">
                      {proofData.helixContact && (
                        <div className="summary-item">
                          <div className="summary-label">Solicitor</div>
                          <div className="summary-value">{proofData.helixContact.split(' ')[0]}</div>
                        </div>
                      )}
                      <div className="summary-item">
                        <div className="summary-label">Amount (inc. VAT)</div>
                        <div className="summary-value amount-value">£{formatAmount(instruction.amount)}</div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-label">Expires in</div>
                        <div className="summary-value">{expiryText}</div>
                      </div>
                    </div>
                  </div>
                )}

                {!paymentsDisabled && (
                  <div className="premium-checkout-wrapper">
                    <PremiumCheckout
                      instructionRef={instruction.instructionRef}
                      onComplete={() => {
                        console.log('HomePage: Premium checkout completed');
                        setPaymentDone(true);
                        setShowFinalBanner(true);
                      }}
                    />
                  </div>
                )}

                <div className="step-navigation">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={prevStep}
                  >
                    Back to Documents
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Completion Banner */}
          {showFinalBanner && (
            <div className="completion-banner">
              <div className="completion-content">
                <h2>✅ All done!</h2>
                <p>Thank you for confirming your instructions. We have emailed you a confirmation, and no further action is required at this time. The solicitor now has your file and will handle the next steps.</p>
              </div>
            </div>
          )}
        </div>

  {/* Summary sidebar removed per UX simplification */}
      </main>
    </div>
  );
};

export default HomePage;
