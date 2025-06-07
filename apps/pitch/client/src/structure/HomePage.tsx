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

import React, { useState, useEffect, useRef, JSX } from 'react';
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
import Payment from './Payment';
import ReviewConfirm from './ReviewConfirm';
import '../styles/HomePage.css';
import { ProofData } from '../context/ProofData';
import { PaymentDetails } from '../context/PaymentDetails';
import SummaryReview from './SummaryReview';

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
];

interface HomePageProps {
  step1Reveal?: boolean;
  clientId: string;
  instructionRef: string;
}

interface StepHeaderProps {
  step: number;
  title: React.ReactNode;
  complete: boolean;
  open: boolean;
  toggle: () => void;
  locked?: boolean;
  onEdit?: () => void;
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
}) => {
  // dark-blue skin when the step is CLOSED and NOT complete
  const attention = !open && !complete;
  const { summaryComplete } = useCompletion();

  const showTick = step === 1 ? summaryComplete : complete;
  const showEdit = !open && !locked && showTick;

  return (
    <div
      className={
        `step-header${open ? ' active' : ''}${locked ? ' locked' : ''}${attention ? ' attention' : ''}`
      }
      onClick={() => { if (!locked) toggle(); }}
      style={locked ? { cursor: 'not-allowed', opacity: 0.5 } : undefined}
      tabIndex={locked ? -1 : 0}
      aria-disabled={locked}
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
        {locked && (
          <span className="step-lock" style={{ marginLeft: 6, fontSize: '1.07em', verticalAlign: 'middle' }}>
            🔒
          </span>
        )}
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

const HomePage: React.FC<HomePageProps> = ({ step1Reveal, clientId, instructionRef }) => {
  const params = new URLSearchParams(window.location.search);
  const aliasId = params.get('Alias.AliasId');
  const orderId = params.get('Alias.OrderId');
  const shaSign = params.get('SHASign');
  const [instruction] = useState({
    instructionRef,
    amount: 0.99,
    product: 'instruction-pitch',
    workType: 'Shareholder Dispute',
  });

  const PSPID = 'epdq1717240';
  const ACCEPT_URL    = `${window.location.origin}/pitch/payment/result?result=accept&amount=${instruction.amount}&product=${instruction.product}`;
  const EXCEPTION_URL = `${window.location.origin}/pitch/payment/result?result=reject&amount=${instruction.amount}&product=${instruction.product}`;
  const [preloadedFlexUrl, setPreloadedFlexUrl] = useState<string | null>(
    process.env.NODE_ENV === 'development'
      ? `${window.location.origin}${import.meta.env.BASE_URL}assets/master_creditcard.htm`
      : null
  );
  const [prefetchPayment, setPrefetchPayment] = useState(false);
  
  const [openStep, setOpenStep] = useState<0 | 1 | 2 | 3>(0);
  const [restartId, setRestartId] = useState(0);
  const [instructionCompleted, setInstructionCompleted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);

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

  const saveInstruction = async (stage: string) => {
    if (!instruction.instructionRef) return;
    try {
      const allowed: Partial<ProofData> = {} as Partial<ProofData>;
      for (const key of ALLOWED_FIELDS) {
        if (key in proofData) (allowed as any)[key] = (proofData as any)[key];
      }
      const res = await fetch('/api/instruction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructionRef: instruction.instructionRef, stage, ...allowed })
      });
      const data = await res.json();
      if (data && data.completed) {
        setInstructionCompleted(true);
      }
    } catch (err) {
      console.error('Failed to save instruction', err);
    }
  };

  useEffect(() => {
    if (instructionCompleted) {
      setOpenStep(0);
    }
  }, [instructionCompleted]);

  useEffect(() => {
    if (!instruction.instructionRef) return;
    fetch(`/api/instruction?instructionRef=${instruction.instructionRef}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          const { stage, ...rest } = data;
          setProofData(prev => ({ ...prev, ...rest }));
          if (stage === 'completed') setInstructionCompleted(true);
        } else {
          saveInstruction('initialised');
        }
      })
      .catch(() => {});
  }, [instruction.instructionRef]);

  useEffect(() => {
    const prefill = window.helixPrefillData;
    if (prefill) {
      setProofData(prev => ({
        ...prev,
        firstName:    prefill.First_Name       ?? prev.firstName,
        lastName:     prefill.Last_Name        ?? prev.lastName,
        email:        prefill.Email            ?? prev.email,
        phone:        prefill.Phone_Number     ?? prev.phone,
        helixContact: prefill.Point_of_Contact ?? prev.helixContact,
      }));
      if (process.env.NODE_ENV !== 'production') {
        console.log('✅ Prefilled data from backend:', prefill);
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[HomePage] window.helixPrefillData:', window.helixPrefillData);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    
    const params: Record<string,string> = {
      'ACCOUNT.PSPID':           PSPID,
      'ALIAS.ORDERID':           instruction.instructionRef,
      'PARAMETERS.ACCEPTURL':    ACCEPT_URL,
      'PARAMETERS.EXCEPTIONURL': EXCEPTION_URL,
      'CARD.PAYMENTMETHOD':      'CreditCard',
      'LAYOUT.TEMPLATENAME':     'master.htm',
      'LAYOUT.LANGUAGE':         'en_GB',
      'ALIAS.STOREPERMANENTLY':  'Y',
    };

      const preload = async () => {
        try {
          const res = await fetch('/pitch/get-shasign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
          });
          const json = await res.json();
          if (res.ok && json.shasign) {
            const query = new URLSearchParams({ ...params, SHASIGN: json.shasign }).toString();
            setPreloadedFlexUrl(
              `https://mdepayments.epdq.co.uk/Tokenization/HostedPage?${query}`
            );
          }
        } catch (err) {
          console.error('Failed to preload payment form:', err);
        }
      };

      preload();
    }, []);

    useEffect(() => {
      if (!preloadedFlexUrl) return;
      const trigger = () => setPrefetchPayment(true);
      const idle = (window as any).requestIdleCallback
        ? requestIdleCallback(trigger)
        : setTimeout(trigger, 1000);
      return () => {
        if ((window as any).cancelIdleCallback) {
          cancelIdleCallback(idle as any);
        } else {
          clearTimeout(idle as any);
        }
      };
    }, [preloadedFlexUrl]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [paymentDetails] = useState<PaymentDetails>({ cardNumber: '', expiry: '', cvv: '' });
  const [isUploadSkipped, setUploadSkipped] = useState(false);

  const [instructionReady, setInstructionReady] = useState(false);
  const [instructionError, setInstructionError] = useState<string | null>(null);

  const [isIdReviewDone, setIdReviewDone] = useState(false);
  const [isUploadDone, setUploadDone] = useState(false);
  const [isPaymentDone, setPaymentDone] = useState(false);
  const [detailsConfirmed, setDetailsConfirmed] = useState(false);
  const { setSummaryComplete } = useCompletion();

  // Track editing state and whether any changes have been made
  const [editing, setEditing] = useState(false);
  const [editBaseline, setEditBaseline] = useState<ProofData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Clear any persisted progress on first load so refreshing starts clean
  useEffect(() => {
    sessionStorage.removeItem('paymentDone');
    sessionStorage.removeItem(`uploadedDocs-${clientId}-${instructionRef}`);
    setDetailsConfirmed(false);
  }, [clientId, instructionRef]);

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
    }
  }, [proofData, isIdReviewDone]);

  const handleEdit = () => {
    setEditBaseline(proofData);
    setEditing(true);
    setShowReview(false);
    setOpenStep(1);
    setRestartId((r) => r + 1);
    step1Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  useEffect(() => {
    const isComplete = uploadedFiles.some(f => f.uploaded);
    setUploadDone(isComplete);
  }, [uploadedFiles]);

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
    if (step1Reveal) setOpenStep(1);
  }, [step1Reveal]);

  useEffect(() => {
    const refs = [step1Ref, step2Ref, step3Ref];
    if (openStep > 0) {
      refs[openStep - 1]?.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [openStep]);

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

useEffect(() => {
  if (
    !instructionReady &&
    clientId &&
    instruction.instructionRef &&
    proofData.isCompanyClient !== null &&
    detailsConfirmed
  ) {
    const clientType = proofData.isCompanyClient ? 'company' : 'individual';
    fetch('/api/instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        instructionRef: instruction.instructionRef,
        clientType,
        amount: instruction.amount,
        product: instruction.product,
        workType: instruction.workType,
      }),
    })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok || data?.alreadyExists) {
          setInstructionReady(true);
          setInstructionError(null);
        } else {
          setInstructionError(data?.error || 'Failed to create instruction');
        }
      })
      .catch(() => setInstructionError('Failed to create instruction'));
  }
}, [clientId, instruction.instructionRef, proofData.isCompanyClient, detailsConfirmed, instructionReady]);

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
    {proofData.isCompanyClient && (
      <div className="group">
        <div className="summary-group-header">Company Details</div>
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
              {proofData.companyStreet?.trim() || 'Street'}
            </span>
          </div>
          <div>
            <span className={!proofData.companyCity?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyCity?.trim() || 'City'}
            </span>,&nbsp;
            <span className={!proofData.companyCounty?.trim() ? 'summary-placeholder' : 'field-value'}>
              {proofData.companyCounty?.trim() || 'County'}
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
    )}

      <div className="group">
        <div className="summary-group-header">
          Personal Details
        </div>
        <FaUser className="backdrop-icon" />
        <p>
          <span className="field-label">Name:</span>{' '}
          <span className={`field-value${!hasFullName ? ' empty' : ''}`}>{nameParts.filter(Boolean).join(' ') || '--'}</span>
        </p>
        <p>
          <span className="field-label">Nationality:</span>{' '}
          <span className={`field-value${!proofData.nationality?.trim() ? ' empty' : ''}`}>{proofData.nationality?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Date of Birth:</span>{' '}
          <span className={`field-value${!proofData.dob?.trim() ? ' empty' : ''}`}>{proofData.dob?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Gender:</span>{' '}
          <span className={`field-value${!proofData.gender?.trim() ? ' empty' : ''}`}>{proofData.gender?.trim() || '--'}</span>
        </p>
        <hr />
      </div>
      <div className="group">
        <div className="summary-group-header">
          Address
        </div>
        <FaMapMarkerAlt className="backdrop-icon" />
        <div className="data-text" style={{ color: 'inherit', lineHeight: 1.5 }}>
          <div>
            <span className={!proofData.houseNumber?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.houseNumber?.trim() || 'House Number'}</span>
            ,&nbsp;
            <span className={!proofData.street?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.street?.trim() || 'Street'}</span>
          </div>
          <div>
            <span className={!proofData.city?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.city?.trim() || 'City'}</span>
            ,&nbsp;
            <span className={!proofData.county?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.county?.trim() || 'County'}</span>
          </div>
          <div>
            <span className={!proofData.postcode?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.postcode?.trim() || 'Postcode'}</span>
            ,&nbsp;
            <span className={!proofData.country?.trim() ? 'summary-placeholder' : 'field-value'}>{proofData.country?.trim() || 'Country'}</span>
          </div>
        </div>
        <hr />
      </div>
      <div className="group">
        <div className="summary-group-header">
          Contact Details
        </div>
        <FaPhone className="backdrop-icon" />
        <p>
          <span className="field-label">Phone:</span>{' '}
          <span className={`field-value${!proofData.phone?.trim() ? ' empty' : ''}`}>{proofData.phone?.trim() || '--'}</span>
        </p>
        <p>
          <span className="field-label">Email:</span>{' '}
          <span className={`field-value${!proofData.email?.trim() ? ' empty' : ''}`}>{proofData.email?.trim() || '--'}</span>
        </p>
        <hr />
      </div>
      <div className="group">
        <div className="summary-group-header">
          ID Details
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
      <div className="group">
        {/* Solicitor information */}
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
    saveInstruction('in_progress');
    if (openStep === 1 && !showReview) {
      if (skipReview) {
        setEditing(false);
        setOpenStep(2);
      } else {
        setShowReview(true);
      }
      return;
    }
    if (openStep === 1 && showReview) {
      setEditing(false);
    }
    setOpenStep((prev) => (prev < 3 ? (prev + 1) as any : prev));
  };
  const back = () => {
    if (openStep === 1 && showReview) {
      setShowReview(false);
      return;
    }
    setOpenStep((prev) => (prev > 1 ? (prev - 1) as any : prev));
  };

  useEffect(() => {
    if (aliasId && orderId && shaSign) {
      fetch('/pitch/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, orderId })
      })
        .then((res) => res.json())
        .then((data) => {
                    if (process.env.NODE_ENV !== 'production') {
            console.log('✅ Logged payment params to backend:', data);
          }
        })
        .catch((err) => {
          console.error('❌ Failed to confirm payment server-side:', err);
        });
    }
  }, [aliasId, orderId, shaSign]);

  return (
    <div className="home-page">
      {instructionCompleted && (
        <div className="completed-banner">
          This instruction has been completed and can no longer be edited.
        </div>
      )}
      <main className="main-content">
        <div className="checkout-container">
          <div className="steps-column">

            <div ref={step1Ref} className={`step-section${openStep === 1 ? ' revealed active' : ''}`}>
              <StepHeader
                step={1}
                title="Prove Your Identity"
                complete={isIdReviewDone}
                open={openStep === 1}
                toggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
                locked={instructionCompleted}
                onEdit={handleEdit}
              />
              <div
                className={`step-content${openStep === 1 ? ' active' : ''}${getPulseClass(1, isIdReviewDone, editing)}`}>
                {openStep === 1 && (
                  !showReview ? (
                    <ProofOfId
                      key={restartId}
                      value={proofData}
                      onUpdate={setProofData}
                      setIsComplete={setIdReviewDone}
                      onNext={next}
                      editing={editing}
                      hasChanges={hasChanges}
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
                          showConfirmation={showReview}
                          edited={hasChanges}
                        />
                      ) : undefined}
                      isMobile={isMobile}
                      instructionRef={instruction.instructionRef}
                      proofData={proofData}
                      onConfirmed={next}
                      onEdit={handleEdit}
                    />
                  )
                )}
              </div>
            </div>

            <div ref={step2Ref} className={`step-section${openStep === 2 ? ' active' : ''}`}>
              <StepHeader
                step={2}
                title="Pay"
                complete={isPaymentDone}
                open={openStep === 2}
                toggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
                locked={instructionCompleted}
              />
              <div className={`step-content${openStep === 2 ? ' active payment-noscroll' : ''}${getPulseClass(2, isPaymentDone)}`}>
                {(prefetchPayment || openStep === 2) && (
                  <div style={{ display: openStep === 2 ? 'block' : 'none' }}>
                    <Payment
                      paymentDetails={paymentDetails}
                      setIsComplete={setPaymentDone}
                      onBack={back}
                      onNext={next}
                      onError={(code) => console.error('Payment error', code)}
                      pspid={PSPID}
                      orderId={instruction.instructionRef}
                      amount={instruction.amount}
                      product={instruction.product}
                      workType={instruction.workType}
                      contactFirstName={proofData.helixContact.split(' ')[0] || ''}
                      acceptUrl={ACCEPT_URL}
                      exceptionUrl={EXCEPTION_URL}
                      preloadFlexUrl={preloadedFlexUrl}
                    />
                  </div>
                )}
              </div>
            </div>
            <div ref={step3Ref} className={`step-section${openStep === 3 ? ' active' : ''}`}>
              <StepHeader
                step={3}
                title={<>Upload Files <span className="optional">(optional)</span></>}
                complete={isUploadDone}
                open={openStep === 3}
                toggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
                locked={instructionCompleted}
              />
              <div className={`step-content${openStep === 3 ? ' active' : ''}${getPulseClass(3, isUploadDone)}`}>
                {openStep === 3 && (
                  <DocumentUpload
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    setIsComplete={setUploadDone}
                    onBack={back}
                    onNext={next}
                    setUploadSkipped={setUploadSkipped}
                    isUploadSkipped={isUploadSkipped}
                    clientId={clientId}
                    instructionRef={instruction.instructionRef}
                    instructionReady={instructionReady}
                    instructionError={instructionError}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Desktop: always show summary sidebar */}
          {!isMobile && (
            <aside className="summary-column">
              <SummaryReview
                proofContent={proofSummary}
                documentsContent={documentsSummary}
                detailsConfirmed={detailsConfirmed}
                setDetailsConfirmed={setDetailsConfirmed}
                showConfirmation={showReview}
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
