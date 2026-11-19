let purchaseCaptureMode30 = 'single';
screenRegistry.push({id:'finalizar',name:'Finalizar',module:'Compras',target:'receipts'});

function receiptStatusLabel30(code) {
  return getSetupRow('Container_Status',code)?.description || code;
}
function receiptStatuses30() {
  return state.setupTables.Container_Status.filter(row=>row.active && row.activeStatus!==false && !row.isConsumed);
}
function configuredReceiptStatus30(finalize=false) {
  state.settings.receiptStatus30 ??= 'RECIBO';
  state.settings.finalReceiptStatus30 ??= 'OK';
  const code = finalize ? (state.settings.finalReceiptStatus30 || 'OK') : (state.settings.receiptStatus30 || 'RECIBO');
  return receiptStatuses30().find(row=>row.code===code && (!finalize || (!row.receivingStatus&&row.code!==state.settings.receiptStatus30)));
}
const openBeforeReceiptSettings30 = openConfigSettings;
openConfigSettings = function () {
  openBeforeReceiptSettings30();
  const fields = [[false,'receiptStatus30','Estatus al recibir una OC'],[true,'finalReceiptStatus30','Estatus al finalizar un recibo']];
  ensureConfigDialog().querySelector('.capture-actions').insertAdjacentHTML('beforebegin',fields.map(([finalize,id,label])=>{
    const configured = configuredReceiptStatus30(finalize);
    return '<label class="field">'+label+'<select class="select" id="'+id+'" required>'+
      (configured?'':'<option value="">Seleccionar estatus</option>')+
      receiptStatuses30().filter(row=>!finalize||(!row.receivingStatus&&row.code!==state.settings.receiptStatus30)).map(row=>
        '<option value="'+esc(row.code)+'" '+(row.code===configured?.code?'selected':'')+'>'+esc(row.description||row.code)+'</option>'
      ).join('')+'</select></label>';
  }).join(''));
  document.getElementById('receiptStatus30').addEventListener('change',function(){
    const final=document.getElementById('finalReceiptStatus30');
    const previous=final.value;
    final.innerHTML='<option value="">Seleccionar estatus</option>'+receiptStatuses30().filter(row=>!row.receivingStatus&&row.code!==this.value)
      .map(row=>'<option value="'+esc(row.code)+'">'+esc(row.description||row.code)+'</option>').join('');
    if(previous!==this.value) final.value=previous;
  });
};
const saveBeforeReceiptSettings30 = saveSettings29;
saveSettings29 = function (apply) {
  if (!requireLevel(4,'setup')) return;
  const initial=document.getElementById('receiptStatus30')?.value;
  const final=document.getElementById('finalReceiptStatus30')?.value;
  const decimals=Number(document.getElementById('number_decimals34')?.value);
  if (!Number.isInteger(decimals)||decimals<0||decimals>6) return saveBeforeReceiptSettings30(apply);
  if (!receiptStatuses30().some(row=>row.code===initial) ||
      final===initial || !receiptStatuses30().some(row=>row.code===final&&!row.receivingStatus)) {
    return showMsg('Selecciona estatus activos y diferentes para recibir y finalizar.',true);
  }
  state.settings.receiptStatus30=initial;
  state.settings.finalReceiptStatus30=final;
  saveBeforeReceiptSettings30(apply);
};

function standardPackForReceipt30(line) {
  const routes=engineeringData29().routes.filter(route=>route.active&&route.part===line.part);
  const revision=routes.map(route=>route.revision).sort((a,b)=>String(b).localeCompare(String(a),'es',{numeric:true}))[0];
  const step=routes.filter(route=>route.revision===revision&&Number(route.standardPack)>0)
    .sort((a,b)=>a.sequence-b.sequence)[0];
  if (!step) return null;
  try {
    const qty=round(quantityIn30(Number(step.standardPack),getPart(line.part)?.unit,line.unit));
    return qty>0?qty:null;
  } catch { return null; }
}
function receiptOrderOptions30(selected) {
  return eligiblePurchaseOrders29().map(order=>{
    const supplier=operationsData29().suppliers.find(row=>row.code===order.supplier);
    return '<option value="'+esc(order.code)+'" '+(selected===order.code?'selected':'')+'>'+
      esc(order.code+' · '+(supplier?.name||order.supplier))+'</option>';
  }).join('');
}
function setPurchaseCaptureMode30(button) {
  purchaseCaptureMode30=button.dataset.mode;
  for (const option of button.parentElement.querySelectorAll('[data-mode]')) {
    option.setAttribute('aria-pressed',String(option===button));
  }
  renderPurchaseLines30(button.form);
}
function purchaseReceiptOrder30(code) {
  return eligiblePurchaseOrders29().find(order=>order.code===code);
}
function renderPurchaseLines30(form) {
  const order=purchaseReceiptOrder30(form.elements.orderCode.value);
  const multiple=purchaseCaptureMode30==='multiple';
  const holder=form.querySelector('[data-receipt-lines]');
  if (!order) {
    holder.innerHTML='<p class="small">Selecciona una OC abierta.</p>';
    return;
  }
  const available=order.lines.filter(line=>getPart(line.part)&&purchaseLineBalance29(order,line)>0);
  const rows=order.lines.map((line,index)=>{
    const part=getPart(line.part);
    const balance=purchaseLineBalance29(order,line);
    const pack=standardPackForReceipt30(line);
    const enabled=Boolean(part&&balance>0);
    const description=esc(line.part+' · '+(part?.desc || ''));
    const disabled=enabled?'':' disabled';
    const picked=enabled&&!multiple&&available.length===1;
    const qty=pack==null?'':String(pack);
    return '<tr data-line="'+esc(line.id)+'"><td><input type="'+(multiple?'checkbox':'radio')+
      '" name="selectedLine" aria-label="Seleccionar partida '+(index+1)+'" '+(picked?' checked':'')+disabled+'></td>'+
      '<td>'+(index+1)+'</td><td>'+description+'</td><td>'+esc(line.unit)+'</td>'+
      '<td>'+number34(line.qty)+'</td><td>'+number34(purchaseLineReceived29(order,line))+'</td><td>'+number34(balance)+'</td>'+
      '<td>'+(pack==null?'—':number34(pack))+'</td>'+
      (multiple?'<td><input class="input" type="number" min="1" step="1" value="1" data-count aria-label="Contenedores partida '+(index+1)+'"'+disabled+'></td>':'')+
      '<td><input class="input" type="number" min="0.01" step="0.01" value="'+qty+'" data-each aria-label="Cantidad por contenedor partida '+
      (index+1)+'"'+disabled+'></td><td data-receipt-total>—</td></tr>';
  });
  holder.innerHTML=resultsTable30(['','Partida','No Parte','Unidad','Ordenado','Capturado','Pendiente','Standard Pack',
    ...(multiple?['Contenedores']:[]),'Cantidad por contenedor','Total'],rows,'830px');
  holder.oninput=()=>updatePurchaseTotals30(form);
  updatePurchaseTotals30(form);
}
function updatePurchaseTotals30(form) {
  let count=0;
  for (const row of form.querySelectorAll('[data-line]')) {
    const checked=row.querySelector('[name=selectedLine]').checked;
    const containers=Number(row.querySelector('[data-count]')?.value ?? 1);
    const each=Number(row.querySelector('[data-each]').value);
    const total=checked&&Number.isSafeInteger(containers)&&containers>0&&Number.isFinite(each)&&each>0
      ? round(containers*each) : null;
    row.querySelector('[data-receipt-total]').textContent=total===null?'—':number34(total);
    if(total!==null) count+=containers;
  }
  form.querySelector('[data-receipt-summary]').textContent=count+' contenedor'+(count===1?'':'es');
}
function renderPurchaseCapture30() {
  const selected=receiptDraftOrder29 || '';
  const locations=state.setupTables.Locations.filter(row=>row.active).map(row=>
    '<option value="'+esc(row.code)+'">'+esc(row.code+' · '+row.description)+'</option>').join('');
  const status=configuredReceiptStatus30();
  const modes=[['single','Individual'],['multiple','Múltiple']].map(([mode,label])=>
    '<button type="button" class="btn soft" data-mode="'+mode+'" aria-pressed="'+(mode===purchaseCaptureMode30)+
    '" onclick="setPurchaseCaptureMode30(this)">'+label+'</button>').join('');
  document.getElementById('view-receipts').innerHTML=cardNavigation29('Recibir orden de compra',
    '<form class="receive-oc30" onsubmit="savePurchaseCapture30(event)">'+
    '<div class="receive-bar30"><div class="receive-modes30" role="group" aria-label="Modo de recibo">'+modes+'</div>'+
    '<span class="small">Estatus inicial '+(status?badge(status.code):'sin configurar')+'</span></div>'+
    '<div class="receive-fields30">'+
    '<label class="field">Orden de compra<select class="select" name="orderCode" required onchange="renderPurchaseLines30(this.form)">'+
    '<option value="">Seleccionar OC</option>'+receiptOrderOptions30(selected)+'</select></label>'+
    '<label class="field">Fecha<input class="input" name="date" type="date" value="'+dateLot29().id+'" required></label>'+
    '<label class="field">Ubicación<select class="select" id="r_location" name="location"><option value="">Seleccionar ubicación</option>'+
    locations+'</select></label><label class="field">Lote proveedor<input class="input" id="r_lot" name="lot"></label></div>'+
    '<div data-receipt-lines></div><p data-receipt-error class="ops-inline-error30" role="alert" hidden></p>'+
    '<div class="receive-bar30 receive-footer30"><span data-receipt-summary class="small" aria-live="polite"></span>'+
    '<div class="actionbar"><button class="btn soft" type="button" onclick="uiState.receiptsMode=\'list\';renderApp()">Cancelar</button>'+
    '<button class="btn primary" type="submit">Registrar recibo</button></div></div></form>');
  renderPurchaseLines30(document.querySelector('.receive-oc30'));
  applyFieldRules32();
}
function purchaseCaptureRows30(form,order) {
  return [...form.querySelectorAll('[data-line]')].filter(row=>row.querySelector('[name=selectedLine]').checked).map(row=>{
    const line=order.lines.find(item=>item.id===row.dataset.line);
    const part=getPart(line?.part);
    const prefix=getSetupRow('Serial_Prefix',part?.serialPrefix);
    const count=Number(row.querySelector('[data-count]')?.value ?? 1);
    const each=round(row.querySelector('[data-each]').value);
    const qty=round(count*each);
    const last=Number(prefix?.lastNumber || 0);
    if (!line || !part || !prefix?.active || !Number.isSafeInteger(last) || last<0 || last+count>Number.MAX_SAFE_INTEGER) {
      throw Error('Revisa la parte y su prefijo de serie activo.');
    }
    if (!Number.isSafeInteger(count)||count<1||!Number.isFinite(qty)||each<=0||qty<=0) {
      throw Error('Indica una cantidad válida para '+line.part+'.');
    }
    if (qty>purchaseLineBalance29(order,line)+1e-8) throw Error('La cantidad de '+line.part+' supera el saldo de la partida.');
    return {line,part,count,each,qty};
  });
}
function saveReceivingState30(change) {
  const previous=state;
  state=structuredClone(state);
  try {
    change();
    saveState();
  } catch (error) {
    state=previous;
    throw error;
  }
}
function savePurchaseCapture30(event) {
  event.preventDefault();
  if (!requireLevel(2,'receive')) return;
  const form=event.currentTarget;
  const error=form.querySelector('[data-receipt-error]');
  error.hidden=true;
  try {
    const {orderCode,date,location,lot}=Object.fromEntries(new FormData(form));
    const order=purchaseReceiptOrder30(orderCode);
    const status=configuredReceiptStatus30();
    if (!order || !date || (fieldRequired32(state,'receive','r_lot')&&!lot?.trim()) ||
        (fieldRequired32(state,'receive','r_location')&&!location) ||
        (location&&!state.setupTables.Locations.some(row=>row.active&&row.code===location))) {
      throw Error('Selecciona una OC, fecha y ubicación activa e indica el lote proveedor.');
    }
    if (!status) throw Error('Configura el estatus inicial en Settings.');
    const lines=purchaseCaptureRows30(form,order);
    if (!lines.length) throw Error('Selecciona al menos una partida con saldo.');
    saveReceivingState30(()=>{
      const used=new Set(state.serials.map(row=>row.serial));
      for (const {line,part,count,each,qty} of lines) {
        const id=receiptId();
        const receipt={id,date,part:line.part,desc:part.desc,unit:line.unit,containers:count,qtyPerContainer:each,qty,location,
          lot:lot.trim(),status:status.receivingStatus?'Por finalizar':'Finalizado',orderCode,orderLineId:line.id,supplierCode:order.supplier,
          operator:shellSession?.user || '',serials:[]};
        for(let i=0;i<count;i++) {
          let serial;
          do { serial=getNextSerial(part.serialPrefix); } while (used.has(serial));
          used.add(serial);
          receipt.serials.push(serial);
          state.serials.push({active:true,serial,part:line.part,desc:part.desc,unit:line.unit,qtyCurrent:each,
            containerType:part.serialPrefix,location,lot:lot.trim(),origin:id,status:status.code,receiptPending30:Boolean(status.receivingStatus)});
          addMovement('RECEIVE',serial,line.part,each,line.unit,id);
        }
        state.receipts.unshift(receipt);
      }
    });
    receiptOrderFilter29=orderCode;
    uiState.receiptsMode='list';
    navigateScreen(status.receivingStatus?'finalizar':'receive');
    showMsg(status.receivingStatus?'Contenedores registrados. Pendientes de finalizar.':'Contenedores registrados.');
  } catch (failure) {
    error.textContent=failure.message;
    error.hidden=false;
  }
}
function renderFinalizeReceipts30() {
  const status=configuredReceiptStatus30(true);
  const pending=state.serials.filter(row=>inventoryRecordActive30(row)&&requiresFinalization30(state,row));
  const rows=pending.map(row=>{
    const receipt=state.receipts.find(item=>item.id===row.origin);
    return '<tr><td><input type="checkbox" name="serial" value="'+esc(row.serial)+'" aria-label="Seleccionar '+esc(row.serial)+'"></td>'+
      [row.serial,receipt?.orderCode||'',row.origin,row.part,number34(row.qtyCurrent),row.unit,row.location,row.lot].map(value=>'<td>'+esc(value||'')+'</td>').join('')+
      '<td>'+badge(row.status)+'</td></tr>';
  });
  document.getElementById('view-receipts').innerHTML=cardNavigation29('Finalizar',
    '<form class="receive-oc30" onsubmit="finalizePurchaseReceipts30(event)">'+
    '<div class="receive-bar30">'+
    '<span class="small">Estatus al finalizar '+(status?badge(status.code):'sin configurar')+'</span></div>'+
    '<fieldset '+(levelFor('finalizar')<2?'disabled':'')+'><legend>Contenedores pendientes</legend>'+
    resultsTable30(['','Serial','OC','Recibo','No Parte','Cantidad','Unidad','Ubicación','Lote','Estatus'],rows,'780px')+
    '<div class="receive-bar30 receive-footer30">'+(pending.length?
      '<label class="concept-check"><input type="checkbox" onchange="for(const box of this.form.querySelectorAll(\'[name=serial]\'))box.checked=this.checked">Seleccionar todos</label>':'')+
    '<button class="btn primary" type="submit" '+(!pending.length||!status?'disabled':'')+'>Finalizar seleccionados</button></div></fieldset></form>');
}
function finalizePurchaseReceipts30(event) {
  event.preventDefault();
  if (!requireLevel(2,'finalizar') || !requireLevel(2,'receive')) return;
  const chosen=new Set(new FormData(event.currentTarget).getAll('serial'));
  const status=configuredReceiptStatus30(true);
  if (!chosen.size) return showMsg('Selecciona al menos un contenedor.',true);
  if (!status) return showMsg('Configura el estatus al finalizar en Settings.',true);
  try {
    saveReceivingState30(()=>{
      const rows=state.serials.filter(row=>inventoryRecordActive30(row)&&requiresFinalization30(state,row)&&chosen.has(row.serial));
      if (rows.length!==chosen.size) throw Error('Alguno de los contenedores ya no está pendiente.');
      const touched=new Set();
      for (const row of rows) {
        row.status=status.code;
        delete row.receiptPending30;
        touched.add(row.origin);
        addMovement('FINALIZE',row.serial,row.part,row.qtyCurrent,row.unit,row.origin);
      }
      for (const receipt of state.receipts) {
        if (touched.has(receipt.id)&&!state.serials.some(row=>row.origin===receipt.id&&requiresFinalization30(state,row))) {
          receipt.status='Finalizado';
        }
      }
    });
    renderApp();
    showMsg('Contenedores finalizados.');
  } catch(error) { showMsg(error.message,true); }
}
const receiptsBeforeOC30=renderReceipts;
renderReceipts=function () {
  if(shellScreen==='finalizar') return renderFinalizeReceipts30();
  if(shellScreen==='receive'&&uiState.receiptsMode==='new') {
    return renderPurchaseCapture30();
  }
  if(shellScreen==='receive'&&uiState.receiptsMode==='standalone') {
    const view=document.getElementById('view-receipts');
    view.innerHTML=getReceiptFormHtml("uiState.receiptsMode='list'; renderApp()");
    for (const id of ['r_order29','r_order_line29','r_supplier29','r_balance29']) {
      const field=document.getElementById(id);
      if (!field) continue;
      if ('value' in field) field.value='';
      (field.closest('label')||field).hidden=true;
    }
    return;
  }
  receiptsBeforeOC30();
  if(shellScreen==='receive'&&uiState.receiptsMode!=='new') {
    const bar=document.querySelector('#view-receipts .actionbar');
    if (bar&&levelFor('receive')>=2) bar.insertAdjacentHTML('beforeend',
      '<button class="btn soft" type="button" onclick="uiState.receiptsMode=\'standalone\';renderApp()">Recibo sin OC</button>');
    if (bar&&levelFor('finalizar')) bar.insertAdjacentHTML('beforeend',
      subAction30('Finalizar','finalizar'));
  }
};
const receiptInventorySave30=saveInventoryAction;
saveInventoryAction=function () {
  const action=uiState.inventoryAction;
  const fields={Move:'move_serial',Split:'split_serial',Merge:'merge_serials'};
  const serials=action==='Edit'?[state.serials[uiState.inventorySelectedIndex]?.serial]:
    (document.getElementById(fields[action])?.value || '').split(',').map(value=>value.trim());
  if (state.serials.some(row=>requiresFinalization30(state,row)&&serials.includes(row.serial))) {
    return showMsg('Finaliza el recibo antes de modificar el contenedor.',true);
  }
  return receiptInventorySave30();
};
const receiptInventoryDelete30=deleteInventorySelected;
deleteInventorySelected=function () {
  if (requiresFinalization30(state,state.serials[uiState.inventorySelectedIndex])) {
    return showMsg('Finaliza el recibo antes de modificar el contenedor.',true);
  }
  return receiptInventoryDelete30();
};

