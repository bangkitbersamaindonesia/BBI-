export const PHOTO_LIMIT=6,PHOTO_MAX_BYTES=300*1024,PHOTO_MAX_SIDE=1200,UPLOAD_MAX_BYTES=5*1024*1024;
export function validatePhotoSelection(existingCount,files){if(existingCount+files.length>PHOTO_LIMIT)throw Error('Maksimal 6 foto per SKU.');for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Gunakan foto JPG, PNG, atau WebP.');if(!file.size||file.size>UPLOAD_MAX_BYTES)throw Error('Setiap file asal maksimal 5 MB.');}}
export function fittedSize(width,height,maxSide=PHOTO_MAX_SIDE){const scale=Math.min(1,maxSide/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
async function compress(file){
 const bitmap=await createImageBitmap(file);try{
  if(bitmap.width*bitmap.height>40000000)throw Error('Resolusi file asal maksimal 40 megapiksel.');
  let size=fittedSize(bitmap.width,bitmap.height);const canvas=document.createElement('canvas');
  for(let pass=0;pass<5;pass++){
   canvas.width=size.width;canvas.height=size.height;const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [0.8,0.65,0.5]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=PHOTO_MAX_BYTES)return {src:URL.createObjectURL(blob),width:canvas.width,height:canvas.height,bytes:blob.size,name:file.name};}
   size=fittedSize(size.width,size.height,Math.max(1,Math.floor(Math.max(size.width,size.height)*0.75)));
  }
  throw Error('Foto terlalu besar setelah kompresi. Pilih foto lain.');
 }finally{bitmap.close();}
}
export function mountPhotoPicker(root,initial=[]){
 let photos=[...initial],owned=new Set(),busy=false,closed=false,generation=0;
 root.innerHTML='<label>Foto produk (maksimal 6)<input class="photo-input" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="sku-guidance">JPG / PNG / WebP, file asal maksimal 5 MB dan 40 MP. Otomatis dikecilkan ke maksimal 1.200 px, maksimal 300 KB per foto (hingga 1,8 MB per SKU). Foto tersimpan selama sesi demo.</p><div class="product-photo-grid"></div><p class="photo-status" role="status"></p>';
 const input=root.querySelector('input'),grid=root.querySelector('.product-photo-grid'),status=root.querySelector('.photo-status');
 function render(){grid.replaceChildren();for(const [i,photo]of photos.entries()){const figure=document.createElement('figure');const img=document.createElement('img');img.src=photo.src;img.alt=`Foto produk ${i+1}`;img.loading='lazy';img.width=100;img.height=100;const caption=document.createElement('figcaption');caption.textContent=`${photo.width} × ${photo.height} · ${Math.ceil(photo.bytes/1024)} KB`;const remove=document.createElement('button');remove.type='button';remove.className='secondary-button';remove.textContent=`Hapus foto ${i+1}`;remove.disabled=busy;remove.onclick=()=>{const removed=photos.splice(i,1)[0];if(owned.delete(removed.src))URL.revokeObjectURL(removed.src);render();};figure.append(img,caption,remove);grid.append(figure);}input.disabled=busy||photos.length>=PHOTO_LIMIT;}
 input.onchange=async()=>{const token=generation;const files=[...input.files];input.value='';const batch=[];try{validatePhotoSelection(photos.length,files);busy=true;render();status.textContent='Memproses foto…';for(const file of files){const photo=await compress(file);if(closed||token!==generation){URL.revokeObjectURL(photo.src);throw Error('Pemrosesan dibatalkan.');}batch.push(photo);}for(const photo of batch)owned.add(photo.src);photos.push(...batch);status.textContent=`${photos.length} dari 6 foto siap disimpan.`;}catch(error){for(const p of batch)URL.revokeObjectURL(p.src);status.textContent=error.message||'Foto tidak dapat dibaca.';}finally{busy=false;if(!closed)render();}};
 render();return {get busy(){return busy;},get photos(){return [...photos];},commit(){if(busy)throw Error('Tunggu pemrosesan foto selesai.');for(const p of initial)if(!photos.some(x=>x.src===p.src))URL.revokeObjectURL(p.src);owned.clear();return [...photos];},reset(){generation++;for(const src of owned)URL.revokeObjectURL(src);owned.clear();photos=[];render();status.textContent='';},dispose(){closed=true;for(const src of owned)URL.revokeObjectURL(src);owned.clear();}};
}
