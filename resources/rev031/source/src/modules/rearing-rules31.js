/* Confirmed by Alejandro: 12,000 larvae per larvero, usual feed 1 kg/day.
   The daily amount is a suggested capture value, never automatic depletion. */
if(!parameterSeed31.some(row=>row[0]==='REA_DAILY_FEED'))parameterSeed31.push(['REA_DAILY_FEED','Alimento diario por larvero',1,'kg/larvero/día','REA','Alejandro · 11 Nov 2026']);
function feedingDefaultAmount31(row){if(row.key!=='feed')return '';const parameter=state.parameters.find(item=>item.code==='REA_DAILY_FEED'&&item.active);if(!parameter||!Number.isFinite(parameter.value)||parameter.value<=0)return '';try{return quantityIn30(parameter.value,'kg',row.unit);}catch{return '';}}
function feedingQuantityText31(container){if(String(container.unit).toLowerCase()==='larvas')return new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(container.qtyCurrent)+' larvas';return number34(container.qtyCurrent)+' '+container.unit;}

function feedingAccumulatedKg31(container,db=state,path=new Set()){
 if(!container||path.has(container.serial))return 0;const next=new Set(path);next.add(container.serial);let kg=0;
 for(const event of db.feeding31?.events||[]){if(!event.serials?.includes(container.serial)||!event.serials.length)continue;for(const input of event.inputs||[]){try{kg+=quantityIn30(Number(input.qty),input.unit,'kg')/event.serials.length;}catch{}}}
 for(const edge of db.genealogy||[]){if(edge.child!==container.serial||!['MERGE','SPLIT'].includes(String(edge.action).toUpperCase()))continue;const parent=db.serials.find(c=>c.serial===edge.parent);if(!parent||parent.part!==container.part||!(parent.qtyInitial>0))continue;try{const share=Math.min(1,quantityIn30(Number(edge.qty),edge.unit,parent.unit)/parent.qtyInitial);kg+=feedingAccumulatedKg31(parent,db,next)*share;}catch{}}
 return kg;
}
function feedingAccumulatedText31(container){return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(feedingAccumulatedKg31(container))+' kg';}

function feedingLotCount31(rows){const incubators=rows.filter(c=>c.physicalType31==='Incubadora').length;if(incubators===rows.length)return rows.length===1?'incubadora':'incubadoras';return rows.length===1?'larvero':'larveros';}
const dailyAmountBeforeReproduction31=feedingDefaultAmount31;
feedingDefaultAmount31=function(row){if(op29().code!=='RRE')return dailyAmountBeforeReproduction31(row);const p=state.parameters.find(p=>p.code==='RRE_DAILY_FEED'&&p.active);if(row.key!=='feed'||!p)return '';return quantityIn30(p.value,'kg',row.unit);};
