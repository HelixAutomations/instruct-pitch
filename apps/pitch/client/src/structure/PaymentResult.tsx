// src/structure/PaymentResult.tsx
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function PaymentResult() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const aliasId  = params.get('Alias.AliasId')
  const orderId  = params.get('Alias.OrderId')
  const status   = params.get('Alias.STATUS')   // if you’ve configured dynamic feedback…
  const result   = params.get('result')         // or from your hard-coded ?result=accept URL

  const [message, setMessage] = useState<string>('Processing…')

  useEffect(() => {
    // 1) Optionally hit your server to finalize the DirectLink capture
    if (aliasId && orderId) {
      fetch('/pitch/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ aliasId, orderId })
      }).catch(console.error)
    }

    // 2) Figure out what to show the user
    if (result === 'accept' || status === '0') {
      setMessage('✅ Payment received! You can close this window.')
    } else if (result === 'reject' || status !== '0') {
      setMessage('❌ Payment failed. Please try again or contact support.')
    } else {
      setMessage('🤔 Payment status unknown. Contact support if this persists.')
    }
  }, [aliasId, orderId, result, status])

  return (
    <div style={{
      display:        'grid',
      placeItems:     'center',
      height:         '50vh',
      textAlign:      'center',
      background:     '#f5f5f5',
      color:          '#333',
      padding:        '2rem'
    }}>
      <h1>{message}</h1>
    </div>
  )
}
