import React, { useEffect, useState } from 'react';
import { Handshake, ClipboardList, CircleDollarSign, CalendarDays, ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';

import { markIntroSeen } from './intro-storage';

const steps = [
  { icon: ClipboardList, tag: 'Conte com a CoopServe', title: 'O serviço que você precisa, em um só lugar.',
    description: 'Escolha uma especialidade e conte o que precisa. A central CoopServe recebe sua solicitação e organiza o atendimento.',
    card: 'Sua necessidade vem primeiro', detail: 'Serviços para cuidar da sua casa e do seu dia a dia.' },
  { icon: CircleDollarSign, tag: 'Você decide com tranquilidade', title: 'Primeiro o orçamento. Depois, sua aprovação.',
    description: 'A central analisa seu pedido e prepara uma proposta. Você confere o valor e as condições antes de aprovar a contratação.',
    card: 'Sem agendamento automático', detail: 'O atendimento só segue após sua aprovação.' },
  { icon: CalendarDays, tag: 'A central cuida do atendimento', title: 'Acompanhe cada etapa do seu pedido.',
    description: 'Após a aprovação, a CoopServe combina o agendamento e direciona o serviço a um profissional cooperado.',
    card: 'Tudo começa pelo seu pedido', detail: 'Acompanhe as atualizações na área Meus pedidos.' },
];

export default function WelcomeIntro({ onStart, onExplore }) {
  const [step, setStep] = useState(0);
  useEffect(()=>{ markIntroSeen(); },[]);
  const current = steps[step], Icon = current.icon;
  return <main className="welcome intro" aria-label="Conheça o CoopServe">
    <div className="introContent">
      <header className="introTop"><div className="logo light"><div className="logoMark"><Handshake size={25}/></div><span>Coop<b>Serve</b></span></div>
        <button className="introSkip" onClick={onStart}>Pular <ArrowRight size={15}/></button>
      </header>
      <section className="introSlide" aria-live="polite" aria-atomic="true">
        <div className="introArt" aria-hidden="true">
          <div className="introOrbit"/><div className="introIcon"><Icon size={62} strokeWidth={1.5}/></div>
          <span className="introSeal"><ShieldCheck size={22}/></span>
          <div className="introCard"><CheckCircle2 size={20}/><div><b>{current.card}</b><small>{current.detail}</small></div></div>
        </div>
        <span className="introTag">{current.tag}</span>
        <h1>{current.title}</h1><p>{current.description}</p>
      </section>
      <footer className="introActions">
        <div className="introProgress" aria-label="Etapas da apresentação">
          <div className="introDots">{steps.map((_, index)=><button key={index} aria-label={'Ir para etapa '+(index+1)} aria-current={index===step?'step':undefined} className={index===step?'active':''} onClick={()=>setStep(index)}/>)}</div>
          <span>Etapa {step+1} de {steps.length}</span>
        </div>
        <div className="introNavigation">
          {step>0&&<button className="introBack" aria-label="Etapa anterior" onClick={()=>setStep(value=>value-1)}><ArrowLeft size={20}/></button>}
          <button className="primary" onClick={()=>step===steps.length-1?onStart():setStep(value=>value+1)}>{step===steps.length-1?'Começar':'Próximo'}<ArrowRight size={18}/></button>
        </div>
        <button className="ghost" onClick={onExplore}>Explorar serviços sem entrar</button>
        <small className="introSignature">Pessoas que servem, qualidade que conecta.</small>
      </footer>
    </div>
  </main>;
}
