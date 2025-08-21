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

import React, { useState, useEffect, useRef, useMemo, JSX } from 'react';
import { scrollIntoViewIfNeeded } from '../utils/scroll';
import { useCompletion } from '../context/CompletionContext';
import {
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaCity,
  FaIdCard,
  FaUserTie,
  FaFilePdf,
  FaFileImage,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileArchive,
  FaFileAlt,
  FaFileAudio,
  FaFileVideo,
  FaFileUpload,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
} from 'react-icons/fa';
import ProofOfId from './ProofOfId';
import DocumentUpload from './DocumentUpload';
import ReviewConfirm from './ReviewConfirm';
import '../styles/HomePage.css';
import { ProofData } from '../context/ProofData';
import SummaryReview from './SummaryReview';
import { CSSTransition } from 'react-transition-group';
import { toTitleCase } from '../utils/format';
import { PaymentExample } from '../components/PaymentExample';
import InfoPopover from '../components/InfoPopover';
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
  onInstructionConfirmed?: () => void;
  onGreetingChange?: (greeting: string | null) => void;
  onContactInfoChange?: (info: { feeEarner?: string }) => void;
  feeEarner?: string;
}

interface StepHeaderProps {
  step: number;
  title: React.ReactNode;
  complete: boolean;
  open: boolean;
  toggle: () => void;
  locked?: boolean;
  onEdit?: () => void;
  editable?: boolean;
  /**
   * Allow the step to be toggled even when locked.
   * This lets the content be revealed in a read‑only state.
   */
  allowToggleWhenLocked?: boolean;
  /**
   * Dim the header when locked. Defaults to true for backwards
   * compatibility.
   */
  dimOnLock?: boolean;
}

interface UploadedFile {
  file: File;
  uploaded: boolean;
}

const iconMap: Record<string, JSX.Element> = {
  pdf: <FaFilePdf className="section-icon" />,
  doc: <FaFileWord className="section-icon" />,
  docx: <FaFileWord className="section-icon" />,
  xls: <FaFileExcel className="section-icon" />,
  xlsx: <FaFileExcel className="section-icon" />,
  ppt: <FaFilePowerpoint className="section-icon" />,
  pptx: <FaFilePowerpoint className="section-icon" />,
  txt: <FaFileAlt className="section-icon" />,
  zip: <FaFileArchive className="section-icon" />,
  rar: <FaFileArchive className="section-icon" />,
  jpg: <FaFileImage className="section-icon" />,
  jpeg: <FaFileImage className="section-icon" />,
  png: <FaFileImage className="section-icon" />,
  mp3: <FaFileAudio className="section-icon" />,
  mp4: <FaFileVideo className="section-icon" />,
};

const getFileIcon = (filename?: string): JSX.Element => {
  if (!filename) return <FaFileUpload className="section-icon" />;
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return iconMap[ext] || <FaFileAlt className="section-icon" />;
};

const StepHeader: React.FC<StepHeaderProps> = ({
  step,
  title,
  complete,
  open,
  toggle,
  locked = false,
  onEdit,
  editable = true,
  allowToggleWhenLocked = false,
  dimOnLock = true,
}) => {
  // dark-blue skin when the step is CLOSED and NOT complete
  const attention = !open && !complete;
  const { summaryComplete } = useCompletion();

  const showTick = step === 1 ? summaryComplete : complete;
  const showEdit = editable && !open && !locked && showTick;

  return (
    <div
      className={
        `step-header${open ? ' active' : ''}${locked ? ' locked' : ''}${attention ? ' attention' : ''}`
      }
      onClick={() => {
        if (!locked || allowToggleWhenLocked) toggle();
      }}
      style={
        locked
          ? {
              cursor: allowToggleWhenLocked ? 'pointer' : 'not-allowed',
              opacity: dimOnLock ? 0.5 : 1,
            }
          : undefined
      }
      tabIndex={locked && !allowToggleWhenLocked ? -1 : 0}
      aria-disabled={locked && !allowToggleWhenLocked}
    >
      <div className="step-number">{step}</div>
      <h2>
        {title}
        {showTick && (
          <span className="completion-tick visible">
            <svg viewBox="0 0 24 24">
              <polyline
                points="5,13 10,18 19,7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
        {/* keep tick only when locked, no padlock icon */}
      </h2>
      {showEdit && (
        <FaEdit
          className="edit-step"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
            toggle();
          }}
        />
      )}
      <span className="toggle-icon">{open ? '−' : '+'}</span>
    </div>
  );
};

const DUMMY_DEAL = {
  amount: 999,
  product: 'Local Development Deal',
  workType: 'Demo Work',
  matterId: null,
};


const HomePage: React.FC<HomePageProps> = ({
  step1Reveal,
  clientId,
  passcode,
  instructionRef,
  returning,
  feeEarner,
  onInstructionConfirmed,
  onGreetingChange,
  onContactInfoChange,
}) => {
  // params parsing removed (was only for legacy payment redirect)
  // removed paymentData state (unused after premium/payment refactor)

  // updatePaymentData removed (unused)
// with
  const [instruction, setInstruction] = useState({
    instructionRef,
    amount: 0,
    product: '',
    workType: 'Shareholder Dispute',
    pitchedAt: new Date().toISOString(),
    matterId: null as string | null,
  });

  // Keep internal instruction reference in sync with prop updates. This ensures
  // the payment step receives a valid orderId generated by the backend.
  useEffect(() => {
    if (
      instructionRef &&
      instructionRef !== instruction.instructionRef
    ) {
      setInstruction(prev => ({ ...prev, instructionRef }));
    }
  }, [instructionRef]);

  useEffect(() => {
    if (!instruction.instructionRef) return;
    fetch(`/api/instruction?instructionRef=${instruction.instructionRef}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const {
            stage,
            Stage: StageCap,
            PaymentAmount,
            PaymentProduct,
            WorkType,
            ...rest
          } = data;
          const mergedStage = stage || StageCap;
          setProofData(prev => ({ ...prev, ...rest }));
          setInstruction(prev => ({
            ...prev,
            amount: PaymentAmount != null ? Number(PaymentAmount) : prev.amount,
            product: PaymentProduct ?? prev.product,
            workType: WorkType ?? prev.workType,
            matterId: rest.MatterId ?? prev.matterId,
          }));
          if (mergedStage === 'completed') {
            setInstructionCompleted(true);
            if (data.InternalStatus === 'paid') {
              const fname = rest.FirstName || '';
              const hr = new Date().getHours();
              const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
              setCompletionGreeting(`${greet}, ${fname}.`);
            }
            setInstructionReady(true);
          } else {
            setInstructionReady(true);
          }
        } else {
          saveInstruction('initialised')
            .then((saved) => {
              if (saved) {
                setInstruction(prev => ({
                  ...prev,
                  amount: saved.PaymentAmount != null ? Number(saved.PaymentAmount) : prev.amount,
                  product: saved.PaymentProduct ?? prev.product,
                  workType: saved.WorkType ?? prev.workType,
                  matterId: saved.MatterId ?? prev.matterId,
                }));
              } else if (import.meta.env.DEV) {
                setInstruction(prev => ({ ...prev, ...DUMMY_DEAL }));
              }
              setInstructionReady(true);
            })
            .catch(() => {
              if (import.meta.env.DEV) {
                setInstruction(prev => ({ ...prev, ...DUMMY_DEAL }));
              }
              setInstructionReady(true);
            });

        }
      })
      .catch(() => {
        if (import.meta.env.DEV) {
          setInstruction(prev => ({ ...prev, ...DUMMY_DEAL }));
          setInstructionReady(true);
        }
      });
  }, [instruction.instructionRef]);

  // Payment system: Enable Stripe integration only for test passcode 20200
  // For all other users, payments remain disabled during transition
  const paymentsDisabled = passcode !== '20200' && passcode !== '85490'; // Allow payments for test deal too
  
  // ACCEPT_URL / EXCEPTION_URL removed (unused legacy constructs)
  // Enable payment preloading for test passcode 20200 when Stripe is active
  const prefetchPayment = !paymentsDisabled && instruction.amount > 0;

  // Allow viewing the payment step locally for the test passcode so devs can preview it
  
  
  const [openStep, setOpenStep] = useState<0 | 1 | 2 | 3>(0);
  const [closingStep, setClosingStep] = useState<0 | 1 | 2 | 3>(0);
  // Consider a deal present if we have a non-zero amount OR product/workType metadata
  // This covers cases where the backend returns product/service but amount may be zero/null
  const hasDeal = instruction.amount > 0 || Boolean(instruction.product) || Boolean(instruction.workType);
  const showPaymentStep = hasDeal && (!paymentsDisabled || (import.meta.env && import.meta.env.DEV && passcode === '20200'));
  // When payments are disabled we collapse the payment step so Documents
  // becomes step 2 instead of step 3. This keeps the UI numbering simple
  // while avoiding rendering the payment UI at all.
  const paymentStepNumber: number | null = paymentsDisabled ? null : 2;
  const documentsStepNumber: number = paymentsDisabled ? 2 : 3;
  const maxStep = documentsStepNumber; // Always show documents step regardless of deal amount
  const [dealStepsVisible, setDealStepsVisible] = useState(false);
  const [documentsStepVisible, setDocumentsStepVisible] = useState(false);
  const [proofStartStep, setProofStartStep] = useState<number>(1);
  const [restartId, setRestartId] = useState(0);
  const [instructionCompleted, setInstructionCompleted] = useState(false);
  const [completionGreeting, setCompletionGreeting] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (onGreetingChange) {
      onGreetingChange(completionGreeting);
    }
  }, [completionGreeting, onGreetingChange]);

  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Always show deal steps and documents step
    setDealStepsVisible(true);
    const t = setTimeout(() => setDocumentsStepVisible(true), 200);
    return () => clearTimeout(t);
  }, []); // Remove hasDeal dependency to always show steps

  const goToStep = (target: 0 | 1 | 2 | 3) => {
    if (openStep !== target) {
      if (openStep !== 0) setClosingStep(openStep);
      setOpenStep(target);
    }
  };

  useEffect(() => {
    if (!closingStep) return;
    const t = setTimeout(() => setClosingStep(0), 400);
    return () => clearTimeout(t);
  }, [closingStep]);

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

  useEffect(() => {
    if (onContactInfoChange) {
      onContactInfoChange({
        feeEarner: proofData.helixContact,
      });
    }
  }, [proofData.helixContact, onContactInfoChange]);

  const saveInstruction = async (stage: string) => {
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
  };

  useEffect(() => {
    if (instructionCompleted) {
      goToStep(0);
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
  // paymentDetails state removed (unused)
  const [isUploadSkipped, setUploadSkipped] = useState(false);

  const [instructionReady, setInstructionReady] = useState(false);
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
        openStep,
      });
    } catch (e) {
      // swallow logging errors
    }
  }, [passcode, instruction.instructionRef, instruction.amount, instructionReady, openStep]);

  // Debug logging for payment visibility
  console.log('[HomePage] Payment visibility check:', {
    passcode,
    paymentsDisabled,
    hasDeal,
    instructionAmount: instruction.amount,
    instructionReady,
    paymentStepNumber,
    documentsStepNumber,
    maxStep
  });

  const [isIdReviewDone, setIdReviewDone] = useState(false);
  const [isUploadDone, setUploadDone] = useState(false);
  const [isPaymentDone, setPaymentDone] = useState(paymentsDisabled ? true : false);
  const [expiryText, setExpiryText] = useState('');
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const [showFinalBanner, setShowFinalBanner] = useState(false);
  const { summaryComplete, setSummaryComplete } = useCompletion();

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
  const [editing, setEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState<ProofData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
    setDetailsConfirmed(false);
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
    if (!isIdReviewDone && isIdInfoComplete()) {
      setIdReviewDone(true);
      // Auto-save proof of ID completion when Step 1 is complete
      saveInstruction('proof-of-id-complete');
    }
  }, [proofData, isIdReviewDone]);

  const handleEdit = (startStep = 1) => {
    setEditBaseline(proofData);
    setEditing(true);
    setShowReview(false);
    goToStep(1);
    setRestartId((r) => r + 1);
    setProofStartStep(startStep);
    scrollIntoViewIfNeeded(step1Ref.current);
  };
  const handleEditSection = (stepNum: number) => {
    handleEdit(stepNum);
  };
  useEffect(() => {
    const isComplete = uploadedFiles.some(f => f.uploaded);
    setUploadDone(isComplete);
  }, [uploadedFiles]);

  useEffect(() => {
    if (
      !returning &&
      (isUploadDone || isUploadSkipped) &&
    openStep !== documentsStepNumber &&
      !showFinalBanner
    ) {
      setShowFinalBanner(true);
    }
  }, [isUploadDone, isUploadSkipped, showFinalBanner, openStep, returning, documentsStepNumber]);

  useEffect(() => {
    if (openStep === documentsStepNumber) {
      setShowFinalBanner(false);
    }
  }, [openStep, documentsStepNumber]);

  useEffect(() => {
    if (showFinalBanner) {
      goToStep(0);
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
      setDetailsConfirmed(true);
    }
  }, [instructionCompleted, setSummaryComplete]);


  // Watch for changes during an edit session
  useEffect(() => {
    if (editing && editBaseline) {
      const changed = JSON.stringify(proofData) !== JSON.stringify(editBaseline);
      setHasChanges(changed);
      if (changed) {
        setSummaryComplete(false);
        setDetailsConfirmed(false);
      }
    }
  }, [proofData, editing, editBaseline]);

  // Clear change flag once details are reconfirmed
  useEffect(() => {
    if (detailsConfirmed) {
      setHasChanges(false);
    }
  }, [detailsConfirmed]);

  const [pulse, setPulse] = useState(false);
  const [pulseStep, setPulseStep] = useState<0 | 1 | 2 | 3>(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (openStep !== 0) {
      setPulseStep(openStep);
      setPulse(true);
      interval = setInterval(() => {
        setPulse(false);
        setTimeout(() => setPulse(true), 50);
      }, 5000);
    }
    return () => {
      clearInterval(interval);
      setPulse(false);
    };
  }, [openStep]);

function getPulseClass(step: number, done: boolean, isEditing = false) {
  return openStep === step && pulse && pulseStep === step && done && !isEditing
    ? ' pulse-green'
    : '';
}

  useEffect(() => {
    // Only auto-open Step 1 for new arrivals when steps are not locked and
    // no other step is currently open. This avoids auto-expanding a locked
    // Step 1 (greyed out) or interrupting the user's current view.
    if (step1Reveal && !returning && !stepsLocked && openStep === 0) {
      goToStep(1);
    }
  }, [step1Reveal, returning]);

  const initialStepScrollSkipped = useRef(false);
  useEffect(() => {
    const refs = paymentsDisabled ? [step1Ref, step3Ref] : [step1Ref, step2Ref, step3Ref];
    if (openStep > 0) {
      if (
        openStep === 1 &&
        !initialStepScrollSkipped.current &&
        window.scrollY === 0
      ) {
        initialStepScrollSkipped.current = true;
        return;
      }
      scrollIntoViewIfNeeded(refs[openStep - 1]?.current);
    }
  }, [openStep, paymentsDisabled]);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  );
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function isIdInfoComplete() {
    return [
      proofData.idStatus,
      proofData.title,
      proofData.firstName,
      proofData.lastName,
      proofData.nationality,
      proofData.idNumber,
    ].every((f) => f && f.toString().trim());
  }

  const nameParts = [proofData.title, proofData.firstName, proofData.lastName];
  const hasFullName = nameParts.every(p => p && p.trim());

  const formattedNameParts = [
    proofData.title,
    proofData.firstName ? toTitleCase(proofData.firstName) : undefined,
    proofData.lastName ? toTitleCase(proofData.lastName) : undefined,
  ];

  const hasCompanyName = !!proofData.companyName && proofData.companyName.trim();
  const hasCompanyNumber = !!proofData.companyNumber && proofData.companyNumber.trim();

const proofSummary = (
  <> 
    {/* Info prompt always shown at the top */}
    {(proofData.idStatus === 'first-time' || proofData.idStatus === 'renewing') && (
      <div className="group">
        <p>
          {proofData.idStatus === 'first-time'
            ? 'You are providing proof of your identity for the first time.'
            : 'You are renewing proof of your identity.'}
        </p>
        <hr />
      </div>
    )}

    {/* Company Details if applicable */}
    <CSSTransition
      in={!!proofData.isCompanyClient}
      timeout={250}
      classNames="summary-company-anim"
      unmountOnExit
    >
      <div className="group" id="summary-company">
        <div className="summary-group-header">
          <span>Company Details</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(2)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
        <FaCity className="backdrop-icon" />
        <p>
          <span className="field-label">Client:</span>{' '}
          <span className="field-value">Yes</span>
        </p>
        <p>
          <span className="field-label">Name:</span>{' '}
          <span className={`field-value${!hasCompanyName ? ' empty' : ''}`}>{proofData.companyName?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Number:</span>{' '}
          <span className={`field-value${!hasCompanyNumber ? ' empty' : ''}`}>{proofData.companyNumber?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Address:</span>
        </p>
        <div className="data-text" style={{ color: 'inherit', lineHeight: 1.5 }}>
          <div>
            <span className={!proofData.companyHouseNumber?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyHouseNumber?.trim() || 'House Number'}
            </span>,&nbsp;
            <span className={!proofData.companyStreet?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyStreet?.trim() ? toTitleCase(proofData.companyStreet.trim()) : 'Street'}
            </span>
          </div>
          <div>
            <span className={!proofData.companyCity?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyCity?.trim() ? toTitleCase(proofData.companyCity.trim()) : 'City'}
            </span>,&nbsp;
            <span className={!proofData.companyCounty?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyCounty?.trim() ? toTitleCase(proofData.companyCounty.trim()) : 'County'}
            </span>
          </div>
          <div>
            <span className={!proofData.companyPostcode?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyPostcode?.trim() || 'Postcode'}
            </span>,&nbsp;
            <span className={!proofData.companyCountry?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyCountry?.trim() || 'Country'}
            </span>
          </div>
        </div>
        <hr />
      </div>
    </CSSTransition>

      <div className="group" id="summary-personal">
        <div className="summary-group-header">
          <span>Personal Details</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(2)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
        <FaUser className="backdrop-icon" />
        <p>
          <span className="field-label">Name:</span>{' '}
          <span className={`field-value${!hasFullName ? ' empty' : ''}`}>{formattedNameParts.filter(Boolean).join(' ') || '--'}</span>
        </p>
        <p>
          <span className="field-label">Gender:</span>{' '}
          <span className={`field-value${!proofData.gender?.trim() ? ' empty' : ''}`}>{proofData.gender?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Date of Birth:</span>{' '}
          <span className={`field-value${!proofData.dob?.trim() ? ' empty' : ''}`}>{proofData.dob?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Nationality:</span>{' '}
          <span className={`field-value${!proofData.nationality?.trim() ? ' empty' : ''}`}>{proofData.nationality?.trim() || '--'}</span>
        </p>
        <hr />
      </div>
      <div className="group" id="summary-address">
        <div className="summary-group-header">
          <span>Address</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(2)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
        <FaMapMarkerAlt className="backdrop-icon" />
        <div className="data-text" style={{ color: 'inherit', lineHeight: 1.5 }}>
          <div>
            <span className={!proofData.houseNumber?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.houseNumber?.trim() || 'House Number'}</span>
            ,&nbsp;
            <span className={!proofData.street?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.street?.trim() ? toTitleCase(proofData.street.trim()) : 'Street'}</span>
          </div>
          <div>
            <span className={!proofData.city?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.city?.trim() ? toTitleCase(proofData.city.trim()) : 'City'}</span>
            ,&nbsp;
            <span className={!proofData.county?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.county?.trim() ? toTitleCase(proofData.county.trim()) : 'County'}</span>
          </div>
          <div>            <span className={!proofData.city?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.city?.trim() || 'City'}</span>
            <span className={!proofData.postcode?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.postcode?.trim() || 'Postcode'}</span>
            ,&nbsp;
            <span className={!proofData.country?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.country?.trim() || 'Country'}</span>
          </div>
        </div>
        <hr />
      </div>
      <div className="group" id="summary-contact">
        <div className="summary-group-header">
          <span>Contact Details</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(2)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
        <FaPhone className="backdrop-icon" />
        <p>
          <span className="field-label">Phone:</span>{' '}
          <span className={`field-value${!proofData.phone?.trim() ? ' empty' : ''}`}>{proofData.phone?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Email:</span>{' '}
          <span className={`field-value${!proofData.email?.trim() ? ' empty' : ''}`}>{proofData.email?.trim() ? proofData.email.trim().toLowerCase() : '--'}</span>
        </p>
        <hr />
      </div>
      <div className="group" id="summary-id">
        <div className="summary-group-header">
          <span>ID Details</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(3)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
        <FaIdCard className="backdrop-icon" />
        <p>
          <span className="field-label">Type:</span>{' '}
          <span className={`field-value${!proofData.idType?.trim() ? ' empty' : ''}`}>{proofData.idType?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Number:</span>{' '}
          <span className={`field-value${!proofData.idNumber?.trim() ? ' empty' : ''}`}>{proofData.idNumber?.trim() || '--'}</span>
        </p>
        <hr />
      </div>
      <div className="group" id="summary-helix">
        {/* Solicitor information */}
      <div className="summary-group-header">
          <span>Helix Contact</span>
          {showReview && !detailsConfirmed && (
            <button
              type="button"
              className="summary-edit-btn visible"
              onClick={() => handleEditSection(3)}
            >
              <FaEdit />
              <span>Edit</span>
            </button>
          )}
        </div>
      <FaUserTie className="backdrop-icon" />
      <p>
        <span className="field-label">Solicitor:</span>{' '}
        <span className={`field-value${!proofData.helixContact?.trim() ? ' empty' : ''}`}>{proofData.helixContact?.trim() || '--'}</span>
      </p>
      <p className="system-info">
        <span className="field-label">Ref:</span>{' '}
        <span className="system-info-text">{instruction.instructionRef}</span>
      </p>
    </div>
  </>
  );

  const documentsSummary = isUploadSkipped ? (
    <span className="field-value">File upload skipped.</span>
  ) : uploadedFiles.length ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {uploadedFiles.map((f, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'nowrap',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <span style={{ flexShrink: 0 }}>{getFileIcon(f.file.name)}</span>
          <span
            style={{
              fontSize: '0.95rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flexGrow: 1,
            }}
            title={f.file.name}
          >
            {f.file.name}
          </span>
          {f.uploaded ? (
            <FaCheckCircle className="summary-file-check" />
          ) : (
            <FaTimesCircle className="summary-file-check" style={{ color: 'crimson' }} />
          )}
        </div>
      ))}
    </div>
  ) : (
    <span className="field-value">--</span>
  );

  const next = (skipReview?: boolean) => {
    if (openStep === 1 && !showReview) {
      if (skipReview && summaryComplete) {
        setEditing(false);
        const target = hasDeal
          ? (isPaymentDone ? documentsStepNumber : (paymentStepNumber ?? documentsStepNumber))
          : 1;
        goToStep(target as 0 | 1 | 2 | 3);
      } else {
        setShowReview(true);
      }
      return;
    }
    if (openStep === 1 && showReview) {
      setEditing(false);
    }
    // If the payment step exists and payment completes, jump to documents.
    if (typeof paymentStepNumber === 'number' && openStep === paymentStepNumber && isPaymentDone) {
      goToStep(documentsStepNumber as 0 | 1 | 2 | 3);
      return;
    }
    if (openStep === documentsStepNumber) {
      goToStep(0);
      return;
    }
    goToStep(openStep < maxStep ? ((openStep + 1) as any) : openStep);
  };
  const back = () => {
    if (openStep === 1 && showReview) {
      setShowReview(false);
      return;
    }
    let target = openStep > 1 ? ((openStep - 1) as 0 | 1 | 2 | 3) : openStep;
    if (target === 2 && isPaymentDone) {
      target = 1;
    }
    goToStep(target);
  };

  // removed effect that persisted legacy payment redirect data

  return (
    <div className="home-page">
      <main className="main-content">
        <div className="checkout-container">
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
          <div className="steps-column">

            <div ref={step1Ref} className={`step-section${openStep === 1 ? ' revealed active' : ''}`}>
              <StepHeader
                step={1}
                title="Prove Your Identity"
                complete={isIdReviewDone}
                open={openStep === 1}
                toggle={() => goToStep(openStep === 1 ? 0 : 1)}
                locked={stepsLocked}
                editable={!stepsLocked}
                onEdit={stepsLocked ? undefined : handleEdit}
                allowToggleWhenLocked={true}
                dimOnLock={false}
              />
              <div
                className={`step-content${openStep === 1 ? ' active' : ''}${getPulseClass(1, isIdReviewDone, editing)}`}
              >
                {(openStep === 1 || closingStep === 1) && (
                  !showReview ? (
                    <ProofOfId
                      key={restartId}
                      value={proofData}
                      onUpdate={setProofData}
                      setIsComplete={setIdReviewDone}
                      onNext={next}
                      editing={editing}
                      hasChanges={hasChanges}
                      startStep={proofStartStep}
                    />
                  ) : (
                    <ReviewConfirm
                      detailsConfirmed={detailsConfirmed}
                      openSummaryPanel={() => {}}
                      summaryContent={isMobile ? (
                        <SummaryReview
                          proofContent={proofSummary}
                          documentsContent={documentsSummary}
                          detailsConfirmed={detailsConfirmed}
                          setDetailsConfirmed={setDetailsConfirmed}
                          showConfirmation={showReview && !stepsLocked}
                          edited={hasChanges}
                        />
                      ) : undefined}
                      isMobile={isMobile}
                      instructionRef={instruction.instructionRef}
                      proofData={proofData}
                      amount={instruction.amount}
                      product={instruction.product}
                      workType={instruction.workType}
                      aliasId={undefined}
                      orderId={undefined}
                      shaSign={undefined}
                      onConfirmed={next}
                      onEdit={handleEdit}
                    />
                  )
                )}
              </div>
            </div>

            {showPaymentStep && (
              <CSSTransition
                in={dealStepsVisible}
                timeout={300}
                classNames="deal-steps-anim"
                unmountOnExit
              >
                <div ref={step2Ref} className={`step-section${openStep === 2 ? ' active' : ''}`}>
                  <StepHeader
                    step={2}
                    title="Pay"
                    complete={isPaymentDone}
                    open={openStep === 2}
                    toggle={() => goToStep(openStep === 2 ? 0 : 2)}
                    locked={stepsLocked}
                    editable={!stepsLocked}
                    allowToggleWhenLocked={true}
                    dimOnLock={false}
                  />
                  <div className={`step-content${openStep === 2 ? ' active payment-noscroll' : ''}${getPulseClass(2, isPaymentDone)}`}>
                    {!isPaymentDone && (
                      <div className="service-summary-box">
                        <div className="question-banner">Service Summary</div>
                        <div className="service-summary-grid">
                          {proofData.helixContact && (
                            <div className="summary-item">
                              <div className="summary-label">Solicitor</div>
                              <div className="summary-value">{proofData.helixContact.split(' ')[0]}</div>
                            </div>
                          )}
                          <div className="summary-item">
                            <div className="summary-label">
                              Expires in{' '}
                              <InfoPopover text="Please note that this fee quotation is subject to a time limit and must be accepted before the stated expiry date to remain valid." />
                            </div>
                            <div className="summary-value">{expiryText}</div>
                          </div>
                          <div className="summary-item">
                            <div className="summary-label">
                              Amount <span className="summary-note">(inc. VAT)</span>
                            </div>
                            <div className="summary-value amount-value">£{formatAmount(instruction.amount)}</div>
                          </div>
                        </div>
                        {proofData.helixContact && (
                          <p className="pitch-description">
                            {proofData.helixContact.split(' ')[0]} will begin work on {instruction.product} once your ID is verified and your matter is open. The fee is £{formatAmount(instruction.amount)} including VAT.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Premium Checkout - Modern single-page checkout experience */}
                    {!paymentsDisabled && (prefetchPayment || openStep === 2 || closingStep === 2) && (
                      <div style={{ display: openStep === 2 ? 'block' : 'none' }}>
                        {/* Clean Payment Experience */}
                        <PaymentExample 
                          instructionRef={instruction.instructionRef}
                          onSuccess={(payment) => {
                            console.log('HomePage: Payment completed successfully', payment);
                            setPaymentDone(true);
                            setTimeout(() => next(), 1500);
                          }}
                          onError={(error) => {
                            console.error('HomePage: Payment failed', error);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CSSTransition>
            )}

            <CSSTransition
              in={documentsStepVisible}
              timeout={300}
              classNames="deal-steps-anim"
              unmountOnExit
            >
              <div ref={step3Ref} className={`step-section${openStep === (documentsStepNumber as 0 | 1 | 2 | 3) ? ' active' : ''}`}>
                <StepHeader
                  step={documentsStepNumber}
                  title={
                    isUploadDone || isUploadSkipped
                      ? 'Upload Files'
                      : <>
                          Upload Files <span className="optional">(optional)</span>
                        </>
                  }
                  complete={isUploadDone || isUploadSkipped}
                  open={openStep === (documentsStepNumber as 0 | 1 | 2 | 3)}
                  toggle={() => goToStep(openStep === (documentsStepNumber as 0 | 1 | 2 | 3) ? 0 : (documentsStepNumber as 0 | 1 | 2 | 3))}
                  locked={false}
                  allowToggleWhenLocked
                  dimOnLock={false}
                />
                <div className={`step-content${openStep === (documentsStepNumber as 0 | 1 | 2 | 3) ? ' active' : ''}${getPulseClass(documentsStepNumber, isUploadDone || isUploadSkipped)}`}>
                  {(openStep === (documentsStepNumber as 0 | 1 | 2 | 3) || closingStep === (documentsStepNumber as 0 | 1 | 2 | 3)) && (
                    <DocumentUpload
                      uploadedFiles={uploadedFiles}
                      setUploadedFiles={setUploadedFiles}
                      setIsComplete={setUploadDone}
                      onBack={back}
                      onNext={next}
                      setUploadSkipped={setUploadSkipped}
                      isUploadSkipped={isUploadSkipped}
                      clientId={clientId}
                      passcode={passcode}
                      instructionRef={instruction.instructionRef}
                      instructionReady={instructionReady}
                      instructionError={instructionError}
                    />
                  )}
                </div>
              </div>
            </CSSTransition>

            {showFinalBanner && (
              <div className="completed-banner">
                Thank you for confirming your instructions. We have emailed you a confirmation, and no further action is required at this time. The solicitor now has your file and will handle the next steps.
              </div>
            )}

          </div>

          {/* Desktop: always show summary sidebar */}
          {!isMobile && (
            <aside className="summary-column">
              <SummaryReview
                proofContent={proofSummary}
                documentsContent={documentsSummary}
                detailsConfirmed={detailsConfirmed}
                setDetailsConfirmed={setDetailsConfirmed}
                showConfirmation={showReview && !stepsLocked}
                edited={hasChanges}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
