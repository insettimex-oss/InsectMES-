function assistantIcon30(name){
  const paths={mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',stop:'<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',send:'<path d="M12 20V4m-6 6 6-6 6 6"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',contract:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/>',dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="11" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 18h7m-7 3h7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',report:'<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h6"/>'};
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.report)+'</svg>';
}
let assistantDictation30=null;
function updateAssistantMic30(recording,message=''){
  if(!recording)stopAssistantWave30();
  const button=assistantPanel30.querySelector('.assistant-mic30');
  if(button){const label=recording?'Detener dictado':'Iniciar dictado';button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(recording));button.classList.toggle('is-recording',recording);button.innerHTML=assistantIcon30(recording?'stop':'mic');}
  const status=assistantPanel30.querySelector('.assistant-voice-message30');if(status)status.textContent=message;
}
function stopAssistantDictation30(){
  const recognition=assistantDictation30;assistantDictation30=null;
  if(recognition){try{recognition.stop();}catch{}}
  updateAssistantMic30(false);
}
function toggleAssistantDictation30(){
  if(assistantDictation30){stopAssistantDictation30();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){updateAssistantMic30(false,'Puedes usar el dictado de Windows con Win + H.');assistantPanel30.querySelector('[name=prompt]')?.focus();return;}
  const input=assistantPanel30.querySelector('[name=prompt]');if(!input)return;
  const recognition=new Recognition();const original=input.value.trim();let finalText='';
  recognition.lang='es-MX';recognition.continuous=true;recognition.interimResults=true;
  recognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const result=event.results[i];if(result.isFinal)finalText+=result[0].transcript+' ';else interim+=result[0].transcript;}input.value=[original,finalText.trim(),interim.trim()].filter(Boolean).join(' ').slice(0,700);input.dispatchEvent(new Event('input',{bubbles:true}));};
  recognition.onerror=event=>{if(assistantDictation30!==recognition)return;assistantDictation30=null;updateAssistantMic30(false,event.error==='not-allowed'?'Permite el acceso al micrófono para dictar.':'No se pudo completar el dictado. Inténtalo otra vez.');};
  recognition.onend=()=>{if(assistantDictation30===recognition){assistantDictation30=null;updateAssistantMic30(false);}};
  assistantDictation30=recognition;
  try{recognition.start();updateAssistantMic30(true,'Escuchando…');startAssistantWave30(recognition);}catch{assistantDictation30=null;updateAssistantMic30(false,'No se pudo iniciar el micrófono.');}
}
const assistantToggleBeforeVoice30=toggleAssistant30;
toggleAssistant30=function(){if(!assistantPanel30.hidden)stopAssistantDictation30();assistantToggleBeforeVoice30();};
const assistantLogoutBeforeVoice30=logoutDemo;
logoutDemo=function(){stopAssistantDictation30();assistantLogoutBeforeVoice30();};

let assistantWaveState30=null;
let assistantWaveGeneration30=0;
function stopAssistantWave30(){
  assistantWaveGeneration30++;
  const state=assistantWaveState30;assistantWaveState30=null;
  if(state){cancelAnimationFrame(state.frame);state.stream.getTracks().forEach(track=>track.stop());if(state.context.state!=='closed')state.context.close().catch(()=>{});}
  assistantPanel30.querySelector('.assistant-wave30')?.remove();
}
async function startAssistantWave30(recognition,providedStream,providedContext){
  stopAssistantWave30();
  const generation=assistantWaveGeneration30;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context||!navigator.mediaDevices?.getUserMedia)return;
  let stream,context;
  try{
    stream=providedStream||await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    if(generation!==assistantWaveGeneration30||assistantDictation30!==recognition){stream.getTracks().forEach(track=>track.stop());return;}
    context=providedContext||new Context();
    await context.resume();
    if(generation!==assistantWaveGeneration30||assistantDictation30!==recognition){stream.getTracks().forEach(track=>track.stop());await context.close();return;}
    const analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.65;
    context.createMediaStreamSource(stream).connect(analyser);
    const wave=document.createElement('span');wave.className='assistant-wave30';wave.setAttribute('role','img');wave.setAttribute('aria-label','Nivel de voz del micrófono');
    for(let i=0;i<18;i++)wave.append(document.createElement('i'));
    assistantPanel30.querySelector('.assistant-mic30').before(wave);
    const bars=[...wave.children],data=new Uint8Array(analyser.frequencyBinCount);
    const state={context,stream,frame:0};assistantWaveState30=state;
    const draw=()=>{
      if(assistantWaveState30!==state)return;
      analyser.getByteFrequencyData(data);
      bars.forEach((bar,index)=>{let level=0;const offset=2+index*3;for(let k=offset;k<offset+3;k++)level=Math.max(level,data[k]||0);bar.style.height=(3+Math.pow(level/255,.8)*23).toFixed(1)+'px';});
      state.frame=requestAnimationFrame(draw);
    };
    draw();
  }catch{
    stream?.getTracks().forEach(track=>track.stop());
    if(context&&context.state!=='closed')context.close().catch(()=>{});
  }
}
