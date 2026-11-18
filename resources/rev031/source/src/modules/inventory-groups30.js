let inventoryGroupingOwner30;
let inventoryGrouping30='part';
function loadInventoryGrouping30() {
  const owner=shellSession?.accountId || '';
  if(inventoryGroupingOwner30===owner)return;
  inventoryGroupingOwner30=owner;
  inventoryGrouping30='part';
}
function changeInventoryGrouping30(mode) {
  if(!['part','location','status'].includes(mode))return;
  clearInventoryChecks30();
  inventoryGrouping30=mode;
  try {localStorage.setItem('InsectMES_Rev031_inventory_group:'+inventoryGroupingOwner30,mode);} catch {}
  renderInventory();
}
function inventoryUnitTotals30(rows) {
  const totals=new Map();
  for(const row of rows) {
    const cells=inventoryGridCells30(row);
    const rawUnit=cells[4].textContent.trim();
    const unit=rawUnit.toLowerCase()==='kg'?'kg':rawUnit;
    const qty=Number(cells[3].dataset.rawNumber);
    totals.set(unit,(totals.get(unit)||0)+qty);
  }
  return [...totals].map(([unit,qty])=>number34(qty)+' '+unit).join(' · ');
}
function inventoryCompactWidths30(table,headers) {
  const weights={'Op No':75,'Operation':145,'Serial':140,'No Parte':140,'Descripción':200,'Cantidad':110,'Unidad':75,'Ubicación':150,'Estatus':170,'Lote':120,'Notas':180};
  const labels=headers.map(h=>h.querySelector('.grid-head34 span')?.textContent||h.textContent.trim());
  const available=Math.max(600,Math.floor(table.closest('.table-wrap').clientWidth)-2);
  const base=headers.map((header,index)=>header.hidden?0:header.classList.contains('grid-check30')?40:weights[labels[index]]||110);
  const minimums=headers.map(header=>header.hidden?0:header.classList.contains('grid-check30')?40:72);
  const extra=Math.max(0,available-minimums.reduce((a,b)=>a+b,0));
  const weight=base.reduce((sum,width,index)=>sum+(headers[index].classList.contains('grid-check30')?0:width),0);
  return minimums.map((minimum,index)=>!minimum?0:headers[index].classList.contains('grid-check30')?40:minimum+extra*base[index]/weight);
}
function inventoryStatusBadge30(code) {
  const rule=getSetupRow('Container_Status',code);
  if(!rule)return '<span class="badge stock-status-unknown30" role="status" title="El código no existe en Container Status">Sin configurar: '+esc(code||'—')+'</span>';
  const html=badge(rule.code);
  return html.replace('class="badge container-status30"','class="badge container-status30" data-status-code30="'+esc('')+'" aria-label="'+esc(rule.code+' · '+(rule.description||rule.code))+'"');
}
function refreshInventoryStatuses30(grid) {
  if(!grid||!['inventory','containers'].includes(shellScreen))return;
  for(const row of inventoryDataRows30(grid)) {
    const cells=inventoryGridCells30(row);
    const container=state.serials.find(record=>record.serial===cells[0]?.textContent.trim());
    if(!container||!cells[8])continue;
    const cell=cells[8];
    const html=inventoryStatusBadge30(container.status);
    if(cell.innerHTML!==html)cell.innerHTML=html;
    cell.dataset.statusCode30=container.status||'';
  }
}
function inventoryLocationContext30(code) {
  const location=state.setupTables.Locations.find(row=>row.code===code);
  const facility=inventoryFacilityLabels30(code);
  return [location?.description,facility.building,facility.area].filter(Boolean).join(' · ');
}
function groupInventoryResults30(grid,fit=false) {
  if(shellScreen!=='inventory'||!grid?.querySelector('[data-select-all30]'))return;
  loadInventoryGrouping30();
  grid.querySelectorAll('[data-inventory-group30]').forEach(row=>row.remove());
  const mode=inventoryGrouping30;
  grid.setAttribute('data-inventory-compact30',mode);
  prepareInventoryColumns30(grid);
  const hidden=new Set([2,5,6,...(mode==='location'?[7]:mode==='status'?[8]:[])]);
  const rows=inventoryDataRows30(grid);
  for(const row of [grid.tHead.rows[0],...rows]) {
    inventoryGridCells30(row).forEach((cell,index)=>{
      cell.hidden=hidden.has(index);
      if(index===3)cell.classList.add('stock-quantity30');
      if(index===1)cell.title=getPart(cell.textContent.trim())?.desc || '';
    });
  }
  const visible=rows.filter(row=>!row.hidden);
  const body=grid.tBodies[0];
  if(mode!=='none') {
    const by=mode==='part'?1:mode==='status'?8:7;
    const groups=new Map();
    for(const row of visible){const key=inventoryGridCells30(row)[by].textContent.trim();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
    const fragment=document.createDocumentFragment();
    for(const [key,children]of [...groups].sort(([a],[b])=>a.localeCompare(b,'es',{numeric:true}))) {
      const tr=document.createElement('tr');tr.dataset.inventoryGroup30='';
      const th=document.createElement('th');th.scope='rowgroup';th.colSpan=grid.tHead.rows[0].cells.length;
      const description=mode==='part'?getPart(key)?.desc:mode==='location'?inventoryLocationContext30(key):'';
      th.innerHTML='<div class="stock-group-heading30"><div><span class="stock-group-label30">'+(mode==='part'?'No Parte':mode==='status'?'Estatus':'Ubicación')+'</span><strong>'+esc(key||'Sin ubicación')+'</strong><span>'+esc(description||'')+'</span></div></div>';
      tr.append(th);fragment.append(tr);
      if(mode==='part')appendInventoryPart30(fragment,grid,children,key);
      else {
        const parts=new Map();
        for(const child of children){const part=inventoryGridCells30(child)[1].textContent.trim();if(!parts.has(part))parts.set(part,[]);parts.get(part).push(child);}
        for(const [part,partRows]of [...parts].sort(([a],[b])=>a.localeCompare(b,'es',{numeric:true})))appendInventoryPart30(fragment,grid,partRows,part);
      }
    }
    fragment.append(...rows.filter(row=>row.hidden));body.append(fragment);
  }
  const form=grid.closest('.card-body').querySelector('.inventory-search30');
  if(form&&!form.querySelector('.stock-group-controls30')) {
    form.insertAdjacentHTML('beforeend','<label class="stock-group-controls30">Agrupar por<select class="select" name="inventoryGroup" aria-label="Agrupar por" data-consult-control30 onchange="changeInventoryGrouping30(this.value)">'+[['part','No Parte'],['location','Ubicación'],['status','Estatus']].map(([value,label])=>'<option value="'+value+'" '+(mode===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>');
  }
  let context=form?.querySelector('.stock-location-context30');
  if(!context&&form){context=document.createElement('div');context.className='stock-location-context30';form.append(context);}
  if(context) {
    const locationFilter=inventorySearch30.criteria.some(row=>row.column==='7')||Boolean(filtersGrid34.inventory?.[7]);
    context.hidden=!locationFilter||mode==='location';
    context.innerHTML=context.hidden?'':[...new Set(visible.map(row=>inventoryGridCells30(row)[7].textContent.trim()))].map(code=>'<span><b>'+esc(code)+'</b> '+esc(inventoryLocationContext30(code))+'</span>').join('');
  }
  let summary=grid.closest('.card-body').querySelector('.stock-results-total30');
  if(!summary){summary=document.createElement('div');summary.className='stock-results-total30';summary.setAttribute('role','status');grid.closest('.table-wrap').parentElement.append(summary);}
  summary.textContent=visible.length+' contenedores';
  // Hidden source cells remain available to filters and export; widths follow only displayed columns.
  const cols=[...grid.querySelectorAll(':scope > colgroup > col')];
  if(fit&&cols.length){
    const headers=[...grid.tHead.rows[0].cells];const widths=inventoryCompactWidths30(grid,headers);
    cols.forEach((col,index)=>{col.style.display=headers[index].hidden?'none':'';col.style.width=widths[index]+'px';});
    grid.style.width=widths.reduce((a,b)=>a+b,0)+'px';grid.style.minWidth=grid.style.width;
    const labels=headers.map(heading=>heading.querySelector('.grid-head34 span')?.textContent||heading.textContent.trim());
    gridWidths30.set(shellScreen+':'+labels.join('|')+':'+mode,widths);
  }
  const wrapper=grid.closest('.table-wrap');
  if(!stockResizeTargets30.has(wrapper)){stockResizeTargets30.add(wrapper);stockLayoutResize30.observe(wrapper);}
  requestAnimationFrame(sizeInventoryGrid30);
}
const inventoryBeforeGrouping30=renderInventory;
renderInventory=function(){inventoryBeforeGrouping30();refreshInventoryStatuses30(gridTable34());if(shellScreen==='inventory')groupInventoryResults30(gridTable34());};
const filterBeforeGrouping30=applyGrid34;
applyGrid34=function(){
  const grid=gridTable34();
  if(shellScreen==='inventory')grid?.querySelectorAll('[data-inventory-group30]').forEach(row=>row.remove());
  refreshInventoryStatuses30(grid);
  filterBeforeGrouping30();
  if(shellScreen==='inventory')groupInventoryResults30(gridTable34());
};
window.addEventListener('resize',()=>{
  if(shellScreen!=='inventory')return;
  const grid=gridTable34();if(grid)groupInventoryResults30(grid,true);
});

const saveBeforeInventoryStatus30=saveConfigRows;
saveConfigRows=function(name){
  const before=state.configHistory.length;
  saveBeforeInventoryStatus30(name);
  if(name==='Container_Status'&&state.configHistory.length>before&&['inventory','containers'].includes(shellScreen)) {
    refreshInventoryStatuses30(gridTable34());
    applyGrid34();
  }
};
const saveInventoryBeforeStatus30=saveInventoryAction;
saveInventoryAction=function(){
  const action=uiState.inventoryAction;
  if(action==='Edit'){const row=state.serials[uiState.inventorySelectedIndex];if(row&&!inventoryRecordActive30(row))return showMsg('El contenedor está inactivo y no permite transacciones.',true);}
  if(['Move','Split','Merge'].includes(action)){
    const id={Move:'move_serial',Split:'split_serial',Merge:'merge_serials'}[action];
    const codes=(document.getElementById(id)?.value||'').split(',').map(code=>code.trim()).filter(Boolean);
    if(state.serials.some(row=>codes.includes(row.serial)&&requiresFinalization30(state,row)))return showMsg('Finaliza el contenedor antes de realizar transacciones.',true);
    if(action==='Move'&&state.serials.some(row=>codes.includes(row.serial)&&!getSetupRow('Container_Status',row.status)?.allowMove))return showMsg('Move bloqueado por Allow Move en Container Status.',true);
    if(state.serials.some(row=>codes.includes(row.serial)&&!inventoryRecordActive30(row)))return showMsg('El contenedor está inactivo y no permite '+action+'.',true);
  }
  if(['Split','Merge'].includes(action)){
    const field=document.getElementById(action==='Split'?'split_serial':'merge_serials');
    const codes=(field?.value||'').split(',').map(code=>code.trim()).filter(Boolean);
    const key=action==='Split'?'preventSplit':'preventMerge';
    const blocked=state.serials.filter(row=>codes.includes(row.serial)&&getSetupRow('Container_Status',row.status)?.[key]);
    if(blocked.length)return showMsg(action+' bloqueado por Container Status: '+blocked.map(row=>row.serial).join(', ')+'.',true);
  }
  if(['New','Edit'].includes(uiState.inventoryAction)) {
    const code=document.getElementById('inv_status')?.value;
    if(!getSetupRow('Container_Status',code)?.active)return showMsg('Selecciona un estatus activo de Container Status.',true);
  }
  return saveInventoryBeforeStatus30();
};

let lastInventoryScreen30=null;
const renderBeforeEmptySelection30=renderApp;
renderApp=function(){
  if(shellScreen==='inventory'&&lastInventoryScreen30!=='inventory'&&!uiState.inventoryAction){
    uiState.inventorySelectedIndex=null;
    gridSelections30.delete('inventory');
  }
  lastInventoryScreen30=shellScreen;
  renderBeforeEmptySelection30();
};

function inventoryPartTotal30(grid,rows,part) {
  const tr=document.createElement('tr');tr.dataset.inventoryGroup30='total';tr.dataset.part=part;
  const totals=new Map();
  for(const row of rows){const cells=inventoryGridCells30(row);const raw=cells[4].textContent.trim();const unit=raw.toLowerCase()==='kg'?'kg':raw;totals.set(unit,(totals.get(unit)||0)+Number(cells[3].dataset.rawNumber));}
  const headers=[...grid.tHead.rows[0].cells];
  for(const header of headers) {
    const cell=document.createElement('td');cell.hidden=header.hidden;
    if(header.classList.contains('grid-check30'))cell.className='grid-check30';
    else {
      const index=inventoryGridCells30(grid.tHead.rows[0]).indexOf(header);
      if(index===0)cell.innerHTML='<strong>Total</strong><small>'+rows.length+' '+(rows.length===1?'contenedor':'contenedores')+'</small>';
      if(index===3){cell.className='stock-quantity30';cell.dataset.partTotal30='';cell.innerHTML=[...totals].map(([,qty])=>'<div>'+number34(qty)+'</div>').join('');}
      if(index===4)cell.innerHTML=[...totals.keys()].map(unit=>'<div>'+esc(unit)+'</div>').join('');
    }
    tr.append(cell);
  }
  return tr;
}
function editCheckedInventory30() {
  if(!requireLevel(2))return;
  const chosen=selectedRows30(shellScreen);
  if(chosen.length!==1)return;
  uiState.inventorySelectedIndex=state.serials.findIndex(row=>row.serial===chosen[0]);
  uiState.inventoryAction='Edit';renderApp();
}
selectInventoryRow=function(index) {
  const serial=state.serials[index]?.serial;if(!serial)return;
  const keys=gridSelections30.get(shellScreen)||new Set();
  if(keys.has(serial))keys.delete(serial);else keys.add(serial);
  gridSelections30.set(shellScreen,keys);
  if(uiState.inventoryAction==='Edit')uiState.inventoryAction='';
  renderInventory();
};
const deleteBeforeCheckboxes30=deleteInventorySelected;
deleteInventorySelected=function(){
  const chosen=selectedRows30(shellScreen);
  if(!chosen.length){const current=state.serials[uiState.inventorySelectedIndex];if(current&&!inventoryRecordActive30(current))return showMsg('Un contenedor inactivo no permite transacciones.',true);if(current&&inventoryHasTransactions30(current))return showMsg('No se puede eliminar un contenedor con transacciones. Puedes inactivarlo.',true);return deleteBeforeCheckboxes30();}
  if(!requireLevel(3))return;
  if(state.serials.some(row=>chosen.includes(row.serial)&&!inventoryRecordActive30(row)))return showMsg('Un contenedor inactivo no permite transacciones.',true);
  if(state.serials.some(row=>chosen.includes(row.serial)&&inventoryHasTransactions30(row)))return showMsg('No se pueden eliminar contenedores con transacciones. Puedes inactivarlos.',true);
  if(state.serials.some(row=>chosen.includes(row.serial)&&requiresFinalization30(state,row)))return showMsg('Finaliza el recibo antes de modificar el contenedor.',true);
  try {
    saveReceivingState30(()=>{state.serials=state.serials.filter(row=>!chosen.includes(row.serial));});
  } catch(error){return showMsg('No se pudieron eliminar los contenedores.',true);}
  gridSelections30.delete(shellScreen);uiState.inventorySelectedIndex=null;uiState.inventoryAction='';renderApp();
  showMsg(chosen.length===1?'Contenedor eliminado.':'Contenedores eliminados.');
};

function clearInventoryChecks30() {
  gridSelections30.delete('inventory');
  if(uiState.inventoryAction!=='Edit')uiState.inventorySelectedIndex=null;
  const grid=gridTable34();
  if(grid&&shellScreen==='inventory'){
    for(const input of grid.querySelectorAll('[data-select-row30]')){input.checked=false;input.closest('tr').classList.remove('selected','grid-marked30');}
    if(grid.querySelector('[data-select-all30]'))refreshGridChecks30(grid);
  }
}

function inventoryOperation30(container) {
  const run=(state.operationRuns||[]).find(row=>row.serial===container.serial||row.outputSerials?.includes(container.serial));
  const db=engineeringData29();
  const routeId=container.routingId||run?.routingId;
  const route=routeId?db.routes.find(row=>row.id===routeId):null;
  const code=container.operationCode||container.operation||run?.operation||route?.operation;
  const operation=db.operations.find(row=>row.code===code);
  const candidates=db.routes.filter(row=>row.part===container.part&&row.operation===code);
  const numbers=[...new Set(candidates.map(row=>row.sequence))];
  return {number:container.operationNo??container.opNo??run?.operationNo??route?.sequence??(numbers.length===1?numbers[0]:''),name:operation?.name||container.operationName||''};
}
function prepareInventoryColumns30(grid) {
  const order=[1,11,12,0,3,4,7,8,9,13,10,2,5,6];
  for(const row of [grid.tHead.rows[0],...inventoryDataRows30(grid)]) {
    const cells=inventoryGridCells30(row);
    cells.forEach((cell,index)=>{cell.dataset.inventoryColumn30=String(index);cell.rowSpan=1;cell.style.removeProperty('display');cell.classList.remove('stock-merged-cell30');});
    const check=row.querySelector(':scope > .grid-check30');if(check)row.append(check);
    order.forEach(index=>{if(cells[index])row.append(cells[index]);});
  }
}
function mergeInventoryCells30(rows,indices) {
  if(!rows.length)return;
  for(const index of indices) {
    const first=inventoryGridCells30(rows[0])[index];
    first.rowSpan=rows.length;first.classList.add('stock-merged-cell30');first.onclick=event=>event.stopPropagation();
    for(const row of rows.slice(1))inventoryGridCells30(row)[index].style.display='none';
  }
}
function appendInventoryPart30(fragment,grid,rows,part) {
  const operations=new Map();
  for(const row of rows){const cells=inventoryGridCells30(row);const key=JSON.stringify([cells[11].textContent,cells[12].textContent]);if(!operations.has(key))operations.set(key,[]);operations.get(key).push(row);}
  const ordered=[];
  for(const [,opRows]of [...operations].sort(([a],[b])=>a.localeCompare(b,'es',{numeric:true}))){mergeInventoryCells30(opRows,[11,12]);ordered.push(...opRows);}
  mergeInventoryCells30(ordered,[1]);
  fragment.append(...ordered,inventoryPartTotal30(grid,ordered,part));
}

function inventoryHasTransactions30(container){
  const serial=container.serial;
  return state.movements.some(row=>row.serial===serial)||state.genealogy.some(row=>row.parent===serial||row.child===serial)||state.receipts.some(row=>row.id===container.origin||row.serials?.includes(serial))||(state.operationRuns||[]).some(row=>row.serial===serial||row.inputSerial===serial||row.outputSerials?.includes(serial)||row.inputs?.some(input=>input.serial===serial));
}
function inactivateSelectedInventory30(){
  if(!requireLevel(2))return;const chosen=selectedRows30(shellScreen);if(!chosen.length)return;
  if(state.serials.some(row=>chosen.includes(row.serial)&&(!inventoryRecordActive30(row)||requiresFinalization30(state,row))))return showMsg('El contenedor está inactivo o requiere finalización; no permite esta transacción.',true);
  try{saveReceivingState30(()=>{for(const row of state.serials.filter(row=>chosen.includes(row.serial))){row.active=false;addMovement('INACTIVATE',row.serial,row.part,row.qtyCurrent,row.unit,'Inventario');}});}catch(error){return showMsg('No se pudieron guardar los cambios.',true);}
  clearInventoryChecks30();renderApp();showMsg('Contenedores inactivados.');
}

function inventoryRecordActive30(container){const rule=getSetupRow('Container_Status',container?.status);return Boolean(container?.active&&rule?.active&&rule.activeStatus!==false);}

const stockResizeTargets30=new WeakSet();
const stockResizeWidths30=new WeakMap();
const stockLayoutResize30=new ResizeObserver(entries=>{
  for(const entry of entries){
    const width=entry.contentRect.width;
    if(width<=0||Math.abs(width-(stockResizeWidths30.get(entry.target)||0))<.5)continue;
    stockResizeWidths30.set(entry.target,width);
    if(shellScreen!=='inventory'||!entry.target.isConnected)continue;
    requestAnimationFrame(()=>{if(shellScreen==='inventory'&&entry.target.isConnected){const grid=entry.target.querySelector('table');if(grid)groupInventoryResults30(grid,true);}});
  }
});
