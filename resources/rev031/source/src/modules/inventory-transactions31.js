// Container transactions preserve balances and genealogy, or commit nothing.
function transactContainers31(action,args){
  const codes=String(args.serials||'').split(',').map(code=>code.trim()).filter(Boolean);
  if(!codes.length||new Set(codes).size!==codes.length)throw Error('Selecciona seriales únicos.');
  if(action!=='Merge'&&codes.length!==1)throw Error('Selecciona un contenedor.');
  if(action==='Merge'&&codes.length<2)throw Error('Merge requiere al menos dos contenedores.');
  if(!state.setupTables.Locations.some(row=>row.active&&row.code===args.location))throw Error('Selecciona una ubicación activa.');
  const sources=codes.map(code=>state.serials.find(row=>row.serial===code));
  if(sources.some(row=>!row||!inventoryRecordActive30(row)||requiresFinalization30(state,row)))throw Error('Hay contenedores inactivos o pendientes de finalización.');
  for(const row of sources){const rule=getSetupRow('Container_Status',row.status);if(action==='Move'&&!rule.allowMove)throw Error('El estatus no permite Move.');if(action==='Split'&&rule.preventSplit)throw Error('El estatus no permite Split.');if(action==='Merge'&&rule.preventMerge)throw Error('El estatus no permite Merge.');}
  if(action==='Merge'&&sources.some(row=>row.part!==sources[0].part))throw Error('Los contenedores deben tener el mismo No Parte.');
  const lots=[...new Set(sources.flatMap(row=>row.productionLots||[row.productionLot||row.lot]).filter(Boolean))];
  if(action==='Merge'&&lots.length>1&&!state.settings.allowMixedLotsMerge)throw Error('El setting no permite Merge de distintos lotes.');
  const count=Number(args.count),each=Number(args.quantity);
  if(action==='Split'&&(!Number.isInteger(count)||count<2||count>1000||!Number.isFinite(each)||each<=0||count*each>sources[0].qtyCurrent+1e-8))throw Error('Revisa el número de contenedores y la cantidad del Split.');
  const unit=sources[0].unit;
  const total=sources.reduce((sum,row)=>sum+amountIn30(Number(row.qtyCurrent),row.unit,unit),0);
  const consumedStatus=containerStatusCode30('CONSUMED');
  if(action!=='Move'&&!getSetupRow('Container_Status',consumedStatus))throw Error('Configura el estatus de los contenedores consumidos.');
  const created=[];
  saveReceivingState30(()=>{
    const live=codes.map(code=>state.serials.find(row=>row.serial===code));
    const now=new Date().toISOString();
    if(action==='Move'){
      const row=live[0],previous=row.location;row.location=args.location;if(args.notes!==undefined)row.notes=args.notes;
      addMovement('MOVE',row.serial,row.part,row.qtyCurrent,row.unit,previous+' → '+row.location);
      return;
    }
    const quantities=action==='Merge'?[total]:Array(count).fill(each);
    if(action==='Split'){
      const remaining=Number((sources[0].qtyCurrent-count*each).toFixed(6));
      if(remaining>0)quantities.push(remaining);
    }
    for(const quantity of quantities){
      const first=live[0],serial=getNextSerial(getPart(first.part)?.serialPrefix||'BSF');
      if(state.serials.some(row=>row.serial===serial))throw Error('El consecutivo de serial ya existe. Revisa Serial Prefixes.');
      const child={...structuredClone(first),serial,qtyCurrent:Number(quantity.toFixed(6)),qtyInitial:Number(quantity.toFixed(6)),active:true,location:args.location,notes:args.notes||'',origin:action.toUpperCase(),parentSerials:[...codes]};
      if(action==='Merge'){child.productionLots=lots;if(lots.length>1){child.lot=lots.join(' / ');delete child.productionLot;}}
      if(action==='Merge'&&live.length===4&&live.every(row=>row.physicalType31==='Incubadora'&&row.qtyCurrent===3500&&String(row.unit).toLowerCase()==='larvas')&&total===14000){child.physicalType31='Larvero';child.containerType='LARVERO-60X40';child.larvaeCount=14000;child.mergedAt31=now;delete child.supportTray31;if(args.location==='WC-RRE'){state.loadedSources['WC-RRE']??={};state.loadedSources['WC-RRE']['tray:'+serial]={serial,part:child.part,qty:0,unit:child.unit,wc:'WC-RRE',loadedAt:now};}}
      state.serials.push(child);created.push(serial);
      for(const parent of live)state.genealogy.unshift({ts:now,parent:parent.serial,child:serial,action:action.toUpperCase(),qty:action==='Split'?quantity:parent.qtyCurrent,unit:action==='Split'?unit:parent.unit,ref:args.notes||''});
      addMovement(action.toUpperCase(),serial,child.part,child.qtyCurrent,child.unit,codes.join(', '));
    }
    for(const parent of live){const balance=parent.qtyCurrent;parent.qtyInitial??=balance;parent.qtyCurrent=0;parent.active=false;parent.status=consumedStatus;addMovement(action.toUpperCase()+'-OUT',parent.serial,parent.part,balance,parent.unit,created.join(', '));}
  });return created;
}
const inventorySaveBeforeTransactions31=saveInventoryAction;
saveInventoryAction=function(){
  const action=uiState.inventoryAction;if(!['Move','Split','Merge'].includes(action))return inventorySaveBeforeTransactions31();
  if(!requireLevel(2))return;
  try{
    const field=id=>document.getElementById(id)?.value?.trim()||'';
    transactContainers31(action,{serials:field({Move:'move_serial',Split:'split_serial',Merge:'merge_serials'}[action]),location:field({Move:'move_location',Split:'split_location',Merge:'merge_location'}[action]),notes:field({Move:'move_notes',Split:'split_notes',Merge:'merge_notes'}[action]),count:field('split_count'),quantity:field('split_qty')});
    uiState.inventoryAction='';uiState.inventorySelectedIndex=null;gridSelections30.delete(shellScreen);renderApp();showMsg('Movimiento registrado.');
  }catch(error){showMsg(error.message||'No se pudo registrar el movimiento.',true);}
};
const consumeBeforeAliases31=consumeInputs30;
consumeInputs30=function(db,inputs){const result=consumeBeforeAliases31(db,inputs);for(const input of inputs){const row=db.serials.find(row=>row.serial===input.serial);if(row)row.status=containerStatusCode30(row.status,db);}return result;};
const nurseryAdvanceBeforeStatus31=advanceNursery30;
advanceNursery30=function(db,serial,date=new Date()){
  const entry=db.nursery.entries.find(row=>row.serial===serial&&!row.closed);
  const code=containerStatusCode30(db.settings?.nurseryReadyStatus31||'OK',db);
  if(entry?.level===4){const rule=db.setupTables.Container_Status.find(row=>row.code===code);if(!rule?.active||rule.activeStatus===false||!rule.okStatus||!rule.allowProduction||rule.receivingStatus)throw Error('Configura un Container Status disponible para la salida de guardería.');}
  const result=nurseryAdvanceBeforeStatus31(db,serial,date);
  if(result.level===5)db.serials.find(row=>row.serial===serial).status=code;
  return result;
};

// Navigation to container transactions stays beside serial traceability.
const renderInventoryBeforeLinks31=renderInventory;
renderInventory=function(){
 renderInventoryBeforeLinks31();
 if(!['inventory','containers'].includes(shellScreen))return;
 const view=document.getElementById('view-inventory'),trace=view?.querySelector('[data-inventory-trace]');
 if(!trace)return;
 const header=trace.closest('.card')?.querySelector('.card-head');if(!header)return;
 if(!header.contains(trace))header.append(trace);
 for(const button of view.querySelectorAll('.actionbar button'))if(['Move','Split','Merge'].includes(button.textContent.trim()))button.remove();
 let previous=trace;
 for(const action of ['Move','Split','Merge']){const button=document.createElement('button');button.type='button';button.className=trace.className;button.dataset.containerAction31=action;button.innerHTML=action+' <span aria-hidden="true">↗</span>';button.onclick=()=>launchSelectedInventory30(action);previous.after(button);previous=button;}
 const grid=gridTable34();if(grid)refreshGridChecks30(grid);
};
const checksBeforeContainerLinks31=refreshGridChecks30;
refreshGridChecks30=function(grid){checksBeforeContainerLinks31(grid);if(!['inventory','containers'].includes(shellScreen))return;const count=selectedRows30(shellScreen).length;for(const button of document.querySelectorAll('[data-container-action31]'))button.disabled=levelFor()<2||(button.dataset.containerAction31==='Merge'?count<2:count!==1);};
