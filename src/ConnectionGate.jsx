import React, { useEffect, useState } from 'react';
import { Handshake, RefreshCw } from 'lucide-react';
import { authEnabled } from './api';
import { waitForApi } from './connection';
export function ConnectionScreen({ failed=false, elapsed=0, onRetry }) {
  return <main className="screen connectionScreen"><div className="connectionPanel">
    <div className="logo"><div className="logoMark"><Handshake size={30}/></div><span>Coop<b>Serve</b></span></div>
    {!failed&&<div className="connectionSpinner" aria-hidden="true"/>}
    <div role={failed?'alert':'status'} aria-live="polite">
      <h1>{failed?'A conexão está demorando':'Conectando ao CoopServe…'}</h1>
      <p>{failed?'Não conseguimos conectar agora. Confira sua internet e tente novamente.':elapsed>=8?'Estamos preparando o atendimento. No primeiro acesso após uma pausa, isso pode levar cerca de um minuto.':'Estamos preparando tudo para você.'}</p>
    </div>
    {failed&&<button className="primary" onClick={onRetry}><RefreshCw size={18}/> Tentar novamente</button>}
    <small>Seu acesso será liberado assim que a conexão estiver pronta.</small>
  </div></main>;
}
export default function ConnectionGate({ children }) {
  const [attempt,setAttempt]=useState(0),[state,setState]=useState(authEnabled?'loading':'ready'),[elapsed,setElapsed]=useState(0);
  useEffect(()=>{
    if(!authEnabled)return;
    const controller=new AbortController();
    setState('loading');setElapsed(0);
    const timer=setInterval(()=>setElapsed(value=>value+1),1000);
    waitForApi({signal:controller.signal}).then(()=>{if(!controller.signal.aborted)setState('ready');}).catch(()=>{if(!controller.signal.aborted)setState('failed');}).finally(()=>clearInterval(timer));
    return ()=>{controller.abort();clearInterval(timer);};
  },[attempt]);
  return state==='ready'?children:<ConnectionScreen failed={state==='failed'} elapsed={elapsed} onRetry={()=>setAttempt(value=>value+1)}/>;
}
