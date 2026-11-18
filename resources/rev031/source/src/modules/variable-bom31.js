// Composition belongs to a No Parte/BOM, never to the Work Center.
const recipeSeeds31=[
 {part:'F-001',name:'Alimento preparado',components:[['MP-001',47],['MP-002',15.9],['MP-004',37.1]]},
 {part:'F-002',name:'Alimento preparado premium 1',components:[['PREMIUM-FEED',34],['MP-004',66]]},
 {part:'F-003',name:'Alimento preparado premium 2',components:[['PREMIUM-FEED',45],['MP-004',55]]}
];
function bomProfile31(part,db=state){return db.bomProfiles31?.[part]||{basis:'quantity',variable:false,validateTotal100:false};}
function recipeMassAmount31(db,kg,part,unit){
 if(kg===0)return 0;
 const normal=String(unit).toLowerCase();
 if(['l','ml'].includes(normal)){
  const density=Number(db.materialDensities31?.[part]);if(!(density>0))throw Error('Configura la densidad de '+part+'.');
  return standardAmount30(kg/density,'L',unit);
 }
 return standardAmount30(kg,'kg',unit);
}
function recipeMassFrom31(db,amount,part,unit){
 if(amount===0)return 0;
 if(['l','ml'].includes(String(unit).toLowerCase())){const density=Number(db.materialDensities31?.[part]);if(!(density>0))throw Error('Configura la densidad de '+part+'.');return standardAmount30(amount,unit,'L')*density;}
 return standardAmount30(amount,unit,'kg');
}
function recipeLinePercent31(line,db=state){
 if(line.percent31!=null)return Number(line.percent31);
 if(line.qtyPerUnit==null)return 0;
 const output=db.parts.find(p=>p.part===line.parentPart);return recipeMassFrom31(db,Number(line.qtyPerUnit),line.componentPart,line.unit)/standardAmount30(1,output.unit,'kg')*100;
}
function validateRecipeTotal31(lines,profile){
 if(!lines.length&&!profile.byproducts?.length)throw Error('Agrega al menos un componente.');
 for(const line of lines)if(!Number.isFinite(line.amount)||line.amount<0)throw Error('Revisa las cantidades de los componentes.');
 const total=lines.reduce((sum,line)=>sum+line.amount,0);
 if(profile.basis==='percent'&&profile.validateTotal100&&Math.abs(total-100)>1e-7)throw Error('El total del BOM debe ser 100%. Total actual: '+number34(total)+'%.');
 return total;
}
function seedVariableRecipes31(db){
 if(db.variableRecipes31?.version===1)return false;
 db.materialDensities31??={};db.materialDensities31['MP-002']=1;db.materialDensities31['MP-004']=1;
 db.bomProfiles31??={};
 const source=db.parts.find(p=>p.part==='F-002');
 if(!source)throw Error('Falta F-002 para configurar las fórmulas.');
 for(const spec of recipeSeeds31){
  let part=db.parts.find(p=>p.part===spec.part);
  if(!part){part={...structuredClone(source),part:spec.part};db.parts.push(part);}
  part.desc=spec.name;
  const old=db.setupTables.Bom.filter(row=>row.parentPart===spec.part);
  db.setupTables.Bom=db.setupTables.Bom.filter(row=>row.parentPart!==spec.part);
  for(const [component,percent]of spec.components){
   const material=db.parts.find(p=>p.part===component);if(!material)throw Error('Falta '+component+'.');
   db.setupTables.Bom.push({...(old.find(r=>r.componentPart===component)||{}),active:true,parentPart:spec.part,componentPart:component,percent31:percent,qtyPerUnit:recipeMassAmount31(db,standardAmount30(1,part.unit,'kg')*percent/100,component,material.unit),unit:material.unit,routingId:'',quantityPending31:false});
  }
  db.bomProfiles31[spec.part]={basis:'percent',variable:true,validateTotal100:false};
  if(db.engineering29&&!db.engineering29.routes.some(r=>r.part===spec.part&&r.operation==='FED'))db.engineering29.routes.push({id:'RECIPE-'+spec.part+'-FED',part:spec.part,revision:'A',sequence:10,operation:'FED',centers:['WC-FED'],description:'Preparación de alimento',note:'',active:true});
 }
 db.variableRecipes31={version:1,at:new Date().toISOString(),source:'Alejandro · recetas, BOM variable y densidad 1 kg/L; validación 100% opcional y desactivada'};
 db.configHistory.unshift({at:db.variableRecipes31.at,action:'Configurar tres fórmulas variables; conservar BOM de cantidades y permitir total >100% salvo validación expresa.'});
 return true;
}
const initializeBeforeVariableBom31=initShell;
initShell=function(){initializeBeforeVariableBom31();if(state.variableRecipes31?.version===1)return;const next=structuredClone(state);if(seedVariableRecipes31(next)){localStorage.setItem('InsectMES_Rev031_before_variable_bom_'+Date.now(),JSON.stringify(state));const previous=state;state=next;try{saveState();}catch(error){state=previous;throw error;}}};
let selectedBomPart31='',bomDraft31=null;
function bomLineAmount31(line){return bomProfile31(line.parentPart).basis==='percent'?recipeLinePercent31(line):Number(line.qtyPerUnit);}
bomCatalogValues30=function(line){return {'No Parte':line.componentPart,'Descripción':getPart(line.componentPart)?.desc||'','Cantidad':line.qtyPerUnit==null?'—':number34(bomLineAmount31(line)),'Unidad':bomProfile31(line.parentPart).basis==='percent'?'%':line.unit};};
bomMatchesCatalogSearch30=function(line,search){if(!catalogSearchHas30(search))return true;const values=bomCatalogValues30(line),parent=line.parentPart+' '+(getPart(line.parentPart)?.desc||'');const query=search.query&&catalogSearchText30(parent).includes(catalogSearchText30(search.query))?'':search.query;const criteria=search.criteria.filter(c=>c.column!=='No Parte'||!catalogSearchText30(line.parentPart).includes(catalogSearchText30(c.value)));const columns=Object.fromEntries(Object.entries(search.columns||{}).filter(([label])=>label in values));if(columns['No Parte']&&catalogSearchMatches30({'No Parte':line.parentPart},{query:'',criteria:[],columns:{'No Parte':columns['No Parte']}}))delete columns['No Parte'];return catalogSearchMatches30(values,{...search,query,criteria,columns});};
renderBomCatalog=function(){
 if(uiState.bomEditor31){if(!bomDraft31)loadBomDraft31(uiState.bomEditor31==='new'?'':uiState.bomEditor31);return renderBomEditor31();}
 const groups=new Map(),search=catalogSearchActive30('bom');
 for(const line of state.setupTables.Bom||[]){if(uiState.bomPart29&&line.parentPart!==uiState.bomPart29)continue;if(!bomMatchesCatalogSearch30(line,search))continue;if(!groups.has(line.parentPart))groups.set(line.parentPart,[]);groups.get(line.parentPart).push(line);}
 if(!groups.has(selectedBomPart31))selectedBomPart31='';
 const edit=levelFor('bom')>=2;
 const actions=`<div class="actionbar">${edit?'<button class="btn soft" onclick="openBomEditor31()">Agregar</button><button class="btn soft" '+(!selectedBomPart31?'disabled':'')+' data-bom-edit31 onclick="openBomEditor31(selectedBomPart31)">Editar</button>':''}<button class="btn soft" onclick="exportGroupedBom30()">Exportar</button>${levelFor('bom')>=3?'<button class="btn danger" '+(!selectedBomPart31?'disabled':'')+' onclick="deleteBomGroup31()">Eliminar</button>':''}</div>`;
 const rows=[...groups].sort(([a],[b])=>a.localeCompare(b)).flatMap(([part,lines])=>{
  const expanded=bomAll30||bomExpanded30.has(part),profile=bomProfile31(part);
  const group=`<tr class="bom-group30 ${selectedBomPart31===part?'selected':''}" data-components="${lines.length}"><td colspan="5"><div class="bom-group-bar31"><input type="radio" name="bom-selection31" aria-label="Seleccionar ${esc(part)}" ${selectedBomPart31===part?'checked':''} data-part="${esc(part)}" onchange="selectBomGroup31(this.dataset.part)"><button class="btn link" data-part="${esc(part)}" aria-expanded="${expanded}" onclick="toggleBomGroup30(this.dataset.part)">${expanded?'▾':'▸'} ${esc(part)} · ${esc(getPart(part)?.desc||'')}</button><small>${lines.length} componentes</small>${profile.variable?'<span class="bom-variable-chip31">BOM variable</span>':''}</div></td></tr>`;
  if(!expanded)return [group];
  return [group,...lines.map(line=>`<tr><td></td><td><button class="btn link" data-part="${esc(part)}" onclick="openBomEditor31(this.dataset.part)">${esc(line.componentPart)}</button></td><td>${esc(getPart(line.componentPart)?.desc||'')}</td><td class="number">${line.qtyPerUnit==null?'—':number34(bomLineAmount31(line))}</td><td>${profile.basis==='percent'?'%':esc(line.unit)}</td></tr>`)];
 });
 const grid=resultsTable30(['','No Parte','Descripción','Cantidad','Unidad'],rows,'680px').replace('<th></th>','<th><span data-select-all30 aria-hidden="true"></span></th>');
 return cardNavigation29('BOM',`<div data-catalog-filter30 data-standard-filter30="1"></div>${actions}<div class="bom-grid31"><div class="bom-grid-tools31"><button type="button" onclick="expandAllBom30(true)">Expandir todos</button><button type="button" onclick="expandAllBom30(false)">Contraer todos</button></div>${grid}</div>`);
};
function selectBomGroup31(part){selectedBomPart31=part;renderApp();}
function loadBomDraft31(part){const profile=structuredClone(bomProfile31(part));bomDraft31={parent:part,original:part,...profile,lines:(state.setupTables.Bom||[]).filter(r=>r.parentPart===part).map(r=>({component:r.componentPart,amount:profile.basis==='percent'?recipeLinePercent31(r):Number(r.qtyPerUnit),unit:r.unit}))};}
function openBomEditor31(part=''){if(!requireLevel(2,'bom'))return;loadBomDraft31(part);uiState.bomEditor31=part||'new';renderApp();history.pushState({insectmes:snapshot29()},'', '#/bom/detail/'+encodeURIComponent(part||'new'));}
function closeBomEditor31(){uiState.bomEditor31='';bomDraft31=null;renderApp();history.replaceState({insectmes:snapshot29()},'','#/bom');}
function renderBomEditor31(){const d=bomDraft31;const partOptions=state.parts.map(p=>`<option value="${esc(p.part)}" ${d.parent===p.part?'selected':''}>${esc(p.part+' · '+p.desc)}</option>`).join('');const parts=(value)=>'<option value="">Seleccionar No Parte</option>'+state.parts.filter(p=>p.part!==d.parent).map(p=>`<option value="${esc(p.part)}" ${p.part===value?'selected':''}>${esc(p.part+' · '+p.desc)}</option>`).join('');
 return cardNavigation29(d.original?'Editar BOM':'Agregar BOM',`<form id="bom-editor31" onsubmit="event.preventDefault();saveBomEditor31(false)"><div class="bom-editor-meta31"><label>No Parte <span class="req">*</span><select class="select" name="parent" required ${d.original?'disabled':''} onchange="bomDraft31.parent=this.value;renderApp()"><option value="">Seleccionar No Parte</option>${partOptions}</select></label><label>Base del BOM<select class="select" name="basis" onchange="changeBomBasis31(this.value)"><option value="quantity" ${d.basis==='quantity'?'selected':''}>Cantidad</option><option value="percent" ${d.basis==='percent'?'selected':''}>Porcentaje</option></select></label><label class="bom-check31"><input name="variable" type="checkbox" ${d.variable?'checked':''} onchange="bomDraft31.variable=this.checked">BOM variable</label>${d.basis==='percent'?`<label class="bom-check31"><input name="validateTotal100" type="checkbox" ${d.validateTotal100?'checked':''} onchange="bomDraft31.validateTotal100=this.checked;updateBomEditorTotal31()">Validar total 100%</label>`:''}</div><div class="bom-edit-grid31"><table><thead><tr><th>No Parte</th><th>Descripción</th><th>${d.basis==='percent'?'Porcentaje (%)':'Cantidad'}</th><th>Unidad</th><th></th></tr></thead><tbody>${d.lines.map((r,i)=>`<tr><td><select class="select" aria-label="Componente ${i+1}" required onchange="bomDraft31.lines[${i}].component=this.value;bomDraft31.lines[${i}].unit=getPart(this.value)?.unit||'';renderApp()">${parts(r.component)}</select></td><td>${esc(getPart(r.component)?.desc||'')}</td><td><input class="input" type="number" min="0" step="any" required aria-label="${d.basis==='percent'?'Porcentaje':'Cantidad'} ${esc(r.component||i+1)}" value="${r.amount??''}" oninput="bomDraft31.lines[${i}].amount=this.value===''?NaN:Number(this.value);updateBomEditorTotal31()"></td><td>${d.basis==='percent'?'%':esc(r.unit)}</td><td><button type="button" class="btn danger" aria-label="Eliminar componente ${i+1}" onclick="bomDraft31.lines.splice(${i},1);renderApp()">×</button></td></tr>`).join('')}</tbody></table><button type="button" class="btn soft" onclick="bomDraft31.lines.push({component:'',amount:'',unit:''});renderApp()">Agregar componente</button>${d.basis==='percent'?`<div class="bom-total31" id="bom-total31">Total <strong>${number34(d.lines.reduce((n,r)=>n+(Number(r.amount)||0),0))}%</strong></div>`:''}</div><div class="capture-actions"><button type="button" class="btn soft" onclick="closeBomEditor31()">Cancelar</button><button type="button" class="btn soft" onclick="saveBomEditor31(true)">Aplicar</button><button type="submit" class="btn soft">Guardar</button></div><div id="bom-error31" role="alert"></div></form>`);
}
function changeBomBasis31(value){bomDraft31.basis=value;bomDraft31.validateTotal100=false;for(const line of bomDraft31.lines)line.amount='';renderApp();}
function updateBomEditorTotal31(){const el=document.getElementById('bom-total31');if(!el)return;const total=bomDraft31.lines.reduce((n,r)=>n+(Number(r.amount)||0),0);el.innerHTML='Total <strong>'+number34(total)+'%</strong>';el.classList.toggle('is-not-100',Math.abs(total-100)>1e-7);}
function saveBomEditor31(stay){
 if(!requireLevel(2,'bom')||!document.getElementById('bom-editor31').reportValidity())return;
 try{const d=bomDraft31;if(!getPart(d.parent))throw Error('Selecciona un No Parte válido.');if(!d.original&&state.setupTables.Bom.some(r=>r.parentPart===d.parent))throw Error('Ese BOM ya existe. Selecciónalo y pulsa Editar.');if(new Set(d.lines.map(r=>r.component)).size!==d.lines.length)throw Error('No repitas componentes.');if(d.lines.some(r=>!getPart(r.component)||r.component===d.parent))throw Error('Revisa los componentes.');validateRecipeTotal31(d.lines,d);
  const byproducts=d.byproducts||[];for(const row of byproducts)if(row.part===d.parent||!state.parts.some(p=>p.part===row.part&&p.unit===row.unit))throw Error('Revisa el No Parte del Byproduct.');
  const next=structuredClone(state),parent=next.parts.find(p=>p.part===d.parent),outputKg=d.basis==='percent'?standardAmount30(1,parent.unit,'kg'):0;
  next.bomOutputs31=[...(next.bomOutputs31||[]).filter(row=>row.parentPart!==d.parent),...structuredClone(byproducts).map(row=>({...row,parentPart:d.parent}))];
  next.setupTables.Bom=next.setupTables.Bom.filter(r=>r.parentPart!==d.parent);
  for(const row of d.lines){const material=next.parts.find(p=>p.part===row.component),record={active:Number(row.amount)>0,parentPart:d.parent,componentPart:row.component,qtyPerUnit:d.basis==='percent'?recipeMassAmount31(next,outputKg*Number(row.amount)/100,row.component,material.unit):Number(row.amount),unit:material.unit,routingId:''};if(d.basis==='percent')record.percent31=Number(row.amount);next.setupTables.Bom.push(record);}
  next.bomProfiles31??={};next.bomProfiles31[d.parent]={basis:d.basis,variable:d.variable,validateTotal100:d.basis==='percent'&&d.validateTotal100};next.configHistory.unshift({at:new Date().toISOString(),action:'Editar BOM '+d.parent});const previous=state;state=next;try{saveState();}catch(error){state=previous;throw error;}selectedBomPart31=d.parent;if(stay){loadBomDraft31(d.parent);renderApp();}else closeBomEditor31();showMsg('BOM guardado.');
 }catch(error){const el=document.getElementById('bom-error31');if(el)el.textContent=error.message;else showMsg(error.message,true);}
}
function deleteBomGroup31(){if(!requireLevel(3,'bom')||!selectedBomPart31)return;const part=selectedBomPart31;if(state.serials.some(c=>c.part===part)||state.operationRuns.some(r=>r.part===part))return showMsg('El No Parte tiene transacciones; no se puede eliminar su BOM.',true);saveReceivingState30(()=>{state.setupTables.Bom=state.setupTables.Bom.filter(r=>r.parentPart!==part);delete state.bomProfiles31?.[part];});selectedBomPart31='';renderApp();}
editBom=function(){const part=selectedBomPart31||state.setupTables.Bom[uiState.bomSelectedIndex]?.parentPart;if(part)openBomEditor31(part);};
exportGroupedBom30=function(){if(!requireLevel(1,'bom'))return;const search=catalogSearchActive30('bom'),rows=state.setupTables.Bom.filter(r=>bomMatchesCatalogSearch30(r,search));exportRows('bom.csv',['No Parte','Componente','Descripción','Cantidad','Unidad','BOM variable','Validar total 100%'],rows.map(r=>[r.parentPart,r.componentPart,getPart(r.componentPart)?.desc||'',bomLineAmount31(r),bomProfile31(r.parentPart).basis==='percent'?'%':r.unit,bomProfile31(r.parentPart).variable?'Sí':'No',bomProfile31(r.parentPart).validateTotal100?'Sí':'No']));};

function variableCaptureMap31(station,db=state){
 const profile=bomProfile31(station.part,db),saved=uiState.variableBomCapture31;
 const master=Object.fromEntries((db.setupTables.Bom||[]).filter(r=>r.parentPart===station.part).map(r=>[r.componentPart,recipeLinePercent31(r,db)]));
 return profile.variable&&saved?.key===station.wc+':'+station.part?{...master,...saved.percentages}:master;
}
function variableCaptureLines31(station,db=state){const percentages=variableCaptureMap31(station,db);return (db.setupTables.Bom||[]).filter(r=>r.parentPart===station.part).map(r=>({part:r.componentPart,amount:Number(percentages[r.componentPart]),unit:r.unit}));}
const sourceRowsBeforeVariable31=sourceRows32;
sourceRows32=function(){const rows=sourceRowsBeforeVariable31(),station=op29();if(bomProfile31(station.part).basis!=='percent')return rows;const percentages=variableCaptureMap31(station);return rows.filter(row=>Number(percentages[row.part])>0);};
function setCapturePercent31(part,value){
 const station=op29(),profile=bomProfile31(station.part);if(!profile.variable)return;
 if(uiState.variableBomCapture31?.key!==station.wc+':'+station.part)uiState.variableBomCapture31={key:station.wc+':'+station.part,percentages:variableCaptureMap31(station)};
 uiState.variableBomCapture31.percentages[part]=value===''?NaN:Number(value);refreshGate32();
}
function redrawVariableCapture31(){
 const expected=sourceRows32().map(r=>'source_card_'+r.id).sort().join('|'),present=[...document.querySelectorAll('.sources32 .source-card32')].map(el=>el.id).sort().join('|');
 if(expected===present){refreshGate32();return;}
 const view=document.getElementById('view-workcenters'),values=Object.fromEntries([...view.querySelectorAll('#cpOutputQty,#parameter_notes,[id^=parameter_]')].map(el=>[el.id,el.value]));
 renderControlPanel29();for(const [id,value]of Object.entries(values)){const el=document.getElementById(id);if(el)el.value=value;}refreshGate32();
}
let syncingVariableBom31=false;
function syncVariableCapture31(){
 if(syncingVariableBom31||uiState.panelMode30!=='capture')return;
 const station=op29(),profile=bomProfile31(station.part);if(profile.basis!=='percent')return;
 syncingVariableBom31=true;
 try{
  const lines=variableCaptureLines31(station),total=lines.reduce((n,l)=>n+(Number(l.amount)||0),0),el=document.getElementById('variable-bom-total31');
  if(el){el.textContent=number34(total)+'%';el.classList.toggle('is-not-100',Math.abs(total-100)>1e-7);}
  const quantity=Number(document.getElementById('cpOutputQty')?.value)||0;const outputKg=quantity===0?0:standardAmount30(quantity,getPart(station.part).unit,'kg');
  for(const row of sourceRows32()){const input=document.getElementById(row.qtyId),percent=lines.find(l=>l.part===row.part)?.amount;if(input&&Number.isFinite(percent)){input.value=quantity>0?String(Number(recipeMassAmount31(state,outputKg*percent/100,row.part,row.unit).toFixed(8))):'';input.readOnly=true;}}
 }catch(error){const message=document.getElementById('variable-bom-error31');if(message)message.textContent=error.message;}
 finally{syncingVariableBom31=false;}
}
const gateBeforeVariableBom31=refreshGate32;
refreshGate32=function(){
 gateBeforeVariableBom31();const station=op29(),profile=bomProfile31(station.part);if(profile.basis!=='percent'||uiState.panelMode30!=='capture')return;
 syncVariableCapture31();
 try{const total=validateRecipeTotal31(variableCaptureLines31(station),profile);if(!(total>0))throw Error('Agrega una cantidad mayor que cero a la fórmula.');const message=document.getElementById('variable-bom-error31');if(message)message.textContent='';}
 catch(error){const button=document.getElementById('reportProduction');if(button)button.disabled=true;const message=document.getElementById('variable-bom-error31');if(message)message.textContent=error.message;}
};
const renderBeforeVariableBom31=renderControlPanel29;
renderControlPanel29=function(){
 renderBeforeVariableBom31();const station=op29(),profile=bomProfile31(station.part);if(uiState.panelMode30!=='capture'||profile.basis!=='percent')return;
 const target=document.querySelector('.station32');if(!target)return;
 target.classList.add('formula-station31');target.querySelector('.station-art')?.remove();
 const lines=variableCaptureLines31(station);
 target.insertAdjacentHTML('beforeend',`<section class="variable-bom-capture31"><div class="variable-bom-title31"><h3>BOM</h3>${profile.variable?'<span class="bom-variable-chip31">BOM variable</span>':''}</div><table><thead><tr><th>Componente</th><th>Porcentaje (%)</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${esc(getPart(line.part)?.desc||line.part)}</td><td><input class="input" aria-label="Porcentaje ${esc(line.part)}" data-recipe-component31="${esc(line.part)}" type="number" min="0" step="any" value="${line.amount}" ${profile.variable?'':'readonly'} oninput="setCapturePercent31(this.dataset.recipeComponent31,this.value)" onchange="redrawVariableCapture31()"></td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td><strong id="variable-bom-total31"></strong></td></tr></tfoot></table><div id="variable-bom-error31" role="alert"></div></section>`);
 document.getElementById('parameter_formula')?.closest('label')?.remove();
 document.getElementById('cpOutputQty')?.addEventListener('input',()=>{syncVariableCapture31();refreshGate32();});
 syncVariableCapture31();refreshGate32();
};
const openBeforeVariableBom31=openPanelCapture30;
openPanelCapture30=function(){uiState.variableBomCapture31=null;openBeforeVariableBom31();};
const recordBeforeVariableBom31=recordCP29;
recordCP29=function(db,station,args){
 const profile=bomProfile31(station.part,db);if(profile.basis!=='percent')return recordBeforeVariableBom31(db,station,args);
 const master=Object.fromEntries((db.setupTables.Bom||[]).filter(r=>r.parentPart===station.part).map(r=>[r.componentPart,recipeLinePercent31(r,db)]));
 const supplied=args.fields?.bomPercentages31||variableCaptureMap31(station,db);
 const percentages=profile.variable?supplied:master;
 if(!profile.variable&&Object.keys(master).some(part=>Math.abs(Number(supplied[part])-master[part])>1e-7))throw Error('Este No Parte no permite BOM variable.');
 const lines=Object.entries(master).map(([part])=>({part,amount:Number(percentages[part])}));const total=validateRecipeTotal31(lines,profile);if(!(total>0))throw Error('Agrega una cantidad mayor que cero a la fórmula.');
 const output=db.parts.find(p=>p.part===station.part),kg=standardAmount30(Number(args.qty),output.unit,'kg'),inputs=args.inputs||[];
 for(const line of lines.filter(l=>l.amount>0)){
  const matches=inputs.filter(i=>i.part===line.part);if(!matches.length)throw Error('Falta cargar '+line.part+'.');
  const actual=matches.reduce((n,i)=>n+recipeMassFrom31(db,Number(i.qty),i.part,i.unit),0),expected=kg*line.amount/100;
  if(Math.abs(actual-expected)>Math.max(1e-7,Math.abs(expected)*1e-7))throw Error('El consumo de '+line.part+' debe corresponder al porcentaje capturado.');
 }
 if(inputs.some(i=>!lines.some(l=>l.part===i.part&&l.amount>0)))throw Error('El consumo incluye un componente fuera de la fórmula.');
 const adjusted={...station,input:inputs[0]?.part||station.input,panelInputs30:inputs.slice(1).map((i,index)=>({key:'variable'+index,part:i.part,unit:i.unit,label:db.parts.find(p=>p.part===i.part)?.desc||i.part}))};
 return recordBeforeVariableBom31(db,adjusted,{...args,fields:{...args.fields,bomPercentages31:structuredClone(percentages),bomSnapshot31:{part:station.part,variable:profile.variable,validateTotal100:profile.validateTotal100,totalPercent:total,components:lines.map(l=>({part:l.part,percent:l.amount})),densities:structuredClone(db.materialDensities31)}}});
};
const appBeforeVariableBom31=renderApp;
renderApp=function(){appBeforeVariableBom31();if(shellScreen==='bom'&&uiState.bomEditor31){const title=document.getElementById('pageTitle');title.textContent=bomDraft31?.original?'Editar BOM':'Agregar BOM';}updateBomEditorTotal31();};
