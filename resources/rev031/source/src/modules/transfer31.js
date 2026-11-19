/* Transferencia: incubadora 5 DOL, muestreo y remanente pendiente de disposición. */
parameterSeed31.push(
 ['TRA_REPRO_TARGET','Larvas por incubadora de reproducción',3500,'larvas/incubadora','TRA','Usuario'],
 ['TRA_SAMPLE_ERROR','Diferencia máxima entre muestras',5,'%','TRA','Usuario · INS020']
);
const transferInputsBefore31=inputRows30;
inputRows30=function(station){return station.code==='TRA'?[]:transferInputsBefore31(station);};
const transferOperationBefore31=op29;
op29=function(){const station=transferOperationBefore31();return station.code==='TRA'?{...station,input:'BSF004',inputName:'Incubadora 5 DOL',unit:'larvas',units:['larvas']}:station;};
function transferSample31(fields,limit=5){
 const values=[fields.sample1,fields.sample2,fields.sample3];
 const valid=value=>Number.isSafeInteger(value)&&value>0;
 if(!valid(values[0])||!valid(values[1]))return {valid:false,requiresThird:false,error:null,average:0,pair:[]};
 const pairResult=(i,j)=>{const average=(values[i]+values[j])/2;return {pair:[i+1,j+1],average,error:Math.abs(values[i]-values[j])*100/average};};
 const first=pairResult(0,1);if(first.error<=limit)return {...first,valid:true,requiresThird:false};
 if(!valid(values[2]))return {...first,valid:false,requiresThird:true};
 const best=[first,pairResult(0,2),pairResult(1,2)].sort((a,b)=>a.error-b.error)[0];
 return {...best,valid:best.error<=limit,requiresThird:true};
}
transferStats30=function(fields){
 const limit=state.parameters?.find(p=>p.code==='TRA_SAMPLE_ERROR'&&p.active)?.value||5;
 const sample=transferSample31(fields,limit),total=fields.sampleSize>0?sample.average*(fields.larvaWeight||0)/fields.sampleSize:0;
 const transferred=Number(fields.transferred||0),target=Number(fields.perTray||0),remaining=Math.max(0,total-transferred*target);
 return {...sample,finalWeight:Number(fields.larvaWeight||0)+Number(fields.frassWeight||0),total,trays:target>0?total/target:0,gramsPerTray:total>0?Number(fields.larvaWeight||0)*target/total:0,remaining,remainingGrams:total>0?Number(fields.larvaWeight||0)*remaining/total:0};
};
function transferFields31(){const fields={};for(const[key,,type]of formCapture29.TRA){const el=document.getElementById('parameter_'+key);if(el&&el.value!=='')fields[key]=type==='number'?Number(el.value):el.value;}fields.destination=document.getElementById('transfer_destination31')?.value||'REA';return fields;}
updateTransferStats30=function(){
 const box=document.getElementById('transfer_results');if(!box)return;
 const fields=transferFields31(),stats=transferStats30(fields),fmt=value=>Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 box.innerHTML=[['Peso final',fmt(stats.finalWeight)+' g'],['Diferencia de peso',fmt(stats.finalWeight-Number(fields.initialWeight||0))+' g'],['Error de muestras',stats.error===null?'—':fmt(stats.error)+' %'],['Larvas estimadas',fmt(stats.total)],['Gramos por contenedor',fmt(stats.gramsPerTray)+' g'],['Remanente · Hold',fmt(stats.remainingGrams)+' g']].map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('');
 const third=document.getElementById('parameter_sample3');if(third){third.required=stats.requiresThird;third.closest('label').classList.toggle('sample-required31',stats.requiresThird);}
 let warning=document.getElementById('transfer_sample_warning31');if(warning)warning.textContent=stats.requiresThird?(!fields.sample3?'Captura M3: las primeras dos muestras superan la diferencia permitida.':!stats.valid?'Las muestras no coinciden dentro de la tolerancia. Repite el muestreo.':'Muestras utilizadas: M'+stats.pair.join(' y M')):'';
 const output=document.getElementById('cpOutputQty');if(output)output.value=Number(fields.transferred||0)*Number(fields.perTray||0)||'';
};
const renderTransferCaptureBefore31=renderControlPanel29;
renderControlPanel29=function(){
 renderTransferCaptureBefore31();if(op29().code!=='TRA'||!document.getElementById('parameter_initialWeight'))return;
 const params=document.querySelector('.capture-parameters');if(!params)return;
 if(!document.getElementById('transfer_destination31'))params.insertAdjacentHTML('afterbegin','<label>Destino<select class="select" id="transfer_destination31"><option value="REA">Bioconversión</option><option value="RRE">Reproducción</option></select></label>');
 if(!document.getElementById('transfer_results'))params.insertAdjacentHTML('beforeend','<div class="transfer-results" id="transfer_results"></div>');
 params.insertAdjacentHTML('beforeend','<p id="transfer_sample_warning31" role="status"></p>');
 document.getElementById('parameter_sampleSize').value=parameter31('TRA_SAMPLE');
 document.getElementById('parameter_perTray').value=parameter31('TRA_TARGET');
 document.getElementById('transfer_destination31').onchange=()=>{document.getElementById('parameter_perTray').value=parameter31(document.getElementById('transfer_destination31').value==='RRE'?'TRA_REPRO_TARGET':'TRA_TARGET');updateTransferStats30();};
 for(const el of params.querySelectorAll('input[type=number]'))el.addEventListener('input',updateTransferStats30);
 const output=document.getElementById('cpOutputQty');if(output)output.readOnly=true;
 const consume=document.getElementById('cpConsume');if(consume)consume.closest('label').hidden=true;
 const center=document.querySelector('.station32'),production=document.querySelector('.production32');
 if(center&&production){center.classList.add('transfer-station31');center.innerHTML='<h2>Transferencia</h2><div id="sourceLot"></div><fieldset id="transfer_fields31"></fieldset>';center.querySelector('fieldset').append(params);const results=document.getElementById('transfer_results');if(results)production.append(results);const warning=document.getElementById('transfer_sample_warning31');if(warning)production.append(warning);}
 refreshGate32();
 updateTransferStats30();
};
const gateTransferBefore31=refreshGate32;
refreshGate32=function(){gateTransferBefore31();const field=document.getElementById('transfer_fields31');if(field)field.disabled=document.getElementById('production_fields32')?.disabled??true;};
function recordTransfer31(db,station,args){
 if(!wcRule32(db,station.wc).allowProduction)throw Error('El Work Center debe estar en Producción.');
 const fields=args.fields||{},sample=transferSample31(fields,parameter31('TRA_SAMPLE_ERROR',db));
 if(!sample.valid)throw Error(sample.requiresThird?'Revisa la tercera muestra y la diferencia entre muestras.':'Captura dos muestras válidas.');
 for(const key of ['initialWeight','larvaWeight','sampleSize','perTray','transferred'])if(!Number.isFinite(fields[key])||fields[key]<=0)throw Error('Revisa los pesos, la muestra y los contenedores transferidos.');
 if(!Number.isFinite(fields.frassWeight)||fields.frassWeight<0)throw Error('Captura el peso de frass.');
 if(!Number.isSafeInteger(fields.transferred)||!Number.isSafeInteger(fields.perTray))throw Error('Los contenedores y las larvas por contenedor deben ser enteros.');
 const destination=fields.destination;if(!['REA','RRE'].includes(destination))throw Error('Selecciona el destino.');
 const input=db.serials.find(c=>c.serial===args.inputSerial);panelContainerRule31(db,input);
 if(input.part!=='BSF004'||input.location!==station.wc)throw Error('Carga la incubadora 5 DOL en Transferencia.');
 if(!(input.productionLot||input.lot))throw Error('La incubadora no tiene lote.');
 const total=sample.average*fields.larvaWeight/fields.sampleSize,used=fields.transferred*fields.perTray,remaining=total-used;
 if(remaining<-.000001)throw Error('Las larvas reportadas superan la estimación. Revisa la cantidad de contenedores o las larvas por contenedor.');
 const hold=remaining>.000001?db.setupTables.Container_Status.find(row=>row.active!==false&&String(row.code).toLowerCase()==='hold'):null;
 if(remaining>.000001&&!hold)throw Error('Configura Hold en Container Status antes de registrar el remanente.');
 const at=(args.date||new Date()).toISOString(),date=dateLot29(args.date||new Date()).id;
 const lines=consumeInputs30(db,[{serial:input.serial,part:input.part,qty:input.qtyCurrent,unit:input.unit}]);
 const targetStation=db.cpOperations.find(o=>o.code===destination),base={part:targetStation?.input||station.part,desc:destination==='RRE'?'Incubadora de reproducción':'Larvero',unit:'larvas',location:station.wc,lot:input.lot,productionLot:input.productionLot||input.lot,sourceLots:[input.productionLot||input.lot],transferDate:date,dolAtTransfer:5,rearingDestination31:destination,origin:'TRANSFER'};
 const outputs=[];
 for(let index=0;index<fields.transferred;index++)outputs.push(nextContainer30(db,{...base,qtyCurrent:fields.perTray,qtyInitial:fields.perTray,larvaeCount:fields.perTray,measuredWeightG31:fields.larvaWeight*fields.perTray/total,physicalType31:destination==='RRE'?'Incubadora':'Larvero',containerType:destination==='RRE'?'INCUBADORA':'LARVERO-60X40'}));
 let remainder=null;
 if(remaining>.000001){remainder=nextContainer30(db,{...base,desc:'Larvas pendientes de disposición',qtyCurrent:remaining,qtyInitial:remaining,larvaeCount:remaining,measuredWeightG31:fields.larvaWeight*remaining/total,status:hold.code,transferRemainder31:true,physicalType31:'Contenedor',containerType:'BSF'});outputs.push(remainder);}
 traceInputs30(db,lines,outputs,'Transferencia',at);
 const calculated={...sample,total,transferredLarvae:used,remaining:Math.max(0,remaining),remainingGrams:remainder?.measuredWeightG31||0,gramsPerTray:fields.larvaWeight*fields.perTray/total,finalWeight:fields.larvaWeight+fields.frassWeight};
 db.operationRuns.unshift({serial:outputs[0].serial,operation:'TRA',qty:used,unit:'larvas',lot:base.lot,productionLot:base.productionLot,inputSerial:input.serial,inputQty:lines[0].qty,inputs:lines.map(({container,...line})=>line),outputSerials:outputs.map(c=>c.serial),fields:{...fields,calculated,remainderSerial:remainder?.serial||''},operator:args.operator||'',at,wc:station.wc});
 for(const entry of db.nursery.entries)if(entry.serial===input.serial&&!entry.closed)entry.closed=at;
 return outputs[0];
}
const reportTransferBefore31=reportProduction29;
const loadTransferBefore31=loadSource32;
loadSource32=function(id){const result=loadTransferBefore31(id);if(op29().code==='TRA'&&id==='cpInput'){const serial=state.loadedSources?.[op29().wc]?.cpInput?.serial,source=state.serials.find(c=>c.serial===serial),field=document.getElementById('parameter_initialWeight');if(source&&field&&!field.value){try{field.value=standardAmount30(source.qtyCurrent,source.unit,'g');}catch{}updateTransferStats30();}}return result;};
reportProduction29=async function(){
 if(op29().code!=='TRA')return reportTransferBefore31();if(!requireLevel(2,'control'))return;
 try{const station=op29(),link=state.loadedSources?.[station.wc]?.cpInput;if(!link)throw Error('Carga la incubadora de entrada.');const next=structuredClone(state),out=recordTransfer31(next,station,{inputSerial:link.serial,fields:transferFields31(),operator:shellSession?.user});state=next;saveState();renderApp();showMsg('Transferencia registrada · '+out.lot);}catch(error){showMsg(error.message,true);}
};

function feedingAge31(container,today=dateLot29().id){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(container.transferDate||'')||!Number.isFinite(container.dolAtTransfer))return null;
 const days=(Date.parse(today+'T12:00:00Z')-Date.parse(container.transferDate+'T12:00:00Z'))/86400000;
 return Number.isInteger(days)&&days>=0?container.dolAtTransfer+days:null;
}
feedingAgeBadge31=function(container){const age=feedingAge31(container);return age===null?'':'<span class="feeding-age31">'+age+' DOL</span>';};
function refreshFeedingAges31(){for(const card of document.querySelectorAll('[data-feeding-serial31]')){const container=state.serials.find(c=>c.serial===card.dataset.feedingSerial31),badge=card.querySelector('.feeding-age31');if(container&&badge){const age=feedingAge31(container);badge.textContent=age===null?'':age+' DOL';}}}
setInterval(refreshFeedingAges31,60000);
window.addEventListener('focus',refreshFeedingAges31);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshFeedingAges31();});
