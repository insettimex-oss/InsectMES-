function isRearingStation31(station){return ['REA','RRE'].includes(station.code);}
if(!productionStations30.reproduction.includes('TRA'))productionStations30.reproduction.splice(2,0,'TRA');
if(!productionStations30.reproduction.includes('RRE'))productionStations30.reproduction.splice(3,0,'RRE');
formCapture29.RRE=structuredClone(formCapture29.REA);
const initializeBeforeRearingBranches31=initShell;
initShell=function(){
 initializeBeforeRearingBranches31();
 const source=state.cpOperations.find(o=>o.code==='REA');if(!source)return;
 if(!state.cpOperations.some(o=>o.code==='RRE'))state.cpOperations.push({...structuredClone(source),code:'RRE',name:'Engorda de reproducción',wc:'WC-RRE',workcenter:'Engorda de reproducción',area:'Reproducción'});
 const location=state.setupTables.Locations.find(l=>l.code===source.wc);
 if(!state.setupTables.Locations.some(l=>l.code==='WC-RRE'))state.setupTables.Locations.push({...structuredClone(location||{active:true}),code:'WC-RRE',description:'Engorda de reproducción'});
 const master=engineeringData29();
 if(!master.operations.some(o=>o.code==='RRE'))master.operations.push({code:'RRE',name:'Engorda de reproducción',area:'Reproducción',active:true});
 if(!master.centers.some(o=>o.code==='WC-RRE'))master.centers.push({...structuredClone(master.centers.find(c=>c.code===source.wc)||{}),code:'WC-RRE',label:'Engorda de reproducción',location:'WC-RRE',area:'Reproducción',active:true});
 if(!master.routes.some(r=>r.operation==='RRE'))master.routes.push({id:'BASE-RRE',part:source.part,revision:'A',sequence:10,operation:'RRE',centers:['WC-RRE'],description:'Engorda de reproducción',note:'',active:true});
 saveState();
};
function reproductionFeedingInputs31(station){
 const route=station.panelRoute30||engineeringData29().routes.find(r=>r.operation==='RRE'&&r.active)?.id;
 const components=state.setupTables.Bom.filter(r=>r.active&&r.parentPart===station.part&&r.routingId===route);
 const feed=components.find(r=>r.componentPart!=='MP-003'&&r.componentPart!==station.input);
 return [{key:'feed',part:feed?.componentPart||state.settings.reproductionFeedPart31||'',label:'Alimento de reproducción',unit:feed?.unit||'kg'},{key:'bran',part:'MP-003',label:'Salvado',unit:'kg'}];
}
const operationBeforeRearingBranches31=op29;
op29=function(){const station=operationBeforeRearingBranches31();if(station.code!=='RRE')return station;const primary=state.cpOperations.find(o=>o.code==='REA');return {...station,input:primary.input,inputName:primary.inputName};};
const inputsBeforeRearingBranches31=inputRows30;
inputRows30=function(station){return station.code==='RRE'?reproductionFeedingInputs31(station):inputsBeforeRearingBranches31(station);};
