import React, { useState } from 'react';
import { Star, CheckCircle2, CalendarDays, CircleDollarSign } from 'lucide-react';
import { apiRequest } from './api';
import { statusLabels, eventLabels } from '../shared/order-status';
export { statusLabels };
const formatDate = value => new Date(value).toLocaleString('pt-BR');
export const money = cents => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents / 100);

export default function OrderWorkflow({ order, admin = false, onChanged }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(''), [rating, setRating] = useState(0);
  async function act(action, body = {}) {
    if(busy)return;
    setBusy(true); setError('');
    try { const data=await apiRequest((admin?'/admin':'')+'/orders/'+order.id+'/'+action,body); setConfirm(''); await onChanged(data.order); }
    catch(failure) { setError(failure.message); } finally { setBusy(false); }
  }
  function quoteSubmit(event) {
    event.preventDefault(); const fields=new FormData(event.currentTarget), value=String(fields.get('amount'));
    if(!/^\d{1,7}([.,]\d{1,2})?$/.test(value)) { setError('Informe o valor com até duas casas decimais.'); return; }
    act('quote',{amountCents:Math.round(Number(value.replace(',','.'))*100), description:fields.get('description'), estimatedDuration:fields.get('estimatedDuration'),conditions:fields.get('conditions')});
  }
  function scheduleSubmit(event) {
    event.preventDefault();const fields=new FormData(event.currentTarget), at=new Date(fields.get('at'));
    if(!Number.isFinite(at.getTime())){setError('Informe a data e o horário.');return;}
    act('schedule',{at:at.toISOString(),professional:fields.get('professional'),notes:fields.get('notes')});
  }
  return <div className="orderFields">
    <span className={'orderStatus status-'+order.status}>{statusLabels[order.status] || order.status}</span>
    {order.isTest&&<p className="testBadge">TESTE INTERNO — SEM ATENDIMENTO OU COBRANÇA</p>}<h2>{order.service}</h2><p>{order.category}</p>
    <h3>Solicitação</h3><p className="preserveLines">{order.description}</p>
    {order.photos?.length>0&&<section><h3>Fotos do serviço</h3><div className="orderPhotos">{order.photos.map((photo,index)=><a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} alt={'Foto do serviço '+(index+1)} loading="lazy"/></a>)}</div></section>}
    <h3>Endereço</h3><p className="preserveLines">{order.address}</p>
    <h3>Preferência de data</h3><p>{order.preferredDate?order.preferredDate.split('-').reverse().join('/'):'O quanto antes'}</p>
    {order.quote&&<section className="quoteCard"><div className="quoteTitle"><CircleDollarSign/><div><small>PROPOSTA DA COOPSERVE</small><h2>{money(order.quote.amountCents)}</h2></div></div><p className="preserveLines">{order.quote.description}</p><h3>Prazo estimado</h3><p>{order.quote.estimatedDuration}</p>{order.quote.conditions&&<><h3>Condições</h3><p className="preserveLines">{order.quote.conditions}</p></>}<small>Enviada em {formatDate(order.quote.sentAt)}</small></section>}
    {!admin&&order.status==='awaiting_approval'&&<section className="workflowActions">
      {!confirm&&<><button className="primary" disabled={busy} onClick={()=>setConfirm('approve')}>Aprovar orçamento</button><button className="dangerOutline" disabled={busy} onClick={()=>setConfirm('reject')}>Recusar orçamento</button></>}
      {['approve','reject'].includes(confirm)&&<div className="confirmBox"><h3>{confirm==='approve'?'Confirmar aprovação?':'Confirmar recusa?'}</h3><p>{confirm==='approve'?'Você está aprovando a proposta de '+money(order.quote.amountCents)+'. A central entrará na etapa de agendamento.':'Este pedido não seguirá para agendamento com esta proposta.'}</p><button className="primary" disabled={busy} onClick={()=>act('decision',{decision:confirm,quoteId:order.quote.id})}>{busy?'Salvando…':confirm==='approve'?'Confirmar aprovação':'Confirmar recusa'}</button><button className="outline" disabled={busy} onClick={()=>setConfirm('')}>Voltar</button></div>}
    </section>}
    {order.status==='approved'&&<p className="authNotice">Orçamento aprovado. A central organizará o agendamento.</p>}
    {order.status==='rejected'&&<p className="authNotice">Orçamento recusado. Nenhum serviço foi agendado com esta proposta.</p>}
    {order.schedule&&<section className="scheduleCard"><h3><CalendarDays size={18}/> Agendamento</h3><p><b>{formatDate(order.schedule.at)}</b></p><p>Profissional: {order.schedule.professional}</p>{order.schedule.notes&&<p className="preserveLines">{order.schedule.notes}</p>}</section>}
    {order.review&&<section className="reviewCard"><h3>Avaliação do atendimento</h3><p className="reviewStars" aria-label={order.review.rating+' de 5 estrelas'}>{'★'.repeat(order.review.rating)}{'☆'.repeat(5-order.review.rating)}</p>{order.review.comment&&<p className="preserveLines">{order.review.comment}</p>}<small>{formatDate(order.review.at)}</small>{order.review.reply&&<div className="reviewReply"><b>Resposta da central</b><p className="preserveLines">{order.review.reply.text}</p></div>}</section>}
    {!admin&&order.status==='completed'&&!order.review&&<form className="workflowForm" onSubmit={event=>{event.preventDefault();if(!rating){setError('Escolha uma nota.');return;}act('review',{rating,comment:new FormData(event.currentTarget).get('comment')});}}>
      <h3>Como foi o serviço?</h3><p>Sua avaliação ajuda a CoopServe a melhorar o atendimento.</p><div className="ratingButtons" role="group" aria-label="Nota do serviço">{[1,2,3,4,5].map(value=><button key={value} type="button" aria-label={value+' estrela'+(value>1?'s':'')} aria-pressed={rating===value} className={value<=rating?'rated':''} onClick={()=>setRating(value)} disabled={busy}><Star/></button>)}</div><label>Comentário (opcional)<textarea className="textInput" name="comment" maxLength={2000} disabled={busy}/></label><button className="primary" disabled={busy||!rating}>{busy?'Enviando…':'Enviar avaliação'}</button>
    </form>}
    {admin&&order.status==='received'&&<button className="primary" disabled={busy} onClick={()=>act('review')}>{busy?'Salvando…':'Iniciar análise'}</button>}
    {admin&&['in_review','rejected'].includes(order.status)&&<form className="workflowForm" onSubmit={quoteSubmit}><h3>{order.status==='rejected'?'Preparar nova proposta':'Preparar orçamento'}</h3>
      <label>Valor total (R$)<input className="textInput" name="amount" inputMode="decimal" placeholder="Ex.: 250,00" required disabled={busy}/></label>
      <label>Descrição da proposta<textarea className="textInput" name="description" minLength={10} maxLength={3000} required defaultValue={order.quote?.description||''} disabled={busy}/></label>
      <label>Prazo estimado<input className="textInput" name="estimatedDuration" minLength={2} maxLength={120} placeholder="Ex.: até 3 horas de serviço" required defaultValue={order.quote?.estimatedDuration||''} disabled={busy}/></label>
      <label>Condições e observações<textarea className="textInput" name="conditions" maxLength={2000} defaultValue={order.quote?.conditions||''} disabled={busy}/></label>
      <button className="primary" disabled={busy}>{busy?'Enviando…':'Enviar orçamento ao cliente'}</button>
    </form>}
    {admin&&order.status==='approved'&&<form className="workflowForm" onSubmit={scheduleSubmit}><h3>Agendar atendimento</h3><label>Data e hora (horário local)<input className="textInput" name="at" type="datetime-local" required disabled={busy}/></label>
      <label>Profissional responsável<input className="textInput" name="professional" minLength={2} maxLength={100} required disabled={busy}/></label><label>Observações<textarea className="textInput" name="notes" maxLength={1000} disabled={busy}/></label><button className="primary" disabled={busy}>{busy?'Agendando…':'Confirmar agendamento'}</button></form>}
    {admin&&order.status==='scheduled'&&<button className="primary" disabled={busy} onClick={()=>act('start')}>{busy?'Salvando…':'Iniciar execução'}</button>}
    {admin&&order.status==='in_progress'&&<div className="workflowActions"><p>Confirme a conclusão somente após o atendimento ter sido realizado.</p><button className="primary" disabled={busy} onClick={()=>act('complete')}>{busy?'Salvando…':'Marcar serviço como concluído'}</button></div>}
    {admin&&order.review&&!order.review.reply&&<form className="workflowForm" onSubmit={event=>{event.preventDefault();act('reply',{reply:new FormData(event.currentTarget).get('reply')});}}><label>Responder à avaliação<textarea className="textInput" name="reply" minLength={2} maxLength={1000} required disabled={busy}/></label><button className="outline" disabled={busy}>Enviar resposta da central</button></form>}
    {error&&<p className="authError" role="alert">{error}</p>}
    <h3>Histórico do pedido</h3><ul className="orderTimeline">{order.history.map((event,index)=><li key={index}><CheckCircle2 size={16}/><span>{eventLabels[event.kind]||statusLabels[event.status]}<small>{formatDate(event.at)}</small></span></li>)}</ul>
    {!admin&&['received','in_review'].includes(order.status)&&<p className="authNotice">A central analisa seu pedido. O agendamento depende de uma proposta e da sua aprovação.</p>}
    {!admin&&['received','in_review','awaiting_approval'].includes(order.status)&&<div className="workflowActions">{confirm==='cancel'?<><p>Deseja cancelar esta solicitação?</p><button className="dangerOutline" disabled={busy} onClick={()=>act('cancel')}>Confirmar cancelamento</button><button className="outline" onClick={()=>setConfirm('')}>Voltar</button></>:<button className="textButton" onClick={()=>setConfirm('cancel')} disabled={busy}>Cancelar solicitação</button>}</div>}
  </div>;
}
