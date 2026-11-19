/* Add Date is independent of production lot, age, moves and inventory edits. */
let knownContainerIds31=null;
function validContainerDate31(value){if(!value)return null;const text=String(value),date=new Date(/^\d{4}-\d{2}-\d{2}$/.test(text)?text+'T12:00:00Z':/^\d{4}-\d{2}-\d{2} \d{2}:/.test(text)?text.replace(' ','T')+'Z':text);return Number.isFinite(date.getTime())?date.toISOString():null;}
function recoverContainerDates31(db){
 const dates=new Map(),add=(serial,value,source)=>{const at=validContainerDate31(value);if(!serial||!at)return;const previous=dates.get(serial);if(!previous||at<previous.at)dates.set(serial,{at,source});};
 for(const movement of db.movements||[])if(['NEW','RECEIVE','SPLIT','MERGE','QA-STOCK','MERGE-IN'].includes(movement.type))add(movement.serial,movement.ts,'Movimiento '+movement.type);
 for(const run of db.operationRuns||[])for(const serial of run.outputSerials||[run.serial])add(serial,run.at,'Producción');
 for(const edge of db.genealogy||[])if(['PRODUCTION','MERGE','SPLIT'].includes(edge.action))add(edge.child,edge.ts,'Genealogía '+edge.action);
 for(const entry of db.nursery?.entries||[])add(entry.serial,entry.started,'Ingreso a guardería');
 for(const container of db.serials||[]){if(validContainerDate31(container.addDate))continue;const explicit=validContainerDate31(container.createdAt||container.created_at),evidence=dates.get(container.serial);if(explicit){container.addDate=explicit;container.addDateSource31='Fecha de creación existente';}else if(evidence){container.addDate=evidence.at;container.addDateSource31=evidence.source;}}
}
function containerAddDateDisplay31(container){const at=validContainerDate31(container.addDate);if(!at)return '';const parts=new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',year:'2-digit'}).formatToParts(new Date(at));const get=type=>parts.find(p=>p.type===type)?.value||'';const month=get('month').replace('.','');return get('day')+' '+month.charAt(0).toUpperCase()+month.slice(1)+', '+get('year');}
const nextContainerBeforeCreated31=nextContainer30;
nextContainer30=function(db,fields){return nextContainerBeforeCreated31(db,{...fields,addDate:new Date().toISOString(),addDateSource31:'Creación del contenedor'});};
const saveStateBeforeCreated31=saveState;
saveState=function(){if(knownContainerIds31){const at=new Date().toISOString();for(const container of state.serials||[])if(!knownContainerIds31.has(container.serial)){container.addDate=at;container.addDateSource31='Creación del contenedor';}}const result=saveStateBeforeCreated31();if(knownContainerIds31)knownContainerIds31=new Set(state.serials.map(c=>c.serial));return result;};
const initializeBeforeCreated31=initShell;
initShell=function(){knownContainerIds31=null;initializeBeforeCreated31();recoverContainerDates31(state);knownContainerIds31=new Set(state.serials.map(c=>c.serial));saveState();};
