import { catalog } from '../shared/catalog.js';
export const initialCatalog = () => Object.entries(catalog).map(([name, services], index) => ({
  id: 'category-' + index, name, active: true, services: services.map(([name, description, emoji], serviceIndex) => ({
    id: 'service-' + index + '-' + serviceIndex, name, description, emoji, active: true,
  })),
}));
export function validateCatalog(categories) {
  if (!Array.isArray(categories) || categories.length > 30 || JSON.stringify(categories).length > 48000) return null;
  const ids=new Set(), names=new Set(); let total=0;
  const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{1,64}$/.test(id)&&!ids.has(id)&&!!ids.add(id);
  const validText=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
  const clean=[];
  for(const category of categories){
    if(!category||!validId(category.id)||!validText(category.name,2,80)||typeof category.active!=='boolean'||!Array.isArray(category.services)||category.services.length>30)return null;
    const name=category.name.trim(),key=name.toLocaleLowerCase('pt-BR');if(names.has(key))return null;names.add(key);
    const serviceNames=new Set(),services=[];
    for(const service of category.services){
      if(!service||!validId(service.id)||!validText(service.name,2,80)||!validText(service.description,0,200)||!validText(service.emoji,0,12)||typeof service.active!=='boolean')return null;
      const serviceKey=service.name.trim().toLocaleLowerCase('pt-BR');if(serviceNames.has(serviceKey))return null;serviceNames.add(serviceKey);
      services.push({id:service.id,name:service.name.trim(),description:service.description.trim(),emoji:service.emoji||'🛠️',active:service.active});if(++total>200)return null;
    }
    clean.push({id:category.id,name,active:category.active,services});
  }
  return clean;
}
export function activeCatalog(categories) {
  return Object.fromEntries(categories.filter(c=>c.active).map(c=>[c.name,c.services.filter(s=>s.active).map(s=>[s.name,s.description,s.emoji])]).filter(([,services])=>services.length));
}
export function installCatalog(app,{store,requireUser,requireAdmin}) {
  app.get('/api/catalog',async(_req,res)=>res.json({catalog:await store.activeCatalog()}));
  app.get('/api/admin/catalog',requireUser,requireAdmin,async(_req,res)=>res.json(await store.getCatalog()));
  app.post('/api/admin/catalog',requireUser,requireAdmin,async(req,res)=>{
    const categories=validateCatalog(req.body?.categories),revision=req.body?.revision;
    if(!categories||!Number.isSafeInteger(revision)||revision<1)return res.status(400).json({error:'Confira nomes, descrições e categorias. Evite nomes repetidos.'});
    const result=await store.saveCatalog(revision,categories,String(req.user._id));
    if(!result)return res.status(409).json({error:'O catálogo foi atualizado por outra sessão. Recarregue antes de editar.'});
    res.json(result);
  });
}
