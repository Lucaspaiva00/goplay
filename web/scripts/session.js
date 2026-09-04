(function(){
  if(window.__goplaySessionInstalled) return;
  window.__goplaySessionInstalled=true;
  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init={}){
    const url=typeof input==='string'?input:(input?.url||'');
    const token=localStorage.getItem('authToken');
    if(token && (url.includes('goplay-dzlr.onrender.com') || url.startsWith('/'))){
      const headers=new Headers(init.headers || (typeof input!=='string' ? input.headers : undefined) || {});
      if(!headers.has('Authorization')) headers.set('Authorization',`Bearer ${token}`);
      init={...init,headers};
    }
    return originalFetch(input,init).then(res=>{
      if(res.status===401 && !location.pathname.includes('login')){
        localStorage.removeItem('authToken');
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('funcionarioLogado');
        setTimeout(()=>{ if(!location.pathname.includes('login')) location.href='login.html'; },0);
      }
      return res;
    });
  };
})();
