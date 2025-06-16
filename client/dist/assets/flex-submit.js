(function(){
  function hideButtons(){
    var submit = document.getElementById('payment-submit');
    if(submit){
      submit.style.display='none';
      submit.setAttribute('aria-hidden','true');
      submit.tabIndex=-1;
    }
    var cancel = document.getElementById('payment-cancel-container');
    if(cancel){
      cancel.style.display='none';
      cancel.setAttribute('aria-hidden','true');
    }
  }
  function ready() {
    hideButtons();
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