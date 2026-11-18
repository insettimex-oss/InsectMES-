let assistantServerCapture30=null;
let assistantServerBusy30=false;
let assistantPreferServer30=false;
function assistantServerBusyState30(busy,message=''){
  assistantServerBusy30=busy;
  assistantPanel30.querySelectorAll('.assistant-mic30,.assistant-send30').forEach(button=>button.disabled=busy);
  const status=assistantPanel30.querySelector('.assistant-voice-message30');if(status)status.textContent=message;
}
function cancelAssistantServer30(){
  const session=assistantServerCapture30;if(!session)return;
  session.discard=true;session.controller.abort();session.stop();
  session.stream?.getTracks().forEach(track=>track.stop());
  if(session.context&&session.context.state!=='closed')session.context.close().catch(()=>{});
  assistantServerCapture30=null;assistantServerBusyState30(false);
}
async function startAssistantServer30(){
  if(!shellSession||assistantServerBusy30)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){updateAssistantMic30(false,'El dictado requiere una conexión segura y permiso de micrófono.');return;}
  if(!window.MediaRecorder){updateAssistantMic30(false,'Este navegador no permite grabar audio. Actualízalo para usar el dictado.');return;}
  const input=assistantPanel30.querySelector('[name=prompt]');if(!input)return;
  const session={kind:'server',owner:shellSession.accountId,controller:new AbortController(),discard:false,phase:'starting',chunks:[],sendAfterStop:false,stop(){
    clearTimeout(this.timer);
    if(this.recorder?.state==='recording')this.recorder.stop();
    else if(this.phase==='starting'){this.discard=true;this.controller.abort();this.stream?.getTracks().forEach(track=>track.stop());if(this.context?.state!=='closed')this.context?.close().catch(()=>{});}
  }};
  assistantServerCapture30=session;assistantDictation30=session;
  const Context=window.AudioContext||window.webkitAudioContext;
  try{if(Context){session.context=new Context();session.context.resume().catch(()=>{});}}catch{}
  updateAssistantMic30(true,'Preparando micrófono…');
  const endpoint=new URL('api/dictation/',document.baseURI);
  let healthTimer;
  try{
    healthTimer=setTimeout(()=>session.controller.abort(),6000);
    const response=await fetch(new URL('health',endpoint),{cache:'no-store',signal:session.controller.signal});
    const health=response.ok?await response.json():{};clearTimeout(healthTimer);
    if(!health.ready)throw Error(health.available===false?'El servicio de dictado no está disponible.':'El dictado se está preparando. Inténtalo de nuevo en unos segundos.');
    if(session.discard)return;
    session.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    if(session.discard||assistantDictation30!==session){session.stream.getTracks().forEach(track=>track.stop());return;}
    const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(type=>MediaRecorder.isTypeSupported?.(type));
    session.recorder=new MediaRecorder(session.stream,mime?{mimeType:mime}:{});
    session.recorder.ondataavailable=event=>{if(event.data.size)session.chunks.push(event.data);};
    session.recorder.onerror=()=>{session.discard=true;stopAssistantDictation30();assistantServerBusyState30(false,'No se pudo grabar el audio. Inténtalo de nuevo.');};
    session.recorder.onstop=async()=>{
      clearTimeout(session.timer);
      session.stream.getTracks().forEach(track=>track.stop());
      if(session.discard||shellSession?.accountId!==session.owner||!input.isConnected)return;
      if(assistantDictation30===session)assistantDictation30=null;
      updateAssistantMic30(false);assistantServerBusyState30(true,'Transcribiendo…');
      const timeout=setTimeout(()=>session.controller.abort(),120000);
      try{
        const blob=new Blob(session.chunks,{type:session.recorder.mimeType||mime||'application/octet-stream'});
        if(!blob.size)throw Error('No se capturó audio. Inténtalo de nuevo.');
        const result=await fetch(new URL('transcribe',endpoint),{method:'POST',headers:{'Content-Type':blob.type,'X-InsectMES-Dictation':'1'},body:blob,signal:session.controller.signal});
        const payload=await result.json();if(!result.ok)throw Error(payload.error||'No se pudo transcribir el audio.');
        if(session.discard||shellSession?.accountId!==session.owner||!input.isConnected)return;
        const text=String(payload.text||'').trim();
        input.value=[input.value.trim(),text].filter(Boolean).join(' ').slice(0,700);input.dispatchEvent(new Event('input',{bubbles:true}));
        assistantServerBusyState30(false,text?'':'No se detectó voz. Inténtalo de nuevo.');input.focus({preventScroll:true});
        if(session.sendAfterStop&&input.value.trim())input.form.requestSubmit();
      }catch(error){if(!session.discard)assistantServerBusyState30(false,error.name==='AbortError'?'La transcripción tardó demasiado. Inténtalo de nuevo.':error.message||'No se pudo transcribir el audio.');}
      finally{clearTimeout(timeout);if(assistantServerCapture30===session)assistantServerCapture30=null;}
    };
    session.phase='recording';session.recorder.start(250);
    updateAssistantMic30(true,'Escuchando…');startAssistantWave30(session,session.stream,session.context);
    session.timer=setTimeout(()=>{if(assistantDictation30===session)stopAssistantDictation30();},90000);
  }catch(error){
    clearTimeout(healthTimer);session.stream?.getTracks().forEach(track=>track.stop());
    if(session.context&&session.context.state!=='closed')session.context.close().catch(()=>{});
    if(assistantDictation30===session)assistantDictation30=null;
    if(assistantServerCapture30===session)assistantServerCapture30=null;
    if(!session.discard)updateAssistantMic30(false,error.name==='NotAllowedError'?'Permite el acceso al micrófono para dictar.':error.name==='NotFoundError'?'No se encontró un micrófono conectado.':error.message?.startsWith('El ')?error.message:'No se pudo conectar con el servicio de dictado.');
  }
}
const nativeAssistantDictation30=toggleAssistantDictation30;
toggleAssistantDictation30=function(){
  if(assistantDictation30){stopAssistantDictation30();return;}
  if(assistantServerBusy30)return;
  if(assistantPreferServer30||!(window.SpeechRecognition||window.webkitSpeechRecognition))return startAssistantServer30();
  nativeAssistantDictation30();
  const recognition=assistantDictation30;
  if(recognition){const onerror=recognition.onerror;recognition.onerror=event=>{const stillListening=assistantDictation30===recognition;onerror?.(event);if(stillListening&&['network','service-not-allowed','language-not-supported'].includes(event.error)&&shellSession&&!assistantPanel30.hidden){assistantPreferServer30=true;startAssistantServer30();}};}
};
const assistantPanelBeforeServer30=toggleAssistant30;
toggleAssistant30=function(){if(!assistantPanel30.hidden)cancelAssistantServer30();assistantPanelBeforeServer30();};
const assistantLogoutBeforeServer30=logoutDemo;
logoutDemo=function(){cancelAssistantServer30();assistantPreferServer30=false;assistantLogoutBeforeServer30();};
