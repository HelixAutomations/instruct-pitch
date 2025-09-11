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
import { useNavigate } from 'react-router-dom';
import { scrollIntoViewIfNeeded } from '../utils/scroll';
import { useCompletion } from '../context/CompletionContext';
import {
// (Icons removed with old summary/review UI)
} from 'react-icons/fa';
import ProofOfId from './ProofOfId';
import '../styles/HomePage.css';
import '../styles/modern-checkout.css';
import { ProofData } from '../context/ProofData';
import { PaymentDetails } from '../context/PaymentDetails';
// Removed summary/review dependencies
import PremiumCheckout from '../components/premium/PremiumCheckout';
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
  onCurrentStepChange?: (step: 'identity' | 'payment') => void; // documents removed
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
  onCurrentStepChange,
}) => {
  // --- STATE & STEP HANDLING (simplified after sidebar removal) ---
  const navigate = useNavigate();
  const [currentCheckoutStep, setCurrentCheckoutStep] = useState<'identity'|'payment'>('identity');
  
  // Wrapper function to handle step changes
  const updateCurrentStep = useCallback((step: 'identity'|'payment') => {
    setCurrentCheckoutStep(step);
    onCurrentStepChange?.(step);
  }, [onCurrentStepChange]);
  
  // Payment availability - no longer restricted by passcode
  const paymentsDisabled = false; // TODO: Connect to server-side paymentsOff flag if needed
  const [instructionReady, setInstructionReady] = useState(false);
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  // instruction declared later; use a ref pattern by deferring showPaymentStep calculation
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  // checkoutSteps removed (UI can infer current step directly)

  // getCurrentStepIndex removed (single forward navigation)
  // nextStep removed (two-step flow)
  // prevStep no longer needed (only forward navigation)
  const goToStep = (stepKey: 'identity' | 'payment') => {
    updateCurrentStep(stepKey);
    // Scroll to top of form area after step change
    setTimeout(() => {
      scrollIntoViewIfNeeded(stepContentRef.current, 20);
    }, 100);
  };

  useEffect(() => { if (onGreetingChange) onGreetingChange(null); }, [onGreetingChange]);

  const step1Ref = useRef<HTMLDivElement>(null);
  const stepContentRef = useRef<HTMLDivElement>(null);
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
    companyCountry: 'United Kingdom',
    companyCountryCode: 'GB',
    title: '',
    titleId: undefined,
    firstName: '',
    lastName: '',
    nationality: 'United Kingdom',
    nationalityCode: 'GB',
    houseNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: 'United Kingdom',
    countryCode: 'GB',
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
  const [dealFetchAttempted, setDealFetchAttempted] = useState(false);
  const [instructionCompleted, setInstructionCompleted] = useState(false);

  // Uploaded files type (lightweight)
  // UploadedFile interface removed (documents step removed)

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
        // Include prefill data and HelixContact for initial stage
        const allowed: Partial<ProofData> = {} as Partial<ProofData>;
        for (const key of ALLOWED_FIELDS) {
          if (key in proofData && (proofData as any)[key]) (allowed as any)[key] = (proofData as any)[key];
        }
        payload = { ...payload, ...allowed, internalStatus: 'pitch' };
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
  }, [instruction.instructionRef, proofData]);

  const loadInstruction = useCallback(async () => {
    if (!instruction.instructionRef) return Promise.resolve();
    try {
      const res = await fetch(`/api/instruction?instructionRef=${encodeURIComponent(instruction.instructionRef)}`);
      if (!res.ok) throw new Error('Failed to load instruction');
      const data = await res.json();
      if (data) {
        if (data.Stage === 'completed') {
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
      console.error('Failed to load instruction', err);
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
        if (process.env.NODE_ENV !== 'production') {
          console.log('✅ Prefilled data loaded');
        }
      };

      // Always initialize instruction (even if prefill fails)
      const initializeInstruction = async () => {
        if (instruction.instructionRef && !instructionReady && !initializationAttempted) {
          setInitializationAttempted(true);
          try {
            // First load existing instruction data (including amount)
            await loadInstruction();
            // Then save any updates/initialization
            await saveInstruction('initialised');
            setInstructionReady(true);
          } catch (err) {
            console.error('Failed to initialize instruction:', err);
            setInitializationAttempted(false); // Allow retry on error
          }
        }
      };

      const existing = window.helixPrefillData;
      if (existing) {
        apply(existing);
        await initializeInstruction();
        return;
      }

      if (!clientId) {
        await initializeInstruction();
        return;
      }

      try {
        const res = await fetch(
          `/api/internal/fetch-instruction-data?cid=${encodeURIComponent(clientId)}`
        );
        
        // If server is still initializing, retry once after a short delay
        if (res.status === 503) {
          const errorData = await res.json().catch(() => ({}));
          const retryAfter = errorData.retryAfter || 3;
          console.log(`Server initializing, retrying in ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          
          const retryRes = await fetch(
            `/api/internal/fetch-instruction-data?cid=${encodeURIComponent(clientId)}`
          );
          if (!retryRes.ok) throw new Error(`Retry failed: ${retryRes.status}`);
          const data = await retryRes.json();
          (window as any).helixPrefillData = data;
          apply(data);
        } else if (res.ok) {
          const data = await res.json();
          (window as any).helixPrefillData = data;
          apply(data);
        } else {
          throw new Error('Fetch failed');
        }
      } catch (err) {
        console.error('prefill fetch error', err);
        // Don't call apply() on error - this prevents the misleading "✅ Prefilled data loaded" message
      }
      
      // Always try to initialize instruction, even if prefill failed
      await initializeInstruction();
    }

    maybeFetchPrefill();
  
    if (process.env.NODE_ENV !== 'production') {
      console.log('[HomePage] prefill data available');
    }
  }, [clientId, instruction.instructionRef, instructionReady, initializationAttempted]);

  // TODO: Add Stripe payment preloading here when implementing Stripe integration
  
  // TODO: Add Stripe payment preloading here when implementing Stripe integration


  const [] = useState<PaymentDetails>({ cardNumber: '', expiry: '', cvv: '' });

  // instructionReady declared earlier (moved up)
  // instructionError state removed (no longer displayed in trimmed flow)

  // Debug: log payment visibility state to help diagnose missing step 2
  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[HomePage] payment debug', {
        passcode,
        paymentsDisabled: false,
        instructionRef: instruction.instructionRef,
        instructionAmount: instruction.amount,
        hasDeal: instruction.amount > 0,
        prefetchPayment: instruction.amount > 0,
        instructionReady,
      });
    } catch (e) {
      // swallow logging errors
    }
  }, [passcode, instruction.instructionRef, instruction.amount, instructionReady]);

  const [isIdReviewDone, setIdReviewDone] = useState(false);
  // Uploads handled on success page now
  // Upload step removed (handled on success page)
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

  // Removed auto-complete inspection; explicit Next click governs completion now.

  const idExpiry = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('en-GB');
  }, []);

  // Steps are considered locked once the final banner is shown or the
  // instruction is marked completed server-side. At this stage we no
  // longer want users editing earlier steps.
  const stepsLocked = instructionCompleted;

  // Track editing state and whether any changes have been made
  // Removed editing/review state

  // Clear any persisted progress on first load so refreshing starts clean
  useEffect(() => {
    sessionStorage.removeItem('paymentDone');
    sessionStorage.removeItem(`uploadedDocs-${passcode}-${instructionRef}`);
  }, [passcode, instructionRef]);

  // Once ID details are marked complete, keep the state unless the user
  // explicitly clears required fields and tries to proceed again.
  // Removed auto-complete effect: we no longer mark proof-of-id complete or POST early
  // Completion now happens only when user explicitly clicks Next on the final step.

  // handleEdit removed (legacy review)

  // Upload monitoring removed

  // Handle post-identity transition:
  //  - If amount > 0 => move to payment (avoid race with showPaymentStep effect)
  //  - If no amount or payments disabled => go to success
  useEffect(() => {
    if (returning) return;
    if (currentCheckoutStep !== 'identity') return;
    if (!isIdReviewDone || !instructionReady || !dealFetchAttempted) return;

    const hasPayableAmount = !paymentsDisabled && instruction.amount > 0;

    if (hasPayableAmount) {
      if (!showPaymentStep) {
        // Race guard: ensure payment step flag set before navigation
        setShowPaymentStep(true);
      }
      // Navigate to payment if still on identity
      goToStep('payment');
    } else {
      navigate(`/${clientId}-${passcode}/success`);
    }
  }, [returning, currentCheckoutStep, isIdReviewDone, instructionReady, dealFetchAttempted, paymentsDisabled, instruction.amount, showPaymentStep, navigate, clientId, passcode, goToStep]);

  // Handle instruction completion callback
  useEffect(() => {
    if (instructionCompleted && onInstructionConfirmed) {
      onInstructionConfirmed();
    }
  }, [instructionCompleted, onInstructionConfirmed]);

  useEffect(() => {
    if (instructionCompleted) {
      setIdReviewDone(true);
      // Always set summary complete for completed instructions
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

  // Fallback single attempt: if amount still zero post-init, fetch deal directly by passcode
  useEffect(() => {
    if (paymentsDisabled) return;
    if (!instructionReady) return;
    if (instruction.amount > 0) return;
    if (dealFetchAttempted) return;
    if (!passcode) return;
    (async () => {
      try {
        const res = await fetch(`/api/getDealByPasscodeIncludingLinked?passcode=${encodeURIComponent(passcode)}`);
        setDealFetchAttempted(true);
        if (!res.ok) return;
        const deal = await res.json();
        if (deal && typeof deal.Amount === 'number' && deal.Amount > 0) {
          setInstruction(prev => ({
            ...prev,
            amount: Number(deal.Amount),
            product: deal.ServiceDescription || prev.product,
            workType: deal.AreaOfWork || prev.workType,
          }));
        }
      } catch {
        setDealFetchAttempted(true);
      }
    })();
  }, [paymentsDisabled, instructionReady, instruction.amount, dealFetchAttempted, passcode]);

  // Removed paymentData tracking effect (paymentData no longer in scope)

  // If payment step disappears (e.g. amount becomes 0) and we're on it, go back
  useEffect(() => {
    if (currentCheckoutStep === 'payment' && !showPaymentStep) {
      navigate(`/${clientId}-${passcode}/success`);
    }
  }, [currentCheckoutStep, showPaymentStep, navigate, clientId, passcode]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
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

      {/* Step Content */}
      <div ref={stepContentRef}>
        {/* Identity Verification */}
        {currentCheckoutStep === 'identity' && (
          <>
            <ProofOfId
              value={proofData}
              onUpdate={setProofData}
              setIsComplete={setIdReviewDone}
              onNext={(skipToPayment) => {
                // Explicit user confirmation path. Ensure we flag completion & save once.
                if (!isIdReviewDone) {
                  setIdReviewDone(true);
                  debouncedSaveInstruction('proof-of-id-complete', 50); // immediate (tiny delay to batch)
                }
                // Subsequent invokes still ensure stage persisted (idempotent server-side)
                else {
                  debouncedSaveInstruction('proof-of-id-complete', 250);
                }

                const shouldShowPayment = !paymentsDisabled && (skipToPayment || instruction.amount > 0 || !dealFetchAttempted);
                if (shouldShowPayment) {
                  if (!dealFetchAttempted && instruction.amount === 0) setDealFetchAttempted(true);
                  setShowPaymentStep(true);
                  setTimeout(() => goToStep('payment'), 60);
                } else {
                  navigate(`/${clientId}-${passcode}/success`);
                }
              }}
              onSkipToStep={(step) => {
                setIdReviewDone(true);
                if (step === 'payment') {
                  if (!dealFetchAttempted && instruction.amount === 0) setDealFetchAttempted(true);
                  setShowPaymentStep(true);
                  setTimeout(() => goToStep('payment'), 60);
                } else {
                  navigate(`/${clientId}-${passcode}/success`);
                }
              }}
            />

            {/* Legacy step-navigation removed; premium navigation inside ProofOfId handles progression & dev skips */}
          </>
        )}

  {/* Documents step removed */}

        {/* Payment */}
        {currentCheckoutStep === 'payment' && showPaymentStep && (
          <>
            {!paymentsDisabled && (
              <PremiumCheckout
                instructionRef={instruction.instructionRef}
                onComplete={() => {
                  console.log('HomePage: Premium checkout completed');
                  navigate(`/${clientId}-${passcode}/success`);
                }}
              />
            )}

            {/* Legacy payment navigation removed; premium components manage completion */}
          </>
        )}
      </div>
    </>
  );
};

export default HomePage;
