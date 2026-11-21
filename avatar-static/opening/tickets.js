/* Ticket photos stay on this phone. Only a capture receipt reaches the room. */
window.TicketCamera=(()=>{
 let key,root,video,preview,status,openButton,snapButton,retryButton,sendButton,input,stream,photo,objectUrl,paused=false,working=false,generation=0,submit;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 function stop(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;if(video)video.srcObject=null;}
 function revoke(){if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;photo=null;}
 function close(){generation++;stop();revoke();key=null;root=null;}
 function controls(){
  if(!root)return;
  openButton.hidden=Boolean(stream||photo);snapButton.hidden=!stream;retryButton.hidden=!photo;sendButton.hidden=!photo;
  for(const b of [openButton,snapButton,retryButton,sendButton,input])b.disabled=paused||working;
  video.hidden=!stream;preview.hidden=!photo;
 }
 async function open(){
  if(paused||working)return;const job=++generation;working=true;status.textContent='Открываем камеру…';controls();
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('unsupported');
   const media=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
   if(job!==generation){media.getTracks().forEach(t=>t.stop());return;}
   stream=media;video.srcObject=media;await video.play();status.textContent='Помести билет целиком в кадр.';
  }catch(e){if(job===generation){stop();status.textContent='Камера не открылась. Разреши доступ в браузере или нажми «Сделать фото другим способом».';}}
  finally{if(job===generation){working=false;controls();}}
 }
 function setPhoto(url,width,height){revoke();objectUrl=url;photo={width,height};preview.src=url;stop();status.textContent='Билет хорошо виден? Подтверди снимок или пересними.';controls();}
 async function snap(){
  if(paused||working||!video.videoWidth)return;
  const job=generation;working=true;controls();
  const ratio=Math.min(1,1280/video.videoWidth),canvas=document.createElement('canvas');canvas.width=Math.round(video.videoWidth*ratio);canvas.height=Math.round(video.videoHeight*ratio);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
  if(job!==generation)return;
  working=false;if(blob)setPhoto(URL.createObjectURL(blob),canvas.width,canvas.height);else{status.textContent='Не получилось сделать снимок. Попробуй ещё раз.';controls();}
 }
 function render(data,parent,onSubmit,isPaused){
  paused=Boolean(isPaused);submit=onSubmit;
  if(key!==data.key||!root?.isConnected){
   close();key=data.key;working=false;
   root=el('section',null,'panel ticket-panel');root.append(el('p','Проверка билетов','eyebrow'),el('h1','Твой билет в приключение'),el('p','Сфотографируй свой билет. Когда все будут готовы, смотритель продолжит.','subtitle'));
   const frame=el('div',null,'ticket-camera');video=el('video');video.autoplay=true;video.muted=true;video.playsInline=true;video.setAttribute('playsinline','');preview=el('img');preview.alt='Снимок твоего билета';frame.append(video,preview);root.append(frame);
   status=el('p','Подготовь билет и открой камеру.','ticket-status');status.setAttribute('role','status');root.append(status);
   const buttons=el('div',null,'ticket-actions');
   openButton=el('button','Открыть камеру','primary-action');openButton.onclick=open;
   snapButton=el('button','Сфотографировать','primary-action');snapButton.onclick=snap;
   retryButton=el('button','Переснять','secondary-action');retryButton.onclick=()=>{if(paused||working)return;revoke();void open();};
   sendButton=el('button','Подтвердить снимок','primary-action');sendButton.onclick=async()=>{if(paused||working||!photo)return;working=true;controls();try{await submit({key,captured:true,...photo});}catch(e){status.textContent=e.message;}finally{working=false;controls();}};
   buttons.append(openButton,snapButton,retryButton,sendButton);root.append(buttons);
   const fallback=el('label','Сделать фото другим способом','ticket-fallback');input=el('input');input.type='file';input.accept='image/*';input.setAttribute('capture','environment');
   input.onchange=()=>{const f=input.files?.[0];if(!f||paused)return;const job=generation,url=URL.createObjectURL(f),im=new Image();im.onload=()=>{if(job!==generation){URL.revokeObjectURL(url);return;}if(im.naturalWidth<64||im.naturalHeight<64){URL.revokeObjectURL(url);status.textContent='Снимок слишком маленький. Сделай новый.';return;}setPhoto(url,im.naturalWidth,im.naturalHeight);};im.onerror=()=>{URL.revokeObjectURL(url);status.textContent='Не удалось открыть фото. Попробуй снять билет через камеру выше.';};im.src=url;input.value='';};fallback.append(input);root.append(fallback);
   root.append(el('p','Фотография остаётся на твоём телефоне.','hint'),el('p',null,'ticket-progress'));parent.replaceChildren(root);
  }
  root.querySelector('.ticket-progress').textContent='Готово '+data.answered+' из '+data.total;
  if(data.captured){stop();revoke();root.querySelector('.ticket-camera').hidden=true;root.querySelector('.ticket-actions').hidden=true;root.querySelector('.ticket-fallback').hidden=true;status.textContent='Билет сфотографирован. Ждём остальных путешественников.';}
  controls();
 }
 window.addEventListener('pagehide',close);
 return {render,close};
})();
