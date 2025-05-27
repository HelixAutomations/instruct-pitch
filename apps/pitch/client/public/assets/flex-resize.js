;(function () {
  function sendHeight() {
    const h = document.documentElement.scrollHeight;
    window.parent.postMessage({ flexMsg: 'size', height: h }, '*');
  }
  window.addEventListener('load', sendHeight);
  new MutationObserver(sendHeight).observe(document.body, {
    childList: true,
    subtree:  true
  });
  if (window.top !== window.self) {
    // Request the parent window to navigate instead of forcing a redirect
    window.parent.postMessage({ flexMsg: 'navigate', href: window.location.href }, '*');
  }
})();