import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, RefreshCw } from 'lucide-react';
import { apiRequest } from './api';
export function AccountPage({ user, onBack, onSaved }) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  async function save(event){event.preventDefault();const fields=new FormData(event.currentTarget);setBusy(true);setError('');setSaved(false);try{const data=await apiRequest('/profile',{name:fields.get('name'),phone:fields.get('phone'),address:fields.get('address')});onSaved(data.user);setSaved(true);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <main className="screen"><header className="simpleHeader"><button aria-label="Voltar" onClick={onBack}><ArrowLeft/></button><h2>Dados e endereço</h2></header><form className="pad form" onSubmit={save}>
    <label>Nome completo<input className="textInput" name="name" autoComplete="name" minLength={2} maxLength={100} required defaultValue={user.name} disabled={busy}/></label>
    <label>E-mail<input className="textInput" value={user.email} readOnly/></label><p className="passwordHint">O e-mail identifica sua conta e não pode ser alterado nesta tela.</p>
    <label>Telefone (opcional)<input className="textInput" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={user.phone||''} disabled={busy}/></label>
    <label>Endereço padrão (opcional)<textarea className="textInput" name="address" autoComplete="street-address" maxLength={500} defaultValue={user.address||''} disabled={busy}/></label>
    {error&&<p className="authError" role="alert">{error}</p>}{saved&&<p className="authNotice" role="status">Dados salvos.</p>}<button className="primary" disabled={busy}>{busy?'Salvando…':'Salvar dados'}</button>
  </form></main>;
}
export function Notifications({ onBack, onOrder }) {
  const [items,setItems]=useState([]),[through,setThrough]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load(){setBusy(true);setError('');try{const data=await apiRequest('/notifications');setItems(data.notifications);setThrough(data.generatedAt);}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  useEffect(()=>{load();},[]);
  async function read(){setBusy(true);try{await apiRequest('/notifications/read',{through});await load();}catch(failure){setError(failure.message);}finally{setBusy(false);}}
  return <main className="screen"><header className="simpleHeader"><button aria-label="Voltar" onClick={onBack}><ArrowLeft/></button><h2>Atualizações dos pedidos</h2></header><div className="pad">
    <p>Os avisos aparecem aqui quando a central atualiza seus pedidos.</p><div className="inlineActions"><button className="outline" onClick={load} disabled={busy}><RefreshCw size={16}/> Atualizar</button><button className="outline" onClick={read} disabled={busy||!items.some(item=>item.unread)}>Marcar como lidos</button></div>
    {busy&&<p role="status">Carregando…</p>}{error&&<p className="authError" role="alert">{error}</p>}{!busy&&!error&&!items.length&&<p>Nenhuma atualização por enquanto.</p>}
    {items.map(item=><button key={item.id} className={'requestItem '+(item.unread?'unread':'')} onClick={()=>onOrder(item.orderId)}><b><Bell size={16}/> {item.message}</b><small>{item.reference} · {new Date(item.at).toLocaleString('pt-BR')}</small>{item.unread&&<small>Não lido</small>}</button>)}
  </div></main>;
}
export function HelpPage({ onBack, onOrders }) {return <main className="screen"><header className="simpleHeader"><button aria-label="Voltar" onClick={onBack}><ArrowLeft/></button><h2>Como funciona</h2></header><div className="pad helpPage">
  <h2>Da solicitação ao atendimento</h2><ol><li>Escolha uma especialidade e descreva sua necessidade.</li><li>A central CoopServe analisa e prepara uma proposta.</li><li>Confira o valor e as condições e aprove ou recuse o orçamento.</li><li>Após sua aprovação, a central agenda e direciona o atendimento.</li><li>Acompanhe a execução e avalie o serviço concluído.</li></ol>
  <h3>Preciso escolher um profissional?</h3><p>A central faz a distribuição dos atendimentos entre os cooperados.</p><h3>Solicitar já confirma a contratação?</h3><p>Não. O orçamento precisa ser aprovado por você antes do agendamento.</p><h3>Como acompanho a central?</h3><p>Consulte Meus pedidos e os avisos internos. A comunicação por e-mail ou WhatsApp ainda não está habilitada.</p>
  <button className="primary" onClick={onOrders}>Ver meus pedidos</button>
</div></main>;}
