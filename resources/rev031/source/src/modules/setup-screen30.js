screenRegistry.push({id:'setup-table',name:'Setup Table',module:'Plataforma / Configuración',concept:'setup-table30'});
internalInventory30['setup-table']='setup';
inheritedAccess29['setup-table']='setup';
function setupScreenSchema30(name) {
  if(state.setupSchemas[name])return state.setupSchemas[name];
  const sample=state.setupTables[name]?.[0]||{};
  return {title:name,fields:Object.keys(sample).filter(key=>!['code','description','active'].includes(key)).map(key=>({key,label:key,type:typeof sample[key]==='boolean'?'boolean':typeof sample[key]==='number'?'number':'text'}))};
}
function openSetupScreen30(name) {
  if(!state.setupTables[name]||!requireLevel(1,'setup'))return;
  closeIfOpen();
  uiState.setupTable30=name;
  uiState.setupDraft30=null;
  uiState.setupDraftTable30=null;
  screenRegistry.find(row=>row.id==='setup-table').name=setupScreenSchema30(name).title;
  navigateScreen('setup-table');
}
openContextSetup=openSetupScreen30;
openSetupTable=openSetupScreen30;
drawSetupDialog=openSetupScreen30;
function setupScreenInput30(row,field,index,editable) {
  const id=field.key, name=row.code||'Nuevo';
  const data=' data-setup-row30="'+index+'" data-setup-key30="'+esc(id)+'"';
  const disabled=editable?'':' disabled';
  if(field.type==='boolean')return '<input type="checkbox" aria-label="'+esc(name+' '+field.label)+'"'+data+(row[id]?' checked':'')+disabled+'>';
  if(field.type==='color') {
    const color=setupHexColor30(row[id])||'#E4E8E5';
    return '<div class="setup-color30"><input type="color" aria-label="'+esc(name+' Selector de color')+'" value="'+color+'" oninput="this.nextElementSibling.value=this.value.toUpperCase()"'+disabled+'><input class="input" aria-label="'+esc(name+' '+field.label)+'" value="'+color+'"'+data+' maxlength="7" oninput="if(setupHexColor30(this.value))this.previousElementSibling.value=setupHexColor30(this.value)"'+disabled+'></div>';
  }
  const lock=id==='code'&&uiState.setupTable30!=='Container_Status'&&state.setupTables[uiState.setupTable30].some(record=>record.code===row.code)?' readonly':'';
  return '<input class="input" type="'+(field.type==='number'?'number':'text')+'" aria-label="'+esc(name+' '+field.label)+'"'+data+' value="'+esc(row[id]??'')+'"'+(field.type==='number'?' step="any"':'')+lock+disabled+'>';
}
function readSetupScreen30() {
  const rows=structuredClone(uiState.setupDraft30||[]);
  for(const input of document.querySelectorAll('[data-setup-row30]')) {
    const value=input.type==='checkbox'?input.checked:input.type==='number'?(input.value===''?'':Number(input.value)):input.value.trim();
    rows[Number(input.dataset.setupRow30)][input.dataset.setupKey30]=value;
  }
  return rows;
}
function renderSetupTableScreen30() {
  const name=uiState.setupTable30;
  const view=document.getElementById('view-'+currentView);
  if(!state.setupTables[name]) {view.innerHTML=cardNavigation29('Setup Table','<div class="empty-state">Selecciona una tabla desde Setup Tables.</div>');return;}
  const schema=setupScreenSchema30(name);
  if(uiState.setupDraftTable30!==name||!uiState.setupDraft30){uiState.setupDraftTable30=name;uiState.setupDraft30=structuredClone(state.setupTables[name]);}
  const fields=setupScreenFields30(name);
  const editable=levelFor('setup')>=4;
  const rows=uiState.setupDraft30.map((row,index)=>'<tr><td><input type="checkbox" data-setup-select30="'+index+'" aria-label="Seleccionar '+esc(row.code||'nuevo registro')+'" onchange="refreshSetupDelete30()"></td>'+fields.map(field=>'<td class="'+(field.type==='boolean'?'setup-boolean30':'')+'">'+setupScreenInput30(row,field,index,editable)+'</td>').join('')+'</tr>');
  view.innerHTML=cardNavigation29(schema.title,'<form class="setup-screen30" onsubmit="event.preventDefault();saveSetupScreen30()"><div class="actionbar">'+(editable?'<button type="button" class="btn primary" onclick="addSetupScreenRow30()">Agregar</button><button class="btn soft" type="submit">Guardar</button><button type="button" class="btn danger" data-setup-delete30 disabled onclick="deleteSetupScreenRows30()">Eliminar</button>':'')+'<button class="btn soft" type="button" onclick="exportSetupScreen30()">Exportar</button></div>'+resultsTable30(['',...fields.map(field=>field.label)],rows,'900px')+'</form>');
  view.querySelector('.card').classList.add('setup-screen-card30');
  const selection=view.querySelector('.setup-screen30 thead th');
  if(selection){selection.classList.add('setup-select-column30','grid-check30');selection.innerHTML='<input type="checkbox" data-setup-select-all30 data-consult-control30 aria-label="Seleccionar todos los registros" onchange="toggleAllSetupRows30(this.checked)">';}
  for(const cell of view.querySelectorAll('.setup-screen30 tbody tr>td:first-child'))cell.classList.add('setup-select-column30');
  installSetupSort30(fields);
  refreshSetupDelete30();
}
function addSetupScreenRow30() {
  if(!requireLevel(4,'setup'))return;
  uiState.setupDraft30=readSetupScreen30();
  const row={active:true,activeStatus:true,code:'',description:''};
  for(const field of setupScreenSchema30(uiState.setupTable30).fields)row[field.key]=field.type==='boolean'?false:field.type==='number'?0:field.type==='color'?'#E4E8E5':'';
  uiState.setupDraft30.push(row);renderSetupTableScreen30();
  const code=document.querySelector('[data-setup-row30="'+(uiState.setupDraft30.length-1)+'"][data-setup-key30="code"]');code?.focus();code?.scrollIntoView({block:'nearest'});
}
function cancelSetupScreen30(){uiState.setupDraft30=null;renderSetupTableScreen30();}
function saveSetupScreen30() {
  if(!requireLevel(4,'setup'))return;
  const name=uiState.setupTable30,rows=readSetupScreen30(),schema=setupScreenSchema30(name),codes=new Set();
  for(const row of rows) {
    const code=row.code?.trim().toLocaleLowerCase('es');
    if(!code||codes.has(code))return showMsg('El código es obligatorio y debe ser único.',true);
    codes.add(code);
    for(const field of schema.fields) {
      if(field.type==='number'&&row[field.key]!==''&&!Number.isFinite(row[field.key]))return showMsg('Revisa los valores numéricos.',true);
      if(field.type==='color'){const color=setupHexColor30(row[field.key]);if(!color)return showMsg('Escribe un color HEX válido.',true);row[field.key]=color;}
    }
  }
  const previous=state.setupTables[name];
  if(name==='Container_Status'&&rows.some((row,index)=>row.code!==previous[index]?.code&&previous.some((old,i)=>i!==index&&old.code===row.code)))return showMsg('Ese código ya pertenece a otro estatus. Usa un código distinto.',true);
  const oldAliases=structuredClone(state.containerStatusAliases30||{});
  const oldSerials=structuredClone(state.serials);
  const oldSettings=structuredClone(state.settings);
  if(name==='Container_Status') {
    const renamed=new Map(previous.map((row,index)=>[row.code,rows[index]?.code]).filter(([old,next])=>next&&old!==next));
    state.containerStatusAliases30??={};
    for(const [old,next]of renamed) {
      if(oldAliases[next]) {delete state.containerStatusAliases30[next];}
      state.containerStatusAliases30[old]=next;
    }
    for(const row of state.serials)row.status=renamed.get(row.status)||row.status;
    for(const key of ['receiptStatus30','finalReceiptStatus30','nurseryReadyStatus31'])state.settings[key]=renamed.get(state.settings[key])||state.settings[key];
  }
  state.setupTables[name]=rows;
  try {configAudit('Edición de '+name);} catch(error){state.setupTables[name]=previous;state.containerStatusAliases30=oldAliases;state.serials=oldSerials;state.settings=oldSettings;return showMsg('No se pudieron guardar los cambios.',true);}
  uiState.setupDraft30=structuredClone(rows);
  history.replaceState({insectmes:snapshot29()},'',location.hash);
  renderSetupTableScreen30();showMsg('Cambios guardados.');
}
function exportSetupScreen30() {
  if(!requireLevel(1,'setup'))return;
  const fields=setupScreenFields30(uiState.setupTable30);
  const selected=new Set([...document.querySelectorAll('[data-setup-select30]:checked')].map(input=>Number(input.dataset.setupSelect30)));
  const rows=readSetupScreen30().filter((row,index)=>!selected.size||selected.has(index));
  exportRows(uiState.setupTable30+'.csv',fields.map(field=>field.label),rows.map(row=>fields.map(field=>typeof row[field.key]==='boolean'?(row[field.key]?'Sí':'No'):row[field.key]??'')));
}
const setupConceptBefore30=renderConceptScreen;
renderConceptScreen=function(){if(conceptScreen==='setup-table30')return renderSetupTableScreen30();setupConceptBefore30();};
const setupRenderBefore30=renderApp;
renderApp=function(){
  if(shellScreen==='setup-table'&&uiState.setupTable30)screenRegistry.find(row=>row.id==='setup-table').name=setupScreenSchema30(uiState.setupTable30).title;
  setupRenderBefore30();
};
const restoreSetupBefore30=restoreInitialRoute29;
restoreInitialRoute29=function(){
  if(location.hash.startsWith('#/setup-table/')) {try {uiState.setupTable30=decodeURIComponent(location.hash.split('/')[2]);}catch{}}
  restoreSetupBefore30();
};
function normalizeScreenLayout30() {
  const view=document.querySelector('main .view.active');
  if(!view)return;
  for(const body of view.querySelectorAll('.card-body')) {
    const children=[...body.children];
    const filters=children.filter(node=>node.matches('.ops-filters,.filters,.catalog-search30,.trace-serial-form30,[data-catalog-filter30]')&&!node.hidden);
    const bars=children.filter(node=>node.matches('.actionbar'));
    const first=bars[0]||children.find(node=>node.matches('.table-wrap'));
    if(first)for(const filter of filters)if(first.compareDocumentPosition(filter)&Node.DOCUMENT_POSITION_FOLLOWING)body.insertBefore(filter,first);
    const grid=[...body.children].find(node=>node.matches('.table-wrap'));
    if(grid)for(const bar of bars)if(grid.compareDocumentPosition(bar)&Node.DOCUMENT_POSITION_FOLLOWING)body.insertBefore(bar,grid);
  }
}
new MutationObserver(normalizeScreenLayout30).observe(document.querySelector('main'),{childList:true,subtree:true});

function refreshSetupDelete30(){
  const checks=[...document.querySelectorAll('[data-setup-select30]')];
  const count=checks.filter(input=>input.checked).length;
  const button=document.querySelector('[data-setup-delete30]');if(button)button.disabled=levelFor('setup')<4||!count;
  const all=document.querySelector('[data-setup-select-all30]');
  if(all){all.checked=checks.length>0&&count===checks.length;all.indeterminate=count>0&&count<checks.length;all.disabled=!checks.length;}
}
function toggleAllSetupRows30(checked){for(const input of document.querySelectorAll('[data-setup-select30]'))input.checked=checked;refreshSetupDelete30();}
function setupCodeInUse30(table,code) {
  if(!code)return false;
  const other={...state,setupTables:{...state.setupTables}};
  delete other.setupTables[table];delete other.setupSchemas;delete other.configHistory;delete other.removedContainerStatuses30;
  function contains(value){return typeof value==='string'?value===code:Array.isArray(value)?value.some(contains):value&&typeof value==='object'?Object.values(value).some(contains):false;}
  return Boolean(contains(other));
}
function deleteSetupScreenRows30(){
  if(!requireLevel(4,'setup'))return;
  const selected=[...document.querySelectorAll('[data-setup-select30]:checked')].map(input=>Number(input.dataset.setupSelect30));
  if(!selected.length)return;
  const rows=readSetupScreen30(),name=uiState.setupTable30;
  const blocked=selected.filter(index=>setupCodeInUse30(name,state.setupTables[name][index]?.code||rows[index].code));
  if(blocked.length)return showMsg('No se puede eliminar: '+blocked.map(index=>rows[index].code).join(', ')+'. Tiene registros relacionados o transacciones; puedes inactivarlo.',true);
  const previous=state.setupTables[name];
  const removed=selected.map(index=>rows[index].code);
  const next=previous.filter((_,index)=>!selected.includes(index));
  state.setupTables[name]=next;
  const oldRemoved=[...(state.removedContainerStatuses30||[])];
  if(name==='Container_Status')state.removedContainerStatuses30=[...new Set([...oldRemoved,...removed])];
  try{configAudit('Eliminación en '+name+': '+removed.join(', '));}catch(error){state.setupTables[name]=previous;state.removedContainerStatuses30=oldRemoved;return showMsg('No se pudieron guardar los cambios.',true);}
  uiState.setupDraft30=structuredClone(next);history.replaceState({insectmes:snapshot29()},'',location.hash);renderSetupTableScreen30();showMsg('Registros eliminados.');
}

const setupEnglishNames30={Item_Type:'Part Types',Location_Type:'Location Types',Container_Type:'Container Types',Container_Status:'Container Status',Serial_Prefix:'Serial Prefixes',Operation_Type:'Operation Types',Workcenter_Status:'Workcenter Status',Workcenter_Status_Control:'Workcenter Status Control',Nursery_Recipe:'Nursery Recipes',Nursery_Rack:'Nursery Racks',Maintenance_Checklist:'Maintenance Checklists',Screen_Field:'Screen Fields',Locations:'Locations',Units:'Units',Users:'Users',Bom:'BOM'};
const setupIdentifierNames30={Item_Type:'Part Type',Location_Type:'Location Type',Container_Type:'Container Type',Serial_Prefix:'Serial Prefix',Operation_Type:'Operation Type',Nursery_Recipe:'Nursery Recipe',Nursery_Rack:'Nursery Rack',Maintenance_Checklist:'Maintenance Checklist',Screen_Field:'Screen Field'};
const setupEnglishInit30=initConcept;
initConcept=function(){setupEnglishInit30();for(const [name,schema]of Object.entries(state.setupSchemas))schema.title=setupEnglishNames30[name]||name.replaceAll('_',' ');Object.assign(setupNames30,setupEnglishNames30);};
function setupScreenFields30(name){
  const schema=setupScreenSchema30(name);
  const fields=schema.fields.filter(field=>!['active','activeStatus'].includes(field.key));
  const colors=fields.filter(field=>field.type==='color');
  return [{key:'code',label:setupIdentifierNames30[name]||setupEnglishNames30[name]||schema.title,type:'text'},...colors,{key:name==='Container_Status'?'activeStatus':'active',label:'Active Status',type:'boolean'},...fields.filter(field=>field.type!=='color')];
}
const setupSortOrders30=new Map();
function installSetupSort30(fields){
  const grid=document.querySelector('.setup-screen30 table');if(!grid)return;
  fields.forEach((field,index)=>{
    const header=grid.tHead.rows[0].cells[index+1];
    header.innerHTML='<button type="button" class="setup-sort30" data-consult-control30 aria-label="Ordenar por '+esc(field.label)+'">'+esc(field.label)+' <span aria-hidden="true">↕</span></button>';
    header.firstChild.onclick=()=>{const previous=setupSortOrders30.get(uiState.setupTable30);setupSortOrders30.set(uiState.setupTable30,{key:field.key,desc:previous?.key===field.key?!previous.desc:false});applySetupSort30(grid,fields);};
  });
  applySetupSort30(grid,fields);
}
function applySetupSort30(grid,fields){
  const sort=setupSortOrders30.get(uiState.setupTable30);if(!sort)return;
  const values=readSetupScreen30();const field=fields.find(field=>field.key===sort.key);if(!field)return;
  const rows=[...grid.tBodies[0].rows].filter(row=>row.querySelector('[data-setup-select30]'));
  rows.sort((a,b)=>{const left=values[Number(a.querySelector('[data-setup-select30]').dataset.setupSelect30)]?.[field.key];const right=values[Number(b.querySelector('[data-setup-select30]').dataset.setupSelect30)]?.[field.key];const result=['boolean','number'].includes(field.type)?Number(left||0)-Number(right||0):String(left||'').localeCompare(String(right||''),'en',{numeric:true});return sort.desc?-result:result;});
  grid.tBodies[0].append(...rows);
  fields.forEach((item,index)=>grid.tHead.rows[0].cells[index+1].setAttribute('aria-sort',item.key===sort.key?(sort.desc?'descending':'ascending'):'none'));
}
