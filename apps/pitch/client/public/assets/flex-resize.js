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
    window.top.location.href = window.location.href;
  }
})();