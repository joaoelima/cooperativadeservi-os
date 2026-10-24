// Only readiness GETs are retried. Never replay a registration, order or payment.
export async function waitForApi({signal,fetchImpl=fetch,budgetMs=90000,attemptMs=10000,delayMs=2000}={}) {
  const deadline=Date.now()+budgetMs;
  while(!signal?.aborted && Date.now()<deadline){
    try{
      const timeout=AbortSignal.timeout(Math.max(1,Math.min(attemptMs,deadline-Date.now())));
      const requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
      const response=await fetchImpl('/api/health',{cache:'no-store',credentials:'omit',signal:requestSignal});
      if(response.ok && response.headers.get('content-type')?.includes('application/json')){
        const body=await response.json();if(body.status==='ok')return;
      }
    }catch(error){if(signal?.aborted)throw error;}
    if(Date.now()>=deadline)break;
    await new Promise((resolve,reject)=>{
      const done=()=>{signal?.removeEventListener('abort',cancel);resolve();};
      const timer=setTimeout(done,Math.min(delayMs,Math.max(0,deadline-Date.now())));
      const cancel=()=>{clearTimeout(timer);reject(signal.reason||new Error('cancelled'));};
      if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
    });
  }
  throw new Error('API unavailable');
}
