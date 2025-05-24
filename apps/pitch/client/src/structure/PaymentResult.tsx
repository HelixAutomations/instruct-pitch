// apps/pitch/client/src/structure/PaymentResult.tsx
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import '../styles/PaymentResult.css'

export default function PaymentResult() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const aliasId = params.get('Alias.AliasId')
  const orderId = params.get('Alias.OrderId')
  const status = params.get('Alias.STATUS')   // if you’ve configured dynamic feedback…
  const result = params.get('result')         // or from your hard-coded ?result=accept URL
  const amount = params.get('amount')
  const product = params.get('product')

  const [message, setMessage] = useState<string>('Processing…')
  const [success, setSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    // 1) Optionally hit your server to finalize the DirectLink capture
    if (aliasId && orderId) {
      fetch('/pitch/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aliasId, orderId })
      }).catch(console.error)
    }

    // 2) Figure out what to show the user
    if (result === 'accept' || status === '0') {
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
  }, [aliasId, orderId, result, status])

  return (
    <div className="result-panel">
        <h2>{message}</h2>
        {success && (
          <>
            <p>
              Thanks for your payment{amount ? ` of £${Number(amount).toFixed(2)}` : ''}
              {product ? ` for ${product}` : ''}. We’ve received your instruction and will be in touch soon.
            </p>
            <p>Please click Next to confirm your details and open your matter.</p>
          </>
        )}
        {success === false && (
          <p>Please try again or contact support.</p>
        )}
        {success === null && (
          <p>Contact support if this persists.</p>
        )}
      </div>
  )
}
