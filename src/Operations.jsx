import React, { useEffect, useState } from 'react';
import { ClipboardList, LogOut, ShieldCheck, RefreshCw, ArrowLeft, LockKeyhole } from 'lucide-react';
import { authRequest } from './api';
const labels = { received: 'Solicitação recebida', in_review: 'Em análise pela central' };
const date = value => new Date(value).toLocaleString('pt-BR');
async function request(route, body) {
  const response = await fetch('/api' + route, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
  return data;
}
function Back({ onClick, children }) { return <header className="simpleHeader"><button aria-label="Voltar" onClick={onClick}><ArrowLeft/></button><h2>{children}</h2></header>; }
function OrderDetails({ order }) { return <div className="orderFields">
  <span className="orderStatus">{labels[order.status] || order.status}</span>
  <h2>{order.service}</h2><p>{order.category}</p>
  <h3>Solicitação</h3><p className="preserveLines">{order.description}</p>
  <h3>Endereço</h3><p className="preserveLines">{order.address}</p>
  <h3>Preferência de data</h3><p>{order.preferredDate ? order.preferredDate.split('-').reverse().join('/') : 'O quanto antes'}</p>
  <h3>Histórico</h3><ul>{order.history.map((event, i) => <li key={i}>{labels[event.status]} — {date(event.at)}</li>)}</ul>
  <p className="authNotice">A central analisa a solicitação. O agendamento dependerá de um orçamento e da sua aprovação.</p>
</div>; }
export function PasswordSettings({ onBack, onChanged }) {
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget, fields = new FormData(form);
    if (fields.get('newPassword') !== fields.get('confirm')) { setError('As novas senhas não coincidem.'); return; }
    setPending(true); setError('');
    try { await authRequest('password', { currentPassword: fields.get('currentPassword'), newPassword: fields.get('newPassword') }); form.reset(); setSuccess(true); }
    catch (failure) { setError(failure.message); } finally { setPending(false); }
  }
  if (success) return <main className="screen"><div className="empty"><ShieldCheck/><h2>Senha alterada</h2><p>As sessões anteriores foram encerradas. Entre novamente com a nova senha.</p><button className="primary" onClick={onChanged}>Voltar ao login</button></div></main>;
  return <main className="screen"><Back onClick={onBack}>Alterar senha</Back><form className="pad form" onSubmit={submit}>
    <p>Use uma frase-senha exclusiva de pelo menos 15 caracteres.</p>
    <label>Senha atual<input className="textInput" name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required disabled={pending}/></label>
    <label>Nova senha<input className="textInput" name="newPassword" type="password" autoComplete="new-password" minLength={15} maxLength={128} required disabled={pending}/></label>
    <label>Confirme a nova senha<input className="textInput" name="confirm" type="password" autoComplete="new-password" minLength={15} maxLength={128} required disabled={pending}/></label>
    {error && <p className="authError" role="alert">{error}</p>}<button className="primary" disabled={pending}>{pending ? 'Salvando…' : 'Alterar senha'}</button>
  </form></main>;
}
export function RequestForm({ category, service, onBack, onSent }) {
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [pickDate, setPickDate] = useState(false);
  async function submit(event) {
    event.preventDefault(); if (pending) return;
    const fields = new FormData(event.currentTarget); setPending(true); setError('');
    try { await request('/orders', { category, service, description: fields.get('description'), address: fields.get('address'), preferredDate: pickDate ? fields.get('preferredDate') : '' }); onSent(); }
    catch (failure) { setError(failure.message); } finally { setPending(false); }
  }
  return <main className="screen"><Back onClick={onBack}>Solicitar orçamento</Back><form className="pad form" onSubmit={submit}>
    <div className="miniService"><span><b>{service}</b><small>{category}</small></span></div>
    <label><h3>Explique o que você precisa</h3><textarea name="description" minLength={10} maxLength={3000} required disabled={pending}/></label>
    <label><h3>Endereço completo do atendimento</h3><input className="textInput" name="address" minLength={10} maxLength={500} autoComplete="street-address" required disabled={pending}/></label>
    <h3>Quando gostaria?</h3><div className="radioRow"><label><input type="radio" name="when" checked={!pickDate} onChange={()=>setPickDate(false)} disabled={pending}/> O quanto antes</label><label><input type="radio" name="when" checked={pickDate} onChange={()=>setPickDate(true)} disabled={pending}/> Escolher data</label></div>
    {pickDate && <label>Data de preferência<input className="textInput" type="date" name="preferredDate" required disabled={pending}/></label>}
    <p className="passwordHint">Envio de fotos será disponibilizado em uma próxima etapa.</p>
    <div className="managedInfo"><ShieldCheck/><div><b>Antes de agendar</b><small>A central recebe seu pedido e prepara uma proposta. Solicitar orçamento não confirma contratação nem agendamento.</small></div></div>
    {error && <p className="authError" role="alert">{error}</p>}<button className="primary" disabled={pending}>{pending ? 'Enviando…' : 'Enviar solicitação à central'}</button>
  </form></main>;
}
export function CustomerOrders({ user, onLogin, onBack }) {
  const [orders, setOrders] = useState([]), [selected, setSelected] = useState(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  async function load() { setLoading(true); setError(''); try { setOrders((await request('/orders')).orders); } catch (failure) { setError(failure.message); } finally { setLoading(false); } }
  useEffect(()=>{ if(user)load(); },[user?.id]);
  if (!user) return <main className="screen"><Back onClick={onBack}>Meus pedidos</Back><div className="empty"><h2>Acesse sua conta</h2><p>Seus pedidos ficam vinculados à sua conta.</p><button className="primary" onClick={onLogin}>Entrar</button></div></main>;
  if (selected) return <main className="screen"><Back onClick={()=>setSelected(null)}>{selected.reference}</Back><div className="pad"><OrderDetails order={selected}/></div></main>;
  return <main className="screen"><Back onClick={onBack}>Meus pedidos</Back><div className="pad">
    <button className="outline" onClick={load} disabled={loading}><RefreshCw size={16}/> Atualizar pedidos</button>
    {loading && <p role="status">Carregando solicitações…</p>}{error && <p className="authError" role="alert">{error}</p>}
    {!loading && !error && orders.length===0 && <p>Você ainda não enviou solicitações.</p>}
    {orders.map(order=><button className="requestItem" key={order.id} onClick={()=>setSelected(order)}><small>{order.reference} · {date(order.createdAt)}</small><b>{order.service}</b><span className="orderStatus">{labels[order.status]}</span></button>)}
    {orders.length===100 && <p>Mostrando os 100 pedidos mais recentes.</p>}
  </div></main>;
}
export function AdminDashboard({ user, onLogout, sessionError }) {
  const [orders, setOrders] = useState([]), [status, setStatus] = useState(''), [page, setPage] = useState(1), [total, setTotal] = useState(0), [selected, setSelected] = useState(null), [section, setSection] = useState('orders');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try { const data = await request('/admin/orders?page='+page+(status ? '&status='+status : '')); setOrders(data.orders); setTotal(data.total); }
    catch (failure) { setError(failure.message); } finally { setLoading(false); }
  }
  useEffect(()=>{load();setSelected(null);},[status,page]);
  async function review() {
    setBusy(true); setError('');
    try { const data = await request('/admin/orders/'+selected.id+'/review',{}); setSelected(data.order); await load(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  if(section==='password')return <PasswordSettings onBack={()=>setSection('orders')} onChanged={onLogout}/>;
  return <main className="adminShell">
    <aside className="adminSidebar"><div className="logo light"><ShieldCheck/><span>Coop<b>Serve</b></span></div><p>Central administrativa</p>
      <nav><button className="selected" onClick={()=>setSelected(null)}><ClipboardList/> Solicitações</button><button onClick={()=>setSection('password')}><LockKeyhole/> Alterar senha</button><button onClick={onLogout}><LogOut/> Sair</button></nav>
      <small>{user.name}<br/>{user.email}</small>
    </aside>
    <section className="adminContent"><header className="adminHeading"><div><small>ATENDIMENTO COOPSERVE</small><h1>Solicitações de serviço</h1><p>Receba e analise os pedidos dos clientes.</p></div><button className="outline" onClick={load} disabled={loading}><RefreshCw size={16}/> Atualizar</button></header>
    <div className="adminStats"><div><small>{status ? 'Pedidos no filtro' : 'Total de pedidos'}</small><strong>{total}</strong></div><div><small>Etapa disponível</small><b>Recebimento e análise</b><span>Orçamentos e agendamentos serão integrados depois.</span></div></div>
    <label className="adminFilter">Status<select value={status} onChange={event=>{setStatus(event.target.value);setPage(1);}}><option value="">Todos</option><option value="received">Solicitação recebida</option><option value="in_review">Em análise pela central</option></select></label>
    {(error||sessionError)&&<p className="authError" role="alert">{error||sessionError}</p>}{loading&&<p role="status">Carregando solicitações…</p>}
    <div className="adminColumns"><div className="adminList">
      {!loading&&!error&&orders.length===0&&<div className="adminEmpty"><ClipboardList/><h2>Nenhuma solicitação encontrada</h2><p>Os novos pedidos dos clientes aparecerão aqui. Use Atualizar para buscar novos pedidos.</p></div>}
      {orders.map(order=><button className={'requestItem '+(selected?.id===order.id?'chosen':'')} key={order.id} onClick={()=>setSelected(order)}><small>{order.reference} · {date(order.createdAt)}</small><b>{order.service}</b><span>{order.customer.name}</span><span className="orderStatus">{labels[order.status]}</span></button>)}
      <div className="adminPagination"><button className="outline" onClick={()=>setPage(value=>value-1)} disabled={page===1||loading}>Anterior</button><span>Página {page}</span><button className="outline" onClick={()=>setPage(value=>value+1)} disabled={page*25>=total||loading}>Próxima</button></div>
    </div><article className="adminDetail">{selected ? <><small>{selected.reference}</small><h3>Cliente</h3><p>{selected.customer.name}<br/>{selected.customer.email}</p><OrderDetails order={selected}/>{selected.status==='received'&&<button className="primary" onClick={review} disabled={busy}>{busy?'Salvando…':'Iniciar análise'}</button>}</> : <p>Selecione uma solicitação para consultar os detalhes.</p>}</article></div>
    </section></main>;
}
