import { randomUUID } from 'node:crypto';
function safeJpeg(bytes) {
 if(bytes.length<12||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)return false;
 let offset=2;
 while(offset+4<bytes.length){
  if(bytes[offset]!==255)return false;while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];if(marker===218||marker===217)return false;
  if(offset+2>bytes.length)return false;
  const length=bytes.readUInt16BE(offset);if(length<2||offset+length>bytes.length)return false;
  if([192,193,194].includes(marker)){if(length<8)return false;const h=bytes.readUInt16BE(offset+3),w=bytes.readUInt16BE(offset+5);return w>0&&h>0&&w<=2048&&h<=2048;}
  offset+=length;
 }
 return false;
}
export function parsePhotos(input=[]) {
 if(!Array.isArray(input)||input.length>3)return null;
 const photos=[];
 for(const item of input){
  if(!item||typeof item.data!=='string'||item.data.length>550000||item.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(item.data))return null;
  const data=Buffer.from(item.data,'base64');if(data.length>400000||data.toString('base64')!==item.data||!safeJpeg(data))return null;
  photos.push({id:randomUUID(),data,mime:'image/jpeg'});
 }
 return photos;
}
export function installPhotos(app,{store,requireUser}) {
 app.get('/api/orders/:id/photos/:photoId',requireUser,async(req,res)=>{
  const photo=await store.findPhoto(req.params.id,req.params.photoId,req.user.role==='admin'?undefined:String(req.user._id));
  if(!photo)return res.status(404).json({error:'Foto não encontrada.'});
  const bytes=Buffer.isBuffer(photo.data)?photo.data:photo.data.buffer;
  res.type('image/jpeg').set('Content-Disposition','inline; filename="foto.jpg"').send(bytes);
 });
}
