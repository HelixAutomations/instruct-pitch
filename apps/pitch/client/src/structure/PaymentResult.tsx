import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/PaymentResult.css'
import '../styles/payments.css'
import logoMark from '../assets/dark blue mark.svg'

export default function PaymentResult() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const aliasId =
    params.get('Alias.AliasId') || sessionStorage.getItem('aliasId') || undefined
  const orderId =
    params.get('Alias.OrderId') || sessionStorage.getItem('orderId') || undefined
  const status = params.get('Alias.STATUS')
  const result = params.get('result')
  const shaSign =
    params.get('SHASIGN') ||
    params.get('SHASign') ||
    sessionStorage.getItem('shaSign') ||
    undefined
  const amount = params.get('amount')
  const product = params.get('product')

  const [message, setMessage] = useState<string>('Processing…')
  const [success, setSuccess] = useState<boolean | null>(null)

  const [challengeHtml, setChallengeHtml] = useState<string | null>(null)

  function collect3dsData() {
    return {
      browserColorDepth: String(window.screen.colorDepth),
      browserJavaEnabled: navigator.javaEnabled(),
      browserLanguage: navigator.language,
      browserScreenHeight: String(window.screen.height),
      browserScreenWidth: String(window.screen.width),
      browserTimeZone: String(new Date().getTimezoneOffset())
    }
  }

  useEffect(() => {
    async function finalize() {
      if (aliasId) sessionStorage.setItem('aliasId', aliasId)
      if (orderId) sessionStorage.setItem('orderId', orderId)
      if (shaSign) sessionStorage.setItem('shaSign', shaSign)
      if (!orderId) return

      const successFlag = result === 'accept' || status === '5' || status === '9'
      let serverSuccess: boolean | null = null
      let alreadyProcessed = false

      if (aliasId && orderId && shaSign) {
        try {
          const threeDS = collect3dsData()
          const accept = `${window.location.origin}/pitch/payment/result?result=accept&amount=${amount}&product=${product}`
          const decline = `${window.location.origin}/pitch/payment/result?result=reject&amount=${amount}&product=${product}`
          const res = await fetch('/pitch/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              aliasId,
              orderId,
              amount,
              product,
              shaSign,
              threeDS,
              acceptUrl: accept,
              exceptionUrl: decline,
              declineUrl: decline
            })
          })
          const data = await res.json()
          if (data.challenge) {
            setChallengeHtml(atob(data.challenge))
            return
          }
          if (typeof data.success === 'boolean') {
            serverSuccess = data.success
          }
          if (data.alreadyProcessed) {
            alreadyProcessed = true
          }
        } catch (err) {
          console.error(err)
        }
      }

      if (serverSuccess === true && alreadyProcessed) {
        sessionStorage.setItem('paymentDone', 'true')
        localStorage.setItem('paymentSuccess', 'true')
        setMessage('Payment already processed')
        setSuccess(true)
      } else if (serverSuccess === true) {
        sessionStorage.setItem('paymentDone', 'true')
        localStorage.setItem('paymentSuccess', 'true')
        setMessage('Payment received')
        setSuccess(true)
      } else if (serverSuccess === false) {
        sessionStorage.removeItem('paymentDone')
        localStorage.removeItem('paymentSuccess')
        setMessage('❌ Payment failed.')
        setSuccess(false)
      } else if (successFlag) {
        sessionStorage.setItem('paymentDone', 'true')
        localStorage.setItem('paymentSuccess', 'true')
        setMessage('Payment received')
        setSuccess(true)
      } else if (result === 'reject' || status !== '0') {
        sessionStorage.removeItem('paymentDone')
        localStorage.removeItem('paymentSuccess')
        setMessage('❌ Payment failed.')
        setSuccess(false)
      } else {
        sessionStorage.removeItem('paymentDone')
        localStorage.removeItem('paymentSuccess')
        setMessage('🤔 Payment status unknown.')
        setSuccess(null)
      }

      try {
        if (!alreadyProcessed) {
          await fetch('/api/instruction/send-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instructionRef: orderId })
          })
        }
      } catch (err) {
        console.error(err)
      }
    }

    finalize()
  }, [aliasId, orderId, result, status, shaSign])

  const feeEarner = sessionStorage.getItem('feeEarnerName') || ''

  return (
    <div className="payment-section">
      {challengeHtml ? (
        <iframe
          className="challenge-iframe"
          srcDoc={challengeHtml}
          style={{ width: '100%', maxWidth: 420, border: 'none', height: 400 }}
          title="3‑D Secure Challenge"
        />
      ) : (
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
            {success === null && <p>Contact support if this persists.</p>}
          </div>
        </div>
      )}
    </div>
  )
  
}
