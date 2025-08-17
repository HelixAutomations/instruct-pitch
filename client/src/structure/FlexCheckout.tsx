import React, { useEffect, useRef, useState } from 'react';
import { theme } from '../styles/theme'; // design tokens provided elsewhere
import '../styles/FlexCheckout.css';

interface FlexCheckoutProps {
  src: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const FlexCheckout: React.FC<FlexCheckoutProps> = ({ src, onSuccess, onError }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(300);
  const [error, setError] = useState<string | null>(null);

  // Timeout if the iframe never loads
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!ready) setError('Payment page failed to load');
    }, 10000);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Handle messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const { type, flexMsg, height: h, error: err } = e.data || {};
      const msg = type || flexMsg; // support both naming schemes
      if (msg === 'FC_READY' || msg === 'ready') {
        setReady(true);
      } else if (msg === 'FC_HEIGHT' || msg === 'size') {
        if (typeof h === 'number') setHeight(h);
      } else if (msg === 'FC_ERROR') {
        setError(err || 'Payment error');
        onError(err || 'Payment error');
      } else if (msg === 'navigate' && typeof e.data.href === 'string') {
        // Existing payment logic unchanged
        if (e.data.href.includes('result=accept')) onSuccess();
        else if (e.data.href.includes('result=reject')) onError('SUBMIT_FAILED');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError, onSuccess]);

  // Relay resize events so the iframe can adjust
  useEffect(() => {
    function onResize() {
      iframeRef.current?.contentWindow?.postMessage({ type: 'RESIZE' }, '*');
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const handleSubmit = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'FC_SUBMIT' }, '*');
  };

  const retry = () => {
    setError(null);
    setReady(false);
    iframeRef.current?.contentWindow?.postMessage({ type: 'RESIZE' }, '*');
  };

  return (
    <div className="fc-container" style={{ maxWidth: 400, margin: '0 auto' }}>
      <div className="fc-iframe-wrapper" style={{ height }}>
        {!ready && !error && <div className="fc-spinner" />}
        {error ? (
          <div className="fc-error" role="alert" tabIndex={-1}>
            {error} <button onClick={retry}>Retry</button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Payment form"
            src={src}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}
      </div>
      <button
        className="fc-next-btn"
        onClick={handleSubmit}
        disabled={!ready}
        aria-disabled={!ready}
      >
        Next
      </button>
    </div>
  );
};

export default FlexCheckout;