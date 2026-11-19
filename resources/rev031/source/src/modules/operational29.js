const orderStatus29 = ['Borrador', 'Abierta', 'Cerrada', 'Cancelada'];
const supplierStatus29 = ['Activo', 'Inactivo'];
const jobStatus29 = ['Nuevo', 'Programado', 'En producción', 'Completado', 'En espera', 'Cancelado'];
const jobType29 = ['Inventario', 'Pedido', 'Prueba'];
const jobPriority29 = ['Normal', 'Alta', 'Urgente'];
const demandStatus29 = new Set(['Nuevo', 'Programado', 'En producción', 'En espera']);
const operationsFilters29 = new Map();

function shiftPlanningDate29(date, days) {
  const day = new Date(date + 'T00:00:00Z');
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}
function planningCenters29() {
  return engineeringData29().centers.filter(center => center.active);
}
function operationsData29() {
  if (state.operationsDesk29) return purchaseLineIds29(state.operationsDesk29);
  const today = dateLot29().id;
  const date = days => shiftPlanningDate29(today, days);
  const suppliers = [
    {code:'PV-001', name:'Nutrición BSF (prueba)', status:'Activo', type:'Materiales', category:'Alimento', terms:'30 días', buyer:'Compras', city:'San Luis Potosí'},
    {code:'PV-002', name:'Empaques del Centro (prueba)', status:'Activo', type:'Materiales', category:'Empaque', terms:'Contado', buyer:'Compras', city:'San Luis Potosí'},
    {code:'PV-003', name:'Servicios de Planta (prueba)', status:'Inactivo', type:'Servicio', category:'Mantenimiento', terms:'15 días', buyer:'Compras', city:'Soledad'},
  ];
  const parts = state.parts.filter(x => x.itemType === 'Materia Prima');
  const orders = parts.slice(0, 2).map((part, i) => ({
    code: 'OC-00' + (i + 1), supplier: suppliers[i].code, status: i ? 'Borrador' : 'Abierta',
    type: 'Estándar', currency: 'MXN', issued: 'Compras', orderDate: today, due: date(i + 3),
    notes: 'Registro de prueba',
    lines: [{part:part.part, qty:i ? 10 : 25, price:i ? 60 : 45, unit:part.unit}],
  }));
  const seedJobs = [['NUR', 0, 14, 2], ['REA', 1, 24, 2], ['REA', 1, 6, 2], ['HAR', 2, 15, 5]];
  const jobs = seedJobs.flatMap(([code, day, qty, rate], i) => {
    const op = state.cpOperations.find(x => x.code === code);
    if (!op || !getPart(op.part)) return [];
    return [{code:'JOB-00' + (i + 1), part:op.part, center:op.wc, qty, rate, setup:0.5,
      status:'Programado', type:'Prueba', priority:i === 2 ? 'Alta' : 'Normal',
      start:date(day), due:date(day + 1), lot:'', notes:'Registro de prueba'}];
  });
  state.operationsDesk29 = {suppliers, orders, jobs, calendars:{}};
  saveState();
  return purchaseLineIds29(state.operationsDesk29);
}

const options29 = values => values.map(value => [value, value]);
const field29 = (key, label, type = 'text', extra = {}) => ({key, label, type, ...extra});
const choice29 = (key, label, choices, required = false) =>
  field29(key, label, 'select', {choices, required});
const centerChoices29 = () => planningCenters29().map(x => [x.code, x.code + ' · ' + x.label]);
const partChoices29 = () => state.parts.map(x => [x.part, x.part + ' · ' + x.desc]);
const supplierChoices29 = (keep = '') => operationsData29().suppliers.filter(x => x.status === 'Activo' || x.code === keep)
  .map(x => [x.code, x.code + ' · ' + x.name]);

function operationsField29(field, value = '', filter = false) {
  const {key, label, type, choices, required, min, max, readonly} = field;
  const id = filter ? ' id="ops-filter-' + key + '"' : '';
  if (type === 'checkbox') {
    return '<label class="ops-check"><input' + id + ' name="' + key + '" type="checkbox"' + (value ? ' checked' : '') +
      '> ' + esc(label) + '</label>';
  }
  const name = id + ' name="' + key + '"' + (required ? ' required' : '');
  const selected = String(value);
  let input;
  if (type === 'select') {
    const options = choices.some(([code]) => code === selected) || !selected ? choices : [...choices, [selected, selected]];
    input = '<select class="select"' + name + '><option value="">' + (filter ? 'Todos' : 'Seleccionar') + '</option>' +
      options.map(([code, text]) => '<option value="' + esc(code) + '"' + (code === selected ? ' selected' : '') +
        '>' + esc(text) + '</option>').join('') + '</select>';
  } else {
    input = '<input class="input"' + name + ' type="' + type + '" value="' + esc(selected) + '"' +
      (type === 'number' ? ' step="' + (field.step ?? 'any') + '"' : '') +
      (min === undefined ? '' : ' min="' + min + '"') + (max === undefined ? '' : ' max="' + max + '"') +
      (readonly ? ' readonly' : '') + '>';
  }
  return '<label class="field">' + esc(label) + (required&&!filter?' <span class="req">*</span>':'') + input + '</label>';
}
function readOperationsForm29(form) {
  return Object.fromEntries([...form.elements].filter(x => x.name).map(x =>
    [x.name, x.type === 'checkbox' ? x.checked : x.value.trim()]));
}
function operationsMoney29(value, currency) {
  return new Intl.NumberFormat('es-MX', {style:'currency', currency, currencyDisplay:'code'}).format(value);
}
function orderTotal29(order) {
  return order.lines.reduce((total, line) => total + Math.round(line.qty * line.price * 100), 0) / 100;
}
function jobInventory29(job) {
  const unit = getPart(job.part)?.unit;
  return activeSerials().filter(x => x.part === job.part && x.unit === unit && productionAvailable30(state, x))
    .reduce((total, x) => total + Number(x.qtyCurrent || 0), 0);
}
function containsOperations29(value, text) {
  return String(value || '').toLocaleLowerCase('es-MX').includes(String(text || '').toLocaleLowerCase('es-MX'));
}
function matchesOperationsDates29(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}
function operationsFilterFields29(id) {
  if (id === 'oc') return [
    field29('code','Folio OC'), choice29('supplier','Proveedor',operationsData29().suppliers.map(x => [x.code,x.name])),
    choice29('status','Estado',options29(orderStatus29)), field29('from','Fecha OC desde','date'),
    field29('to','Fecha OC hasta','date'), field29('part','No Parte'),
  ];
  if (id === 'proveedores') return [
    field29('code','Código'), field29('name','Nombre'), choice29('status','Estado',options29(supplierStatus29)),
    choice29('type','Tipo',options29(['Materiales','Servicio'])), field29('category','Categoría'), field29('city','Ciudad'),
  ];
  if (id === 'job-manager') return [
    field29('code','No. de job'), field29('part','No Parte'), choice29('center','Centro de trabajo',centerChoices29()),
    choice29('status','Estado',options29(jobStatus29)), choice29('type','Tipo de job',options29(jobType29)),
    choice29('priority','Prioridad',options29(jobPriority29)), field29('from','Vence desde','date'),
    field29('to','Vence hasta','date'), field29('active','Solo activos','checkbox'),
    field29('overdue','Solo vencidos','checkbox'),
  ];
  return [
    choice29('center','Centro de trabajo',centerChoices29()), field29('part','No Parte'),
    field29('start','Inicio de ventana','date',{required:true}), field29('window','Días de la ventana','number',{min:1,max:180,step:1,required:true}),
    choice29('group','Agrupar por',options29(['Día','Semana','Mes']),true),
    field29('includeSetup','Incluir tiempo de preparación','checkbox'),
    field29('detail','Mostrar detalle de jobs','checkbox'),
    field29('carry','Incluir jobs anteriores a la ventana','checkbox'),
  ];
}
function defaultOperationsFilters29(id) {
  if (id === 'job-manager') return {active:true};
  if (id === 'capacity-planning') return {start:dateLot29().id, window:7, group:'Día', includeSetup:true, detail:false,carry:false};
  return {};
}
function operationsTable29(id, filters) {
  const data = operationsData29();
  if (id === 'oc') return {
    headers:['OC','Proveedor','Fecha OC','Vence','Tipo','Estado','Recepción','Emitió','Partidas','Importe'],
    rows:data.orders.filter(x => containsOperations29(x.code, filters.code) &&
      (!filters.supplier || x.supplier === filters.supplier) && (!filters.status || x.status === filters.status) &&
      matchesOperationsDates29(x.orderDate,filters.from,filters.to) &&
      (!filters.part || x.lines.some(line => containsOperations29(line.part,filters.part))))
      .map(x => ({key:x.code, cells:[x.code,data.suppliers.find(s => s.code === x.supplier)?.name || x.supplier,
        x.orderDate,x.due,x.type,x.status,purchaseReceiptStatus29(x),x.issued,x.lines.length,operationsMoney29(orderTotal29(x),x.currency)]})),
  };
  if (id === 'proveedores') return {
    headers:['Código','Proveedor','Estado','Tipo','Categoría','Términos de pago','Comprador','Ciudad','Teléfono','RFC'],
    rows:data.suppliers.filter(x => ['code','name','category','city'].every(k => containsOperations29(x[k], filters[k])) &&
      ['status','type'].every(k => !filters[k] || x[k] === filters[k]))
      .map(x => ({key:x.code,cells:[x.code,x.name,x.status,x.type,x.category,x.terms,x.buyer,x.city,x.phone,x.rfc]})),
  };
  if (id === 'job-manager') return {
    headers:['Job','No Parte','Descripción','Lote','Cantidad','Pendiente','Inv. disponible','Unidad','Centro','Paso de ruta','Tipo','Prioridad','Estado','Inicio','Vence'],
    rows:data.jobs.filter(x => containsOperations29(x.code,filters.code) && containsOperations29(x.part,filters.part) &&
      ['center','type','priority','status'].every(k => !filters[k] || x[k] === filters[k]) &&
      (!filters.active || demandStatus29.has(x.status)) &&
      (!filters.overdue || (demandStatus29.has(x.status) && x.due < dateLot29().id)) &&
      matchesOperationsDates29(x.due,filters.from,filters.to))
      .sort((a,b) => a.due.localeCompare(b.due) || a.code.localeCompare(b.code))
      .map(x => ({key:x.code,cells:[x.code,x.part,getPart(x.part)?.desc,x.lot,number34(x.qty),number34(remainingJob30(x)),number34(jobInventory29(x)),getPart(x.part)?.unit||'',
        x.center,x.routeId ? bomRouteLabel29(x.routeId) : '—',x.type,x.priority,x.status,x.start,x.due]})),
  };
  return capacityTable29(filters, data);
}
function capacityPeriod29(date, group) {
  if (group === 'Mes') return date.slice(0, 7);
  if (group === 'Semana') {
    const weekday = new Date(date + 'T00:00:00Z').getUTCDay();
    return shiftPlanningDate29(date,-((weekday + 6) % 7));
  }
  return date;
}
function capacityTable29(filters, data) {
  const days = Number(filters.window);
  const end = shiftPlanningDate29(filters.start, days - 1);
  const jobs = data.jobs.filter(x => demandStatus29.has(x.status) && x.rate > 0 && remainingJob30(x) > 1e-8 &&
    (!filters.center || filters.center === x.center) && containsOperations29(x.part, filters.part) &&
    x.start <= end && (filters.carry || x.start >= filters.start));
  const centerCodes = filters.center ? [filters.center] : [...new Set([
    ...jobs.map(x => x.center), ...Object.keys(data.calendars),
  ])];
  const periods = new Map();
  for (let i = 0; i < days; i++) {
    const date = shiftPlanningDate29(filters.start,i);
    const key = capacityPeriod29(date,filters.group);
    if (!periods.has(key)) periods.set(key,[]);
    periods.get(key).push(date);
  }
  const centers = planningCenters29();
  const rows = [];
  for (const center of centerCodes.sort()) {
    const info = centers.find(x => x.code === center);
    const calendar = data.calendars[center] || {hours:8, workdays:5, crew:1};
    for (const [period, dates] of periods) {
      const demand = jobs.filter(x => x.center === center && dates.includes(x.start < filters.start ? filters.start : x.start));
      const available = dates.filter(date => (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7 < calendar.workdays)
        .length * calendar.hours;
      const hours = job => remainingJob30(job) / job.rate + (filters.includeSetup && remainingJob30(job) === job.qty ? job.setup : 0);
      const required = demand.reduce((total, job) => total + hours(job),0);
      const utilization = available ? number34(required / available * 100) + '%' : (required ? 'Sin capacidad' : '—');
      const details = demand.map(job => job.code + (job.start < filters.start ? ' · arrastre' : '') + ' (' + number34(hours(job)) + ' h)').join(', ');
      rows.push({overload:required > available,cells:[
        info ? center + ' · ' + info.label : center,period,number34(required),number34(available),utilization,
        number34(Math.max(0,required - available)),calendar.crew,number34(required * calendar.crew),...(filters.detail ? [details] : []),
      ]});
    }
  }
  const periodLabel = {Día:'Fecha',Semana:'Semana del',Mes:'Mes'}[filters.group];
  return {headers:['Centro de trabajo',periodLabel,'Horas requeridas','Horas disponibles','Utilización','Déficit (h)','Cuadrilla','Horas de cuadrilla',
    ...(filters.detail ? ['Detalle de jobs'] : [])],rows};
}

function searchOperations29(event) {
  event.preventDefault();
  const filters = readOperationsForm29(event.currentTarget);
  if (filters.from && filters.to && filters.from > filters.to) {
    showMsg('La fecha inicial debe ser anterior o igual a la final.',true);
    return;
  }
  operationsFilters29.set(shellScreen, filters);
  renderOperationsResults29(shellScreen);
}
function clearOperations29() {
  operationsFilters29.delete(shellScreen);
  renderOperationsDesk29(document.getElementById('view-' + currentView),shellScreen);
}
function currentOperationsFilters29(id) {
  return operationsFilters29.get(id) || defaultOperationsFilters29(id);
}
function renderOperationsResults29(id) {
  const {headers,rows} = operationsTable29(id,currentOperationsFilters29(id));
  const grid = document.getElementById('ops29-results');
  grid.innerHTML = '<div class="ops-count" role="status">' + rows.length + (rows.length === 1 ? ' resultado' : ' resultados') + '</div>' +
    table(headers,rows.map(row => '<tr' + (row.overload ? ' class="ops-overload"' : '') + '>' +
      row.cells.map((cell,i) => '<td>' + (i === 0 && row.key
        ? '<button class="btn link" type="button" data-code="' + esc(row.key) + '" onclick="openOperationsRecord29(this.dataset.code)">' +
          esc(String(cell ?? '')) + '</button>'
        : esc(String(cell ?? ''))) + '</td>').join('') + '</tr>'),id === 'job-manager' ? '1060px' : '760px');
  grid.querySelector('.table-wrap')?.setAttribute('tabindex','0');
}
function exportOperations29() {
  if (!requireLevel(1)) return;
  const {headers,rows} = operationsTable29(shellScreen,currentOperationsFilters29(shellScreen));
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  exportRows(shellScreen + '.csv',headers,rows.map(row => row.cells));
}
function renderOperationsDesk29(el, id) {
  operationsData29();
  const titles = {oc:'Órdenes de compra',proveedores:'Proveedores','job-manager':'Job Manager','capacity-planning':'Capacity Planning'};
  const filters = currentOperationsFilters29(id);
  const isCapacity = id === 'capacity-planning';
  const action = isCapacity ? 'openCapacityCalendar29()' : 'openOperationsRecord29()';
  const edit = levelFor(id) >= 2 ? '<button type="button" class="btn primary" onclick="' + action + '">' + (isCapacity ? 'Configurar capacidad' : 'Agregar') + '</button>' : '';
  el.innerHTML = cardNavigation29(titles[id],
    '<form class="ops-filters" onsubmit="searchOperations29(event)" aria-label="Filtros"><div class="ops-fields">' +
      operationsFilterFields29(id).map(field => operationsField29(field,filters[field.key],true)).join('') +
      '</div><div class="ops-filter-actions"><button type="button" class="btn soft" onclick="clearOperations29()">Limpiar</button>' +
      '<button class="btn primary" type="submit">Buscar</button></div></form>' +
      '<div class="actionbar ops-actions" aria-label="Acciones">' + edit +
      '<button type="button" class="btn soft" onclick="exportOperations29()">Exportar</button>' +
      (id === 'oc' ? screenAction29('Recibo OC','receive') : '') +
      (id === 'job-manager' ? screenAction29('Capacity Planning','capacity-planning') + screenAction29('MRP','mrp') + screenAction29('PRP','prp') : '') +
      (isCapacity ? screenAction29('Job Manager','job-manager') + screenAction29('PRP','prp') : '') + '</div>' +
      (isCapacity ? '<div class="ops-method">Demanda de jobs activos. La carga se asigna a la fecha de inicio de cada job. Capacidad inicial: 8 h/día, lunes a viernes.</div>' : '') +
      '<div id="ops29-results"></div>');
  renderOperationsResults29(id);
}

function operationsRecordFields29(id, existing = {}) {
  const code = field29('code',id === 'oc' ? 'Folio OC' : id === 'proveedores' ? 'Código de proveedor' : 'No. de job',
    'text',{required:true,readonly:Boolean(existing.code)});
  if (id === 'proveedores') return [
    code,field29('name','Nombre','text',{required:true}),choice29('status','Estado',options29(supplierStatus29),true),
    choice29('type','Tipo',options29(['Materiales','Servicio']),true),field29('category','Categoría'),
    field29('terms','Términos de pago'),field29('buyer','Comprador'),field29('city','Ciudad'),
    field29('phone','Teléfono','tel'),field29('rfc','RFC'),field29('notes','Notas'),
  ];
  if (id === 'oc') return [
    code,choice29('supplier','Proveedor',supplierChoices29(existing.supplier),true),
    choice29('status','Estado',options29(orderStatus29),true),choice29('type','Tipo',options29(['Estándar','Abierta / Blanket']),true),
    choice29('currency','Moneda',options29(['MXN','USD','EUR']),true),field29('issued','Emitió'),
    field29('orderDate','Fecha OC','date',{required:true}),field29('due','Fecha de entrega','date',{required:true}),
    field29('notes','Notas'),
  ];
  return [
    code,choice29('part','No Parte',partChoices29(),true),choice29('routeId','Paso de ruta (opcional)',jobRoutingOptions29(existing.part,existing.routeId)),
    ...(levelFor('pedidos') ? [choice29('salesCode','Pedido (opcional)',[])] : []),
    choice29('center','Centro de trabajo',centerChoices29(),true),
    field29('qty','Cantidad','number',{min:0.000001,required:true}),
    field29('rate','Tasa (unidades por hora)','number',{min:0.000001,required:true}),
    field29('setup','Preparación (h)','number',{min:0,required:true}),
    choice29('status','Estado',options29(jobStatus29),true),choice29('type','Tipo de job',options29(jobType29),true),
    choice29('priority','Prioridad',options29(jobPriority29),true),
    field29('start','Inicio programado','date',{required:true}),field29('due','Fecha compromiso','date',{required:true}),
    field29('lot','Lote'),field29('notes','Notas'),
  ];
}
function operationsRecords29(id) {
  const key = {oc:'orders',proveedores:'suppliers','job-manager':'jobs'}[id];
  return operationsData29()[key];
}
function nextOperationsCode29(id, records) {
  const prefix = {oc:'OC',proveedores:'PV','job-manager':'JOB'}[id];
  const number = records.reduce((max, row) => {
    const match = row.code.match(new RegExp('^' + prefix + '-([0-9]+)$','i'));
    return match ? Math.max(max,Number(match[1])) : max;
  },0) + 1;
  return prefix + '-' + String(number).padStart(3,'0');
}
function operationsOrderLine29(line = {}, editable = true) {
  const fields = [choice29('part','No Parte',partChoices29(),true),
    field29('qty','Cantidad','number',{min:0.01,step:0.01,required:true}),
    field29('price','Precio unitario','number',{min:0,required:true})];
  return '<fieldset class="ops-line" data-line-id="' + esc(line.id || '') + '"' + (editable ? '' : ' disabled') + '>' +
    fields.map(field => operationsField29(field,line[field.key])).join('') +
    (editable ? '<button type="button" class="btn soft ops-remove-line" aria-label="Quitar partida" onclick="removeOperationsLine29(this)">Quitar</button>' : '') +
    '</fieldset>';
}
function addOperationsLine29() {
  document.getElementById('ops29-lines').insertAdjacentHTML('beforeend',operationsOrderLine29());
  document.querySelector('#ops29-lines .ops-line:last-child select').focus();
}
function removeOperationsLine29(button) {
  if (document.querySelectorAll('#ops29-lines .ops-line').length > 1) button.closest('fieldset').remove();
  else showMsg('La orden debe tener al menos una partida.',true);
}
function openOperationsRecord29(code) {
  const id = shellScreen;
  if (!requireLevel(code ? 1 : 2,id)) return;
  const records = operationsRecords29(id);
  const existing = code ? records.find(x => x.code === code) : null;
  if (code && !existing) return;
  const today = dateLot29().id;
  const editable = levelFor(id) >= 2;
  const defaults = id === 'oc' ? {status:'Borrador',type:'Estándar',currency:'MXN',issued:shellSession?.user,orderDate:today,due:today} :
    id === 'proveedores' ? {status:'Activo',type:'Materiales'} :
      {status:'Nuevo',type:'Inventario',priority:'Normal',start:today,due:today,setup:0};
  const values = existing || {...defaults,code:nextOperationsCode29(id,records)};
  const title = {oc:'Orden de compra',proveedores:'Proveedor','job-manager':'Job'}[id];
  const lines = id === 'oc' ? '<h3>Partidas</h3><div id="ops29-lines">' +
    (existing?.lines || [{}]).map(line => operationsOrderLine29(line,editable)).join('') + '</div>' +
    (editable ? '<button type="button" class="btn soft" onclick="addOperationsLine29()">Agregar partida</button>' : '') +
    (existing ? '<div class="ops-method">Importe: ' + esc(operationsMoney29(orderTotal29(existing),existing.currency)) + '</div>' +
      purchaseReceiptDetail29(existing) : '') : '';
  configDialog(title + (code ? ' · ' + code : ' · Alta'),
    '<form class="ops-dialog" data-code="' + esc(code || '') + '" onsubmit="saveOperationsRecord29(event)">' +
    '<fieldset class="ops-fields"' + (editable ? '' : ' disabled') + '>' +
    operationsRecordFields29(id,existing || {}).map(field => operationsField29(field,values[field.key])).join('') +
    '</fieldset>' + lines +
    (editable ? '<div class="capture-actions"><button class="btn primary" type="submit">Guardar</button></div>' : '') + '</form>');
  if (id === 'job-manager') {
    const form = document.querySelector('#configDialog .ops-dialog');
    refreshJobRouting29(form,existing?.routeId);
    refreshJobSales30(form,existing?.salesCode);
    form.elements.part.addEventListener('change',() => {
      refreshJobRouting29(form);
      refreshJobSales30(form);
    });
    form.elements.routeId.addEventListener('change',() => {
      refreshJobRouting29(form,form.elements.routeId.value);
      const route = engineeringData29().routes.find(row => row.id === form.elements.routeId.value);
      if (route?.standardRate && !form.elements.rate.value) form.elements.rate.value = route.standardRate;
      if (route?.standardSetup != null && (!existing && !Number(form.elements.setup.value)))
        form.elements.setup.value = route.standardSetup;
    });
  }
}
function saveOperationsRecord29(event) {
  event.preventDefault();
  const id = shellScreen;
  if (!requireLevel(2,id)) return;
  const form = event.currentTarget;
  const values = readOperationsForm29(form.querySelector('.ops-fields'));
  const records = operationsRecords29(id);
  const oldCode = form.dataset.code;
  if (!values.code || records.some(x => x.code !== oldCode && x.code.toUpperCase() === values.code.toUpperCase()))
    return showMsg('Captura un folio o código único.',true);
  if (id === 'proveedores' && !values.name) return showMsg('Captura el nombre del proveedor.',true);
  const start = values.orderDate || values.start;
  if (start && values.due < start) return showMsg('La fecha compromiso debe ser posterior o igual a la inicial.',true);
  if (id === 'oc') {
    values.lines = [...form.querySelectorAll('.ops-line')].map(line => {
      const fields = readOperationsForm29(line);
      const previous = records.find(order => order.code === oldCode)?.lines.find(item => item.id === line.dataset.lineId);
      return {id:previous?.id || crypto.randomUUID(),part:fields.part,qty:Number(fields.qty),price:Number(fields.price),
        unit:previous?.part === fields.part ? previous.unit : getPart(fields.part)?.unit || ''};
    });
    if (!values.lines.length || values.lines.some(line => !getPart(line.part) || !line.unit ||
      !Number.isFinite(line.qty) || !(line.qty > 0) || !Number.isFinite(line.price) || !(line.price >= 0)))
      return showMsg('Revisa las cantidades y precios de las partidas.',true);
    const conflict = checkPurchasedLines29(records.find(order => order.code === oldCode),values);
    if (conflict) return showMsg(conflict,true);
  }
  if (id === 'job-manager') {
    for (const field of ['qty','rate','setup']) values[field] = Number(values[field]);
    if (![values.qty,values.rate,values.setup].every(Number.isFinite) || !(values.qty > 0) || !(values.rate > 0) || !(values.setup >= 0))
      return showMsg('Revisa cantidad, tasa y tiempo de preparación.',true);
    const previous = records.find(row => row.code === oldCode);
    if (previous) {
      const produced = previous.qty - remainingJob30(previous);
      if (produced > 0 && (values.qty + 1e-8 < produced || values.part !== previous.part ||
          values.center !== previous.center || (values.routeId || '') !== (previous.routeId || '')))
        return showMsg('El job ya tiene producción. Conserva parte, centro, ruta y al menos la cantidad registrada.',true);
    }
    values.salesCode ??= previous?.salesCode || '';
    const salesError = validateJobSales30(values,previous);
    if (salesError) return showMsg(salesError,true);
    if (values.routeId) {
      const route = engineeringData29().routes.find(row => row.id === values.routeId);
      if (!route || route.part !== values.part || !route.centers.includes(values.center) ||
        (!route.active && route.id !== previous?.routeId)) return showMsg('Elige un paso y un centro válidos para esta parte.',true);
    }
  }
  const index = records.findIndex(x => x.code === oldCode);
  if (index === -1) records.push(values); else records[index] = values;
  saveState();
  closeConfigDialog();
  showMsg('Registro guardado.');
}
function openCapacityCalendar29() {
  if (!requireLevel(2,'capacity-planning')) return;
  const current = currentOperationsFilters29('capacity-planning').center;
  const center = current || planningCenters29()[0]?.code;
  configDialog('Capacidad por centro de trabajo',
    '<form class="ops-dialog" onsubmit="saveCapacityCalendar29(event)"><div class="ops-fields">' +
    operationsField29(choice29('center','Centro de trabajo',centerChoices29(),true),center) +
    '<div id="ops29-calendar-fields"></div></div><div class="capture-actions">' +
    '<button class="btn primary" type="submit">Guardar</button></div></form>');
  const select = document.querySelector('#configDialog select[name="center"]');
  select.addEventListener('change',() => renderCapacityCalendar29(select.value));
  renderCapacityCalendar29(center);
}
function renderCapacityCalendar29(center) {
  const values = operationsData29().calendars[center] || {hours:8,workdays:5,crew:1};
  const fields = [field29('hours','Horas disponibles por día','number',{min:0,max:24,required:true}),
    choice29('workdays','Días de operación',[['5','Lunes a viernes'],['6','Lunes a sábado'],['7','Todos los días']],true),
    field29('crew','Personas en la cuadrilla','number',{min:1,step:1,required:true})];
  document.getElementById('ops29-calendar-fields').innerHTML = fields.map(field => operationsField29(field,values[field.key])).join('');
}
function saveCapacityCalendar29(event) {
  event.preventDefault();
  if (!requireLevel(2,'capacity-planning')) return;
  const {center,hours,workdays,crew} = readOperationsForm29(event.currentTarget);
  operationsData29().calendars[center] = {hours:Number(hours),workdays:Number(workdays),crew:Number(crew)};
  saveState();
  closeConfigDialog();
  showMsg('Capacidad guardada.');
}

const renderBeforeOperations29 = renderConceptScreen;
renderConceptScreen = function () {
  if (conceptScreen === 'operations-list') {
    renderOperationsDesk29(document.getElementById('view-' + currentView),shellScreen);
  } else {
    renderBeforeOperations29();
  }
};

