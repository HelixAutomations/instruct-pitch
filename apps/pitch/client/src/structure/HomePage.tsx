declare global {
  interface Window {
    helixPrefillData?: {
      First_Name?: string;
      Last_Name?: string;
      [key: string]: any;
    };
  }
}

import React, { useState, useEffect } from 'react';
import {
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaCity,
  FaIdCard,
  FaUserTie
} from 'react-icons/fa';
import ProofOfId from './ProofOfId';
import DocumentUpload from './DocumentUpload';
import Payment from './Payment';
import ReviewConfirm from './ReviewConfirm';
import { colours } from '../styles/colours';
import '../styles/HomePage.css';
import { ProofData } from '../context/ProofData';
import { PaymentDetails } from '../context/PaymentDetails';
import SummaryReview from './SummaryReview';

interface HomePageProps {
  step1Reveal?: boolean;
}

interface StepHeaderProps {
  step: number;
  title: string;
  complete: boolean;
  open: boolean;
  toggle: () => void;
  locked?: boolean;
}
const StepHeader: React.FC<StepHeaderProps> = ({
  step,
  title,
  complete,
  open,
  toggle,
  locked = false,
}) => (
  <div
    className={`step-header${open ? ' active' : ''}${locked ? ' locked' : ''}`}
    onClick={() => {
      if (!locked) toggle();
    }}
    style={locked ? { cursor: "not-allowed", opacity: 0.5 } : undefined}
    tabIndex={locked ? -1 : 0}
    aria-disabled={locked}
  >
    <div className="step-number">{step}</div>
    <h2>
      {title}
      {complete && <span className="completion-tick visible">✔</span>}
      {locked && <span className="step-lock" style={{
        marginLeft: 6,
        fontSize: "1.07em",
        verticalAlign: "middle"
      }}>🔒</span>}
    </h2>
    <span className="toggle-icon">{open ? '−' : '+'}</span>
  </div>
);

const SummaryHeader: React.FC<{
  title: string;
  complete: boolean;
  verified: boolean;
  open: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onVerify: () => void;
}> = ({ title, complete, verified, open, onEdit, onToggle, onVerify }) => (
  <div className={`summary-header ${open ? 'active' : ''}`} onClick={onToggle}>
    <h3>
      {complete && (
        <span
          className={`verify-tick ${verified ? 'pressed' : ''} visible`}
          onClick={(e) => { e.stopPropagation(); onVerify(); }}
        >
          ✔
        </span>
      )}
      {title}
      <span className="edit-icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
        ✎
      </span>
    </h3>
    <span className="toggle-icon">{open ? '−' : '+'}</span>
  </div>
);

const MOCK_INSTRUCTION = {
  instructionId: "HLX-2405-000001",
  amount: 0.99,
  product: "instruction-pitch",
  workType: "Shareholder Dispute",
};

const HomePage: React.FC<HomePageProps> = ({ step1Reveal }) => {
  const params = new URLSearchParams(window.location.search);
  const aliasId = params.get('Alias.AliasId');
  const orderId = params.get('Alias.OrderId');
  const shaSign = params.get('SHASign');
  const isInIframe = window.self !== window.top;
  const [instruction] = useState(MOCK_INSTRUCTION);

  const [openStep, setOpenStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const [proofData, setProofData] = useState<ProofData>({
    idStatus: 'first-time',
    isCompanyClient: false,
    idType: null,
    companyName: '',
    companyNumber: '',
    companyHouseNumber: '',
    companyStreet: '',
    companyCity: '',
    companyCounty: '',
    companyPostcode: '',
    companyCountry: '',
    title: '',
    firstName: '',
    lastName: '',
    nationality: '',
    houseNumber: '',
    street: '',
    city: '',
    county: '',
    postcode: '',
    country: '',
    dob: '',
    gender: '',
    phone: '',
    email: '',
    idNumber: '',
    helixContact: '',
  });

useEffect(() => {
  if (window.helixPrefillData) {
    setProofData(prev => ({
      ...prev,
      firstName: window.helixPrefillData?.First_Name || prev.firstName,
      lastName: window.helixPrefillData?.Last_Name || prev.lastName,
    }));
    console.log("✅ Prefilled names from backend:", window.helixPrefillData);
  }
  // Add this line:
  console.log('[HomePage] window.helixPrefillData:', window.helixPrefillData);
}, []);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({ cardNumber: '', expiry: '', cvv: '' });
  const [isUploadSkipped, setUploadSkipped] = useState(false);

  const [isProofDone, setProofDone] = useState(false);
  const [isUploadDone, setUploadDone] = useState(false);
  const [isPaymentDone, setPaymentDone] = useState(false);
  const [summaryConfirmed, setSummaryConfirmed] = useState(false);

  useEffect(() => {
    setProofDone(isProofComplete());
  }, [proofData]);
  useEffect(() => {
    setUploadDone(isUploadDataComplete());
  }, [uploadedFiles]);
  useEffect(() => {
    setPaymentDone(isPaymentComplete());
  }, [paymentDetails]);

  const [pulse, setPulse] = useState(false);
  const [pulseStep, setPulseStep] = useState<0 | 1 | 2 | 3 | 4>(0);

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

  function getPulseClass(step: number, done: boolean) {
    return openStep === step && pulse && pulseStep === step
      ? done ? ' pulse-green' : ' pulse-red'
      : '';
  }

  useEffect(() => {
    if (step1Reveal) setOpenStep(1);
  }, [step1Reveal]);

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

  function isProofComplete() {
    return [
      proofData.idStatus,
      proofData.title,
      proofData.firstName,
      proofData.lastName,
      proofData.nationality,
      proofData.idNumber,
    ].every((f) => f && f.toString().trim());
  }
  function isUploadDataComplete() {
    return uploadedFiles.length > 0;
  }
  function isPaymentComplete() {
    return (
      !!paymentDetails.cardNumber.trim() &&
      !!paymentDetails.expiry.trim() &&
      !!paymentDetails.cvv.trim()
    );
  }

  const nameParts = [proofData.title, proofData.firstName, proofData.lastName];
  const hasFullName = nameParts.every(p => p && p.trim());
  const nameValue = nameParts.filter(Boolean).join(' ') || '--';

  const personalAddressParts = [
    proofData.houseNumber,
    proofData.street,
    proofData.city,
    proofData.county,
    proofData.postcode,
    proofData.country,
  ];
  const hasPersonalAddress = personalAddressParts.every(p => p && p.trim());

  const companyAddressParts = [
    proofData.companyHouseNumber,
    proofData.companyStreet,
    proofData.companyCity,
    proofData.companyCounty,
    proofData.companyPostcode,
    proofData.companyCountry,
  ];
  const hasCompanyAddress = companyAddressParts.every(p => p && p.trim());

  const hasCompanyName = !!proofData.companyName && proofData.companyName.trim();
  const hasCompanyNumber = !!proofData.companyNumber && proofData.companyNumber.trim();

  const toggleStep = (s: 1 | 2 | 3 | 4) => setOpenStep(openStep === s ? 0 : s);
  const next = () => setOpenStep((prev) => (prev < 4 ? (prev + 1) as any : prev));
  const back = () => setOpenStep((prev) => (prev > 1 ? (prev - 1) as any : prev));

  useEffect(() => {
    if (aliasId && orderId && shaSign) {
      fetch('/pitch/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, orderId })
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('✅ Logged payment params to backend:', data);
        })
        .catch((err) => {
          console.error('❌ Failed to confirm payment server-side:', err);
        });
    }
  }, [aliasId, orderId, shaSign]);

  const isFlexRedirect = aliasId && orderId && shaSign && isInIframe;
  useEffect(() => {
    if (isFlexRedirect) {
      fetch('/pitch/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, orderId })
      }).catch(console.error);
    }
  }, [isFlexRedirect, aliasId, orderId]);
  if (isFlexRedirect) {
    return (
      <div style={{
        display: 'grid',
        placeItems: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: '#f5f5f5',
        color: '#333'
      }}>
        <div>
          <h1>✅ Payment Received</h1>
          <p>Thank you! You may now close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <main className="main-content">
        <div className="checkout-container">
          <div className="steps-column">

            <div className={`step-section${openStep === 1 ? ' revealed active' : ''}`}>
              <StepHeader
                step={1}
                title="Verify Your Identity and Open a Matter"
                complete={isProofDone}
                open={openStep === 1}
                toggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
              />
              <div
                className={`step-content${openStep === 1 ? ' active' : ''}${getPulseClass(1, isProofDone)}`}>
                {openStep === 1 && (
                  <ProofOfId
                    value={proofData}
                    onUpdate={setProofData}
                    setIsComplete={setProofDone}
                    onNext={next}
                  />
                )}
              </div>
            </div>

            <div className={`step-section${openStep === 2 ? ' active' : ''}`}>
              <StepHeader
                step={2}
                title="Upload Your Documents"
                complete={isUploadDone}
                open={openStep === 2}
                toggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
              />
              <div className={`step-content${openStep === 2 ? ' active' : ''}${getPulseClass(2, isUploadDone)}`}>
                {openStep === 2 && (
                  <DocumentUpload
                    uploadedFiles={uploadedFiles}
                    setUploadedFiles={setUploadedFiles}
                    setIsComplete={setUploadDone}
                    onBack={back}
                    onNext={next}
                    setUploadSkipped={setUploadSkipped}
                    isUploadSkipped={isUploadSkipped}
                  />
                )}
              </div>
            </div>

            <div className={`step-section${openStep === 3 ? ' active' : ''}`}>
              <StepHeader
                step={3}
                title="Pay and Instruct"
                complete={isPaymentDone}
                open={openStep === 3}
                toggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
              />
              <div className={`step-content${openStep === 3 ? ' active payment-noscroll' : ''}${getPulseClass(3, isPaymentDone)}`}>
                {openStep === 3 && (
                  <Payment
                    paymentDetails={paymentDetails}
                    setIsComplete={setPaymentDone}
                    onBack={back}
                    onError={(code) => console.error('Payment error', code)}
                    pspid="epdq1717240"
                    orderId={instruction.instructionId}
                    amount={instruction.amount}
                    product={instruction.product}
                    workType={instruction.workType}
                    acceptUrl="https://helix-law.co.uk"
                    exceptionUrl="https://helix-law.co.uk"
                    preloadFlexUrl={null}
                  />
                )}
              </div>
            </div>

            <div className={`step-section${openStep === 4 ? ' active' : ''}`}>
              <StepHeader
                step={4}
                title="Review & Confirm"
                complete={isProofDone && isUploadDone && isPaymentDone}
                open={openStep === 4}
                toggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
              />
              <div className={`step-content${openStep === 4 ? ' active' : ''}`}>
                {openStep === 4 && (
                  <ReviewConfirm
                    summaryConfirmed={summaryConfirmed}
                    openSummaryPanel={() => {}}
                    summaryContent={isMobile ? (
                      <SummaryReview
                        proofContent={
                          <>
                            {proofData.isCompanyClient && (
                              <div className="group">
                                <div className="summary-group-header">Company Details</div>
                                <FaCity className="backdrop-icon" />
                                <p>
                                  <span className="field-label">Client:</span>{" "}
                                  <span className={`field-value${!proofData.isCompanyClient ? " empty" : ""}`}>
                                    Yes
                                  </span>
                                </p>
                                <p>
                                  <span className="field-label">Name:</span>{" "}
                                  <span className={`field-value${!hasCompanyName ? " empty" : ""}`}>
                                    {proofData.companyName?.trim() || '--'}
                                  </span>
                                </p>
                                <p>
                                  <span className="field-label">Number:</span>{" "}
                                  <span className={`field-value${!hasCompanyNumber ? " empty" : ""}`}>
                                    {proofData.companyNumber?.trim() || '--'}
                                  </span>
                                </p>
                                <p>
                                  <span className="field-label">Address:</span>
                                </p>
                                <div className="data-text" style={{ color: "inherit", lineHeight: 1.5 }}>
                                  <div>
                                    <span className={`field-value${!hasCompanyAddress ? " empty" : ""}`}>
                                      {companyAddressParts.filter(Boolean).join(', ') || '--'}
                                    </span>
                                  </div>
                                </div>
                                <hr />
                              </div>
                            )}
                            {proofData.idStatus === 'first-time' && (
                              <div className="group">
                                <div className="summary-status-note">
                                  You are providing proof of your identity for the first time.
                                </div>
                                <hr />
                              </div>
                            )}
                            {proofData.idStatus === 'renewing' && (
                              <div className="group">
                                <div className="summary-status-note">
                                  You are renewing proof of your identity.
                                </div>
                                <hr />
                              </div>
                            )}
                            <div className="group">
                              <div className="summary-group-header">Personal Details</div>
                              <FaUser className="backdrop-icon" />
                              <p>
                                <span className="field-label">Name:</span>{" "}
                                <span className={`field-value${!hasFullName ? " empty" : ""}`}>
                                  {nameParts.filter(Boolean).join(' ') || '--'}
                                </span>
                              </p>
                              <p>
                                <span className="field-label">Nationality:</span>{" "}
                                <span className={`field-value${!proofData.nationality?.trim() ? " empty" : ""}`}>
                                  {proofData.nationality?.trim() || '--'}
                                </span>
                              </p>
                              <p>
                                <span className="field-label">Date of Birth:</span>{" "}
                                <span className={`field-value${!proofData.dob?.trim() ? " empty" : ""}`}>
                                  {proofData.dob?.trim() || '--'}
                                </span>
                              </p>
                              <p>
                                <span className="field-label">Gender:</span>{" "}
                                <span className={`field-value${!proofData.gender?.trim() ? " empty" : ""}`}>
                                  {proofData.gender?.trim() || '--'}
                                </span>
                              </p>
                              <hr />
                            </div>
                            <div className="group">
                              <div className="summary-group-header">Address</div>
                              <FaMapMarkerAlt className="backdrop-icon" />
                              <div className="data-text" style={{ color: "inherit", lineHeight: 1.5 }}>
                                <div>
                                  <span className={!proofData.houseNumber?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.houseNumber?.trim() || "House Number"}
                                  </span>
                                  ,&nbsp;
                                  <span className={!proofData.street?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.street?.trim() || "Street"}
                                  </span>
                                </div>
                                <div>
                                  <span className={!proofData.city?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.city?.trim() || "City"}
                                  </span>
                                  ,&nbsp;
                                  <span className={!proofData.county?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.county?.trim() || "County"}
                                  </span>
                                </div>
                                <div>
                                  <span className={!proofData.postcode?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.postcode?.trim() || "Postcode"}
                                  </span>
                                  ,&nbsp;
                                  <span className={!proofData.country?.trim() ? "summary-placeholder" : "field-value"}>
                                    {proofData.country?.trim() || "Country"}
                                  </span>
                                </div>
                              </div>
                              <hr />
                            </div>
                            <div className="group">
                              <div className="summary-group-header">Contact Details</div>
                              <FaPhone className="backdrop-icon" />
                              <p>
                                <span className="field-label">Phone:</span>{" "}
                                <span className={`field-value${!proofData.phone?.trim() ? " empty" : ""}`}>
                                  {proofData.phone?.trim() || '--'}
                                </span>
                              </p>
                              <p>
                                <span className="field-label">Email:</span>{" "}
                                <span className={`field-value${!proofData.email?.trim() ? " empty" : ""}`}>
                                  {proofData.email?.trim() || '--'}
                                </span>
                              </p>
                              <hr />
                            </div>
                            <div className="group">
                              <div className="summary-group-header">ID Details</div>
                              <FaIdCard className="backdrop-icon" />
                              <p>
                                <span className="field-label">Type:</span>{" "}
                                <span className={`field-value${!proofData.idType?.trim() ? " empty" : ""}`}>
                                  {proofData.idType?.trim() || '--'}
                                </span>
                              </p>
                              <p>
                                <span className="field-label">Number:</span>{" "}
                                <span className={`field-value${!proofData.idNumber?.trim() ? " empty" : ""}`}>
                                  {proofData.idNumber?.trim() || '--'}
                                </span>
                              </p>
                              <hr />
                            </div>
                            <div className="group">
                              <div className="summary-group-header">Helix Contact</div>
                              <FaUserTie className="backdrop-icon" />
                              <p>
                                <span className="field-label">Contact:</span>{" "}
                                <span className={`field-value${!proofData.helixContact?.trim() ? " empty" : ""}`}>
                                  {proofData.helixContact?.trim() || '--'}
                                </span>
                              </p>
                            </div>
                          </>
                        }
                        documentsContent={
                          <>
                            {isUploadSkipped
                              ? <span className="field-value">File upload skipped.</span>
                              : uploadedFiles.length
                                ? uploadedFiles.map((f) => f.name).join(', ')
                                : '--'}
                          </>
                        }
                        paymentContent={
                          <>
                            **** **** **** {paymentDetails.cardNumber.slice(-4) || '--'}
                          </>
                        }
                        summaryConfirmed={summaryConfirmed}
                        setSummaryConfirmed={setSummaryConfirmed}
                      />
                    ) : undefined}
                    isMobile={isMobile}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Desktop: always show summary sidebar */}
          {!isMobile && (
            <aside className="summary-column">
              <SummaryReview
                proofContent={
                  <>
                    {proofData.isCompanyClient && (
                      <div className="group">
                        <div className="summary-group-header">Company Details</div>
                        <FaCity className="backdrop-icon" />
                        <p>
                          <span className="field-label">Client:</span>{" "}
                          <span className={`field-value${!proofData.isCompanyClient ? " empty" : ""}`}>Yes</span>
                        </p>
                        <p>
                          <span className="field-label">Name:</span>{" "}
                          <span className={`field-value${!hasCompanyName ? " empty" : ""}`}>{proofData.companyName?.trim() || '--'}</span>
                        </p>
                        <p>
                          <span className="field-label">Number:</span>{" "}
                          <span className={`field-value${!hasCompanyNumber ? " empty" : ""}`}>{proofData.companyNumber?.trim() || '--'}</span>
                        </p>
                        <p>
                          <span className="field-label">Address:</span>
                        </p>
                        <div className="data-text" style={{ color: "inherit", lineHeight: 1.5 }}>
                          <div>
                            <span className={`field-value${!hasCompanyAddress ? " empty" : ""}`}>
                              {companyAddressParts.filter(Boolean).join(', ') || '--'}
                            </span>
                          </div>
                        </div>
                        <hr />
                      </div>
                    )}
                    {proofData.idStatus === 'first-time' && (
                      <div className="group">
                        <div className="summary-status-note">You are providing proof of your identity for the first time.</div>
                        <hr />
                      </div>
                    )}
                    {proofData.idStatus === 'renewing' && (
                      <div className="group">
                        <div className="summary-status-note">You are renewing proof of your identity.</div>
                        <hr />
                      </div>
                    )}
                    <div className="group">
                      <div className="summary-group-header">Personal Details</div>
                      <FaUser className="backdrop-icon" />
                      <p>
                        <span className="field-label">Name:</span>{" "}
                        <span className={`field-value${!hasFullName ? " empty" : ""}`}>{nameValue}</span>
                      </p>
                      <p>
                        <span className="field-label">Nationality:</span>{" "}
                        <span className={`field-value${!proofData.nationality?.trim() ? " empty" : ""}`}>{proofData.nationality?.trim() || '--'}</span>
                      </p>
                      <p>
                        <span className="field-label">Date of Birth:</span>{" "}
                        <span className={`field-value${!proofData.dob?.trim() ? " empty" : ""}`}>{proofData.dob?.trim() || '--'}</span>
                      </p>
                      <p>
                        <span className="field-label">Gender:</span>{" "}
                        <span className={`field-value${!proofData.gender?.trim() ? " empty" : ""}`}>{proofData.gender?.trim() || '--'}</span>
                      </p>
                      <hr />
                    </div>
                    <div className="group">
                      <div className="summary-group-header">Address</div>
                      <FaMapMarkerAlt className="backdrop-icon" />
                      <div className="data-text" style={{ color: "inherit", lineHeight: 1.5 }}>
                        <div>
                          <span className={!proofData.houseNumber?.trim() ? "summary-placeholder" : "field-value"}>{proofData.houseNumber?.trim() || "House Number"}</span>
                          ,&nbsp;
                          <span className={!proofData.street?.trim() ? "summary-placeholder" : "field-value"}>{proofData.street?.trim() || "Street"}</span>
                        </div>
                        <div>
                          <span className={!proofData.city?.trim() ? "summary-placeholder" : "field-value"}>{proofData.city?.trim() || "City"}</span>
                          ,&nbsp;
                          <span className={!proofData.county?.trim() ? "summary-placeholder" : "field-value"}>{proofData.county?.trim() || "County"}</span>
                        </div>
                        <div>
                          <span className={!proofData.postcode?.trim() ? "summary-placeholder" : "field-value"}>{proofData.postcode?.trim() || "Postcode"}</span>
                          ,&nbsp;
                          <span className={!proofData.country?.trim() ? "summary-placeholder" : "field-value"}>{proofData.country?.trim() || "Country"}</span>
                        </div>
                      </div>
                      <hr />
                    </div>
                    <div className="group">
                      <div className="summary-group-header">Contact Details</div>
                      <FaPhone className="backdrop-icon" />
                      <p>
                        <span className="field-label">Phone:</span>{" "}
                        <span className={`field-value${!proofData.phone?.trim() ? " empty" : ""}`}>{proofData.phone?.trim() || '--'}</span>
                      </p>
                      <p>
                        <span className="field-label">Email:</span>{" "}
                        <span className={`field-value${!proofData.email?.trim() ? " empty" : ""}`}>{proofData.email?.trim() || '--'}</span>
                      </p>
                      <hr />
                    </div>
                    <div className="group">
                      <div className="summary-group-header">ID Details</div>
                      <FaIdCard className="backdrop-icon" />
                      <p>
                        <span className="field-label">Type:</span>{" "}
                        <span className={`field-value${!proofData.idType?.trim() ? " empty" : ""}`}>{proofData.idType?.trim() || '--'}</span>
                      </p>
                      <p>
                        <span className="field-label">Number:</span>{" "}
                        <span className={`field-value${!proofData.idNumber?.trim() ? " empty" : ""}`}>{proofData.idNumber?.trim() || '--'}</span>
                      </p>
                      <hr />
                    </div>
                    <div className="group">
                      <div className="summary-group-header">Helix Contact</div>
                      <FaUserTie className="backdrop-icon" />
                      <p>
                        <span className="field-label">Contact:</span>{" "}
                        <span className={`field-value${!proofData.helixContact?.trim() ? " empty" : ""}`}>{proofData.helixContact?.trim() || '--'}</span>
                      </p>
                    </div>
                  </>
                }
                documentsContent={
                  <>
                    {isUploadSkipped
                      ? <span className="field-value">File upload skipped.</span>
                      : uploadedFiles.length
                        ? uploadedFiles.map((f) => f.name).join(', ')
                        : '--'}
                  </>
                }
                paymentContent={
                  <>
                    **** **** **** {paymentDetails.cardNumber.slice(-4) || '--'}
                  </>
                }
                summaryConfirmed={summaryConfirmed}
                setSummaryConfirmed={setSummaryConfirmed}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
