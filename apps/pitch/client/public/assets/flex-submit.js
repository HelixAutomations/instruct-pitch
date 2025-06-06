(function(){
  function ready() {
    window.parent.postMessage({ flexMsg: 'ready' }, '*');
  }
  function handle(e){
    if(e.data && e.data.flexMsg==='submit'){
      var btn=document.querySelector('#payment-submit');
      if(btn) btn.click();
    }
  }
  window.addEventListener('message', handle);
  if(document.readyState==='complete'){
    ready();
  }else{
    window.addEventListener('load', ready);
  }
})();