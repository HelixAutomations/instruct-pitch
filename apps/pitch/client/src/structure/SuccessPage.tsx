import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import DocumentUploadPremium from '../components/premium/DocumentUploadPremium';
import '../styles/ProofOfId-premium.css';
import '../styles/HomePage.css'; // Use clean home page styling

interface InstructionSummary {
  instructionRef: string;
  clientDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  serviceDetails?: {
    description?: string;
    amount?: number;
    currency?: string;
  };
  solicitorDetails?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
  };
  completedSteps?: {
    identityVerified: boolean;
    documentsUploaded: boolean;
    paymentCompleted: boolean;
  };
  createdAt?: string;
}

const SuccessPage: React.FC = () => {
  const { instructionRef, dealData } = useClient();
  const [instructionSummary, setInstructionSummary] = useState<InstructionSummary | null>(null);
  const location = useLocation();

  console.log('SuccessPage - instructionRef:', instructionRef);
  console.log('SuccessPage - dealData:', dealData);
  console.log('SuccessPage - location.pathname:', location.pathname);

  const extractedRef = location.pathname.split('/')[1];
  const effectiveInstructionRef = instructionRef || extractedRef;

  useEffect(() => {
    const fetchInstructionSummary = async () => {
      if (!effectiveInstructionRef) return;
      try {
        const response = await fetch(`/api/instruction/summary/${effectiveInstructionRef}`);
        if (response.ok) {
          const summaryData = await response.json();
          setInstructionSummary(summaryData);
        }
      } catch (e) {
        console.error('Fetch summary failed', e);
      }
    };
    fetchInstructionSummary();
  }, [effectiveInstructionRef]);

  const summary: InstructionSummary = instructionSummary || {
    instructionRef: effectiveInstructionRef || 'N/A',
    serviceDetails: {
      description: dealData?.ServiceDescription || 'Payment on Account of Costs',
      amount: dealData?.Amount,
      currency: dealData?.Currency || 'GBP'
    },
    solicitorDetails: {
      name: dealData?.SolicitorName,
      title: dealData?.SolicitorTitle,
      email: dealData?.SolicitorEmail,
      phone: dealData?.SolicitorPhone
    },
    completedSteps: {
      identityVerified: true,
      documentsUploaded: true,
      paymentCompleted: !!dealData?.Amount
    },
    createdAt: new Date().toISOString()
  };

  const formatAmount = (amount?: number, currency: string = 'GBP') => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  };

  // Inline document upload integration state
  const [showUpload, setShowUpload] = useState(true); // start expanded
  const [uploadedFiles, setUploadedFiles] = useState<{ file: File; uploaded: boolean }[]>([]);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Derived passcode placeholder (was used earlier in flow) – keep stable fallback
  const passcode = 'POSTPAY';

  return (
    <>
      {/* Scoped responsive spacing styles for SuccessPage */}
      <style>{`
        .success-page { --sp-container-pad: clamp(16px,3vw,28px); --sp-card-pad: clamp(20px,3.2vw,32px); --sp-card-radius: clamp(14px,2.5vw,20px); --sp-card-mt: clamp(20px,4vw,36px); --sp-section-gap: clamp(28px,5vw,48px); --sp-grid-gap: 14px; }
        @media (max-width: 640px){ .success-page { --sp-card-pad: clamp(18px,4vw,26px); --sp-grid-gap: 12px; } }
        .success-page .sp-main-card { padding: var(--sp-card-pad) !important; border-radius: var(--sp-card-radius) !important; margin-top: var(--sp-card-mt) !important; margin-bottom: clamp(20px,4vw,32px) !important; }
        .success-page .sp-ref-block { padding-bottom: clamp(14px,3.2vw,22px) !important; margin-bottom: clamp(6px,2.5vw,14px) !important; }
        .success-page .sp-upload { margin-top: var(--sp-section-gap) !important; }
        .success-page .sp-next { margin-top: var(--sp-section-gap) !important; }
        .success-page .sp-grid-steps { display:grid; gap:var(--sp-grid-gap); grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
        @media (min-width: 980px){ .success-page .sp-grid-steps { grid-template-columns: repeat(3,1fr); } }
        .success-page .sp-step-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; display:flex; gap:12px; align-items:flex-start; }
        @media (hover:hover){ .success-page .sp-step-box{ transition:background .25s, box-shadow .25s, transform .25s; } .success-page .sp-step-box:hover{ background:#f1f5f9; box-shadow:0 2px 6px rgba(0,0,0,0.06); transform:translateY(-2px); } }
        .success-page .sp-icon { width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; }
        .success-page .sp-icon--green { background:#14B07A10; }
        .success-page .sp-icon--navy { background:#0D2F6010; }
        .success-page .sp-step-title { font-size:13px; font-weight:600; letter-spacing:.3px; color:#0D2F60; margin:0 0 4px; }
        .success-page .sp-step-desc { font-size:12px; line-height:1.45; color:#475569; }
        .success-page .action-buttons { padding:0 !important; }
      `}</style>
      <CheckoutHeader
        currentIndex={2}
        steps={[{ key: 'identity', label: 'Identity' }, { key: 'payment', label: 'Pay' }]}
        instructionRef={instructionRef || ''}
        currentStep="complete"
      />
      <div className="premium-payment-layout success-page">
        <div className="premium-payment-container" style={{ justifyContent: 'center', padding: 'var(--sp-container-pad)', minHeight: 'auto' }}>
          <div style={{ justifyContent: 'center', maxWidth: '100%', width: '100%' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%' }}>
              <div className="sp-main-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', padding: 'clamp(24px, 4.5vw, 36px)', boxShadow: '0 3px 14px -2px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120,119,198,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,119,198,0.03) 0%, transparent 50%)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 'clamp(70px,16vw,88px)', height: 'clamp(70px,16vw,88px)', background: 'var(--helix-success)', borderRadius: '50%', margin: '0 auto clamp(20px,4vw,28px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.18), 0 0 0 4px rgba(20,176,122,0.15)' }} role="img" aria-label="Payment successful">
                    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" aria-hidden="true"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M8.2 12.4l3 3.2 5.3-6.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <h1 style={{ fontSize: 'clamp(28px,6vw,36px)', fontWeight: 700, color: '#0f172a', margin: '0 0 clamp(16px,3.5vw,20px)', lineHeight: 1.2, letterSpacing: '-0.025em' }}>Payment Confirmed</h1>
                  <p style={{ fontSize: 'clamp(16px,3.8vw,18px)', color: '#475569', textAlign: 'center', margin: '0 auto clamp(24px,6vw,32px)', lineHeight: 1.6, padding: 0, fontWeight: 500, maxWidth: '620px' }}>Your payment has been successful.</p>
                  {/* Integrated Reference & Amount Block */}
                  <div className="sp-ref-block" style={{ padding: '0 0 clamp(16px,4vw,24px)', textAlign: 'center', margin: '0 0 clamp(8px,3vw,16px)', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 'clamp(12px,2.8vw,14px)', fontWeight: 700, color: '#15803d', display: 'block', marginBottom: 'clamp(6px,1.5vw,8px)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Reference</span>
                    <span style={{ fontSize: 'clamp(18px,4.5vw,22px)', fontWeight: 800, color: '#1e293b', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace', letterSpacing: '0.05em', wordBreak: 'break-all', display: 'block', padding: 'clamp(4px,1vw,6px) 0' }}>HLX-{summary.instructionRef}</span>
                    {summary.serviceDetails?.amount && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '20px', marginTop: 'clamp(12px,3vw,16px)' }}>
                        <div>
                          <div style={{ fontSize: 'clamp(20px,5vw,24px)', fontWeight: 800, color: 'var(--helix-success)', lineHeight: 1.2, marginBottom: 4 }}>{formatAmount(summary.serviceDetails.amount, summary.serviceDetails.currency)}</div>
                          <div style={{ fontSize: 'clamp(11px,2.8vw,13px)', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid</div>
                        </div>
                        {summary.serviceDetails?.description && (
                          <div style={{ textAlign: 'left', maxWidth: '320px' }}>
                            <div style={{ fontSize: 'clamp(14px,3.4vw,16px)', fontWeight: 600, color: '#1e293b', marginBottom: 4, lineHeight: 1.3 }}>{summary.serviceDetails.description}</div>
                            <div style={{ fontSize: 'clamp(12px,3vw,14px)', color: '#64748b' }}>Payment successfully processed</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Optional Document Upload Section (moved above next steps) */}
                  <div className="sp-upload" style={{ textAlign: 'left' }}>
                    {showUpload && (
                      <div style={{ marginTop: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24 }}>
                        <div style={{ marginBottom: 0, textAlign: 'center' }}>
                          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.015em' }}>Upload supporting documents <span style={{ fontWeight: 600, color: '#64748b' }}>(optional)</span></h3>
                          <p style={{ margin: '10px auto 0', fontSize: 15, color: '#64748b', lineHeight: 1.55, maxWidth: 620 }}>You can add any relevant documents now or provide them later.</p>
                        </div>
                        <DocumentUploadPremium
                          uploadedFiles={uploadedFiles}
                          setUploadedFiles={setUploadedFiles}
                          setIsComplete={setUploadComplete}
                          onBack={() => setShowUpload(false)}
                          onNext={() => setShowUpload(false)}
                          clientId={''}
                          passcode={passcode}
                          instructionRef={summary.instructionRef}
                          instructionReady={true}
                          hideBackButton
                          continueLabel="Done"
                          alignButtonsRight
                        />
                        {uploadComplete && (
                          <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: 'var(--helix-success)' }}>
                            Documents saved
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Next Steps integrated - styled like Failure Page info boxes */}
                  <div className="sp-next" style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: 'clamp(20px,4.5vw,24px)', fontWeight: 700, color: '#0f172a', margin: '0 0 clamp(16px,3.5vw,22px)', letterSpacing: '-0.015em', textAlign: 'center' }}>What Happens Next</h3>
                    <div className="sp-grid-steps" style={{ maxWidth: '880px', margin: '0 auto' }}>
                      {/* Box 1 */}
                      <div className="sp-step-box">
                        <div className="sp-icon sp-icon--green">
                          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#14B07A" fill="none" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="sp-step-title">Confirmation on its way</div>
                          <div className="sp-step-desc">Your confirmation documents and next steps are being prepared.</div>
                        </div>
                      </div>
                      {/* Box 2 */}
                      <div className="sp-step-box">
                        <div className="sp-icon sp-icon--navy">
                          {/* Strategy / planning icon replacing shield */}
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D2F60" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="7" cy="6" r="2" />
                            <circle cx="17" cy="18" r="2" />
                            <path d="M7 8v3c0 2 1 3 3 3h4c2 0 3 1 3 3v1" />
                            <path d="M13 6h4" />
                            <path d="M15 4v4" />
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="sp-step-title">Legal strategy planning</div>
                          <div className="sp-step-desc">Your solicitor will assess your matter and advise on the optimal path forward.</div>
                        </div>
                      </div>
                      {/* Box 3 */}
                      <div className="sp-step-box">
                        <div className="sp-icon sp-icon--green">
                          <svg width="18" height="18" viewBox="0 0 24 24" stroke="#14B07A" fill="none" strokeWidth="1.8"><path d="M5 8h14M5 12h14M5 16h10" strokeLinecap="round"/></svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="sp-step-title">Direct solicitor contact</div>
                          <div className="sp-step-desc">Your assigned solicitor will be your dedicated point of contact throughout.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <footer className="premium-payment-footer">
        <div className="premium-footer-container">
          <div className="premium-trust-footer">
            <div className="premium-trust-indicators">
              <div className="premium-trust-indicator"><svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg><span>Secure Payment Processing</span></div>
              <div className="premium-trust-indicator"><svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>AML/KYC Compliant</span></div>
            </div>
            <div className="premium-footer-legal">
              <div className="premium-footer-copyright">All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law and applicable logo are exclusively owned trademarks registered with the Intellectual Property Office under numbers UK00003984532 and UK00003984535. The trademarks should not be used, copied or replicated without consent. Helix Law Limited is regulated by the SRA, our SRA ID is 565557.</div>
              <div className="premium-footer-links">
                <ul className="premium-legal-menu">
                  <li><a href="https://helix-law.co.uk/transparency/">Transparency, Complaints, Timescales and VAT</a></li>
                  <li><a href="https://helix-law.co.uk/cookies-policy/">Cookies Policy</a></li>
                  <li><a href="https://helix-law.co.uk/privacy-policy/">Privacy Policy</a></li>
                  <li><a href="https://helix-law.co.uk/terms-and-conditions/">Terms and Conditions</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
export default SuccessPage;
