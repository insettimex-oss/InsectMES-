let requirementsFilters30;
const planningStates30 = ['Nuevo','Programado','En producción','En espera'];
const salesStates30 = ['Abierto','Cerrado','Cancelado'];
const sales30 = () => state.sales30 || [];

function quantityIn30(quantity, from, to) {
  if (quantity === 0) return 0;
  return amountIn30(quantity,from,to);
}

function materialPlan30(filters) {
  const data = operationsData29();
  const start = filters.start;
  const end = shiftPlanningDate29(start,Number(filters.days) - 1);
  const balances = new Map();
  const issues = new Set();
  function entry(part, unit) {
    const key = part + '|' + unit.toLowerCase();
    if (!balances.has(key)) balances.set(key,{part,unit,events:new Map(),inventory:0,overdue:0});
    return balances.get(key);
  }
  function register(part, unit, date, quantity, kind) {
    const master = getPart(part);
    if (!master?.unit || !unit) {
      issues.add(part + ': unidad o parte sin catálogo.');
      return;
    }
    let converted;
    try { converted = quantityIn30(quantity,unit,master.unit); }
    catch { issues.add(part + ': ' + unit + ' no se puede convertir a ' + master.unit + '.'); return; }
    const row = entry(part,master.unit);
    if (kind === 'stock') { row.inventory += converted; return; }
    if (kind === 'receipt' && date < start) { row.overdue += converted; return; }
    const when = date < start ? start : date;
    if (when > end) return;
    if (!row.events.has(when)) row.events.set(when,{required:0,receipt:0});
    row.events.get(when)[kind] += converted;
  }
  for (const job of data.jobs) {
    const pending = remainingJob30(job);
    if (!planningStates30.includes(job.status) || job.start > end || pending <= 1e-8) continue;
    const bom = state.setupTables.Bom.filter(line => line.active && line.parentPart === job.part &&
      (!job.routeId || !line.routingId || line.routingId === job.routeId));
    if (!bom.length) issues.add(job.code + ': ' + job.part + ' sin BOM aplicable.');
    for (const line of bom) {if(line.qtyPerUnit==null||!Number.isFinite(Number(line.qtyPerUnit))||Number(line.qtyPerUnit)<=0){issues.add(job.code+': falta cantidad en BOM '+line.parentPart+' / '+line.componentPart+'.');continue;}register(line.componentPart,line.unit,job.start,line.qtyPerUnit * pending,'required');}
  }
  for (const order of data.orders) {
    if (order.status !== 'Abierta' || order.due > end) continue;
    for (const line of order.lines) {
      const quantity = purchaseLineBalance29(order,line);
      if (quantity) register(line.part,line.unit,order.due,quantity,'receipt');
    }
  }
  const relevant = new Set([...balances.values()].map(row => row.part));
  for (const serial of state.serials) {
    if (relevant.has(serial.part) && planningStockAvailable30(state,serial))
      register(serial.part,serial.unit,start,Number(serial.qtyCurrent),'stock');
  }
  const rows = [];
  for (const row of balances.values()) {
    if (!containsOperations29(row.part,filters.part)) continue;
    let balance = row.inventory;
    const events = [...row.events].sort(([a],[b]) => a.localeCompare(b));
    if (!events.length && row.overdue) events.push([start,{required:0,receipt:0}]);
    for (const [index,[date,event]] of events.entries()) {
      const opening = balance;
      balance += event.receipt - event.required;
      const shortage = Math.max(0,-balance);
      if (!filters.shortage || shortage > 1e-8) rows.push({
        part:row.part,date,unit:row.unit,opening,required:event.required,receipt:event.receipt,
        overdue:index === 0 ? row.overdue : 0,balance,shortage,
      });
    }
  }
  rows.sort((a,b) => a.part.localeCompare(b.part) || a.date.localeCompare(b.date));
  return {rows,issues:[...issues]};
}

function salesAllocated30(code, except = '') {
  return (state.operationsDesk29?.jobs || []).filter(job => job.salesCode === code && job.code !== except && job.status !== 'Cancelado')
    .reduce((qty,job) => qty + Number(job.qty),0);
}

function productionPlan30(filters) {
  const data = operationsData29();
  const end = shiftPlanningDate29(filters.start,Number(filters.days) - 1);
  const jobs = data.jobs.filter(job => planningStates30.includes(job.status) && remainingJob30(job) > 1e-8 && job.due <= end &&
    containsOperations29(job.part,filters.part)).map(job => ({
      source:'Job',code:job.code,part:job.part,qty:remainingJob30(job),unit:getPart(job.part)?.unit || '',
      start:job.start,due:job.due,center:job.center,hours:remainingJob30(job) / job.rate + (remainingJob30(job) === job.qty ? job.setup : 0),
      status:job.due < filters.start ? 'Vencido' : job.status,
    }));
  const stock=new Map();
  for(const serial of state.serials.filter(row=>planningStockAvailable30(state,row))){const part=getPart(serial.part);if(!part?.unit)continue;try{stock.set(serial.part,(stock.get(serial.part)||0)+quantityIn30(serial.qtyCurrent,serial.unit,part.unit));}catch{}}
  const demand = [...sales30()].sort((a,b)=>a.due.localeCompare(b.due)).filter(order => order.status === 'Abierto' && order.due <= end &&
    containsOperations29(order.part,filters.part)).map(order => ({
      source:'Pedido',code:order.code,part:order.part,qty:Math.max(0,order.qty-salesAllocated30(order.code)),
      unit:order.unit,start:'',due:order.due,center:'',hours:null,status:'Sin job',
    })).map(order=>{const part=getPart(order.part);let available=0;try{available=quantityIn30(stock.get(order.part)||0,part?.unit,order.unit);}catch{}const applied=Math.min(order.qty,available);try{stock.set(order.part,Math.max(0,(stock.get(order.part)||0)-quantityIn30(applied,order.unit,part?.unit)));}catch{}return {...order,qty:round(order.qty-applied)};}).filter(order => order.qty > 1e-8);
  return [...jobs,...demand].filter(row => !filters.shortage || ['Sin job','Vencido'].includes(row.status))
    .sort((a,b) => a.due.localeCompare(b.due) || a.code.localeCompare(b.code));
}

function renderRequirements30() {
  const mrp = shellScreen === 'mrp';
  const filters = requirementsFilters30?.[shellScreen] || {start:dateLot29().id,days:30,part:'',shortage:false};
  const fields = [field29('part','No Parte'),field29('start','Fecha inicial','date',{required:true}),
    field29('days','Horizonte en días','number',{min:1,max:180,step:1,required:true}),
    field29('shortage',mrp?'Solo faltantes':'Solo pendientes o vencidos','checkbox')];
  const links = screenAction29('Job Manager','job-manager') +
    (mrp ? screenAction29('Órdenes de compra','oc') : screenAction29('Capacity Planning','capacity-planning') +
      screenAction29('Pedidos','pedidos'));
  let content;
  if (mrp) {
    const {rows,issues} = materialPlan30(filters);
    const heads = ['No Parte','Fecha','Unidad','Saldo inicial','Requerido','OC prevista','OC vencida','Saldo proyectado','Faltante'];
    const data = rows.map(x => [x.part,x.date,x.unit,...[x.opening,x.required,x.receipt,x.overdue,x.balance,x.shortage].map(number34)]);
    content = '<div class="ops-method">Demanda directa de BOM de jobs activos. Las OC vencidas se muestran aparte y no se suman al disponible.</div>' +
      (issues.length ? '<details class="r30-notice"><summary>' + issues.length + ' datos por completar</summary><ul>' +
        issues.map(issue => '<li>' + esc(issue) + '</li>').join('') + '</ul></details>' : '') +
      dataTable29(heads,data);
  } else {
    const rows = productionPlan30(filters);
    content = dataTable29(['Origen','Folio','No Parte','Cantidad','Unidad','Inicio','Entrega','Centro','Horas','Estado'],
      rows.map(x => [x.source,x.code,x.part,number34(x.qty),x.unit,x.start || '—',x.due,x.center || '—',
        x.hours === null ? '—' : number34(x.hours),x.status]));
  }
  document.getElementById('view-' + currentView).innerHTML = cardNavigation29(mrp ? 'MRP · Materiales' : 'PRP · Producción',
    '<form class="ops-filters" onsubmit="searchRequirements30(event)" aria-label="Filtros"><div class="ops-fields">' +
    fields.map(field => operationsField29(field,filters[field.key],true)).join('') +
    '</div><div class="ops-filter-actions"><button class="btn primary">Buscar</button></div></form>' +
    '<div class="actionbar">' + links + '</div>' + content);
}
function searchRequirements30(event) {
  event.preventDefault();
  requirementsFilters30 ??= {};
  requirementsFilters30[shellScreen] = readOperationsForm29(event.currentTarget);
  renderRequirements30();
}

function renderSales30() {
  const rows = sales30().map(order => '<tr><td><button class="btn link" type="button" data-code="' + esc(order.code) +
    '" onclick="openSales30(this.dataset.code)">' + esc(order.code) + '</button></td>' +
    [order.customer,order.part,number34(order.qty),order.unit,order.due,order.status,number34(salesAllocated30(order.code)),
      number34(shippedQty30(order.code)),number34(shipmentBalance30(order))]
      .map(value => '<td>' + esc(String(value)) + '</td>').join('') + '</tr>');
  document.getElementById('view-' + currentView).innerHTML = cardNavigation29('Pedidos',
    '<div class="actionbar">' + (levelFor() >= 2 ? '<button class="btn primary" type="button" onclick="openSales30()">Agregar</button>' : '') +
    screenAction29('PRP','prp') + screenAction29('Envíos','shipping') + '</div>' +
    resultsTable30(['Folio','Cliente','No Parte','Cantidad','Unidad','Entrega','Estado','Cantidad en jobs','Enviado','Saldo'],rows));
}
function openSales30(code) {
  if (!requireLevel(code ? 1 : 2,'pedidos')) return;
  const existing = sales30().find(row => row.code === code);
  if (code && !existing) return;
  const editable = levelFor('pedidos') >= 2;
  const record = existing || {due:dateLot29().id,status:'Abierto'};
  const fields = [
    field29('code','Folio','text',{required:true,readonly:Boolean(existing)}),
    field29('customer','Cliente','text',{required:true}),
    choice29('part','No Parte',partChoices29(),true),
    field29('qty','Cantidad','number',{min:0.01,step:0.01,required:true}),
    field29('due','Entrega','date',{required:true}),choice29('status','Estado',options29(salesStates30),true),
  ];
  configDialog('Pedido' + (code ? ' · ' + code : ''),
    '<form class="ops-dialog" data-code="' + esc(code || '') + '" onsubmit="saveSales30(event)">' +
    '<fieldset class="ops-fields"' + (editable ? '' : ' disabled') + '>' +
    fields.map(field => operationsField29(field,record[field.key])).join('') + '</fieldset>' +
    (editable ? '<div class="capture-actions"><button class="btn primary">Guardar</button></div>' : '') + '</form>');
}
function saveSales30(event) {
  event.preventDefault();
  if (!requireLevel(2,'pedidos')) return;
  const form = event.currentTarget;
  const values = readOperationsForm29(form.querySelector('fieldset'));
  const previous = sales30().find(row => row.code === form.dataset.code);
  const part = getPart(values.part);
  const qty = Number(values.qty);
  if (!values.code || !values.customer || !part || !Number.isFinite(qty) || qty <= 0 ||
      sales30().some(row => row !== previous && row.code.toUpperCase() === values.code.toUpperCase())) {
    return showMsg('Revisa el folio, cliente, parte y cantidad.',true);
  }
  if (previous && salesAllocated30(previous.code) > 0 &&
    (previous.part !== values.part || qty < salesAllocated30(previous.code) || values.status === 'Cancelado')) {
    return showMsg('El pedido tiene jobs. Conserva la parte y cubre las cantidades asignadas, o ajusta los jobs primero.',true);
  }
  if (previous && shippedQty30(previous.code) > 0 && (previous.part !== values.part ||
      qty < shippedQty30(previous.code) || values.status === 'Cancelado')) {
    return showMsg('El pedido tiene envíos. Conserva la parte y la cantidad ya enviada.',true);
  }
  const record = {...values,qty,unit:previous?.part === values.part ? previous.unit : part.unit};
  const records = sales30();
  if (previous) records[records.indexOf(previous)] = record;
  else records.push(record);
  state.sales30 = records;
  saveState();
  closeConfigDialog();
  showMsg('Pedido guardado.');
}

function refreshJobSales30(form, current = '') {
  const field = form.elements.salesCode;
  if (!field) return;
  const orders = sales30().filter(order => order.part === form.elements.part.value &&
    (order.status === 'Abierto' || order.code === current));
  field.innerHTML = '<option value="">Sin pedido vinculado</option>' +
    selectOptions(orders.map(order => ({value:order.code,label:order.code})),false);
  field.value = orders.some(order => order.code === current) ? current : '';
}
function validateJobSales30(job, previous) {
  if (!job.salesCode) return '';
  const order = sales30().find(row => row.code === job.salesCode);
  if (!order || order.part !== job.part || order.unit !== getPart(job.part)?.unit ||
    (order.status !== 'Abierto' && order.code !== previous?.salesCode)) return 'Selecciona un pedido de la misma parte y unidad.';
  if (job.status !== 'Cancelado' && salesAllocated30(order.code,previous?.code) + job.qty > order.qty + 1e-8)
    return 'La cantidad del job excede el saldo del pedido.';
  return '';
}


const shipmentRows30 = () => state.shipments30 || [];
const shippedQty30 = code => shipmentRows30().filter(row => row.order === code).reduce((sum,row) => sum + row.qty,0);
let shipmentFilters30 = {};
function shipmentBalance30(order) {
  return Math.max(0,round(order.qty - shippedQty30(order.code)));
}
function shipmentSource30(serial, order) {
  if (!serial?.active || !(serial.qtyCurrent > 0) || serial.part !== order.part) return false;
  const part = getPart(serial.part);
  const location = getSetupRow('Locations',serial.location);
  if (requiresFinalization30(state,serial)) return false;
  const status = getSetupRow('Container_Status',serial.status);
  const type = getSetupRow('Item_Type',part?.itemType);
  const warehouse = ['ALM-RM-01','ALM-WIP-01'].includes(location?.code);
  const locationType = getSetupRow('Location_Type',location?.locationType || (warehouse ? 'Almacén' : ''));
  return Boolean(type?.active && type.allowShip && location?.active && locationType?.active &&
    locationType.allowShip && status?.active && status.activeStatus!==false && status.allowShip && !status.isConsumed);
}
function shipmentOrders30() {
  return sales30().filter(order => order.status === 'Abierto' && shipmentBalance30(order) > 0 &&
    getSetupRow('Item_Type',getPart(order.part)?.itemType)?.allowShip);
}
function renderShipments30() {
  const view = document.getElementById('view-' + currentView);
  const fields = [field29('query','Folio, pedido o serial'),field29('date','Fecha','date')];
  const filters = '<form class="ops-filters" onsubmit="searchShipments30(event)"><div class="ops-fields">' +
    fields.map(field => operationsField29(field,shipmentFilters30[field.key],true)).join('') +
    '</div><div class="ops-filter-actions"><button class="btn primary">Buscar</button></div></form>';
  const actions = '<div class="actionbar">' + (levelFor('shipping') >= 2 && levelFor('inventory') >= 2 && levelFor('pedidos') ?
    '<button class="btn primary" type="button" onclick="openShipment30()">Agregar</button>' : '') +
    screenAction29('Pedidos','pedidos') + '</div>';
  const matches = shipmentRows30().filter(row => (!shipmentFilters30.date || row.date === shipmentFilters30.date) &&
    containsOperations29([row.code,row.order,row.serial].join(' '),shipmentFilters30.query || ''));
  const rows = matches.map(row => {
    const cells = [row.code,dateDisplay34(row.date),row.order,row.customer,row.part,row.serial,
      number34(row.qty) + ' ' + row.unit,row.location,row.operator];
    return '<tr>' + cells.map(value => '<td>' + esc(String(value ?? '')) + '</td>').join('') + '</tr>';
  });
  view.innerHTML = cardNavigation29('Envíos',filters + actions + resultsTable30(
    ['Envío','Fecha','Pedido','Cliente','No Parte','Serial','Cantidad','Ubicación','Operador'],rows));
}
function searchShipments30(event) {
  event.preventDefault();
  shipmentFilters30 = readOperationsForm29(event.currentTarget);
  renderShipments30();
}
function openShipment30() {
  if (!requireLevel(2,'shipping') || !requireLevel(2,'inventory') || !requireLevel(1,'pedidos')) return;
  const orders = shipmentOrders30();
  if (!orders.length) return showMsg('No hay pedidos abiertos con saldo y parte habilitada para embarque.',true);
  const fields = [choice29('order','Pedido',orders.map(order => [order.code,order.code + ' · ' + order.customer]),true),
    choice29('serial','Serial',[],true),field29('qty','Cantidad','number',{required:true,min:0.01,step:0.01})];
  configDialog('Nuevo envío','<form class="ops-dialog" onsubmit="saveShipment30(event)"><div class="ops-fields">' +
    fields.map(field => operationsField29(field)).join('') + '</div><div id="shipment-balance30" role="status"></div>' +
    '<div class="capture-actions"><button class="btn primary" disabled>Guardar</button></div></form>');
  const form = document.querySelector('#configDialog form');
  form.elements.order.addEventListener('change',() => updateShipmentSources30(form));
  form.elements.serial.addEventListener('change',() => {
    form.querySelector('button[type=submit], .capture-actions button').disabled = !form.elements.serial.value;
  });
}
function updateShipmentSources30(form) {
  const order = shipmentOrders30().find(row => row.code === form.elements.order.value);
  const options = order ? state.serials.filter(row => shipmentSource30(row,order)) : [];
  form.elements.serial.replaceChildren(new Option('Seleccionar',''),...options.map(row =>
    new Option(row.serial + ' · ' + number34(row.qtyCurrent) + ' ' + row.unit + ' · ' + row.location,row.serial)));
  form.querySelector('.capture-actions button').disabled = true;
  form.elements.qty.value = '';
  form.querySelector('#shipment-balance30').textContent = !order ? '' :
    'Saldo del pedido: ' + number34(shipmentBalance30(order)) + ' ' + order.unit +
      (options.length ? '' : ' · Sin seriales habilitados para embarque');
}
function saveShipment30(event) {
  event.preventDefault();
  if (!requireLevel(2,'shipping') || !requireLevel(2,'inventory') || !requireLevel(1,'pedidos')) return;
  const values = readOperationsForm29(event.currentTarget);
  const order = shipmentOrders30().find(row => row.code === values.order);
  const source = state.serials.find(row => row.serial === values.serial);
  const qty = round(values.qty);
  if (!order || !shipmentSource30(source,order)) return showMsg('El pedido o el serial no está disponible.',true);
  try {
    const exact = amountIn30(qty,order.unit,source.unit);
    const consumed = round(exact);
    if (Math.abs(exact - consumed) > 1e-8 || consumed <= 0 ||
        qty > shipmentBalance30(order) || consumed > source.qtyCurrent) {
      return showMsg('La cantidad excede el saldo del pedido o del serial, o es inferior a la precisión del inventario.',true);
    }
    const code = 'ENV-' + String(shipmentRows30().length + 1).padStart(5,'0');
    const previous = state;
    const next = structuredClone(state);
    (next.shipments30 ??= []).unshift({code,date:dateLot29().id,order:order.code,customer:order.customer,
      part:source.part,serial:source.serial,qty,unit:order.unit,location:source.location,operator:shellSession?.user || ''});
    const container = next.serials.find(row => row.serial === source.serial);
    container.qtyCurrent = Math.round((source.qtyCurrent - consumed) * 1e6) / 1e6;
    if (container.qtyCurrent === 0) {
      container.active = false;
      container.status = 'CONSUMED';
    }
    state = next;
    try {
      addMovement('Embarque',source.serial,source.part,consumed,source.unit,code + ' · ' + order.code);
      saveState();
    } catch (error) {
      state = previous;
      throw error;
    }
    shipmentFilters30 = {};
    closeConfigDialog();
    showMsg('Envío ' + code + ' registrado.');
  } catch (error) {
    showMsg(error.message,true);
  }
}

