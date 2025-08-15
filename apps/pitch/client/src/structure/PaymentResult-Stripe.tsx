import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/PaymentResult.css'
import '../styles/payments.css'
import logoMark from '../assets/dark blue mark.svg'

export default function PaymentResult() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const result = params.get('result')
  
  const [message, setMessage] = useState<string>('Processing…')
  const [success, setSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    // During Barclays->Stripe migration, show migration notice
    if (result === 'accept') {
      setMessage('Payment system is being updated')
      setSuccess(null)
    } else if (result === 'reject') {
      setMessage('Payment cancelled')
      setSuccess(false)
    } else {
      setMessage('Payment system maintenance')
      setSuccess(null)
    }
  }, [result])

  const feeEarner = sessionStorage.getItem('feeEarnerName') || ''

  return (
    <div className="payment-section">
      <div className="combined-section payment-pane">
        <div className="service-summary-box result-panel">
          <h2 className="result-header">
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
            {message}
            <img src={logoMark} alt="" className="result-logo" />
          </h2>
          
          <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', margin: '20px 0' }}>
            <h3 style={{ color: '#6c757d', marginBottom: '10px' }}>Payment System Update</h3>
            <p style={{ color: '#6c757d', margin: '0' }}>
              We're updating our payment system to provide you with a better experience. 
              Please contact us directly to complete your instruction.
            </p>
          </div>

          {success && (
            <>
              <p>
                Thank you for your payment which we have received. We will contact you separately under separate cover shortly and will take it from there.
              </p>
              <p>
                To finalise your instruction, please upload documents requested by {feeEarner || 'us'}, if any.
              </p>
            </>
          )}
          {success === false && <p>Please try again or contact support.</p>}
          {success === null && <p>Contact support if you need assistance.</p>}
        </div>
      </div>
    </div>
  )
}
