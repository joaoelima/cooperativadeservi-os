import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { apiRequest } from './api';
export default function CatalogManager({onBack}) {
 const [catalog,setCatalog]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 async function load(){setBusy(true);setError('');try{setCatalog(await apiRequest('/admin/catalog'));}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 function patch(index,fields){setCatalog(current=>({...current,categories:current.categories.map((c,i)=>i===index?{...c,...fields}:c)}));setSaved(false);}
 function patchService(index,serviceIndex,fields){patch(index,{services:catalog.categories[index].services.map((s,i)=>i===serviceIndex?{...s,...fields}:s)});}
 async function save(event){event.preventDefault();setBusy(true);setError('');setSaved(false);try{setCatalog(await apiRequest('/admin/catalog',catalog));setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <main className="catalogScreen"><header className="simpleHeader"><button aria-label="Voltar à central" onClick={onBack}><ArrowLeft/></button><h2>Especialidades e serviços</h2></header><div className="pad"><p>Cadastre ou ajuste o catálogo. Desativar um item impede novas solicitações; o histórico dos pedidos permanece disponível.</p>
 {error&&<p className="authError" role="alert">{error}</p>}{saved&&<p className="authNotice" role="status">Catálogo salvo. As alterações aparecerão quando o cliente atualizar o aplicativo.</p>}
 {!catalog?<button className="outline" onClick={load} disabled={busy}>{busy?'Carregando…':'Tentar novamente'}</button>:<form onSubmit={save}><fieldset disabled={busy} className="catalogFields">
 {catalog.categories.map((category,index)=><section className="catalogCategory" key={category.id}>
 <div className="catalogCategoryHeader"><label>Especialidade<input className="textInput" value={category.name} minLength={2} maxLength={80} required onChange={e=>patch(index,{name:e.target.value})}/></label><label className="checkboxLabel"><input type="checkbox" checked={category.active} onChange={e=>patch(index,{active:e.target.checked})}/> Ativa</label></div>
 {category.services.map((service,serviceIndex)=><div className="catalogService" key={service.id}><label>Serviço<input className="textInput" value={service.name} minLength={2} maxLength={80} required onChange={e=>patchService(index,serviceIndex,{name:e.target.value})}/></label><label>Descrição<input className="textInput" value={service.description} maxLength={200} onChange={e=>patchService(index,serviceIndex,{description:e.target.value})}/></label><label className="checkboxLabel"><input type="checkbox" checked={service.active} onChange={e=>patchService(index,serviceIndex,{active:e.target.checked})}/> Disponível</label></div>)}
 <button type="button" className="outline" disabled={category.services.length>=30} onClick={()=>patch(index,{services:[...category.services,{id:crypto.randomUUID(),name:'',description:'',emoji:'🛠️',active:true}]})}>Adicionar serviço</button>
 </section>)}
 <button type="button" className="outline" disabled={catalog.categories.length>=30} onClick={()=>setCatalog(current=>({...current,categories:[...current.categories,{id:crypto.randomUUID(),name:'',active:true,services:[]}]}))}>Adicionar especialidade</button>
 <button className="primary catalogSave">{busy?'Salvando…':'Salvar catálogo'}</button></fieldset></form>}
 </div></main>;
}
