import React, { useState } from 'react';
async function compress(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw new Error('Escolha imagens JPEG, PNG ou WebP de até 10 MB.');
 const bitmap=await createImageBitmap(file);
 try {
  if(bitmap.width*bitmap.height>40000000)throw new Error('Imagem muito grande. Escolha uma foto menor.');
  const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.72));
  if(blob?.size>400000)blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.45));
  if(!blob||blob.size>400000)throw new Error('Não foi possível reduzir esta foto. Escolha uma imagem menor.');
  const bytes=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return {data:btoa(binary)};
 } finally {bitmap.close();}
}
export default function PhotoPicker({photos,onChange,disabled,onBusy}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function choose(event){const files=[...event.target.files];if(files.length>3){setError('Selecione até 3 fotos.');return;}
  setBusy(true);onBusy(true);setError('');try{onChange(await Promise.all(files.map(compress)));}catch(failure){setError(failure.message);}finally{setBusy(false);onBusy(false);event.target.value='';}}
 return <section className="photoPicker"><label>Fotos (opcional, até 3)<input className="textInput" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled||busy} onChange={choose}/></label><p className="passwordHint">Envie apenas fotos necessárias ao serviço. Evite documentos, rostos e informações pessoais.</p>{busy&&<p role="status">Preparando fotos…</p>}{error&&<p className="authError" role="alert">{error}</p>}<div className="orderPhotos">{photos.map((photo,index)=><figure key={index}><img src={'data:image/jpeg;base64,'+photo.data} alt={'Foto selecionada '+(index+1)}/><button type="button" className="textButton" disabled={disabled||busy} onClick={()=>onChange(photos.filter((_,i)=>i!==index))}>Remover</button></figure>)}</div></section>;
}
