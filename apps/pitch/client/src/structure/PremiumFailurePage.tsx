/**
 * Premium Failure Page
 * 
 * Comprehensive failure page showing the complete picture - what succeeded and what failed
 * Matches success page layout exactly but with failure-specific information
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useClient } from '../context/ClientContext';
import CheckoutHeader from '../components/premium/CheckoutHeader';
import { getStoredPaymentData, clearStoredPaymentData, getPremiumErrorMessage } from '../utils/premiumPaymentUtils';
import { colours } from '../styles/colours';
import '../styles/premium/premiumComponents.css';
// Path fix: file resides in components/premium not styles
import '../components/premium/PaymentSummaryMinimal.css';

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
  failureDetails?: {
    errorCode?: string;
    errorMessage?: string;
    timestamp?: string;
  };
}

const PremiumFailurePage: React.FC = () => {
  const { instructionRef, dealData } = useClient();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [instructionSummary, setInstructionSummary] = useState<InstructionSummary | null>(null);
  const location = useLocation();
  const notificationSentRef = useRef(false);

  console.log('PremiumFailurePage - dealData:', dealData);
  console.log('PremiumFailurePage - instructionRef:', instructionRef);
  console.log('PremiumFailurePage - location.pathname:', location.pathname);

  // Extract instruction reference from URL if not available in context
  const extractedRef = location.pathname.split('/')[1]; // Get the first part after /
  const effectiveInstructionRef = instructionRef || extractedRef;
  
  console.log('PremiumFailurePage - extractedRef:', extractedRef);
  console.log('PremiumFailurePage - effectiveInstructionRef:', effectiveInstructionRef);

  useEffect(() => {
    // Get payment data from session storage
    const storedData = getStoredPaymentData('failure');
    console.log('PremiumFailurePage - storedData:', storedData);
    if (storedData) {
      setPaymentData(storedData);
      // Clear the stored data after use
      clearStoredPaymentData('failure');
    }
  }, []);

  useEffect(() => {
    const fetchInstructionSummary = async () => {
      if (!effectiveInstructionRef) {
        console.log('No effectiveInstructionRef, skipping API call');
        return;
      }

      try {
        console.log('Fetching instruction summary for:', effectiveInstructionRef);
        const response = await fetch(`/api/instruction/summary/${effectiveInstructionRef}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched instruction summary:', data);
          setInstructionSummary(data);
        } else {
          console.log('Failed to fetch instruction summary:', response.status);
        }
      } catch (error) {
        console.error('Error fetching instruction summary:', error);
      }
    };

    fetchInstructionSummary();
  }, [effectiveInstructionRef]);

  // Send admin notification for failure
  useEffect(() => {
    const sendAdminNotification = async () => {
      if (!effectiveInstructionRef || notificationSentRef.current) return;
      
      notificationSentRef.current = true;

      try {
        console.log('Sending admin notification for payment failure');
        await fetch('/api/admin/payment-failure-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instructionRef: effectiveInstructionRef,
            errorCode: paymentData?.status || 'unknown',
            errorMessage: paymentData ? getPremiumErrorMessage(paymentData) : 'Payment processing failed',
            clientEmail: instructionSummary?.clientDetails?.email,
            amount: instructionSummary?.serviceDetails?.amount,
            timestamp: new Date().toISOString()
          }),
        });
        console.log('✅ Admin notification sent successfully');
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }
    };

    sendAdminNotification();
  }, [effectiveInstructionRef, instructionSummary, paymentData]);

  // Extract error details from stored data or provide defaults
  const errorCode = paymentData?.status || 'failed';
  const errorMessage = paymentData ? getPremiumErrorMessage(paymentData) : null;

  // Create complete summary including failure details
  const summary: InstructionSummary = instructionSummary || {
    instructionRef: effectiveInstructionRef || 'UNKNOWN',
    serviceDetails: {
      description: dealData?.ServiceDescription || 'Payment on Account of Costs',
      amount: paymentData?.amount || dealData?.Amount,
      currency: dealData?.Currency || 'GBP'
    },
    solicitorDetails: {
      name: dealData?.SolicitorName,
      title: dealData?.SolicitorTitle,
      email: dealData?.SolicitorEmail,
      phone: dealData?.SolicitorPhone
    },
    completedSteps: {
      identityVerified: true, // They got to payment so ID was verified
      documentsUploaded: true, // They got to payment so docs were uploaded
      paymentCompleted: false // This failed
    },
    failureDetails: {
      errorCode,
      errorMessage: errorMessage || 'Payment processing failed',
      timestamp: new Date().toISOString()
    }
  };

  const [showBank, setShowBank] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = React.useState(false);
  // Resolve earlier-captured email (from client details, instruction summary, or payment data), else dev fallback
  const resolvedClientEmail = React.useMemo(() => {
    const candidate = summary.clientDetails?.email || instructionSummary?.clientDetails?.email || paymentData?.clientEmail;
    if (candidate && candidate.includes('@')) return candidate.trim();
    // Local/dev fallback
    return 'lz@helix-law.com';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.clientDetails?.email, instructionSummary?.clientDetails?.email, paymentData?.clientEmail]);
  const [emailInput, setEmailInput] = React.useState<string>(resolvedClientEmail);
  const [emailEdited, setEmailEdited] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string>('');
  const clientEmail = resolvedClientEmail; // unified source

  const handleCopy = (label: string, value: string) => {
    try {
      navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1800);
    } catch (err) {
      console.warn('Clipboard copy failed', err);
    }
  };

  // Initialise email input when prompt first opened (lazy to ensure latest clientEmail)
  React.useEffect(() => {
    // If a better email arrives later (async fetch) and user hasn't edited, update the input
    if (!emailEdited && emailInput !== clientEmail) {
      setEmailInput(clientEmail);
    }
  }, [clientEmail, emailEdited, emailInput]);

  const handleEmailBankDetails = async () => {
    if (emailStatus === 'sending') return;
    const target = emailInput.trim();
    if (!target) return; // basic guard
    // Validate before send
    const valid = /.+@.+\..+/.test(target);
    if (!valid) {
      setEmailError('Please enter a valid email address');
      return;
    }
    try {
      setEmailStatus('sending');
      const resp = await fetch('/api/email/bank-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target, instructionRef: summary.instructionRef, amount: summary.serviceDetails?.amount })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data.success) {
        setEmailStatus('sent');
        setShowEmailPrompt(false);
      } else if (resp.ok && data.warning) {
        // Dev fallback: treat as sent but surface warning briefly
        setEmailStatus('sent');
        setShowEmailPrompt(false);
        console.warn('Bank details email dev warning:', data.warning, data.detail);
      } else {
        console.error('Bank details email error payload:', data);
        setEmailStatus('error');
        setEmailError(data?.error || 'Failed to send – please try again.');
      }
    } catch (e) {
      setEmailStatus('error');
      setEmailError('Network issue – please retry.');
    }
  };

  // Map error codes to user-friendly messages
  const getErrorInfo = (code: string | null) => {
    switch (code) {
      case 'card_declined':
        return {
          title: 'Payment Declined',
          message: 'Your bank declined this payment. Please try a different card or contact your bank.',
          icon: '💳'
        };
      case 'insufficient_funds':
        return {
          title: 'Insufficient Funds',
          message: 'Your account does not have sufficient funds. Please try a different payment method.',
          icon: '💰'
        };
      case 'expired_card':
        return {
          title: 'Card Expired',
          message: 'The card you used has expired. Please try with a different card.',
          icon: '📅'
        };
      case 'network_error':
        return {
          title: 'Connection Error',
          message: 'There was a problem connecting to the payment system. Please try again.',
          icon: '🌐'
        };
      default:
        return {
          title: 'Payment Failed',
          message: errorMessage || '',
          icon: '⚠️'
        };
    }
  };
  const errorInfo = getErrorInfo(errorCode);

  const formatAmount = (amount: number | undefined, currency: string = 'GBP') => {
    if (!amount) return 'Amount TBD';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <>
  <style>{`@keyframes fadeEmailIn { from { opacity:0; transform: translateY(4px) scale(.985);} to { opacity:1; transform: translateY(0) scale(1);} }`}</style>
      {/* Header with progress showing failure state */}
      <CheckoutHeader
        currentIndex={1} // Final visible step index after collapsing flow
        steps={[
          { key: 'identity', label: 'Prove Your Identity' },
          { key: 'payment', label: 'Pay' }
        ]}
        instructionRef={summary.instructionRef}
        currentStep="error" // Special error state
        showInstructionRef={false}
      />

      {/* Clean Failure Content - Matches Success Page Layout */}
      <div className="premium-payment-layout">
        <div className="premium-payment-container" style={{ 
          justifyContent: 'center',
          padding: 'clamp(16px, 4vw, 32px)',
          minHeight: 'auto'
        }}>
          <div style={{ 
            justifyContent: 'center',
            maxWidth: '100%',
            width: '100%'
          }}>
            <div style={{ 
              maxWidth: '800px', 
              margin: '0 auto',
              width: '100%'
            }}>
              
              {/* Unified Failure Card: message + reference + next actions */}
              <div style={{ 
                background: 'white',
                borderRadius: '16px',
                padding: 'clamp(24px, 5vw, 36px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
                border: '1px solid #f1f5f9',
                marginTop: 'clamp(16px, 4vw, 32px)',
                marginBottom: 'clamp(24px, 5vw, 36px)',
                textAlign: 'center'
              }}>
                {/* Error Icon */}
                <div style={{ 
                  width: 'clamp(64px, 15vw, 80px)', 
                  height: 'clamp(64px, 15vw, 80px)',
                  backgroundColor: colours.cta,
                  borderRadius: '50%',
                  margin: '0 auto clamp(20px, 5vw, 28px) auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(220, 38, 38, 0.2)'
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>

                <h1 style={{
                  fontSize: 'clamp(28px, 5.5vw, 36px)',
                  fontWeight: '600',
                  color: colours.cta,
                  margin: '0 0 clamp(16px, 3.5vw, 20px) 0',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em'
                }}>
                  {errorInfo.title}
                </h1>
                {errorInfo.message && (
                  <p style={{
                    fontSize: 'clamp(16px, 3.8vw, 18px)',
                    color: '#475569',
                    textAlign: 'center',
                    margin: '0 0 clamp(20px, 5vw, 28px) 0',
                    lineHeight: '1.6',
                    padding: '0 clamp(16px, 3vw, 24px)',
                    fontWeight: '400'
                  }}>
                    {errorInfo.message}
                  </p>
                )}

                {/* Reference + Service Summary */}
                <div style={{
                  padding: '0 0 clamp(16px, 4vw, 24px) 0',
                  textAlign: 'center',
                  margin: '0 0 clamp(8px, 3vw, 16px) 0',
                  borderBottom: '1px solid #f1f5f9'
                }}>
                  <span style={{
                    fontSize: 'clamp(12px, 2.8vw, 14px)',
                    fontWeight: '700',
                    color: '#991b1b',
                    display: 'block',
                    marginBottom: 'clamp(6px, 1.5vw, 8px)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    Your Reference
                  </span>
                  <span style={{
                    fontSize: 'clamp(18px, 4.5vw, 22px)',
                    fontWeight: '800',
                    color: '#991b1b',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    letterSpacing: '0.05em',
                    wordBreak: 'break-all',
                    display: 'block',
                    padding: 'clamp(4px, 1vw, 6px) 0'
                  }}>
                    HLX-{summary.instructionRef}
                  </span>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: 'clamp(12px, 3vw, 16px)'
                  }}>
                    {/* Service description removed per request */}
                    {summary.serviceDetails?.amount && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: 'clamp(18px, 4.5vw, 22px)',
                          fontWeight: '800',
                          color: colours.cta,
                          lineHeight: '1.2',
                          marginBottom: '4px'
                        }}>
                          {formatAmount(summary.serviceDetails.amount, summary.serviceDetails.currency)}
                        </div>
                        <div style={{
                          fontSize: 'clamp(11px, 2.8vw, 13px)',
                          color: '#64748b',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Payment Required
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Steps (merged) */}
                <div style={{
                  textAlign: 'center',
                  paddingTop: '4px'
                }}>
                  <h3 style={{
                    fontSize: 'clamp(18px, 4.5vw, 22px)',
                    fontWeight: '600',
                    color: '#1e293b',
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M9 12l2 2 4-4" stroke="#3690CE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="10" stroke="#3690CE" strokeWidth="2" fill="none"/>
                    </svg>
                    Next Steps
                  </h3>
                  <p style={{
                    fontSize: 'clamp(14px, 3.5vw, 15px)',
                    color: '#64748b',
                    margin: '0 0 16px 0',
                    lineHeight: '1.5',
                    textAlign: 'center'
                  }}>
                    Your payment has failed. Use the bank transfer option below or have the bank details emailed to you.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                    <button
                      style={{
                        background: '#fff',
                        color: colours.cta,
                        border: `2px solid ${colours.cta}`,
                        borderRadius: '8px',
                        padding: '12px 18px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => setShowBank(v => !v)}
                    >{showBank ? 'Hide Bank Details' : 'Use Bank Transfer Instead'}</button>
                  </div>
                  {showBank && (
                    <div style={{ marginTop: '18px' }}>
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '18px 18px 22px',
                        animation: 'fadeInBank 400ms ease'
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'.75rem', margin:'0 0 .5rem' }}>
                          <h4 style={{ fontSize:'1rem', fontWeight:600, color:'#0D2F60', letterSpacing:'.3px', margin:0 }}>Bank Transfer Details</h4>
                          <span style={{ background:'#0D2F6010', color:'#0D2F60', fontSize:'.625rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'6px', textTransform:'uppercase' }}>Manual Settlement</span>
                        </div>
                        <p style={{ fontSize:'.75rem', lineHeight:1.3, color:'#475569', margin:'0 0 .875rem' }}>Send a transfer using your online banking. Use the exact reference so we can match your payment instantly.</p>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:'.75rem', marginBottom:'1rem' }}>
                          {/* Account Name */}
                          <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                            <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Account Name</span>
                            <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('accountName','Helix Law General Client Account')}>Helix Law General Client Account</span>
                            <button type="button" onClick={() => handleCopy('accountName','Helix Law General Client Account')} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='accountName' ? 'Copied' : 'Copy'}</button>
                          </div>
                          {/* Bank */}
                          <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                            <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Bank</span>
                            <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('bank','Barclays Bank, Eastbourne')}>Barclays Bank, Eastbourne</span>
                            <button type="button" onClick={() => handleCopy('bank','Barclays Bank, Eastbourne')} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='bank' ? 'Copied' : 'Copy'}</button>
                          </div>
                          {/* Sort Code */}
                          <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                            <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Sort Code</span>
                            <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('sortCode','20-27-91')}>20-27-91</span>
                            <button type="button" onClick={() => handleCopy('sortCode','20-27-91')} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='sortCode' ? 'Copied' : 'Copy'}</button>
                          </div>
                          {/* Account Number */}
                          <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                            <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Account Number</span>
                            <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('accountNumber','9347 2434')}>9347 2434</span>
                            <button type="button" onClick={() => handleCopy('accountNumber','9347 2434')} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='accountNumber' ? 'Copied' : 'Copy'}</button>
                          </div>
                          {/* Reference */}
                          <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                            <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Reference</span>
                            <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('reference', `HLX-${summary.instructionRef}`)}>HLX-{summary.instructionRef}</span>
                            <button type="button" onClick={() => handleCopy('reference', `HLX-${summary.instructionRef}`)} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='reference' ? 'Copied' : 'Copy'}</button>
                          </div>
                          {/* Amount */}
                          {summary.serviceDetails?.amount && (
                            <div style={{ position:'relative', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'.8rem .75rem .7rem', display:'flex', flexDirection:'column', gap:'4px' }}>
                              <span style={{ fontSize:'.575rem', fontWeight:600, letterSpacing:'.7px', textTransform:'uppercase', color:'#64748b' }}>Amount (GBP)</span>
                              <span style={{ fontSize:'.85rem', fontWeight:600, color:'#0f172a', wordBreak:'break-all', cursor:'pointer', paddingRight:'50px', lineHeight:1.3 }} onClick={() => handleCopy('amount', formatAmount(summary.serviceDetails!.amount))}>{formatAmount(summary.serviceDetails.amount)}</span>
                              <button type="button" onClick={() => handleCopy('amount', formatAmount(summary.serviceDetails!.amount))} style={{ position:'absolute', top:8, right:8, background:'#f1f5f9', border:'1px solid #e2e8f0', fontSize:'.55rem', fontWeight:600, letterSpacing:'.5px', padding:'4px 8px', borderRadius:'4px', cursor:'pointer', color:'#475569' }}>{copiedField==='amount' ? 'Copied' : 'Copy'}</button>
                            </div>
                          )}
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                          <div style={{ fontSize:'.65rem', lineHeight:1.25, color:'#475569', padding:'6px 8px', background:'#fff', border:'1px dashed #e2e8f0', borderRadius:'6px' }}>Use the reference exactly – it links your payment to your matter.</div>
                          <div style={{ fontSize:'.65rem', lineHeight:1.25, color:'#475569', padding:'6px 8px', background:'#fff', border:'1px dashed #e2e8f0', borderRadius:'6px' }}>Faster Payments usually arrive within minutes; some banks may take up to 2 hours.</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', flexDirection:'column', alignItems:'center', gap:'12px' }}>
                          {!showEmailPrompt && (
                            <>
                              <button
                                disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                                style={{
                                  background: emailStatus==='sent' ? '#14B07A' : '#fff',
                                  color: emailStatus==='sent' ? '#fff' : colours.cta,
                                  border: emailStatus==='sent' ? '2px solid #14B07A' : `2px solid ${colours.cta}`,
                                  borderRadius: '8px',
                                  padding: '12px 18px',
                                  fontSize: '15px',
                                  fontWeight: '600',
                                  cursor: emailStatus==='sent' ? 'default' : 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onClick={() => { setShowEmailPrompt(true); setEmailStatus('idle'); setEmailError(''); }}
                              >{emailStatus==='sent' ? 'Bank Details Sent' : 'Email Me These Details'}</button>
                              {emailStatus==='sent' && (
                                <div style={{ fontSize:'12px', color:'#16a34a', fontWeight:600, marginTop:'6px' }} aria-live="polite">Sent – check your inbox (and spam just in case).</div>
                              )}
                            </>
                          )}
                          {showEmailPrompt && (
                            <form onSubmit={(e) => { e.preventDefault(); handleEmailBankDetails(); }} style={{
                              display:'flex', flexDirection:'column', gap:'10px',
                              background:'#f8fafc', border:'1px solid #e2e8f0', padding:'16px 16px 14px', borderRadius:'12px', width:'100%', maxWidth:'420px',
                              boxShadow:'0 1px 2px rgba(0,0,0,0.04)',
                              animation:'fadeEmailIn 260ms ease'
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" stroke="#0D2F60" fill="none" strokeWidth="1.6"><path d="M4 6.5c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v.4l-8 5-8-5v-.4Z"/><path d="M4 8.8V17.5c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8.8l-8 5-8-5Z"/></svg>
                                <div style={{ fontSize:'13px', fontWeight:600, color:'#0D2F60' }}>Send Secure Bank Details</div>
                              </div>
                              <label htmlFor="email-confirm" style={{ fontSize:'11px', fontWeight:600, letterSpacing:'.5px', textTransform:'uppercase', color:'#475569', marginTop:'4px' }}>Email Address</label>
                              <input
                                id="email-confirm"
                                type="email"
                                required
                                autoFocus
                                value={emailInput}
                                onChange={(e) => { if (!emailEdited) setEmailEdited(true); const v=e.target.value; setEmailInput(v); if (emailStatus!=='idle') setEmailStatus('idle'); if (emailError) setEmailError(''); if(v && !/.+@.+\..+/.test(v)) setEmailError('Invalid email format'); }}
                                placeholder="you@example.com"
                                style={{
                                  fontSize:'14px', padding:'10px 12px', border:`1px solid ${emailError? '#dc2626':'#cbd5e1'}`, borderRadius:'6px', outline:'none',
                                  boxShadow:'0 1px 1px rgba(0,0,0,0.02)'
                                }}
                              />
                              {emailError && <div style={{ fontSize:'11px', color:'#dc2626', fontWeight:600 }} aria-live="polite">{emailError}</div>}
                              {/* Informational bullet list removed per request */}
                              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                                <button type="submit" disabled={emailStatus==='sending'} style={{
                                  background: emailStatus==='sending' ? '#0D2F60' : '#14B07A',
                                  color:'#fff', border:'none', borderRadius:'6px', padding:'10px 16px', fontSize:'14px', fontWeight:600,
                                  cursor: emailStatus==='sending' ? 'progress' : 'pointer', flex:1, minWidth:'140px'
                                }}>
                                  {emailStatus==='sending' && 'Sending...'}
                                  {emailStatus==='idle' && 'Send Now'}
                                  {emailStatus==='error' && 'Retry Send'}
                                  {emailStatus==='sent' && 'Sent'}
                                </button>
                                <button type="button" onClick={() => { setShowEmailPrompt(false); setEmailStatus('idle'); setEmailError(''); }} style={{
                                  background:'#fff', color:'#475569', border:'1px solid #cbd5e1', borderRadius:'6px', padding:'10px 16px', fontSize:'14px', fontWeight:600,
                                  cursor:'pointer'
                                }}>Cancel</button>
                              </div>
                              {emailStatus==='error' && <div style={{ fontSize:'12px', color:'#dc2626', fontWeight:600 }} aria-live="polite">Failed to send. Please adjust the email or retry.</div>}
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lightweight Info Strip to reduce whitespace */}
              <div style={{
                maxWidth: '880px',
                margin: 'clamp(12px,3vw,28px) auto clamp(8px,3vw,32px)',
                display: 'grid',
                gap: '14px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))'
              }}>
                <div style={{
                  background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px',
                  display:'flex', flexDirection:'row', gap:12, alignItems:'flex-start'
                }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'#0D2F6010', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {/* Strategy / planning icon replacing shield */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0D2F60" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="7" cy="6" r="2" />
                      <circle cx="17" cy="18" r="2" />
                      <path d="M7 8v3c0 2 1 3 3 3h4c2 0 3 1 3 3v1" />
                      <path d="M13 6h4" />
                      <path d="M15 4v4" />
                    </svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, letterSpacing:'.3px', color:'#0D2F60', marginBottom:4 }}>After You Transfer</div>
                    <div style={{ fontSize:12, lineHeight:1.45, color:'#475569' }}>Funds usually appear within minutes. We reconcile automatically using your reference.</div>
                  </div>
                </div>
                <div style={{
                  background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 18px',
                  display:'flex', flexDirection:'row', gap:12, alignItems:'flex-start'
                }}>
                  <div style={{ width:34, height:34, borderRadius:8, background:'#14B07A10', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" stroke="#14B07A" fill="none" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600, letterSpacing:'.3px', color:'#0D2F60', marginBottom:4 }}>What Happens Next</div>
                    <div style={{ fontSize:12, lineHeight:1.45, color:'#475569' }}>Once received we allocate funds and progress without further action from you.</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Premium Footer */}
      <footer className="premium-payment-footer">
        <div className="premium-footer-container">
          <div className="premium-trust-footer">
            <div className="premium-trust-indicators">
              <div className="premium-trust-indicator">
                <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure Payment Processing</span>
              </div>
              
              <div className="premium-trust-indicator">
                <svg className="premium-trust-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>AML/KYC Compliant</span>
              </div>
            </div>
            
            <div className="premium-footer-legal">
              <div className="premium-footer-copyright">
                All copyright is reserved entirely on behalf of Helix Law Limited. Helix Law
                and applicable logo are exclusively owned trademarks registered with the
                Intellectual Property Office under numbers UK00003984532 and
                UK00003984535. The trademarks should not be used, copied or replicated
                without consent. Helix Law Limited is regulated by the SRA, our SRA ID is
                565557.
              </div>
              
              <div className="premium-footer-links">
                <ul className="premium-legal-menu">
                  <li>
                    <a href="https://helix-law.co.uk/transparency/">
                      Transparency, Complaints, Timescales and VAT
                    </a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/cookies-policy/">Cookies Policy</a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/privacy-policy/">Privacy Policy</a>
                  </li>
                  <li>
                    <a href="https://helix-law.co.uk/terms-and-conditions/">
                      Terms and Conditions
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PremiumFailurePage;
