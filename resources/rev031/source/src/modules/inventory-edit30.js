// Individual inventory details and atomic, explicitly selected bulk adjustments.
const inventoryAdjustmentInit30=initConcept;
initConcept=function(){
  inventoryAdjustmentInit30();
  state.setupTables.Inventory_Adjustment_Reason??=[{code:'Corrección de captura',active:true},{code:'Diferencia de inventario',active:true},{code:'Baja de contenedor',active:true}];
  state.setupSchemas.Inventory_Adjustment_Reason={title:'Inventory Adjustment Reasons',owner:'Inventory',fields:[]};
  setupEnglishNames30.Inventory_Adjustment_Reason='Inventory Adjustment Reasons';
  setupIdentifierNames30.Inventory_Adjustment_Reason='Adjustment Reason';
  setupNames30.Inventory_Adjustment_Reason='Inventory Adjustment Reasons';
  if(!setupGroups30[0][1].includes('Inventory_Adjustment_Reason'))setupGroups30[0][1].push('Inventory_Adjustment_Reason');
  state.inventoryAdjustments30??=[];
};
function inventoryReasonOptions30(){return state.setupTables.Inventory_Adjustment_Reason.filter(row=>row.active).map(row=>'<option value="'+esc(row.code)+'">'+esc(row.code)+'</option>').join('');}
function inventoryStatusOptions30(value='',blank=false){return (blank?'<option value="">Sin cambiar</option>':'<option value="">Seleccionar estatus</option>')+state.setupTables.Container_Status.filter(row=>row.active).map(row=>'<option value="'+esc(row.code)+'" '+(row.code===value?'selected':'')+'>'+esc(row.code)+'</option>').join('');}
function inventorySearchField30(id,label,value,kind,required=false){return '<label class="inventory-edit-field30" for="'+id+'">'+esc(label)+(required?' <span class="req">*</span>':'')+'<div class="inventory-lookup30" data-lookup-kind30="'+kind+'"><input class="input" id="'+id+'" value="'+esc(value||'')+'" role="combobox" aria-label="'+esc(label)+'" aria-autocomplete="list" aria-expanded="false" aria-controls="'+id+'_options" autocomplete="off" '+(required?'required':'')+' placeholder="Buscar"><button class="inventory-lookup-open30" type="button" aria-label="Buscar '+esc(label)+'">'+icon29('search')+'</button><div class="inventory-lookup-list30" id="'+id+'_options" role="listbox" hidden></div></div></label>';}
function installInventoryLookups30(root){
  for(const wrap of root.querySelectorAll('[data-lookup-kind30]')){
    const input=wrap.querySelector('input'),list=wrap.querySelector('[role=listbox]'),kind=wrap.dataset.lookupKind30;
    const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');};
    const choose=row=>{input.value=row.code;input.setCustomValidity('');input.setAttribute('aria-invalid','false');close();input.focus();close();input.dispatchEvent(new Event('change',{bubbles:true}));};
    const show=(all=false)=>{
      const query=inventorySearchText30(all?'':input.value);
      const records=kind==='part'?state.parts.filter(row=>row.active!==false).map(row=>({code:row.part,name:row.desc})):state.setupTables.Locations.filter(row=>row.active).map(row=>({code:row.code,name:row.description}));
      const rows=records.filter(row=>inventorySearchText30(row.code+' '+row.name).includes(query)).sort((a,b)=>a.code.localeCompare(b.code,'es',{numeric:true})).slice(0,100);
      list.replaceChildren();
      for(const row of rows){const button=document.createElement('button');button.type='button';button.role='option';button.innerHTML='<strong>'+esc(row.code)+'</strong><span>'+esc(row.name||'')+'</span>';button.onclick=()=>choose(row);button.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();button.nextElementSibling?.focus();}if(event.key==='ArrowUp'){event.preventDefault();if(button.previousElementSibling)button.previousElementSibling.focus();else input.focus();}if(event.key==='Escape'){event.preventDefault();input.focus();close();}};list.append(button);}
      if(!rows.length)list.textContent='Sin resultados';
      list.hidden=false;input.setAttribute('aria-expanded','true');
    };
    input.oninput=()=>{input.setCustomValidity('');show();};input.onfocus=()=>show(true);
    input.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();if(list.hidden)show();list.querySelector('button')?.focus();}if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Enter'){event.preventDefault();if(!list.hidden&&list.querySelectorAll('button').length===1)list.querySelector('button').click();else close();}};
    wrap.querySelector('.inventory-lookup-open30').onclick=()=>{if(list.hidden){input.focus();show(true);}else close();};
    wrap.addEventListener('focusout',()=>setTimeout(()=>{if(!wrap.contains(document.activeElement))close();},0));
  }
}
document.addEventListener('click',event=>{for(const wrap of document.querySelectorAll('.inventory-lookup30'))if(!wrap.contains(event.target)){wrap.querySelector('[role=listbox]').hidden=true;wrap.querySelector('input').setAttribute('aria-expanded','false');}});
function inventoryReasonField30(){return '<label class="inventory-reason30" hidden>Adjustment Reason <span class="req">*</span><select class="select" name="adjustmentReason" aria-label="Adjustment Reason" disabled><option value="">Seleccionar razón</option>'+inventoryReasonOptions30()+'</select></label>';}
function inventoryAdjustmentToggle30(form){
  const bulk=form.dataset.bulkInventory30!==undefined;
  const active=form.elements.active;
  const status=form.querySelector('[data-inventory-status30]');
  const statusRule=status.value?getSetupRow('Container_Status',status.value):null;
  if(statusRule?.activeStatus===false){active.checked=false;if(bulk)form.elements.changeActive.checked=true;}
  active.disabled=bulk&&!form.elements.changeActive.checked;
  const existingInactive=bulk&&inventoryMassSelection30.some(code=>!inventoryRecordActive30(state.serials.find(row=>row.serial===code)));
  const inactive=((!bulk||form.elements.changeActive.checked)&&!active.checked)||(existingInactive&&!(form.elements.changeActive.checked&&active.checked));
  const field=form.querySelector('.inventory-reason30'),reason=form.elements.adjustmentReason;
  field.hidden=!inactive;reason.disabled=!inactive;reason.required=inactive;reason.setAttribute('aria-required',String(inactive));
  if(!inactive)reason.value='';
}
function inventoryDetail30(){
  const row=state.serials[uiState.inventorySelectedIndex];if(!row){uiState.inventoryAction='';return inventoryBeforeDetail30();}
  const view=document.getElementById('view-inventory');
  view.innerHTML='<div class="card capture inventory-detail30"><div class="card-head"><div class="card-title">Editar inventario</div></div><div class="card-body"><form id="inventory-edit-form30" onsubmit="event.preventDefault();saveInventoryDetail30(false)"><div class="form-grid"><label>Serial<input class="input" id="inv_serial_locked30" aria-label="Serial" value="'+esc(row.serial)+'" readonly></label>'+inventorySearchField30('inventory_part_edit30','No Parte',row.part,'part',true)+'<label>Cantidad <span class="req">*</span><input class="input" name="quantity" aria-label="Cantidad" type="number" min="0" step="any" value="'+esc(row.qtyCurrent)+'" required></label><label>Unidad<input class="input" aria-label="Unidad" value="'+esc(row.unit)+'" readonly></label>'+inventorySearchField30('inventory_location_edit30','Ubicación',row.location,'location',true)+'<label>Estatus <span class="req">*</span><select class="select" aria-label="Estatus" data-inventory-status30 required onchange="inventoryAdjustmentToggle30(this.form)">'+inventoryStatusOptions30(row.status)+'</select></label><label class="inventory-active30"><input type="checkbox" name="active" aria-label="Activo" '+(inventoryRecordActive30(row)?'checked':'')+' onchange="inventoryAdjustmentToggle30(this.form)">Activo</label>'+inventoryReasonField30()+'<label class="inventory-edit-notes30">Notas<textarea class="input" name="notes" aria-label="Notas" rows="3">'+esc(row.notes||'')+'</textarea></label></div><div class="capture-actions"><button class="btn soft" type="button" onclick="returnInventoryDetail30()">Cancelar</button><button class="btn soft" type="button" onclick="saveInventoryDetail30(true)">Aplicar</button><button class="btn primary" type="submit">Guardar</button></div></form></div></div>';
  const form=view.querySelector('form');form.dataset.serial30=row.serial;installInventoryLookups30(form);inventoryAdjustmentToggle30(form);
}
const inventoryBeforeDetail30=renderInventory;
renderInventory=function(){if(['inventory','containers'].includes(shellScreen)&&uiState.inventoryAction==='Edit')return inventoryDetail30();inventoryBeforeDetail30();};
function returnInventoryDetail30(){
  uiState.inventoryAction='';uiState.inventorySelectedIndex=null;gridSelections30.delete(shellScreen);
  if(history.state?.insectmes?.ui?.inventoryAction==='Edit')history.back();else renderApp();
}
editCheckedInventory30=function(){
  if(!requireLevel(2))return;
  const chosen=selectedRows30(shellScreen);if(!chosen.length)return;
  if(chosen.length>1)return openInventoryMassUpdate30(chosen);
  uiState.inventorySelectedIndex=state.serials.findIndex(row=>row.serial===chosen[0]);uiState.inventoryAction='Edit';renderApp();
};
let inventoryMassSelection30=[];
function openInventoryMassUpdate30(chosen){
  if(!requireLevel(2))return;
  inventoryMassSelection30=[...new Set(chosen)];
  configDialog('Edición masiva de inventario','<form data-bulk-inventory30 onsubmit="event.preventDefault();saveInventoryMassUpdate30(this)"><p class="inventory-mass-count30">'+chosen.length+' contenedores seleccionados</p><div class="form-grid"><label>Estatus<select class="select" data-inventory-status30 aria-label="Estatus" onchange="inventoryAdjustmentToggle30(this.form)">'+inventoryStatusOptions30('',true)+'</select></label>'+inventorySearchField30('inventory_mass_location30','Ubicación','','location')+'<div class="inventory-mass-change30"><label><input type="checkbox" name="changeActive" onchange="inventoryAdjustmentToggle30(this.form)">Cambiar activo</label><label class="inventory-active30"><input type="checkbox" name="active" aria-label="Activo" checked disabled onchange="inventoryAdjustmentToggle30(this.form)">Activo</label></div>'+inventoryReasonField30()+'<label class="inventory-edit-notes30"><span><input type="checkbox" name="changeNotes" onchange="this.form.elements.notes.disabled=!this.checked">Cambiar notas</span><textarea class="input" name="notes" aria-label="Notas" rows="3" disabled></textarea></label></div><div class="capture-actions"><button class="btn soft" type="button" onclick="closeConfigDialog()">Cancelar</button><button class="btn primary" type="submit">Aplicar</button></div></form>');
  const dialog=ensureConfigDialog();dialog.classList.add('inventory-mass-dialog30');const close=dialog.querySelector('.concept-head button');close.innerHTML='×';close.setAttribute('aria-label','Cerrar');
  installInventoryLookups30(dialog);inventoryAdjustmentToggle30(dialog.querySelector('form'));
}
function validateInventoryAdjustment30(records,patch,reason){
  if(!records.length)throw Error('Selecciona al menos un contenedor.');
  const status=patch.status===undefined?null:getSetupRow('Container_Status',patch.status);
  if(patch.status!==undefined&&!status?.active)throw Error('Selecciona un estatus de Container Status.');
  if(patch.location!==undefined&&!state.setupTables.Locations.some(row=>row.active&&row.code===patch.location))throw Error('Selecciona una ubicación del catálogo.');
  const part=patch.part===undefined?null:getPart(patch.part);
  if(patch.part!==undefined&&(!part||part.active===false))throw Error('Selecciona un No Parte del catálogo.');
  if(patch.qtyCurrent!==undefined&&(!Number.isFinite(patch.qtyCurrent)||patch.qtyCurrent<0))throw Error('La cantidad debe ser un número igual o mayor a cero.');
  for(const row of records){
    const next={...row,...patch};const nextStatus=status||getSetupRow('Container_Status',row.status);
    if(patch.active===true&&nextStatus?.activeStatus===false)throw Error('Ese Container Status no permite que el contenedor esté activo.');
    const changed=Object.keys(patch).some(key=>row[key]!==patch[key]);if(!changed)continue;
    if(requiresFinalization30(state,row))throw Error('Finaliza el recibo antes de modificar el contenedor.');
    if((!next.active||nextStatus?.activeStatus===false)&&!state.setupTables.Inventory_Adjustment_Reason.some(item=>item.active&&item.code===reason))throw Error('Selecciona un Adjustment Reason para inactivar el contenedor.');
    if(part&&part.part!==row.part&&Number(next.qtyCurrent)>0&&String(part.unit).toLowerCase()!==String(row.unit).toLowerCase())throw Error('El No Parte debe tener la misma unidad del inventario.');
    if(!inventoryRecordActive30(row)&&patch.qtyCurrent!==undefined&&patch.qtyCurrent!==row.qtyCurrent)throw Error('No se puede ajustar la cantidad de un contenedor inactivo.');
  }
}
function commitInventoryAdjustment30(serials,patch,reason){
  const records=serials.map(code=>state.serials.find(row=>row.serial===code));
  if(records.some(row=>!row))throw Error('La selección cambió. Vuelve a seleccionar los contenedores.');
  validateInventoryAdjustment30(records,patch,reason);
  const changed=records.filter(row=>Object.keys(patch).some(key=>row[key]!==patch[key]));
  if(!changed.length)return 0;
  saveReceivingState30(()=>{
    for(const code of changed.map(row=>row.serial)){
      const row=state.serials.find(item=>item.serial===code),before=structuredClone(row);
      Object.assign(row,patch);
      if(patch.part!==undefined){
        const part=getPart(patch.part);row.desc=part.desc;row.unit=part.unit;
        if(before.part!==row.part){
          const op=row.operationCode||row.operation;
          const routes=engineeringData29().routes.filter(route=>route.active&&route.part===row.part&&route.operation===op);
          delete row.routingId;delete row.operationNo;delete row.opNo;
          if(routes.length===1){row.routingId=routes[0].id;row.operationNo=routes[0].sequence;}
          if(!routes.length){delete row.operationCode;delete row.operation;delete row.operationName;}
        }
      }
      const active=inventoryRecordActive30(row);if(!active)row.active=false;
      const audit={serial:code,date:new Date().toISOString(),user:shellSession?.user||'',reason:reason||'',before,after:structuredClone(row)};
      state.inventoryAdjustments30.unshift(audit);
      addMovement(active?'ADJUST':'INACTIVATE',row.serial,row.part,row.qtyCurrent,row.unit,reason||'Edición de inventario');
      Object.assign(state.movements[0],{adjustmentReason:reason||'',before:structuredClone(before),after:structuredClone(row)});
    }
  });return changed.length;
}
function saveInventoryDetail30(stay=false){
  if(!requireLevel(2))return;
  const form=document.getElementById('inventory-edit-form30');if(!form||!form.reportValidity())return;
  const patch={part:form.querySelector('#inventory_part_edit30').value.trim(),qtyCurrent:Number(form.elements.quantity.value),location:form.querySelector('#inventory_location_edit30').value.trim(),status:form.querySelector('[data-inventory-status30]').value,notes:form.elements.notes.value,active:form.elements.active.checked};
  try{commitInventoryAdjustment30([form.dataset.serial30],patch,form.elements.adjustmentReason.value);}catch(error){showMsg(error.message||'No se pudieron guardar los cambios.',true);return;}
  if(stay){renderApp();showMsg('Cambios guardados.');}else{returnInventoryDetail30();showMsg('Cambios guardados.');}
}
function saveInventoryMassUpdate30(form){
  if(!requireLevel(2)||!form.reportValidity())return;
  const patch={},status=form.querySelector('[data-inventory-status30]').value,location=form.querySelector('#inventory_mass_location30').value.trim();
  if(status)patch.status=status;if(location)patch.location=location;
  if(form.elements.changeActive.checked)patch.active=form.elements.active.checked;
  if(form.elements.changeNotes.checked)patch.notes=form.elements.notes.value;
  if(!Object.keys(patch).length)return showMsg('Selecciona al menos un cambio para aplicar.',true);
  try{const count=commitInventoryAdjustment30(inventoryMassSelection30,patch,form.elements.adjustmentReason.value);clearInventoryChecks30();ensureConfigDialog().close();renderApp();showMsg(count+' contenedores actualizados.');}catch(error){showMsg(error.message||'No se pudieron guardar los cambios.',true);}
}
// A record detail owns its workspace; the catalogue is shown again on return.
const inventoryDetailsRender30=renderApp;
renderApp=function(){
  inventoryDetailsRender30();
  const view=document.querySelector('main .view.active');if(!view)return;
  const details=[...view.querySelectorAll(':scope > .card.capture')];
  for(const detail of details){for(const sibling of [...view.children])if(sibling!==detail&&sibling.matches('.card:not(.capture)'))sibling.hidden=true;}
  if(['inventory','containers'].includes(shellScreen)&&uiState.inventoryAction==='Edit')document.getElementById('pageTitle').textContent='Editar inventario';
};
