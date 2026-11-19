
const STORAGE_KEY = 'InsectMES_Rev031_state';
const SESSION_KEY = 'InsectMES_Rev031_session';
let currentView = 'dashboard';

const uiState = {
  catalogsExpanded: false,
  receiptsMode: 'list',
  inventoryAction: '',
  activeArea: '',
  activeProcess: '',
  catalogSection: 'items',
  setupTable: '',
  itemMode: 'list',
  itemEditIndex: null,
  itemSelectedIndex: null,
  unitMode: 'list',
  unitEditIndex: null,
  unitSelectedIndex: null,
  setupMode: 'list',
  setupEditIndex: null,
  setupSelectedIndex: null,
  inventorySubsection: 'serials',
  inventoryMenuExpanded: false,
  bomMode: 'list',
  bomEditIndex: null,
  bomSelectedIndex: null,
  locationMode: 'list',
  locationEditIndex: null,
  locationSelectedIndex: null,
  inventorySelectedIndex: null
};

const TITLES = {
  dashboard: '',
  receipts: 'Recibo',
  inventory: 'Inventario',
  movements: 'Movimientos',
  workcenters: 'Producción',
  genealogy: 'Genealogía',
  catalogs: 'Catálogos'
};

const productionAreas = {
  'Pre-Tratamiento': ['Recibo', 'Inspección', 'Triturado', 'Mezcla'],
  'Reproducción': ['Cosecha', 'Guardería', 'Incubadoras', 'Puparios', 'Jaula Oscura', 'Jaula de Reproducción'],
  'Bioconversión': ['Transferencia', 'Crianza', 'Tamizado'],
  'Post-Proceso': ['Sanitizado', 'Deshidratado', 'Fraccionado', 'Molienda', 'Empaque']
};

function defaultState(){
  return {
    parts: [],
    units: [],
    setupTables: {
      Container_Status: [],
      Container_Type: [],
      Move_Type: [],
      Item_Type: [],
      Serial_Prefix: [],
      Locations: [],
      Users: [],
      Bom: []
    },
    receipts: [],
    serials: [],
    movements: [],
    workcenterTx: [],
    genealogy: [],
    counters: {receipt:1, move:1, wc:1}
  };
}
let state = defaultState();
let savedContainerCatalog31 = false;

function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('InsectMES_Rev029_state') || localStorage.getItem('InsectMES_Rev028_state') || localStorage.getItem('MES_Rev015_state');
  if(raw){
    try {
      state = JSON.parse(raw);
      savedContainerCatalog31 = Array.isArray(state.setupTables?.Container_Status);
      if(savedContainerCatalog31 && !localStorage.getItem('InsectMES_Rev031_before_status_fix_20261111'))
        localStorage.setItem('InsectMES_Rev031_before_status_fix_20261111',raw);
      return;
    } catch(e){}
  }
  state = defaultState();
}
function saveState(){
  for(const row of state.serials||[]){row.status=containerStatusCode30(row.status,state);if(row.receiptPending30&&!requiresFinalization30(state,row))delete row.receiptPending30;}
  for(const receipt of state.receipts||[]){if(!receipt.orderCode)continue;const serials=state.serials.filter(row=>row.origin===receipt.id||receipt.serials?.includes(row.serial));if(serials.length)receipt.status=serials.some(row=>requiresFinalization30(state,row))?'Por finalizar':'Finalizado';}
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
function statusRule30(s,container){return s.setupTables.Container_Status.find(row=>row.code===containerStatusCode30(container?.status,s));}
function requiresFinalization30(s,container){return statusRule30(s,container)?.receivingStatus===true;}
function planningStockAvailable30(s,container){const rule=statusRule30(s,container);return Boolean(container?.active&&container.qtyCurrent>0&&rule?.active&&rule.activeStatus!==false&&!rule.isConsumed&&rule.includeInMRP===true);}

function nowDate(){ return new Date().toISOString().slice(0,10); }
function fmtDateDisplay(iso){
  if(!iso) return '';
  const p = String(iso).split('-');
  if(p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}
function nowDateTimeLocal(){
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function receiptId(){ return `R-${String(state.counters.receipt++).padStart(4,'0')}`; }
function moveId(){ return `MOV-${String(state.counters.move++).padStart(5,'0')}`; }
function wcId(){ return `WCTX-${String(state.counters.wc++).padStart(4,'0')}`; }
function round(v){ return Math.round((Number(v)+Number.EPSILON)*100)/100; }
function getPart(part){ return state.parts.find(x => x.part === part); }
function activeSerials(){ return state.serials.filter(x => x.active); }
function esc(s){ return String(s ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function selectOptions(options, blank=true){
  let html = blank ? '<option value=""></option>' : '';
  html += options.map(o => {
    const value = typeof o === 'string' ? o : o.value;
    const label = typeof o === 'string' ? o : o.label;
    return `<option value="${esc(value)}">${esc(label)}</option>`;
  }).join('');
  return html;
}
function dataRow(cells, onclick, selected=false){
  return `<tr class="data-row ${selected ? 'selected' : ''}" onclick="${onclick}">${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
}
function table(headers, rowHtml, minWidth='860px', footerHtml=''){
  if(!rowHtml.length) return '<div class="empty">Sin registros</div>';
  return `<div class="table-wrap"><table style="min-width:${minWidth}"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rowHtml.join('')}</tbody>${footerHtml}</table></div>`;
}
function badge(status){
  const row=getSetupRow('Container_Status',status);
  const color=setupHexColor30(row?.color) || '#E4E8E5';
  const rgb=color.slice(1).match(/../g).map(hex=>parseInt(hex,16)/255)
    .map(channel=>channel<=0.04045 ? channel/12.92 : ((channel+0.055)/1.055)**2.4);
  const luminance=rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  const ink=luminance>=0.179 ? '#000000' : '#FFFFFF';
  return `<span class="badge container-status30" title="${esc(status || '')}"
    style="background-color:${color};color:${ink}">${esc(row?.code || status || '—')}</span>`;
}
function containerStatusCode30(code,s=state){
  const seen=new Set();
  while(s.containerStatusAliases30?.[code]&&!seen.has(code)){seen.add(code);code=s.containerStatusAliases30[code];}
  return code;
}
function getSetupRow(tableName, code){
  if(tableName==='Container_Status')code=containerStatusCode30(code);
  return (state.setupTables[tableName] || []).find(x => x.code === code);
}
function getNextSerial(prefix){
  const row = getSetupRow('Serial_Prefix', prefix);
  if(!row) return `${prefix}-000001`;
  row.lastNumber = Number(row.lastNumber || 0) + 1;
  return `${row.code}${String(row.lastNumber).padStart(6,'0')}`;
}

function getNextItemCode(itemType){
  const used = state.parts
    .map(x => String(x.part || ''))
    .filter(x => itemType === 'Materia Prima' ? x.startsWith('MP-') : x.startsWith('F-'))
    .map(x => parseInt(x.split('-')[1], 10))
    .filter(x => !isNaN(x));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${itemType === 'Materia Prima' ? 'MP' : 'F'}-${String(next).padStart(3,'0')}`;
}

function showMsg(text, error=false){
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg show' + (error ? ' error' : '');
  clearTimeout(showMsg._timer);
  showMsg._timer = setTimeout(() => el.className = 'msg', 2600);
}
function addMovement(type, serial, part, qty, unit, ref){
  state.movements.unshift({
    id: moveId(),
    ts: new Date().toISOString().slice(0,19).replace('T',' '),
    type, serial, part, qty: round(qty), unit, ref
  });
}

function areaIcon(area){
  const icons = {
    'Pre-Tratamiento': `<svg viewBox="0 0 32 32" fill="none"><path d="M12 5v7l-5 10a3 3 0 0 0 2.7 4.4h12.6A3 3 0 0 0 25 22L20 12V5" class="icon-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 19h10" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Reproducción': `<svg viewBox="0 0 32 32" fill="none"><rect x="6" y="9" width="20" height="14" rx="2.5" class="icon-stroke" stroke-width="2"/><path d="M11 9V5M21 9V5M6 14h20" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Bioconversión': `<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="8" width="16" height="16" rx="8" class="icon-stroke" stroke-width="2"/><path d="M16 8v16M11 11l10 10M21 11l-10 10" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Post-Proceso': `<svg viewBox="0 0 32 32" fill="none"><path d="M7 11 16 6l9 5v11l-9 5-9-5V11Z" class="icon-stroke" stroke-width="2" stroke-linejoin="round"/><path d="M7 11l9 5 9-5M16 16v11" class="icon-stroke" stroke-width="2" stroke-linejoin="round"/></svg>`
  };
  return `<div class="icon-box">${icons[area] || ''}</div>`;
}

function processIcon(name){
  const icons = {
    'Recibo': `<svg viewBox="0 0 32 32" fill="none"><path d="M16 6v18" class="icon-stroke" stroke-width="2" stroke-linecap="round"/><path d="m10 18 6 6 6-6" class="icon-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 8h18" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Inspección': `<svg viewBox="0 0 32 32" fill="none"><circle cx="14" cy="14" r="6" class="icon-stroke" stroke-width="2"/><path d="m19 19 6 6" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Triturado': `<svg viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="7" class="icon-stroke" stroke-width="2"/><circle cx="16" cy="16" r="2" class="icon-stroke" stroke-width="2"/><path d="M16 7l4 5M25 16l-6 2M13 24l-2-6M7 13l6-1" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Mezcla': `<svg viewBox="0 0 32 32" fill="none"><rect x="7" y="12" width="18" height="10" rx="4" class="icon-stroke" stroke-width="2"/><path d="M10 10l8 8M18 8l6 6" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Cosecha': `<svg viewBox="0 0 32 32" fill="none"><ellipse cx="11" cy="12" rx="3" ry="4" class="icon-stroke" stroke-width="2"/><ellipse cx="18" cy="12" rx="3" ry="4" class="icon-stroke" stroke-width="2"/><ellipse cx="14.5" cy="18" rx="3" ry="4" class="icon-stroke" stroke-width="2"/><ellipse cx="21.5" cy="18" rx="3" ry="4" class="icon-stroke" stroke-width="2"/></svg>`,
    'Guardería': `<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="6" width="16" height="20" rx="2" class="icon-stroke" stroke-width="2"/><path d="M10 10h12M10 13.5h12M10 17h12M10 20.5h12M10 24h12" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Incubadoras': `<svg viewBox="0 0 32 32" fill="none"><rect x="6" y="14" width="8" height="6" rx="2" class="icon-stroke" stroke-width="2"/><rect x="12" y="9" width="8" height="6" rx="2" class="icon-stroke" stroke-width="2"/><rect x="18" y="14" width="8" height="6" rx="2" class="icon-stroke" stroke-width="2"/></svg>`,
    'Puparios': `<svg viewBox="0 0 32 32" fill="none"><rect x="11" y="6" width="10" height="20" rx="5" class="icon-stroke" stroke-width="2"/><path d="M13 10h6M13 14h6M13 18h6M13 22h6" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Jaula Oscura': `<svg viewBox="0 0 32 32" fill="none"><rect x="6" y="10" width="18" height="12" rx="2" class="icon-stroke" stroke-width="2"/><path d="M10 10v12M24 12l4 4-4 4" class="icon-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="8" y="14" width="2" height="4" class="icon-stroke" stroke-width="2"/></svg>`,
    'Jaula de Reproducción': `<svg viewBox="0 0 32 32" fill="none"><rect x="5" y="9" width="18" height="14" rx="2" class="icon-stroke" stroke-width="2"/><circle cx="14" cy="15" r="2.5" class="icon-stroke" stroke-width="2"/><path d="M14 10v2.5M12.8 10l-2-2M15.2 10l2-2M11.5 16l-4-2M11.5 18l-4 2M16.5 16l4-2M16.5 18l4 2M14 17.5l-5 4M14 17.5l5 4" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Transferencia': `<svg viewBox="0 0 32 32" fill="none"><path d="M7 12h18l-3 8H10l-3-8Z" class="icon-stroke" stroke-width="2" stroke-linejoin="round"/><path d="M10 15h12" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Crianza': `<svg viewBox="0 0 32 32" fill="none"><rect x="9" y="6" width="14" height="4" rx="2" class="icon-stroke" stroke-width="2"/><rect x="7" y="12" width="18" height="4" rx="2" class="icon-stroke" stroke-width="2"/><rect x="9" y="18" width="14" height="4" rx="2" class="icon-stroke" stroke-width="2"/></svg>`,
    'Tamizado': `<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="7" width="16" height="4" rx="1.5" class="icon-stroke" stroke-width="2"/><rect x="8" y="13" width="16" height="4" rx="1.5" class="icon-stroke" stroke-width="2"/><rect x="8" y="19" width="16" height="4" rx="1.5" class="icon-stroke" stroke-width="2"/><path d="M11 23v4M16 23v4M21 23v4" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Sanitizado': `<svg viewBox="0 0 32 32" fill="none"><path d="M7 20c0-6 4-10 10-10" class="icon-stroke" stroke-width="2" stroke-linecap="round"/><path d="M17 10h5v5" class="icon-stroke" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 20c0 0 2 2 2 4M26 18c0 0 2 2 2 4M24 22c0 0 2 2 2 4" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Deshidratado': `<svg viewBox="0 0 32 32" fill="none"><rect x="8" y="10" width="16" height="12" rx="2" class="icon-stroke" stroke-width="2"/><path d="M11 14h10M11 18h10M16 6c0 2-1 2-1 4" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Fraccionado': `<svg viewBox="0 0 32 32" fill="none"><rect x="9" y="8" width="14" height="14" rx="2" class="icon-stroke" stroke-width="2"/><path d="M16 8V4M12 13h8M12 18h8" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Molienda': `<svg viewBox="0 0 32 32" fill="none"><rect x="12" y="6" width="8" height="4" rx="1" class="icon-stroke" stroke-width="2"/><path d="M16 10v4" class="icon-stroke" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="18" r="6" class="icon-stroke" stroke-width="2"/><path d="M16 12v12M10 18h12" class="icon-stroke" stroke-width="2" stroke-linecap="round"/></svg>`,
    'Empaque': `<svg viewBox="0 0 32 32" fill="none"><path d="M8 11 16 7l8 4v10l-8 4-8-4V11Z" class="icon-stroke" stroke-width="2" stroke-linejoin="round"/><path d="M8 11l8 4 8-4" class="icon-stroke" stroke-width="2" stroke-linejoin="round"/></svg>`
  };
  return `<div class="icon-box">${icons[name] || ''}</div>`;
}

function seedDemo(){
  state = defaultState();
  state.parts = [
    {part:'MP-001', desc:'Pan', unit:'Kg', itemType:'Materia Prima', serialPrefix:'PA'},
    {part:'MP-002', desc:'Suero', unit:'L', itemType:'Materia Prima', serialPrefix:'SU'},
    {part:'MP-003', desc:'Salvado', unit:'Kg', itemType:'Materia Prima', serialPrefix:'SA'},
    {part:'MP-004', desc:'Agua', unit:'L', itemType:'Materia Prima', serialPrefix:'AP'},
    {part:'F-001', desc:'Alimento preparado', unit:'Kg', itemType:'WIP', serialPrefix:'FO'},
    {part:'F-002', desc:'Alimento preparado premium', unit:'Kg', itemType:'WIP', serialPrefix:'FP'}
  ];
  state.units = [
    {code:'Kg', description:'Kilogramo'},
    {code:'g', description:'gramos'},
    {code:'L', description:'Litro'},
    {code:'ml', description:'mililitros'}
  ];
  state.setupTables = {
    Container_Status: [
      {code:'OK', description:''},
      {code:'HOLD', description:''},
      {code:'CONSUMED', description:''}
    ],
    Container_Type: [
      {code:'PA', description:''},
      {code:'SU', description:''},
      {code:'AP', description:''},
      {code:'SA', description:''},
      {code:'FO', description:''},
      {code:'FP', description:''}
    ],
    Move_Type: [
      {code:'RECEIVE',description:'Recepción'},
      {code:'MOVE',description:'Movimiento'},
      {code:'CAPTURE',description:'Captura simple'},
      {code:'WC-CAPTURE',description:'Captura en producción'}
    ],
    Item_Type: [
      {code:'Materia Prima',description:''},
      {code:'WIP',description:''}
    ],
    Serial_Prefix: [
      {active:true, code:'PA', description:'', lastNumber:0},
      {active:true, code:'SU', description:'', lastNumber:0},
      {active:true, code:'AP', description:'', lastNumber:0},
      {active:true, code:'SA', description:'', lastNumber:0},
      {active:true, code:'FO', description:'', lastNumber:0},
      {active:true, code:'FP', description:'', lastNumber:0}
    ],
    Locations: [
      {active:true, code:'ALM-RM-01', description:'Almacén materia prima 01'},
      {active:true, code:'ALM-WIP-01', description:'Almacén WIP 01'},
      {active:true, code:'MEZ-01', description:'Área mezcla'}
    ],
    Users: [
      {active:true, code:'USR-001', description:'Alejandro'},
      {active:true, code:'USR-002', description:'Operador 1'}
    ],
    Bom: [
      {active:true, parentPart:'F-001', componentPart:'MP-001', qtyPerUnit:0.50, unit:'Kg'},
      {active:true, parentPart:'F-001', componentPart:'MP-002', qtyPerUnit:0.20, unit:'L'},
      {active:true, parentPart:'F-001', componentPart:'MP-003', qtyPerUnit:0.30, unit:'Kg'},
      {active:true, parentPart:'F-001', componentPart:'MP-004', qtyPerUnit:1.00, unit:'L'},
      {active:true, parentPart:'F-002', componentPart:'MP-001', qtyPerUnit:0.40, unit:'Kg'},
      {active:true, parentPart:'F-002', componentPart:'MP-002', qtyPerUnit:0.10, unit:'L'},
      {active:true, parentPart:'F-002', componentPart:'MP-003', qtyPerUnit:0.50, unit:'Kg'},
      {active:true, parentPart:'F-002', componentPart:'MP-004', qtyPerUnit:1.20, unit:'L'}
    ]
  };
  const seeds = [
    {part:'MP-001', qtyEach:40, containers:3, location:'ALM-RM-01', lot:'PAN-01'},
    {part:'MP-003', qtyEach:40, containers:2, location:'ALM-RM-01', lot:'SAL-01'}
  ];
  for(const s of seeds){
    const rid = receiptId();
    const p = getPart(s.part);
    state.receipts.unshift({
      id:rid, date:nowDate(), part:s.part, desc:p.desc, unit:p.unit, containers:s.containers,
      qtyPerContainer:s.qtyEach, qty:round(s.qtyEach*s.containers), location:s.location, lot:s.lot, status:'Procesado'
    });
    for(let i=1;i<=s.containers;i++){
      const serial = getNextSerial(p.serialPrefix);
      state.serials.push({
        active:true,
        serial,
        part:s.part,
        desc:p.desc,
        qtyCurrent:round(s.qtyEach),
        unit:p.unit,
        containerType:p.serialPrefix,
        status:'OK',
        origin:rid,
        location:s.location,
        notes:''
      });
      addMovement('RECEIVE', serial, s.part, s.qtyEach, p.unit, rid);
    }
  }
  // Agua con inventario muy grande
  const water = getPart('MP-004');
  const waterRid = receiptId();
  state.receipts.unshift({
    id:waterRid, date:nowDate(), part:'MP-004', desc:water.desc, unit:water.unit, containers:1,
    qtyPerContainer:1000000, qty:1000000, location:'ALM-RM-01', lot:'AGUA-01', status:'Procesado'
  });
  const waterSerial = getNextSerial(water.serialPrefix);
  state.serials.push({
    active:true,
    serial:waterSerial,
    part:'MP-004',
    desc:water.desc,
    qtyCurrent:1000000,
    unit:'L',
    containerType:water.serialPrefix,
    status:'OK',
    origin:waterRid,
    location:'ALM-RM-01',
    notes:'Contenedor de agua grande'
  });
  addMovement('RECEIVE', waterSerial, 'MP-004', 1000000, 'L', waterRid);
  saveState();
}




function getBomForParent(parentPart){
  return (state.setupTables.Bom || []).filter(x => x.active && x.parentPart === parentPart);
}
function consumeMaterialForBom(parentPart, productionQty, selectedSerials){
  const bom = getBomForParent(parentPart);
  if(!bom.length) return {ok:false, message:'No existe receta/BOM para el NP seleccionado'};
  if(bom.some(line=>line.qtyPerUnit==null||!Number.isFinite(Number(line.qtyPerUnit))||Number(line.qtyPerUnit)<=0))return {ok:false,message:'Completa las cantidades del BOM antes de calcular sus consumos.'};
  const serialObjs = [...new Set(selectedSerials)].map(serialByCode).filter(Boolean);
  const requirements = new Map();
  for(const line of bom){
    const unit = String(line.unit || '').toLowerCase();
    const key = JSON.stringify([line.componentPart,unit]);
    const entry = requirements.get(key) || {part:line.componentPart,unit,qtyPerUnit:0};
    entry.qtyPerUnit += Number(line.qtyPerUnit);
    requirements.set(key,entry);
  }
  const inventory = [];
  for(const line of requirements.values()){
    const required = round(line.qtyPerUnit * Number(productionQty));
    const candidates = serialObjs.filter(s => s.active && s.part === line.part &&
      String(s.unit || '').toLowerCase() === line.unit && Number(s.qtyCurrent) > 0);
    const available = round(candidates.reduce((a,b)=>a+Number(b.qtyCurrent||0),0));
    if(available < required){
      return {ok:false, message:`No hay suficiente material para ${line.part}. Requerido: ${required} ${line.unit}, disponible: ${available}`};
    }
    inventory.push({required,candidates});
  }
  for(const item of inventory){
    let {required} = item;
    const {candidates} = item;
    for(const s of candidates){
      if(required <= 0) break;
      const take = Math.min(required, Number(s.qtyCurrent));
      s.qtyCurrent = round(Number(s.qtyCurrent) - take);
      s.notes = ((s.notes || '') + ` | Consumo BOM ${parentPart}`).trim();
      addMovement('DEPLETION', s.serial, s.part, take, s.unit, parentPart);
      if(Number(s.qtyCurrent) <= 0){
        s.qtyCurrent = 0;
        deactivateSerial(s, 'CONSUMED');
      }
      required = round(required - take);
    }
  }
  return {ok:true};
}

function getUserOptions(){
  return (state.setupTables.Users || []).filter(x => x.active).map(x => ({value:x.code,label:`${x.code}${x.description ? ' | ' + x.description : ''}`}));
}
function getWipItemOptions(){
  return state.parts.filter(x => x.itemType === 'WIP').map(x => ({value:x.part,label:`${x.part} | ${x.desc}`}));
}

function getLocationOptions(){
  return (state.setupTables.Locations || []).filter(x => x.active).map(x => ({value:x.code,label:`${x.code}${x.description ? ' | ' + x.description : ''}`}));
}
function serialByCode(code){
  return state.serials.find(x => x.serial === code);
}
function deactivateSerial(serial, status='CONSUMED'){
  serial.active = false;
  serial.status = status;
}
function createChildSerial(part, qty, unit, prefix, location, notes=''){
  const p = getPart(part);
  const serial = getNextSerial(prefix);
  state.serials.push({
    active:true,
    serial,
    part,
    desc:p ? p.desc : part,
    qtyCurrent:round(qty),
    unit,
    containerType:prefix,
    status:'OK',
    origin:'DERIVED',
    location,
    notes
  });
  return serial;
}

function renderNav(){
  document.getElementById('nav').innerHTML = `
    <button class="nav-btn ${currentView==='catalogs' ? 'active' : ''}" onclick="toggleCatalogsMenu()">
      <span class="nav-ico">☷</span><span>Catálogos</span><span class="nav-chevron">${uiState.catalogsExpanded ? '▾' : '▸'}</span>
    </button>
    <div class="nav-sub ${uiState.catalogsExpanded ? 'open' : ''}">
      <button class="nav-btn ${currentView==='catalogs' && uiState.catalogSection==='items' ? 'active' : ''}" onclick="openCatalogSection('items')">No Parte</button>
      <button class="nav-btn ${currentView==='catalogs' && uiState.catalogSection==='units' ? 'active' : ''}" onclick="openCatalogSection('units')">Unidades</button>
      <button class="nav-btn ${currentView==='catalogs' && uiState.catalogSection==='setup' ? 'active' : ''}" onclick="openCatalogSection('setup')">Setup Tables</button>
      <button class="nav-btn ${currentView==='catalogs' && uiState.catalogSection==='bom' ? 'active' : ''}" onclick="openCatalogSection('bom')">Recetas / BOM</button>
    </div>
    <button class="nav-btn ${currentView==='receipts' ? 'active' : ''}" onclick="openView('receipts')"><span class="nav-ico">⬇</span><span>Recibo</span></button>
    <button class="nav-btn ${currentView==='inventory' ? 'active' : ''}" onclick="toggleInventoryMenu()"><span class="nav-ico">◫</span><span>Inventario</span><span class="nav-chevron">${uiState.inventoryMenuExpanded ? '▾' : '▸'}</span></button>
    <div class="nav-sub ${uiState.inventoryMenuExpanded ? 'open' : ''}">
      <button class="nav-btn ${currentView==='inventory' && uiState.inventorySubsection==='serials' ? 'active' : ''}" onclick="openInventorySection('serials')">Inventario</button>
      <button class="nav-btn ${currentView==='inventory' && uiState.inventorySubsection==='locations' ? 'active' : ''}" onclick="openInventorySection('locations')">Ubicaciones</button>
    </div>
    <button class="nav-btn ${currentView==='movements' ? 'active' : ''}" onclick="openView('movements')"><span class="nav-ico">↻</span><span>Movimientos</span></button>
    <button class="nav-btn ${currentView==='workcenters' ? 'active' : ''}" onclick="openView('workcenters')"><span class="nav-ico">⚙</span><span>Producción</span></button>
    <button class="nav-btn ${currentView==='genealogy' ? 'active' : ''}" onclick="openView('genealogy')"><span class="nav-ico">⎇</span><span>Genealogía</span></button>
  `;
}
function showOnlyView(id){
  document.querySelectorAll('.view').forEach(v => { v.classList.remove('active'); v.style.display = 'none'; });
  const target = document.getElementById('view-'+id);
  if(target){
    target.classList.add('active');
    target.style.display = 'block';
    target.style.width = '100%';
  }
  document.getElementById('pageTitle').textContent = TITLES[id] || '';
  document.getElementById('pageTitle').style.marginLeft = document.getElementById('app').classList.contains('sidebar-hidden') ? '56px' : '0';
}

function titleWithBack(title, backJs){
  return `<div class="title-row"><div class="card-title" style="font-size:22px">${title}</div></div>`;
}


function toggleInventoryMenu(){ uiState.inventoryMenuExpanded = !uiState.inventoryMenuExpanded; currentView='inventory'; renderNav(); }
function openInventorySection(section){
  uiState.inventorySubsection = section;
  uiState.inventoryMenuExpanded = true;
  currentView = 'inventory';
  renderApp();
}

function toggleCatalogsMenu(){ uiState.catalogsExpanded = !uiState.catalogsExpanded; renderNav(); }
function hideSidebar(){ document.getElementById('app').classList.add('sidebar-hidden'); }
function showSidebar(){ document.getElementById('app').classList.remove('sidebar-hidden'); }
function goHome(){ currentView = 'dashboard'; uiState.catalogsExpanded = false; uiState.inventoryMenuExpanded = false; renderApp(); }
function openCatalogSection(section){
  uiState.inventoryMenuExpanded = false;
  uiState.catalogSection = section;
  uiState.catalogsExpanded = true;
  uiState.setupTable = '';
  uiState.itemMode = 'list'; uiState.itemEditIndex = null; uiState.itemSelectedIndex = null;
  uiState.unitMode = 'list'; uiState.unitEditIndex = null; uiState.unitSelectedIndex = null;
  uiState.setupMode = 'list'; uiState.setupEditIndex = null; uiState.setupSelectedIndex = null;
  uiState.bomMode = 'list'; uiState.bomEditIndex = null; uiState.bomSelectedIndex = null;
  currentView = 'catalogs';
  renderApp();
}
function openView(view){
  currentView = view;
  if(view !== 'catalogs') uiState.catalogsExpanded = false;
  if(view !== 'inventory') uiState.inventoryMenuExpanded = false;
  renderApp();
  if(window.innerWidth <= 860) hideSidebar();
}

function renderDashboard(){
  const active = activeSerials();
  document.getElementById('view-dashboard').innerHTML = `
    <div class="grid kpis">
      <div class="card"><div class="kpi"><div class="kpi-label">Seriales activos</div><div class="kpi-value">${active.length}</div><div class="kpi-bar"></div></div></div>
      <div class="card"><div class="kpi"><div class="kpi-label">Contenedores abiertos</div><div class="kpi-value">${active.filter(x => x.type === 'Container').length}</div><div class="kpi-bar"></div></div></div>
      <div class="card"><div class="kpi"><div class="kpi-label">Movimientos hoy</div><div class="kpi-value">${state.movements.filter(x => x.ts.startsWith(nowDate())).length}</div><div class="kpi-bar"></div></div></div>
      <div class="card"><div class="kpi"><div class="kpi-label">Eventos producción</div><div class="kpi-value">${state.workcenterTx.filter(x => String(x.dt).startsWith(nowDate())).length}</div><div class="kpi-bar"></div></div></div>
    </div>
    <div style="height:16px"></div>
    <div class="grid quick">
      <button class="quick-btn" onclick="openView('receipts')"><div class="quick-btn-title">Recibo</div></button>
      <button class="quick-btn" onclick="openView('inventory')"><div class="quick-btn-title">Inventario</div></button>
      <button class="quick-btn" onclick="openView('workcenters')"><div class="quick-btn-title">Producción</div></button>
      <button class="quick-btn" onclick="openCatalogSection('items')"><div class="quick-btn-title">Catálogos</div></button>
    </div>
  `;
}


function getReceiptFormHtml(backAction){
  const rawItems = state.parts.filter(x => x.itemType === 'Materia Prima');
  const itemList = rawItems.map(x => `<option value="${esc(x.part)}">${esc(x.desc)}</option>`).join('');
  return `
    <div class="card capture">
      <div class="card-head"><div class="card-title">Nuevo recibo</div></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="field"><label>Fecha <span class="req">*</span></label><input class="input" id="r_date" type="date" value="${nowDate()}"></div>
          <div class="field"><label>No Parte <span class="req">*</span></label><input class="input" id="r_part" list="receiptItemList" oninput="syncReceiptItem()" placeholder="Escribe o selecciona No Parte"><datalist id="receiptItemList">${itemList}</datalist></div>
          <div class="field"><label>Contenedores <span class="req">*</span></label><input class="input" id="r_containers" type="number" min="1" step="1" oninput="recalcReceiptTotal()"></div>
          <div class="field"><label>Cantidad por contenedor <span class="req">*</span></label><input class="input" id="r_qty_each" type="number" step="0.01" oninput="recalcReceiptTotal()"></div>
          <div class="field"><label>Cantidad total</label><input class="input" id="r_qty_total" readonly></div>
          <div class="field"><label>Unidad</label><input class="input" id="r_unit" readonly></div>
          <div class="field"><label>Ubicación</label><input class="input" id="r_location"></div>
          <div class="field"><label>Lote proveedor</label><input class="input" id="r_lot"></div>
        </div>
        <div class="capture-actions">
          <button class="btn soft" onclick="${backAction}">Cancelar</button>
          <button class="btn primary" onclick="createReceipt()">Guardar</button>
        </div>
      </div>
    </div>
  `;
}

function renderReceipts(){
  const rows = state.receipts.map(x => `<tr>${[x.id,fmtDateDisplay(x.date),x.part,x.desc,x.containers,x.qtyPerContainer,x.qty,x.unit,x.location,x.lot || '',x.status].map(v => `<td>${esc(v)}</td>`).join('')}</tr>`);
  if(uiState.receiptsMode === 'new'){
    document.getElementById('view-receipts').innerHTML = getReceiptFormHtml("uiState.receiptsMode='list'; renderApp()");
  } else {
    document.getElementById('view-receipts').innerHTML = `
      <div class="card">
        <div class="card-head"><div class="card-title">Recibo</div></div>
        <div class="card-body">
          <div class="actionbar">
            <button class="btn new" onclick="uiState.receiptsMode='new'; renderApp()">Agregar</button>
            <button class="btn soft" onclick="exportReceipts()">Exportar</button>
          </div>
          ${table(['Recibo','Fecha','No Parte','Descripción','Contenedores','Cantidad por contenedor','Cantidad total','Unidad','Ubicación','Lote proveedor','Estado'], rows)}
        </div>
      </div>
    `;
  }
}

function exportReceipts(){
  exportRows('recibos.csv',
    ['Recibo','Fecha','No Parte','Descripción','Contenedores','Cantidad por contenedor','Cantidad total','Unidad','Ubicación','Lote proveedor','Estado'],
    state.receipts.map(x => [x.id, fmtDateDisplay(x.date), x.part, x.desc, x.containers, x.qtyPerContainer, x.qty, x.unit, x.location, x.lot || '', x.status])
  );
}

function exportReceipts(){
  exportRows('recibos.csv',
    ['Recibo','Fecha','No Parte','Descripción','Unidad','Contenedores','Cantidad por contenedor','Cantidad total','Ubicación','Lote proveedor','Estado'],
    state.receipts.map(x => [x.id, fmtDateDisplay(x.date), x.part, x.desc, x.unit, x.containers, x.qtyPerContainer, x.qty, x.location, x.lot || '', x.status])
  );
}

function syncReceiptItem(){
  const val = (document.getElementById('r_part').value || '').trim();
  const p = getPart(val);
  document.getElementById('r_unit').value = p ? p.unit : '';
}
function recalcReceiptTotal(){
  const c = Number(document.getElementById('r_containers').value || 0);
  const q = Number(document.getElementById('r_qty_each').value || 0);
  document.getElementById('r_qty_total').value = c && q ? round(c*round(q)) : '';
}
function createReceipt(){
  const date = document.getElementById('r_date').value;
  const part = (document.getElementById('r_part').value || '').trim();
  const p = getPart(part);
  const unit = document.getElementById('r_unit').value || (p ? p.unit : '');
  const rawContainers = document.getElementById('r_containers').value;
  const containers = parseInt(rawContainers, 10);
  const qtyEach = round(document.getElementById('r_qty_each').value);
  const qty = round(containers * qtyEach);
  const location = document.getElementById('r_location').value.trim();
  const lot = document.getElementById('r_lot').value.trim();
  if(!date || !part || !Number.isSafeInteger(containers) || String(containers) !== String(rawContainers).trim() || containers <= 0 || !Number.isFinite(qty) || qtyEach <= 0 || qty <= 0){
    showMsg('Completa los campos obligatorios', true);
    return;
  }
  const purchase = validatePurchaseReceipt29(part, unit, qty);
  if(purchase === false) return;
  if(!p || (!purchase && p.itemType !== 'Materia Prima')){
    showMsg('Solo se permiten números de parte de materia prima en recibo', true);
    return;
  }
  if(!getSetupRow('Serial_Prefix',p.serialPrefix)){
    showMsg('Configura un prefijo de serie para la parte antes de recibir.',true);
    return;
  }
  const rid = receiptId();
  state.receipts.unshift({id:rid,date,part,desc:p.desc,unit,containers,qtyPerContainer:qtyEach,qty,location,lot,status:'Procesado',...purchase});
  for(let i=1;i<=containers;i++){
    const serial = getNextSerial(p.serialPrefix);
    state.serials.push({
      active:true,
      serial,
      part,
      desc:p.desc,
      qtyCurrent:round(qtyEach),
      unit,
      containerType:p.serialPrefix,
      status:'OK',
      origin:rid,
      location
    });
    addMovement('RECEIVE', serial, part, qtyEach, unit, rid);
  }
  saveState();
  uiState.receiptsMode = 'list';
  renderApp();
  showMsg('Recibo generado');
}

const inventoryHeaders30 = ['Serial','No Parte','Descripción','Cantidad','Unidad','Edificio','Área','Ubicación','Estatus','Lote','Notas','Op No','Operation','Fecha'];
function renderInventory(){
  uiState.inventoryFilters = uiState.inventoryFilters || {part:'', loc:'', status:''};
  if(uiState.inventorySubsection === 'locations'){
    return renderInventoryLocations();
  }
  const filterPart = shellScreen === 'inventory' ? '' : uiState.inventoryFilters.part || '';
  const filterLoc = shellScreen === 'inventory' ? '' : uiState.inventoryFilters.loc || '';
  const filterStatus = shellScreen === 'inventory' ? '' : uiState.inventoryFilters.status || '';
  const partOptions = [{value:'',label:''}].concat(state.parts.map(x => ({value:x.part,label:`${x.part} | ${x.desc}`})));
  const filtered = state.serials.filter(x => shellScreen==='inventory'||x.active).filter(x => {
    return (!filterPart || x.part === filterPart)
      && (!filterLoc || String(x.location || '').toLowerCase().includes(filterLoc.toLowerCase()))
      && (!filterStatus || x.status === filterStatus);
  });
  const totalQty = filtered.reduce((a,b)=>a+Number(b.qtyCurrent||0),0);
  const rows = filtered.map(x => {
    const {building,area} = inventoryFacilityLabels30(x.location);
    return dataRow([esc(x.serial),esc(x.part),esc(x.desc),x.qtyCurrent,esc(x.unit),esc(building),esc(area),esc(x.location),badge(x.status),esc(x.lot||''),esc(x.notes||''),esc(inventoryOperation30(x).number),esc(inventoryOperation30(x).name),esc(containerAddDateDisplay31(x))], `selectInventoryRow(${state.serials.indexOf(x)})`, uiState.inventorySelectedIndex===state.serials.indexOf(x)).replace('<tr ','<tr data-active30="'+Boolean(x.active)+'" ');
  });
  const footer = () => `<tfoot><tr><td colspan="3" style="font-weight:700;background:#eef6ea">Total</td><td data-inventory-total style="font-weight:700;background:#eef6ea">${round(totalQty)}</td><td colspan="7" style="background:#eef6ea"></td></tr></tfoot>`;

  let actionPanel = '';
  if(uiState.inventoryAction === 'Split'){
    const locOptions = getLocationOptions();
    actionPanel = `
      <div class="card capture" style="margin-bottom:16px">
        <div class="card-head"><div class="card-title">Split</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Serial origen</label><input class="input" id="split_serial"></div>
            <div class="field"><label>Número de nuevos contenedores</label><input class="input" id="split_count" type="number" min="2" step="1"></div>
            <div class="field"><label>Cantidad por nuevo contenedor</label><input class="input" id="split_qty" type="number" step="0.01"></div>
            <div class="field"><label>Ubicación destino</label><select class="select" id="split_location">${selectOptions(locOptions, true)}</select></div>
            <div class="field"><label>Notas</label><input class="input" id="split_notes"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.inventoryAction=''; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveInventoryAction()">Guardar</button>
          </div>
        </div>
      </div>`;
  } else if(uiState.inventoryAction === 'Merge'){
    const locOptions = getLocationOptions();
    actionPanel = `
      <div class="card capture" style="margin-bottom:16px">
        <div class="card-head"><div class="card-title">Merge</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Seriales origen</label><input class="input" id="merge_serials" placeholder="Separados por coma"></div>
            <div class="field"><label>Ubicación destino</label><select class="select" id="merge_location">${selectOptions(locOptions, true)}</select></div>
            <div class="field"><label>Notas</label><input class="input" id="merge_notes"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.inventoryAction=''; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveInventoryAction()">Guardar</button>
          </div>
        </div>
      </div>`;
  } else if(uiState.inventoryAction === 'Move'){
    const locOptions = getLocationOptions();
    actionPanel = `
      <div class="card capture" style="margin-bottom:16px">
        <div class="card-head"><div class="card-title">Move</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Serial</label><input class="input" id="move_serial"></div>
            <div class="field"><label>Ubicación destino</label><select class="select" id="move_location">${selectOptions(locOptions, true)}</select></div>
            <div class="field"><label>Notas</label><input class="input" id="move_notes"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.inventoryAction=''; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveInventoryAction()">Guardar</button>
          </div>
        </div>
      </div>`;
  } else if(uiState.inventoryAction === 'New' || uiState.inventoryAction === 'Edit'){
    const serial = uiState.inventoryAction === 'Edit' && uiState.inventorySelectedIndex !== null ? state.serials[uiState.inventorySelectedIndex] : null;
    const locOptions = getLocationOptions();
    const partOptions2 = state.parts.map(x => ({value:x.part,label:`${x.part} | ${x.desc}`}));
    actionPanel = `
      <div class="card capture" style="margin-bottom:16px">
        <div class="card-head"><div class="card-title">${uiState.inventoryAction === 'New' ? 'Nuevo serial' : 'Editar serial'}</div></div>
        <div class="card-body">
          <div class="form-grid">
            ${uiState.inventoryAction === 'New' ? `<div class="field"><label>No Parte</label><select class="select" id="inv_part">${selectOptions(partOptions2, true)}</select></div>` : `<div class="field"><label>Serial</label><input class="input" value="${esc(serial?.serial || '')}" readonly></div><div class="field"><label>No Parte</label><input class="input" value="${esc(serial?.part || '')}" readonly></div>`}
            <div class="field"><label>Cantidad</label><input class="input" id="inv_qty" type="number" step="0.01" value="${esc(serial?.qtyCurrent || '')}"></div>
            <div class="field"><label>Ubicación</label><select class="select" id="inv_location">${selectOptions(locOptions, true)}</select></div>
            <div class="field"><label>Estatus</label><select class="select" id="inv_status"><option>OK</option><option>HOLD</option><option>CONSUMED</option></select></div>
            <div class="field"><label>Notas</label><input class="input" id="inv_notes" value="${esc(serial?.notes || '')}"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.inventoryAction=''; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveInventoryAction()">Guardar</button>
          </div>
        </div>
      </div>`;
  }

  document.getElementById('view-inventory').innerHTML = `
    ${actionPanel}
    <div class="card">
      <div class="card-head">
        <div class="card-title">Inventario</div>
        <div class="actions-right">
          <button class="btn orange" onclick="uiState.inventoryAction='Split'; renderApp()">Split</button>
          <button class="btn orange" onclick="uiState.inventoryAction='Merge'; renderApp()">Merge</button>
          <button class="btn orange" onclick="uiState.inventoryAction='Move'; renderApp()">Move</button>
        </div>
      </div>
      <div class="card-body">
        <div class="actionbar">
          <button class="btn new" onclick="uiState.inventoryAction='New'; renderApp()">Agregar</button>
          <button class="btn soft" ${uiState.inventorySelectedIndex===null ? 'disabled' : ''} onclick="uiState.inventoryAction='Edit'; renderApp()">Editar</button>
          <button class="btn danger" ${uiState.inventorySelectedIndex===null ? 'disabled' : ''} onclick="deleteInventorySelected()">Eliminar</button>
          <button class="btn soft" onclick="exportInventory()">Exportar</button>
        </div>
        ${shellScreen === 'inventory' ? inventorySearchForm30() : `
        <form class="ops-filters" aria-label="Filtros de inventario" onsubmit="searchInventory30(event)" onreset="clearInventory30(event)">
          <div class="ops-fields">
            <label class="field">No Parte<select class="select" id="fi_part">${selectOptions(partOptions,false)}</select></label>
            <label class="field">Ubicación<input class="input" id="fi_loc" value="${esc(filterLoc)}"></label>
            <label class="field">Estatus<select class="select" id="fi_status"><option value="">Todos</option>${state.setupTables.Container_Status.filter(row=>row.active).map(row=>`<option value="${esc(row.code)}" ${filterStatus===row.code?'selected':''}>${esc(row.description||row.code)}</option>`).join('')}</select></label>
          </div>
          <div class="ops-filter-actions"><button class="btn soft" type="reset">Limpiar</button><button class="btn primary" type="submit">Buscar</button></div>
        </form>`}
        ${table(inventoryHeaders30, rows, '980px', footer())}
      </div>
    </div>
  `;
  const fi = document.getElementById('fi_part'); if(fi) fi.value = filterPart;
  if(uiState.inventoryAction === 'Edit' && state.serials[uiState.inventorySelectedIndex]){const serial=state.serials[uiState.inventorySelectedIndex];
    document.getElementById('inv_location').value = serial.location || '';
    document.getElementById('inv_status').value = serial.status || 'OK';
  }
}
function locationCatalog30() {
  const headers = ['Activo','Código','Descripción','Área','Edificio','Tipo de ubicación'];
  const rows = state.setupTables.Locations.map(location => {
    const {area,building} = facilityForLocation30(location);
    return [location.active ? 'Sí' : 'No',location.code,location.description || '',facilityLabel30(area),
      facilityLabel30(building,'buildings'),location.locationType || 'Almacén'];
  });
  return {headers,rows};
}
function searchInventory30(event) {
  event.preventDefault();
  const form = event.currentTarget;
  uiState.inventoryFilters = {part:form.elements.fi_part.value,loc:form.elements.fi_loc.value.trim(),
    status:form.elements.fi_status.value};
  renderInventory();
}
function clearInventory30(event) {
  event.preventDefault();
  uiState.inventoryFilters = {part:'',loc:'',status:''};
  renderInventory();
}
function exportLocations30() {
  if (!requireLevel(1,'locations')) return;
  const {headers,rows} = locationCatalog30();
  exportRows('ubicaciones.csv',headers,rows);
}
function renderInventoryLocations(){
  const {headers,rows} = locationCatalog30();
  let form = '';
  if(uiState.locationMode === 'form'){
    const rec = uiState.locationEditIndex !== null ? state.setupTables.Locations[uiState.locationEditIndex] : {active:true, code:'', description:''};
    form = `
      <div class="card capture" style="margin-bottom:16px">
        <div class="card-head"><div class="card-title">${uiState.locationEditIndex !== null ? 'Editar ubicación' : 'Nueva ubicación'}</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Activo</label><input id="loc_active" type="checkbox" ${rec.active ? 'checked' : ''}></div>
            <div class="field"><label>Código</label><input class="input" id="loc_code" value="${esc(rec.code || '')}"></div>
            <div class="field"><label>Descripción</label><input class="input" id="loc_desc" value="${esc(rec.description || '')}"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.locationMode='list'; uiState.locationEditIndex=null; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveLocation()">Guardar</button>
          </div>
        </div>
      </div>`;
  }
  document.getElementById('view-inventory').innerHTML = `
    ${form}
    <div class="card">
      <div class="card-head">
        <div class="card-title">Ubicaciones</div>
        <div class="actions-right">
        </div>
      </div>
      <div class="card-body">
        <div class="actionbar">
          <button class="btn new" onclick="uiState.locationMode='form'; uiState.locationEditIndex=null; renderApp()">Agregar</button>
          <button class="btn soft" ${uiState.locationSelectedIndex===null ? 'disabled' : ''} onclick="editLocation()">Editar</button>
          <button class="btn danger" ${uiState.locationSelectedIndex===null ? 'disabled' : ''} onclick="deleteLocation()">Eliminar</button>
          <button class="btn soft" onclick="exportLocations30()">Exportar</button>
        </div>
        ${table(headers,rows.map((row,i) => dataRow([row[0] === 'Sí' ? '☑' : '☐',...row.slice(1).map(esc)],
          `selectLocationRow(${i})`,uiState.locationSelectedIndex===i)), '750px')}
      </div>
    </div>`;
}
function selectInventoryRow(idx){ uiState.inventorySelectedIndex = idx; renderInventory(); }
function deleteInventorySelected(){
  if(uiState.inventorySelectedIndex===null) return;
  state.serials.splice(uiState.inventorySelectedIndex,1);
  uiState.inventorySelectedIndex = null;
  saveState(); renderApp(); showMsg('Serial eliminado');
}
function selectLocationRow(i){ uiState.locationSelectedIndex = i; renderInventoryLocations(); }
function editLocation(){ if(uiState.locationSelectedIndex===null) return; uiState.locationEditIndex = uiState.locationSelectedIndex; uiState.locationMode='form'; renderApp(); }
function saveLocation(){
  const payload = {active: !!document.getElementById('loc_active')?.checked, code: document.getElementById('loc_code').value.trim(), description: document.getElementById('loc_desc').value.trim()};
  if(!payload.code){ showMsg('Captura código de ubicación', true); return; }
  const previous = state.setupTables.Locations[uiState.locationEditIndex];
  payload.locationType = document.getElementById('loc_type')?.value ?? previous?.locationType ?? 'Almacén';
  payload.area = document.querySelector('#view-inventory .capture [name="area"]')?.value ?? previous?.area ?? '';
  if(payload.area && !facility30().areas.some(row => row.code === payload.area)){
    showMsg('Selecciona un área existente.',true); return;
  }
  if(state.setupTables.Locations.some(row => row !== previous && row.code.toUpperCase() === payload.code.toUpperCase())){
    showMsg('El código de ubicación ya existe.',true); return;
  }
  if(previous && previous.code !== payload.code && locationInUse29(previous.code)){
    showMsg('La ubicación tiene centros, recibos o inventario. Conserva su código.',true); return;
  }
  if(uiState.locationEditIndex !== null) state.setupTables.Locations[uiState.locationEditIndex] = payload;
  else state.setupTables.Locations.push(payload);
  uiState.locationMode='list'; uiState.locationEditIndex=null; saveState(); renderApp(); showMsg('Ubicación guardada');
}
function deleteLocation(){
  if(uiState.locationSelectedIndex===null) return;
  if(locationInUse29(state.setupTables.Locations[uiState.locationSelectedIndex]?.code)){
    showMsg('La ubicación tiene centros, recibos o inventario.',true); return;
  }
  state.setupTables.Locations.splice(uiState.locationSelectedIndex,1);
  uiState.locationSelectedIndex=null; saveState(); renderApp(); showMsg('Ubicación eliminada');
}

function saveInventoryAction(){
  if(uiState.inventoryAction === 'Move'){
    const code = document.getElementById('move_serial').value.trim();
    const loc = document.getElementById('move_location').value;
    const notes = document.getElementById('move_notes').value.trim();
    const s = serialByCode(code);
    if(!s || !loc){ showMsg('Captura serial y ubicación', true); return; }
    s.location = loc;
    s.notes = notes;
    addMovement('MOVE', s.serial, s.part, s.qtyCurrent, s.unit, loc);
  } else if(uiState.inventoryAction === 'Split'){
    const code = document.getElementById('split_serial').value.trim();
    const count = parseInt(document.getElementById('split_count').value,10);
    const qty = Number(document.getElementById('split_qty').value);
    const loc = document.getElementById('split_location').value;
    const notes = document.getElementById('split_notes').value.trim();
    const s = serialByCode(code);
    if(!s || !Number.isInteger(count) || count < 2 || qty <= 0 || !loc){ showMsg('Completa los datos de split', true); return; }
    if(round(count * qty) > round(s.qtyCurrent)){ showMsg('La suma del split excede la cantidad del serial origen', true); return; }
    for(let i=0;i<count;i++){
      const child = createChildSerial(s.part, qty, s.unit, s.containerType, loc, notes);
      addMovement('SPLIT', child, s.part, qty, s.unit, s.serial);
    }
    deactivateSerial(s, 'CONSUMED');
    addMovement('SPLIT-OUT', s.serial, s.part, s.qtyCurrent, s.unit, 'Split');
  } else if(uiState.inventoryAction === 'Merge'){
    const codes = document.getElementById('merge_serials').value.split(',').map(x => x.trim()).filter(Boolean);
    const loc = document.getElementById('merge_location').value;
    const notes = document.getElementById('merge_notes').value.trim();
    if(codes.length < 2 || !loc){ showMsg('Captura al menos dos seriales y una ubicación', true); return; }
    const serials = codes.map(serialByCode);
    if(serials.some(x => !x)){ showMsg('Uno o más seriales no existen', true); return; }
    const firstPart = serials[0].part;
    if(serials.some(x => x.part !== firstPart)){ showMsg('No se pueden hacer split o merge de números de parte distintos', true); return; }
    const total = serials.reduce((a,b)=>a+Number(b.qtyCurrent||0),0);
    const newSerial = createChildSerial(firstPart, total, serials[0].unit, serials[0].containerType, loc, notes);
    serials.forEach(s => { deactivateSerial(s, 'CONSUMED'); addMovement('MERGE-OUT', s.serial, s.part, s.qtyCurrent, s.unit, newSerial); });
    addMovement('MERGE', newSerial, firstPart, total, serials[0].unit, codes.join(', '));
  } else if(uiState.inventoryAction === 'New'){
    const part = document.getElementById('inv_part').value;
    const qty = Number(document.getElementById('inv_qty').value);
    const loc = document.getElementById('inv_location').value;
    const status = document.getElementById('inv_status').value;
    const notes = document.getElementById('inv_notes').value.trim();
    const p = getPart(part);
    if(!p || qty <= 0 || !loc){ showMsg('Completa los datos del serial', true); return; }
    createChildSerial(part, qty, p.unit, p.serialPrefix, loc, notes);
    const created = state.serials[state.serials.length - 1];
    created.status = status;
    addMovement('NEW', created.serial, part, qty, p.unit, 'Alta manual');
  } else if(uiState.inventoryAction === 'Edit'){
    const s = uiState.inventorySelectedIndex !== null ? state.serials[uiState.inventorySelectedIndex] : null;
    if(!s){ showMsg('Selecciona un serial', true); return; }
    s.qtyCurrent = Number(document.getElementById('inv_qty').value);
    s.location = document.getElementById('inv_location').value;
    s.status = document.getElementById('inv_status').value;
    s.notes = document.getElementById('inv_notes').value.trim();
    addMovement('EDIT', s.serial, s.part, s.qtyCurrent, s.unit, 'Edición');
  }
  saveState();
  uiState.inventoryAction = '';
  renderApp();
  showMsg('Guardado');
}

function renderSimpleCapture(viewId, title, key){
  document.getElementById(viewId).innerHTML = `
    <div class="card capture">
      <div class="card-head"><div class="card-title">${title}</div></div>
      <div class="card-body">
        <div class="form-grid"><div class="field"><label>Serial</label><input class="input" id="${key}_serial"></div></div>
        <div class="capture-actions">
          <button class="btn soft" onclick="document.getElementById('${key}_serial').value=''">Cancelar</button>
          <button class="btn primary" onclick="saveSimpleCapture('${key}')">Guardar</button>
        </div>
      </div>
    </div>
  `;
}
function saveSimpleCapture(key){
  const el = document.getElementById(key + '_serial');
  const serial = el ? el.value.trim() : '';
  if(!serial){ showMsg('Captura un serial', true); return; }
  if(key === 'mov') addMovement('CAPTURE', serial, '', 0, '', 'Captura simple');
  if(key === 'gen') state.genealogy.unshift({ts:new Date().toISOString().slice(0,19).replace('T',' '), parent:serial, child:'', action:'CAPTURE', qty:0, ref:'Captura simple'});
  saveState();
  el.value = '';
  showMsg('Guardado');
}

function renderWorkcenters(){
  let html = '';
  if(!uiState.activeArea){
    html = `<div class="grid cards">${Object.keys(productionAreas).map(area => `
      <div class="icon-card" onclick="uiState.activeArea='${area}'; uiState.activeProcess=''; renderApp();">
        ${areaIcon(area)}
        <div class="tile-title">${area}</div>
      </div>`).join('')}</div>`;
  } else if(!uiState.activeProcess){
    html = `
      <div class="card">
        <div class="card-head"><div class="card-title">${uiState.activeArea}</div></div>
        <div class="card-body">
          ${titleWithBack(uiState.activeArea, "uiState.activeArea=''; renderApp()")}
          <div class="grid cards">${productionAreas[uiState.activeArea].map(proc => `
            <div class="icon-card" onclick="uiState.activeProcess='${proc}'; renderApp();">
              ${processIcon(proc)}
              <div class="tile-title">${proc}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
  } else if(uiState.activeProcess === 'Recibo'){
    html = `
      ${titleWithBack(uiState.activeArea, "uiState.activeProcess=''; renderApp()")}
      ${getReceiptFormHtml("uiState.activeProcess=''; renderApp()")}
    `;
  } else if(uiState.activeProcess === 'Mezcla'){
    const today = fmtDateDisplay(nowDate());
    const openRaw = state.serials.filter(x => x.active && (getPart(x.part)?.itemType === 'Materia Prima'));
    const totalRaw = round(openRaw.reduce((a,b)=>a+Number(b.qtyCurrent||0),0));
    const currentBatch = state.workcenterTx[0]?.producedItem || 'Sin NP seleccionado';
    const userOptions = getUserOptions();
    const wipOptions = getWipItemOptions();
    html = `
      <div class="card">
        <div class="card-head"><div class="card-title">Control Panel - Mezcla</div></div>
        <div class="card-body">
          ${titleWithBack('Control Panel - Mezcla', "uiState.activeProcess=''; renderApp()")}
          <div class="grid kpis">
            <div class="card"><div class="kpi"><div class="kpi-label">Centro de trabajo</div><div class="kpi-value" style="font-size:20px">Mezcla</div><div class="kpi-bar"></div></div></div>
            <div class="card"><div class="kpi"><div class="kpi-label">Fecha</div><div class="kpi-value" style="font-size:20px">${today}</div><div class="kpi-bar"></div></div></div>
            <div class="card"><div class="kpi"><div class="kpi-label">NP a producir</div><div class="kpi-value" style="font-size:20px">${esc(currentBatch)}</div><div class="kpi-bar"></div></div></div>
            <div class="card"><div class="kpi"><div class="kpi-label">Materia prima disponible</div><div class="kpi-value" style="font-size:20px">${totalRaw} Kg</div><div class="kpi-bar"></div></div></div>
          </div>
          <div style="height:16px"></div>
          <div class="grid cards">
            <div class="card">
              <div class="card-head"><div class="card-title">Setup</div></div>
              <div class="card-body">
                <div><strong>Proceso:</strong> Mezcla</div>
                <div><strong>Estatus:</strong> En espera / producción</div>
                <div><strong>Objetivo:</strong> Preparar alimento</div>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">Record Production</div></div>
              <div class="card-body">
                <div class="form-grid">
                  <div class="field"><label>Usuario</label><select class="select" id="mix_user">${selectOptions(userOptions, true)}</select></div>
                  <div class="field"><label>NP a producir</label><select class="select" id="mix_item">${selectOptions(wipOptions, true)}</select></div>
                  <div class="field"><label>Source material seriales</label><input class="input" id="mix_source_serials" placeholder="Seriales separados por coma"></div>
                  <div class="field"><label>Cantidad</label><input class="input" id="mix_qty" type="number" step="0.01"></div>
                  <div class="field"><label>Notas</label><input class="input" id="mix_note" placeholder="Observación del turno"></div>
                </div>
                <div class="capture-actions">
                  <button class="btn primary" onclick="saveMixProduction()">Guardar</button>
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">Material disponible</div></div>
              <div class="card-body">
                ${table(['Serial','No Parte','Cantidad','Unidad'], openRaw.slice(0,8).map(x => `<tr>${[x.serial,x.part,x.qtyCurrent,x.unit].map(v => `<td>${esc(v)}</td>`).join('')}</tr>`), '520px')}
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">Historial de producción</div></div>
              <div class="card-body">
                ${table(['Fecha-hora','Usuario','NP','Cantidad'], state.workcenterTx.slice(0,8).map(x => `<tr>${[x.dt,x.user || '',x.producedItem || x.process,x.qty || x.serial || ''].map(v => `<td>${esc(v)}</td>`).join('')}</tr>`), '520px')}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    html = `
      <div class="card capture">
        <div class="card-head"><div class="card-title">${uiState.activeArea} / ${uiState.activeProcess}</div></div>
        <div class="card-body">
          <div class="form-grid"><div class="field"><label>Serial</label><input class="input" id="prod_serial"></div></div>
          <div class="capture-actions">
            <button class="btn primary" onclick="saveProductionCapture()">Guardar</button>
          </div>
        </div>
      </div>`;
  }
  document.getElementById('view-workcenters').innerHTML = html;
}


function saveMixProduction(){
  const user = document.getElementById('mix_user')?.value;
  const producedItem = document.getElementById('mix_item')?.value;
  const sourceSerials = (document.getElementById('mix_source_serials')?.value || '').split(',').map(x => x.trim()).filter(Boolean);
  const qty = Number(document.getElementById('mix_qty')?.value || 0);
  const note = document.getElementById('mix_note')?.value.trim() || '';
  const p = getPart(producedItem);
  if(!user || !producedItem || qty <= 0 || !p || sourceSerials.length === 0){
    showMsg('Completa usuario, NP a producir, source material y cantidad', true);
    return;
  }
  const consume = consumeMaterialForBom(producedItem, qty, sourceSerials);
  if(!consume.ok){
    showMsg(consume.message, true);
    return;
  }
  const serial = createChildSerial(producedItem, qty, p.unit, p.serialPrefix, 'MEZ-01', note);
  state.workcenterTx.unshift({
    id: wcId(),
    dt: nowDateTimeLocal(),
    area: uiState.activeArea,
    process: uiState.activeProcess,
    user,
    producedItem,
    qty,
    serial,
    note,
    sourceSerials: sourceSerials.join(', ')
  });
  addMovement('WC-PRODUCTION', serial, producedItem, qty, p.unit, 'Record Production');
  saveState();
  renderApp();
  showMsg('Producción registrada con consumo de materiales');
}

function saveProductionCapture(){
  const serial = document.getElementById('prod_serial').value.trim();
  if(!serial){ showMsg('Captura un serial', true); return; }
  state.workcenterTx.unshift({id:wcId(), dt:nowDateTimeLocal(), area:uiState.activeArea, process:uiState.activeProcess, serial});
  addMovement('WC-CAPTURE', serial, '', 0, '', `${uiState.activeArea} / ${uiState.activeProcess}`);
  saveState();
  showMsg('Guardado');
  document.getElementById('prod_serial').value = '';
}

function renderCatalogs(){
  let html = '';
  if(uiState.catalogSection === 'items') html = renderItemsCatalog();
  else if(uiState.catalogSection === 'units') html = renderUnitsCatalog();
  else if(uiState.catalogSection === 'bom') html = renderBomCatalog();
  else html = renderSetupTablesCatalog();
  document.getElementById('view-catalogs').innerHTML = html;
}
function renderItemsCatalog(){
  if(uiState.itemMode === 'form'){
    const item = uiState.itemEditIndex !== null ? state.parts[uiState.itemEditIndex] : {part:'', desc:'', unit:'', itemType:'', serialPrefix:''};
    const html = `
      <div class="card capture">
        <div class="card-head"><div class="card-title">${uiState.itemEditIndex !== null ? 'Editar No Parte' : 'Agregar No Parte'}</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>No Parte</label><input class="input" id="item_part" value="${esc(item.part)}" readonly></div>
            <div class="field"><label>Descripción</label><input class="input" id="item_desc" value="${esc(item.desc)}"></div>
            <div class="field"><label>Unidad</label><select class="select" id="item_unit">${selectOptions(state.units.map(x => ({value:x.code,label:x.code})), true)}</select></div>
            <div class="field"><label>Tipo de No Parte</label><select class="select" id="item_type">${selectOptions(state.setupTables.Item_Type.map(x => ({value:x.code,label:x.code})), true)}</select></div>
            <div class="field"><label>Serial Prefix</label><select class="select" id="item_serial_prefix">${selectOptions((state.setupTables.Serial_Prefix||[]).map(x => ({value:x.code,label:x.code})), true)}</select></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.itemMode='list'; uiState.itemEditIndex=null; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveItemCatalog()">Guardar</button>
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      const u = document.getElementById('item_unit');
      const t = document.getElementById('item_type');
      const s = document.getElementById('item_serial_prefix');
      if(u) u.value = item.unit || '';
      if(t) t.value = item.itemType || '';
      if(s) s.value = item.serialPrefix || '';
      const p = document.getElementById('item_part');
      if(p && !p.value){ p.value = getNextItemCode(t?.value || 'Materia Prima'); }
      if(t){ t.onchange = () => { const p2 = document.getElementById('item_part'); if(p2 && uiState.itemEditIndex === null) p2.value = getNextItemCode(t.value || 'Materia Prima'); }; }
    }, 0);
    return html;
  }
  const rows = state.parts.map((x,i) => dataRow([esc(x.part), esc(x.desc), esc(x.unit), esc(x.itemType || ''), esc(x.serialPrefix || '')], `selectItemRow(${i})`, uiState.itemSelectedIndex===i));
  return `
    <div class="card">
      <div class="card-head"><div class="card-title">No Parte</div></div>
      <div class="card-body">
        <div class="actionbar">
          <button class="btn new" onclick="uiState.itemMode='form'; uiState.itemEditIndex=null; renderApp()">Agregar</button>
          <button class="btn soft" onclick="exportItems()">Exportar</button>
          <button class="btn soft" ${uiState.itemSelectedIndex===null ? 'disabled' : ''} onclick="editSelectedItem()">Editar</button>
          <button class="btn danger" ${uiState.itemSelectedIndex===null ? 'disabled' : ''} onclick="deleteSelectedItem()">Eliminar</button>
        </div>
        ${table(['No Parte','Descripción','Unidad','Tipo de No Parte','Serial Prefix'], rows)}
      </div>
    </div>`;
}
function exportItems(){
  if (!requireLevel(1,'parts')) return;
  const grid = gridTable34();
  const parts = new Map(state.parts.map(part => [part.part,part]));
  const rows = [...(grid?.tBodies[0].rows || [])].filter(row => !row.hidden)
    .map(row => parts.get(row.cells[0].textContent.trim())).filter(Boolean);
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  exportRows('items.csv',['No Parte','Descripción','Unidad','Tipo de No Parte','Serial Prefix'],
    rows.map(row => [row.part,row.desc,row.unit,row.itemType || '',row.serialPrefix || '']));
}

function selectItemRow(i){ uiState.itemSelectedIndex = i; renderApp(); }
function editSelectedItem(){ if(uiState.itemSelectedIndex===null) return; uiState.itemEditIndex=uiState.itemSelectedIndex; uiState.itemMode='form'; renderApp(); }
function saveItemCatalog(){
  let part = document.getElementById('item_part').value.trim();
  const desc = document.getElementById('item_desc').value.trim();
  const unit = document.getElementById('item_unit').value;
  const itemType = document.getElementById('item_type').value;
  const serialPrefix = document.getElementById('item_serial_prefix').value;
  if(!desc || !unit || !itemType){ showMsg('Completa los campos de No Parte', true); return; }
  if(uiState.itemEditIndex === null) part = getNextItemCode(itemType);
  try {
    const db = engineeringSnapshot29();
    writeEngineeringRecord29(db,'part',{part,desc,unit,itemType,serialPrefix},db.parts[uiState.itemEditIndex]);
    commitEngineering29(db);
  } catch (error) {
    showMsg(error.message,true); return;
  }
  uiState.itemMode='list'; uiState.itemEditIndex=null; uiState.itemSelectedIndex=null;
  renderApp();
  showMsg('No Parte guardado');
}
function deleteSelectedItem(){
  if(uiState.itemSelectedIndex===null) return;
  const part = state.parts[uiState.itemSelectedIndex]?.part;
  const data = state.operationsDesk29;
  if(!part) return;
  if(engineeringData29().routes.some(row => row.part === part) ||
    state.setupTables.Bom.some(row => row.parentPart === part || row.componentPart === part) ||
    state.cpOperations.some(row => row.part === part || row.input === part) ||
    state.receipts.some(row => row.part === part) || state.serials.some(row => row.part === part) ||
    state.sales30?.some(row => row.part === part) ||
    data?.orders.some(order => order.lines.some(line => line.part === part)) ||
    data?.jobs.some(row => row.part === part)) {
    showMsg('La parte tiene movimientos o referencias en otras pantallas.',true); return;
  }
  state.parts.splice(uiState.itemSelectedIndex, 1);
  saveState();
  uiState.itemSelectedIndex=null;
  renderApp();
  showMsg('No Parte eliminado');
}

function renderUnitsCatalog(){
  if(uiState.unitMode === 'form'){
    const unit = uiState.unitEditIndex !== null ? state.units[uiState.unitEditIndex] : {code:'', description:''};
    return `
      <div class="card capture">
        <div class="card-head"><div class="card-title">${uiState.unitEditIndex !== null ? 'Editar unidad' : 'Nueva unidad'}</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Unidad</label><input class="input" id="unit_code" value="${esc(unit.code)}"></div>
            <div class="field"><label>Descripción</label><input class="input" id="unit_desc" value="${esc(unit.description)}"></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.unitMode='list'; uiState.unitEditIndex=null; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveUnitCatalog()">Guardar</button>
          </div>
        </div>
      </div>`;
  }
  const rows = state.units.map((x,i) => dataRow([esc(x.code), esc(x.description)], `selectUnitRow(${i})`, uiState.unitSelectedIndex===i));
  return `
    <div class="card">
      <div class="card-head"><div class="card-title">Unidades</div></div>
      <div class="card-body">
        <div class="actionbar">
          <button class="btn new" onclick="uiState.unitMode='form'; uiState.unitEditIndex=null; renderApp()">Agregar</button>
          <button class="btn soft" onclick="exportUnits()">Exportar</button>
          <button class="btn soft" ${uiState.unitSelectedIndex===null ? 'disabled' : ''} onclick="editSelectedUnit()">Editar</button>
          <button class="btn danger" ${uiState.unitSelectedIndex===null ? 'disabled' : ''} onclick="deleteSelectedUnit()">Eliminar</button>
        </div>
        ${table(['Unidad','Descripción'], rows)}
      </div>
    </div>`;
}
function exportUnits(){
  exportRows('unidades.csv', ['Unidad','Descripción'], state.units.map(x => [x.code, x.description]));
}

function selectUnitRow(i){ uiState.unitSelectedIndex = i; renderApp(); }
function editSelectedUnit(){ if(uiState.unitSelectedIndex===null) return; uiState.unitEditIndex=uiState.unitSelectedIndex; uiState.unitMode='form'; renderApp(); }
function saveUnitCatalog(){
  const code = document.getElementById('unit_code').value.trim();
  const description = document.getElementById('unit_desc').value.trim();
  if(!code || !description){ showMsg('Completa los campos de la unidad', true); return; }
  if(uiState.unitEditIndex !== null) state.units[uiState.unitEditIndex] = {code, description};
  else state.units.push({code, description});
  saveState();
  uiState.unitMode='list'; uiState.unitEditIndex=null; uiState.unitSelectedIndex=null;
  renderApp();
  showMsg('Unidad guardada');
}
function deleteSelectedUnit(){
  if(uiState.unitSelectedIndex===null) return;
  const code = state.units[uiState.unitSelectedIndex]?.code;
  if((state.unitConversions30 || []).some(row => row.from === code || row.to === code)){
    showMsg('La unidad está asociada a una conversión.',true); return;
  }
  state.units.splice(uiState.unitSelectedIndex,1);
  saveState();
  uiState.unitSelectedIndex=null;
  renderApp();
  showMsg('Unidad eliminada');
}


function renderBomCatalog(){
  if(uiState.bomMode === 'form'){
    const rec = uiState.bomEditIndex !== null ? state.setupTables.Bom[uiState.bomEditIndex] : {active:true,parentPart:uiState.bomPart29 || '',componentPart:'',qtyPerUnit:'',unit:'',routingId:uiState.bomRoute29 || ''};
    const parents = state.parts.map(x => ({value:x.part,label:`${x.part} | ${x.desc}`}));
    const comps = state.parts.map(x => ({value:x.part,label:`${x.part} | ${x.desc}`}));
    const html = `
      <div class="card capture">
        <div class="card-head"><div class="card-title">${uiState.bomEditIndex !== null ? 'Editar receta / BOM' : 'Nueva receta / BOM'}</div></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field"><label>Activo</label><input id="bom_active" type="checkbox" ${rec.active ? 'checked' : ''}></div>
            <div class="field"><label>NP padre</label><select class="select" id="bom_parent" onchange="refreshBomRoute29()">${selectOptions(parents, true)}</select></div>
            <label class="field" for="bom_routing29">Paso de ruta (opcional)<select class="select" id="bom_routing29"></select></label>
            <div class="field"><label>Componente</label><select class="select" id="bom_component">${selectOptions(comps, true)}</select></div>
            <div class="field"><label>Cantidad por unidad</label><input class="input" id="bom_qty" type="number" step="0.01" value="${esc(rec.qtyPerUnit || '')}"></div>
            <div class="field"><label>Unidad</label><select class="select" id="bom_unit">${selectOptions(state.units.map(x => ({value:x.code,label:x.code})), true)}</select></div>
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.bomMode='list'; uiState.bomEditIndex=null; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveBom()">Guardar</button>
          </div>
        </div>
      </div>`;
    setTimeout(() => {
      const p = document.getElementById('bom_parent'); if(p) p.value = rec.parentPart || '';
      const c = document.getElementById('bom_component'); if(c) c.value = rec.componentPart || '';
      const u = document.getElementById('bom_unit'); if(u) u.value = rec.unit || '';
      refreshBomRoute29(rec.routingId);
    }, 0);
    return html;
  }
  const bomRows = (state.setupTables.Bom || []);
  let prevParent = null;
  const rows = bomRows.flatMap((x,i) => {
    if(uiState.bomPart29 && x.parentPart !== uiState.bomPart29) return [];
    if(uiState.bomRoute29 && x.routingId && x.routingId !== uiState.bomRoute29) return [];
    const showParent = x.parentPart !== prevParent;
    prevParent = x.parentPart;
    return dataRow([
      showParent ? esc(x.parentPart) : '',
      showParent ? esc(getPart(x.parentPart)?.desc || '') : '',
      esc(x.componentPart),
      esc(getPart(x.componentPart)?.desc || ''),
      esc(x.qtyPerUnit),
      esc(x.unit),
      esc(bomRouteLabel29(x.routingId))
    ], `selectBomRow(${i})`, uiState.bomSelectedIndex===i);
  });
  return `
    <div class="card">
      <div class="card-head"><div class="card-title">Recetas / BOM</div></div>
      <div class="card-body">
        <div class="actionbar">
          <button class="btn new" onclick="uiState.bomMode='form'; uiState.bomEditIndex=null; renderApp()">Agregar</button>
          <button class="btn soft" onclick="exportBom()">Exportar</button>
          <button class="btn soft" ${uiState.bomSelectedIndex===null ? 'disabled' : ''} onclick="editBom()">Editar</button>
          <button class="btn danger" ${uiState.bomSelectedIndex===null ? 'disabled' : ''} onclick="deleteBom()">Eliminar</button>
        </div>
        ${bomContext29()}
        ${table(['NP padre','Descripción','Componente','Descripción componente','Cantidad por unidad','Unidad','Paso de ruta'], rows, '1040px')}
      </div>
    </div>`;
}
function selectBomRow(i){ uiState.bomSelectedIndex = i; renderCatalogs(); showOnlyView('catalogs'); }
function editBom(){ if(uiState.bomSelectedIndex===null) return; uiState.bomEditIndex = uiState.bomSelectedIndex; uiState.bomMode='form'; renderApp(); }
function saveBom(){
  const payload = {
    active: !!document.getElementById('bom_active')?.checked,
    parentPart: document.getElementById('bom_parent').value,
    componentPart: document.getElementById('bom_component').value,
    qtyPerUnit: Number(document.getElementById('bom_qty').value),
    unit: document.getElementById('bom_unit').value,
    routingId: document.getElementById('bom_routing29')?.value || ''
  };
  if(!payload.parentPart || !payload.componentPart || payload.qtyPerUnit <= 0 || !payload.unit){
    showMsg('Completa los campos del BOM', true); return;
  }
  try {
    const db = engineeringSnapshot29();
    writeEngineeringRecord29(db,'bom',payload,db.bom[uiState.bomEditIndex]);
    commitEngineering29(db);
  } catch (error) {
    showMsg(error.message,true); return;
  }
  uiState.bomMode='list'; uiState.bomEditIndex=null; uiState.bomSelectedIndex=null;
  renderApp(); showMsg('BOM guardado');
}
function deleteBom(){
  if(uiState.bomSelectedIndex===null) return;
  state.setupTables.Bom.splice(uiState.bomSelectedIndex,1);
  uiState.bomSelectedIndex=null; saveState(); renderApp(); showMsg('BOM eliminado');
}
function exportBom(){
  exportRows('bom.csv', ['NP padre','Componente','Cantidad por unidad','Unidad'], (state.setupTables.Bom || []).map(x => [x.parentPart,x.componentPart,x.qtyPerUnit,x.unit]));
}

function renderSetupTablesCatalog(){
  if(!uiState.setupTable){
    const rows = Object.keys(state.setupTables).map(name => {
      if(name === 'Move_Type') return '';
      return `<tr><td><button class="btn link" onclick="openSetupTable('${name}')">${name}</button></td></tr>`;
    }).filter(Boolean);
    return `<div class="card"><div class="card-head"><div class="card-title">Setup Tables</div></div><div class="card-body">${table(['Tabla'], rows)}</div></div>`;
  }
  if(uiState.setupMode === 'form'){
    const rec = uiState.setupEditIndex !== null ? state.setupTables[uiState.setupTable][uiState.setupEditIndex] : {};
    const isPrefix = uiState.setupTable === 'Serial_Prefix';
    return `
      <div class="card capture">
        <div class="card-head"><div class="card-title">${uiState.setupTable}</div></div>
        <div class="card-body">
          ${titleWithBack(uiState.setupTable, "uiState.setupMode='list'; uiState.setupEditIndex=null; renderApp()")}
          <div class="form-grid">
            <div class="field"><label>Activo</label><input id="setup_active" type="checkbox" ${rec.active ? 'checked' : ''}></div>
            <div class="field"><label>Código</label><input class="input" id="setup_code" value="${esc(rec.code || '')}"></div>
            <div class="field"><label>Descripción</label><input class="input" id="setup_desc" value="${esc(rec.description || '')}"></div>
            ${isPrefix ? `<div class="field"><label>Último número</label><input class="input" id="setup_last" type="number" value="${esc(rec.lastNumber ?? 0)}"></div>` : ``}
          </div>
          <div class="capture-actions">
            <button class="btn soft" onclick="uiState.setupMode='list'; uiState.setupEditIndex=null; renderApp()">Cancelar</button>
            <button class="btn primary" onclick="saveSetupRecord()">Guardar</button>
          </div>
        </div>
      </div>`;
  }
  const isPrefix = uiState.setupTable === 'Serial_Prefix';
  const rows = state.setupTables[uiState.setupTable].map((x,i) => {
    const cols = isPrefix
      ? [x.active ? '☑' : '☐', esc(x.code), esc(x.description || ''), esc(x.lastNumber ?? 0)]
      : [x.active ? '☑' : '☐', esc(x.code), esc(x.description || '')];
    return dataRow(cols, `selectSetupRow(${i})`, uiState.setupSelectedIndex===i);
  });
  const headers = isPrefix ? ['Activo','Código','Descripción','Último número'] : ['Activo','Código','Descripción'];
  return `
    <div class="card">
      <div class="card-head"><div class="card-title">${uiState.setupTable}</div></div>
      <div class="card-body">
        ${titleWithBack(uiState.setupTable, "uiState.setupTable=''; uiState.setupSelectedIndex=null; renderApp()")}
        <div class="actionbar">
          <button class="btn new" onclick="uiState.setupMode='form'; uiState.setupEditIndex=null; renderApp()">Agregar</button>
          <button class="btn soft" onclick="exportSetupTable()">Exportar</button>
          <button class="btn soft" ${uiState.setupSelectedIndex===null ? 'disabled' : ''} onclick="editSelectedSetup()">Editar</button>
          <button class="btn danger" ${uiState.setupSelectedIndex===null ? 'disabled' : ''} onclick="deleteSelectedSetup()">Eliminar</button>
        </div>
        ${table(headers, rows)}
      </div>
    </div>`;
}
function exportSetupTable(){
  const rows = state.setupTables[uiState.setupTable] || [];
  if(uiState.setupTable === 'Serial_Prefix'){
    exportRows('serial_prefix.csv', ['Activo','Código','Descripción','Último número'], rows.map(x => [x.active ? 1 : 0, x.code, x.description || '', x.lastNumber ?? 0]));
  } else {
    exportRows(`${uiState.setupTable}.csv`, ['Activo','Código','Descripción'], rows.map(x => [x.active ? 1 : 0, x.code, x.description || '']));
  }
}

function openSetupTable(name){
  uiState.setupTable = name;
  uiState.setupMode = 'list';
  uiState.setupEditIndex = null;
  uiState.setupSelectedIndex = null;
  currentView = 'catalogs';
  renderApp();
}
function selectSetupRow(i){ uiState.setupSelectedIndex=i; renderApp(); }
function editSelectedSetup(){ if(uiState.setupSelectedIndex===null) return; uiState.setupEditIndex=uiState.setupSelectedIndex; uiState.setupMode='form'; renderApp(); }
function saveSetupRecord(){
  const code = document.getElementById('setup_code').value.trim();
  const description = (document.getElementById('setup_desc')?.value || '').trim();
  const isPrefix = uiState.setupTable === 'Serial_Prefix';
  if(!code){ showMsg('Completa el código del setup table', true); return; }
  const payload = isPrefix
    ? {active: !!document.getElementById('setup_active')?.checked, code, description, lastNumber: Number(document.getElementById('setup_last')?.value || 0)}
    : {active: !!document.getElementById('setup_active')?.checked, code, description};
  if(uiState.setupEditIndex !== null) state.setupTables[uiState.setupTable][uiState.setupEditIndex] = payload;
  else state.setupTables[uiState.setupTable].push(payload);
  saveState();
  uiState.setupMode='list'; uiState.setupEditIndex=null; uiState.setupSelectedIndex=null;
  renderApp();
  showMsg('Registro guardado');
}
function deleteSelectedSetup(){
  if(uiState.setupSelectedIndex===null) return;
  state.setupTables[uiState.setupTable].splice(uiState.setupSelectedIndex,1);
  saveState();
  uiState.setupSelectedIndex=null;
  renderApp();
  showMsg('Registro eliminado');
}

function renderApp(){
  renderNav();
  renderDashboard();
  renderReceipts();
  renderInventory();
  renderSimpleCapture('view-movements', 'Movimientos', 'mov');
  renderWorkcenters();
  renderSimpleCapture('view-genealogy', 'Genealogía', 'gen');
  renderCatalogs();
  showOnlyView(currentView);
}

document.getElementById('sidebarHideBtn').addEventListener('click', hideSidebar);
document.getElementById('sidebarShowBtn').addEventListener('click', showSidebar);

/* Rev028: estructura conceptual. Este archivo se incorpora al HTML autónomo. */
const setupDefinitions = {
  Item_Type: {title:'Tipos de parte',owner:'Parts / No Parte',fields:[{key:'allowShip',label:'Allow Ship',type:'boolean'},{key:'allowReceive',label:'Allow Receive',type:'boolean'},{key:'allowProduction',label:'Allow Production',type:'boolean'}]},
  Location_Type: {title:'Tipos de ubicación',owner:'Locations',fields:[{key:'allowShip',label:'Allow Ship',type:'boolean'},{key:'allowReceive',label:'Allow Receive',type:'boolean'}]},
  Container_Status: {title:'Estados del contenedor',owner:'Inventory / Control Panel',fields:[{key:'allowProduction',label:'Allow Production',type:'boolean'},{key:'allowMove',label:'Allow Move',type:'boolean'},{key:'allowShip',label:'Allow Ship',type:'boolean'}]},
  Container_Type: {title:'Tipos de contenedor',owner:'Inventory',fields:[{key:'capacity',label:'Capacidad de referencia',type:'number'},{key:'unit',label:'Unidad',type:'text'}]},
  Operation_Type: {title:'Tipos de operación',owner:'Operations / Process Routing',fields:[{key:'requiresInput',label:'Requiere entrada',type:'boolean'},{key:'createsLot',label:'Genera lote',type:'boolean'}]},
  Workcenter_Status: {title:'Estados del workcenter',owner:'Workcenters / Control Panel',fields:[{key:'allowProduction',label:'Permite reportar producción',type:'boolean'}]},
  Serial_Prefix: {title:'Prefijos de serial',owner:'Parts / Inventory',fields:[{key:'lastNumber',label:'Último número',type:'number'}]}
};
const containerStatusDefaults30 = [
  {code:'RECIBO',description:'Recibo',color:'#FFF1C5',allowProduction:false,allowMove:false,allowShip:false,allowMaintenance:false,isConsumed:false},
  {code:'OK',description:'OK',color:'#EAF6DA',allowProduction:true,allowMove:true,allowShip:true,allowMaintenance:true,isConsumed:false},
  {code:'HOLD',description:'HOLD',color:'#FFF2E3',allowProduction:false,allowMove:false,allowShip:false,allowMaintenance:false,isConsumed:false},
  {code:'CONSUMED',description:'Consumido',color:'#EFF2F0',allowProduction:false,allowMove:false,allowShip:false,allowMaintenance:false,isConsumed:true},
  {code:'INCUBATING',description:'En guardería',color:'#FFF1C5',allowProduction:false,allowMove:true,allowShip:false,allowMaintenance:true,isConsumed:false},
  {code:'READY',description:'Listo para transferencia',color:'#DDF0E3',allowProduction:true,allowMove:true,allowShip:false,allowMaintenance:true,isConsumed:false},
];
function setupHexColor30(value) {
  const text=String(value ?? '').trim();
  return /^#?[0-9a-f]{6}$/i.test(text) ? '#'+text.replace(/^#/,'').toUpperCase() : '';
}
function initContainerStatuses30() {
  const schema=state.setupSchemas.Container_Status;
  schema.fields=schema.fields.filter(field=>!['allowMaintenance','isConsumed'].includes(field.key));
  const statusFields=[
    {key:'color',label:'Color',type:'color'},
    ...[['receivingStatus','Receiving Status'],['systemStatus','System Status'],['preventSplit','Prevent Split'],['preventMerge','Prevent Merge'],['okStatus','OK Status'],['includeInMRP','Include in MRP'],['scrap','Scrap']].map(([key,label])=>({key,label,type:'boolean'}))
  ];
  for(const field of statusFields){const current=schema.fields.find(row=>row.key===field.key);if(current)Object.assign(current,field);else schema.fields.push(field);}
  const rows=state.setupTables.Container_Status ??= [];
  for (const defaults of containerStatusDefaults30) {
    if(state.removedContainerStatuses30?.includes(defaults.code))continue;
    const row=rows.find(entry=>entry.code===containerStatusCode30(defaults.code));
    if (!row) {
      if(!savedContainerCatalog31)rows.push({active:true,...defaults});
      continue;
    }
    for (const [key,value] of Object.entries(defaults)) row[key] ??= value;
    if (!row.description && ['READY','INCUBATING'].includes(row.code)) row.description=defaults.description;
    row.color=setupHexColor30(row.color) || defaults.color;
  }
  for (const row of rows){
    row.color=setupHexColor30(row.color)||'#E4E8E5';
    row.activeStatus??=row.active!==false&&!['shipped','scrap'].includes(String(row.code).toLowerCase());
    row.active=true;
    for(const field of statusFields.filter(field=>field.type==='boolean'))row[field.key]??=field.key==='receivingStatus'?row.code===containerStatusCode30('RECIBO'):field.key==='okStatus'?row.code===containerStatusCode30('OK'):false;
  }
}
let configContext='items';
function initConcept(){
  state.setupSchemas ??= structuredClone(setupDefinitions);
  for(const [name,def] of Object.entries(setupDefinitions)) state.setupSchemas[name] ??= structuredClone(def);
  state.settings ??= {allowMixedLotsMerge:true};
  state.configHistory ??= [];
  state.setupTables.Location_Type ??= [{active:true,code:'Workcenter',description:'Ubicación asociada al centro de trabajo',allowShip:false,allowReceive:false},{active:true,code:'Almacén',description:'Almacén habilitado',allowShip:true,allowReceive:true}];
  state.setupTables.Operation_Type ??= [{active:true,code:'Receive',description:'Recibo',requiresInput:false,createsLot:false},{active:true,code:'Production',description:'Transformación',requiresInput:true,createsLot:false},{active:true,code:'Egg Collection',description:'Cosecha de huevos',requiresInput:false,createsLot:true}];
  state.setupTables.Workcenter_Status ??= [{active:true,code:'Producción',description:'Centro disponible para producir',allowProduction:true},{active:true,code:'Setup',description:'Preparación del centro',allowProduction:false},{active:true,code:'Paro',description:'Centro detenido',allowProduction:false}];
  const types=state.setupTables.Item_Type;
  if(!types.some(x=>x.code==='Producto Terminado'))types.push({active:true,code:'Producto Terminado',description:'Ejemplo de finished good',allowShip:true,allowProduction:true,allowReceive:false});
  types.forEach(x=>{x.allowShip ??= x.code==='Producto Terminado';x.allowReceive ??= x.code==='Materia Prima';x.allowProduction ??= x.code!=='Materia Prima';});
  initContainerStatuses30();
  Object.values(state.setupTables).forEach(rows=>rows.forEach(x=>x.active ??= true));
}
function configAudit(action){state.configHistory.unshift({at:new Date().toISOString(),action});saveState();}
function configInfo(){return `<div class="concept-note"><b>Estructura para UASLP</b><p>Un setup table define categorías y sus atributos. Cada registro del catálogo selecciona una categoría; el sistema consulta sus atributos antes de permitir una acción. Settings define opciones generales del módulo.</p><p>Las columnas nuevas se guardan como propuesta. Su efecto debe definirse e implementarse con UASLP. Esta revisión incluye un evaluador de ejemplo para embarque y mezcla de lotes; no cambia las validaciones de las pantallas operativas anteriores.</p></div>`;}
function configLink(name){return `<button class="btn link" onclick="openContextSetup('${name}')">${esc(state.setupSchemas[name]?.title||name)}</button>`;}
function contextBar(){
 let names=[];
 if(currentView==='catalogs'&&uiState.catalogSection==='items')names=['Item_Type','Serial_Prefix'];
 if(currentView==='inventory')names=uiState.inventorySubsection==='locations'?['Location_Type']:['Container_Status','Container_Type'];
 if(currentView==='receipts')names=['Item_Type','Container_Type','Serial_Prefix'];
 if(currentView==='workcenters')names=['Operation_Type','Workcenter_Status','Container_Status'];
 if(!names.length)return '';
 return `<div class="concept-bar"><span>Configurar esta pantalla:</span>${names.map(configLink).join('')}<button class="btn link" onclick="openConfigSettings()">Settings</button></div>`;
}
const baseRenderApp=renderApp;
renderApp=function(){initConcept();baseRenderApp();const section=document.getElementById('view-'+currentView);if(section)section.insertAdjacentHTML('afterbegin',contextBar());if(currentView==='dashboard')section.insertAdjacentHTML('afterbegin',`<div class="concept-note"><b>MES Rev028 · Configuración contextual</b><p>Basado en Kiber y MES Rev027. Revisa cómo los catálogos usan Setup Tables y Settings.</p><button class="btn primary" onclick="openConfigGuide()">Ver estructura para UASLP</button> <button class="btn soft" onclick="openSetupHub()">Explorar setup tables</button></div>`);};
function ensureConfigDialog(){let d=document.getElementById('configDialog');if(!d){d=document.createElement('dialog');d.id='configDialog';document.body.append(d);}return d;}
function configDialog(title,body){const d=ensureConfigDialog();d.innerHTML=`<div class="concept-head"><h2>${esc(title)}</h2><button class="btn soft" onclick="closeConfigDialog()">Cerrar</button></div>${body}`;if(!d.open)d.showModal();}
function closeConfigDialog(){const d=ensureConfigDialog();d.close();renderApp();}
function openContextSetup(name){configContext=currentView==='catalogs'?uiState.catalogSection:currentView;drawSetupDialog(name);}
function setupColorInput30(row,field,index) {
  const color=setupHexColor30(row[field.key]) || '#E4E8E5';
  return `<div class="setup-color30">
    <input type="color" value="${color}" aria-label="${esc(row.code+' Selector de color')}" oninput="syncSetupColor30(this)">
    <input class="input" data-color-hex30 data-config-row="${index}" data-config-key="${esc(field.key)}"
      value="${color}" maxlength="7" aria-label="${esc(row.code+' '+field.label)}" oninput="syncSetupColor30(this)">
  </div>`;
}
function syncSetupColor30(input) {
  const group=input.closest('.setup-color30');
  if (input.type==='color') group.querySelector('[data-color-hex30]').value=input.value.toUpperCase();
  else {
    const color=setupHexColor30(input.value);
    if (color) group.querySelector('input[type=color]').value=color;
  }
}
function drawSetupDialog(name){
 const schema=state.setupSchemas[name];if(!schema)return;
 const rows=state.setupTables[name]||[];
 const input=(row,f,i)=>f.type==='color'?setupColorInput30(row,f,i):f.type==='boolean'?`<input type="checkbox" aria-label="${esc(row.code+' '+f.label)}" data-config-row="${i}" data-config-key="${esc(f.key)}" ${row[f.key]?'checked':''}>`:`<input class="input" aria-label="${esc(row.code+' '+f.label)}" data-config-row="${i}" data-config-key="${esc(f.key)}" type="${f.type==='number'?'number':'text'}" value="${esc(row[f.key]??'')}" ${f.type==='number'?'step="any"':''}>`;
 configDialog(schema.title,`${configInfo()}<p><b>Se usa en:</b> ${esc(schema.owner)} · <b>Identificador:</b> ${esc(name)}</p><div class="concept-table"><table><thead><tr><th>Activo</th><th>Código / categoría</th><th>Descripción</th>${schema.fields.map(f=>`<th>${esc(f.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr><td><input type="checkbox" aria-label="${esc(r.code+' Activo')}" data-config-row="${i}" data-config-key="active" ${r.active?'checked':''}></td><td>${esc(r.code)}</td><td><input class="input" aria-label="${esc(r.code+' Descripción')}" data-config-row="${i}" data-config-key="description" value="${esc(r.description||'')}"></td>${schema.fields.map(f=>`<td>${input(r,f,i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="actionbar"><button class="btn primary" onclick="saveConfigRows('${name}')">Guardar cambios</button><button class="btn soft" onclick="newConfigRow('${name}')">Agregar</button><button class="btn soft" onclick="newConfigColumn('${name}')">Proponer otra columna</button><button class="btn soft" onclick="openConfigGuide()">Ver relaciones</button></div><p class="small">Ejemplos ilustrativos. Guardado local en esta revisión; sin conexión a Plex ni a una base de datos compartida.</p>`);
}
function saveConfigRows(name){
 const rows=structuredClone(state.setupTables[name]);
 for(const el of ensureConfigDialog().querySelectorAll('[data-config-row]')){
   const value=el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?'':Number(el.value)):el.value;
   if(el.type==='number'&&value!==''&&!Number.isFinite(value)){showMsg('Revisa los valores numéricos',true);return;}
   if(el.hasAttribute('data-color-hex30')&&!setupHexColor30(value)){
     el.setCustomValidity('Escribe un color HEX de seis dígitos, por ejemplo #DDF0E3.');
     el.reportValidity();
     el.setCustomValidity('');
     return;
   }
   rows[Number(el.dataset.configRow)][el.dataset.configKey]=el.hasAttribute('data-color-hex30')?setupHexColor30(value):value;
 }
 state.setupTables[name]=rows;configAudit('Edición de '+name);drawSetupDialog(name);showMsg('Setup table guardado en la demo');
}
function newConfigRow(name){configDialog('Agregar categoría',`<p>En ${esc(state.setupSchemas[name].title)}. Los atributos se completan en la tabla.</p><form onsubmit="event.preventDefault();submitConfigRow('${name}')"><div class="form-grid"><label>Código<input class="input" id="newConfigCode" required></label><label>Descripción<input class="input" id="newConfigDescription"></label></div><button class="btn primary">Agregar</button><button type="button" class="btn soft" onclick="drawSetupDialog('${name}')">Volver</button></form>`);}
function submitConfigRow(name){const code=document.getElementById('newConfigCode').value.trim();if(!code||state.setupTables[name].some(x=>x.code.toLowerCase()===code.toLowerCase())){showMsg('El código debe ser único y no puede estar vacío',true);return;}const row={code,active:true,description:document.getElementById('newConfigDescription').value.trim()};state.setupSchemas[name].fields.forEach(f=>row[f.key]=f.type==='boolean'?false:f.type==='number'?0:'');state.setupTables[name].push(row);configAudit('Categoría nueva en '+name+': '+code);drawSetupDialog(name);}
function newConfigColumn(name){configDialog('Proponer columna de configuración',`<p>Describe un atributo que necesite esta categoría. Quedará documentado y editable para acordar su comportamiento con UASLP.</p><form onsubmit="event.preventDefault();submitConfigColumn('${name}')"><div class="form-grid"><label>Nombre visible<input class="input" id="newColumnLabel" required placeholder="Ej. Requiere aprobación de calidad"></label><label>Tipo de dato<select class="select" id="newColumnType"><option value="boolean">Sí / No</option><option value="number">Número</option><option value="text">Texto</option></select></label></div><button class="btn primary">Agregar columna</button><button type="button" class="btn soft" onclick="drawSetupDialog('${name}')">Volver</button></form>`);}
function submitConfigColumn(name){const label=document.getElementById('newColumnLabel').value.trim(),type=document.getElementById('newColumnType').value;if(!label)return;const fields=state.setupSchemas[name].fields;if(fields.some(x=>x.label.toLowerCase()===label.toLowerCase())){showMsg('Ya existe una columna con ese nombre',true);return;}const key='custom_'+Date.now();fields.push({key,label,type,proposed:true});state.setupTables[name].forEach(r=>r[key]=type==='boolean'?false:type==='number'?0:'');configAudit('Columna propuesta en '+name+': '+label);drawSetupDialog(name);}
function openSetupHub(){currentView='catalogs';uiState.catalogSection='setup';uiState.setupTable='';renderApp();closeIfOpen();}
function closeIfOpen(){const d=ensureConfigDialog();if(d.open)d.close();}
renderSetupTablesCatalog=function(){return `<div class="card"><div class="card-head"><div class="card-title">Setup Tables · Estructura configurable</div></div><div class="card-body">${configInfo()}<div class="actionbar"><button class="btn primary" onclick="newSetupTable()">Agregar</button><button class="btn soft" onclick="openConfigSettings()">Settings</button><button class="btn soft" onclick="openConfigGuide()">Ver relaciones y ejemplo</button></div>${table(['Setup table','Pantalla donde se utiliza','Categorías','Atributos'],Object.entries(state.setupSchemas).map(([name,def])=>`<tr><td>${configLink(name)}</td><td>${esc(def.owner)}</td><td>${(state.setupTables[name]||[]).length}</td><td>${def.fields.map(f=>esc(f.label)).join(', ')||'Por definir'}</td></tr>`))}<p>Parts, Locations, Users y BOM son catálogos o relaciones. Rev027 los almacenaba junto a los setup tables; se conserva ese almacenamiento por compatibilidad, pero aquí se explica su función por separado.</p></div></div>`;};
function newSetupTable(){configDialog('Proponer setup table',`<form onsubmit="event.preventDefault();submitSetupTable()"><div class="form-grid"><label>Identificador<input class="input" id="newTableId" required placeholder="Ej. Quality_Status" pattern="[A-Za-z][A-Za-z0-9_]*"></label><label>Nombre visible<input class="input" id="newTableTitle" required placeholder="Estados de calidad"></label><label>Pantalla donde se usa<input class="input" id="newTableOwner" required placeholder="Calidad / Inventory"></label></div><button class="btn primary">Crear estructura</button></form>`);}
function submitSetupTable(){const id=document.getElementById('newTableId').value.trim();if(!/^[A-Za-z][A-Za-z0-9_]*$/.test(id)||state.setupTables[id]||['__proto__','constructor','prototype'].includes(id)){showMsg('Usa un identificador único con letras, números o guion bajo',true);return;}state.setupSchemas[id]={title:document.getElementById('newTableTitle').value.trim(),owner:document.getElementById('newTableOwner').value.trim(),fields:[]};state.setupTables[id]=[];configAudit('Setup table propuesto: '+id);drawSetupDialog(id);}
function openConfigSettings(){configDialog('Settings · Inventario',`${configInfo()}<label class="concept-check"><input type="checkbox" id="mixedLotsSetting" ${state.settings.allowMixedLotsMerge?'checked':''}> Permitir Merge entre distintos lotes de producción</label><p>Valor inicial activado por indicación de Alejandro. Es una opción general de InsectMES; no se presenta como una configuración confirmada de Plex. El contenedor resultante debe conservar los seriales y lotes de origen.</p><p>En esta revisión la opción se demuestra en el evaluador conceptual. La implementación operativa con trazabilidad de varios lotes queda pendiente.</p><button class="btn primary" onclick="state.settings.allowMixedLotsMerge=document.getElementById('mixedLotsSetting').checked;configAudit('Setting: mezcla de lotes');showMsg('Setting guardado');openConfigSettings()">Guardar setting</button> <button class="btn soft" onclick="openConfigGuide()">Probar ejemplo</button>`);}
function openConfigGuide(){
 const opts=(name)=>state.setupTables[name].filter(x=>x.active).map(x=>`<option value="${esc(x.code)}">${esc(x.code)}</option>`).join('');
 configDialog('Cómo se configura el comportamiento',`${configInfo()}<div class="concept-relations"><div><b>Catálogo</b><p>Parte → Tipo de parte<br>Ubicación → Tipo de ubicación<br>Contenedor → Estado<br>Operación → Tipo de operación<br>Workcenter → Estado</p></div><div><b>Setup Table</b><p>Una fila por categoría.<br>Columnas Sí/No, número o texto.<br>Los atributos se consultan al validar una acción.</p></div><div><b>Settings</b><p>Opciones generales por módulo.<br>Ejemplo: permitir mezcla de lotes en Inventario.</p></div></div><h3>Ejemplo para discutir: validar embarque</h3><p>No genera un embarque real. Comprueba Allow Ship en los tres setup tables.</p><div class="form-grid"><label>Tipo de parte<select class="select" id="examplePart">${opts('Item_Type')}</select>${configLink('Item_Type')}</label><label>Tipo de ubicación<select class="select" id="exampleLocation">${opts('Location_Type')}</select>${configLink('Location_Type')}</label><label>Estado de contenedor<select class="select" id="exampleStatus">${opts('Container_Status')}</select>${configLink('Container_Status')}</label></div><button class="btn primary" onclick="evaluateConcept()">Evaluar configuración</button><div id="conceptResult" aria-live="polite"></div><h3>Ejemplo: Merge de distintos lotes</h3><p>Setting actual: <b>${state.settings.allowMixedLotsMerge?'Permitido':'Bloqueado'}</b>. La genealogía de todos los lotes debe conservarse.</p><button class="btn link" onclick="openConfigSettings()">Cambiar setting de inventario</button><h3>Fuentes y acuerdos</h3><p>Kiber: Parts, Detalle de No Parte, Icons B18:B19 y notes A1:A7. MES Rev027: estructura y capturas existentes. Plex Test: distingue Setup Tables y Settings en el menú de pantalla. Las reglas nuevas son propuestas de InsectMES.</p><p>UASLP debe definir: pantalla de uso, dato del catálogo que referencia la categoría, acción afectada, validación, mensajes, permisos e historial de cambios. Agregar una columna por sí solo no implementa una regla.</p>`);
}
function evaluateConcept(){const checks=[['Tipo de parte','Item_Type','examplePart'],['Tipo de ubicación','Location_Type','exampleLocation'],['Estado del contenedor','Container_Status','exampleStatus']].map(([label,t,e])=>({label,row:state.setupTables[t].find(x=>x.code===document.getElementById(e).value)}));const ok=checks.every(x=>x.row?.active&&x.row.allowShip);document.getElementById('conceptResult').innerHTML=`<div class="concept-note"><b>${ok?'Embarque permitido en el ejemplo':'Embarque bloqueado en el ejemplo'}</b><ul>${checks.map(x=>`<li>${esc(x.label)}: ${x.row?.allowShip?'Allow Ship = Sí':'Allow Ship = No'}</li>`).join('')}</ul></div>`;}
openSetupTable=function(name){if(state.setupSchemas[name])openContextSetup(name);else{uiState.setupTable=name;uiState.catalogSection='setup';renderApp();}};

// Navegación y pantallas conceptuales derivadas de Pantallas Demo.xlsx.
const screenRegistry=[
 {id:'home',module:'Inicio',name:'Home',target:'dashboard'},
 {id:'parts',module:'Datos maestros',name:'No Parte',section:'items'},
 {id:'locations',module:'Datos maestros',name:'Locations / Ubicaciones',inventory:'locations'},
 {id:'operations',module:'Datos maestros',name:'Operations / Operaciones',concept:'operations'},
 {id:'wcs',module:'Datos maestros',name:'Workcenters / Centros de trabajo',concept:'workcenters'},
 {id:'routing',module:'Ingeniería',name:'Process Routing / Rutas de proceso',concept:'routing'},
 {id:'bom',module:'Ingeniería',name:'Bill of Materials / BOM',section:'bom'},
 {id:'control',module:'Producción',name:'Control Panel / Flujo BSF',target:'workcenters'},
 {id:'reproduction',module:'Producción',name:'Reproducción',target:'workcenters',area:'Reproducción'},
 {id:'rearing',module:'Producción',name:'Cría / Bioconversión',target:'workcenters',area:'Bioconversión'},
 {id:'receive',module:'Inventario',name:'Recibo',target:'receipts'},
 {id:'inventory',module:'Inventario',name:'Inventory / Contenedores',inventory:'serials'},
 {id:'trace',module:'Inventario',name:'Genealogía / Trazabilidad',target:'genealogy'},
 {id:'setup',module:'Configuración',name:'Setup Tables',section:'setup'},
 {id:'hierarchy',module:'Configuración',name:'Jerarquía de módulos y acciones',concept:'hierarchy'},
 {id:'help',module:'Ayuda',name:'Documentación e iconos',concept:'help'}
];
const bsfFlow=[
 ['EGG','Cosecha de huevos','Reproducción','Cosecha','Huevos','Mesa de recolección','0 días'],
 ['NUR','Guardería','Reproducción','Guardería','5-DOL','Rack ducha','5 días'],
 ['TRA','Transferencia','Bioconversión','Transferencia','Larvero','Transferencia','0 días'],
 ['REA','Engorda','Bioconversión','Crianza','Larvero 17-DOL','Larvero','12 días'],
 ['HAR','Tamizado / Cosecha','Bioconversión','Tamizado','17-DOL + Frass fino + Frass grueso','Tamizadora','0 días'],
 ['WAS','Enjuague','Post-Proceso','Enjuague','Larva enjuagada','Enjuague','Por definir'],
 ['SAN','Neutralizado','Post-Proceso','Sanitizado','Larva sanitizada','Neutralizado','Por definir'],
 ['DRY','Deshidratado','Post-Proceso','Deshidratado','Pop Larvae','Microondas / Horno','Por definir'],
 ['FRA','Fraccionado','Post-Proceso','Fraccionado','Flake Larvae','Fraccionadora','Por definir'],
 ['GRI','Molienda','Post-Proceso','Molienda','BSFL Meal','Molino','Por definir'],
 ['PAC','Empaque','Post-Proceso','Empaque','Producto empacado','Mesa de empaque','Por definir'],
 ['BOX','Embalaje','Post-Proceso','Embalaje','Caja','Mesa de embalaje','Por definir'],
 ['SHP','Embarque','Post-Proceso','Embarque','Entrega','Despacho','Por definir'],
 ['PUP','Pupación','Reproducción','Puparios','Pupas','Pupario','7 días'],
 ['DAR','Jaula oscura','Reproducción','Jaula Oscura','Moscas','Jaula oscura','15 días'],
 ['LOV','Reproducción','Reproducción','Jaula de Reproducción','Huevos','Jaula de reproducción','5 días']
];
let shellScreen='home',conceptScreen='',searchResults=[],shellSession=null;
function initShell(){
 state.favorites ??= ['control','inventory','parts'];state.recents ??= [];state.todos ??= [{text:'Validar ciclo larvario y unidades con UASLP',done:false},{text:'Definir atributos y permisos de cada setup table',done:false}];
 state.messages ??= ['Revisión de diseño: las pantallas nuevas son una propuesta para validar.'];
 state.screenActions ??= Object.fromEntries(screenRegistry.map(x=>[x.id,{view:true,add:true,edit:true,export:true}]));
 state.operatorDrafts ??= [];
 TITLES.dashboard='Home';TITLES.workcenters='Control Panel';
}
function loginScreen(){const el=document.createElement('section');el.id='demoLogin';el.innerHTML=`<div class="login-card"><small>INSETTI / MES</small><h1>InsectMES</h1><p>Acceso a la demo de pantallas para UASLP</p><form onsubmit="event.preventDefault();enterDemo()"><label>Compañía<input class="input" id="loginCompany" value="Insetti" required></label><label>Nombre de usuario<input class="input" id="loginUser" value="Alejandro" required></label><label>Perfil de demostración<select class="select" id="loginRole"><option>Administrador</option><option>Operador</option><option>Consulta</option></select></label><button class="btn primary">Entrar a la demo</button></form><p class="small">Acceso simulado. No solicita contraseñas reales ni autentica usuarios. La seguridad del sistema debe implementarse en el backend.</p></div>`;document.body.append(el);}
function enterDemo(){shellSession={company:document.getElementById('loginCompany').value.trim(),user:document.getElementById('loginUser').value.trim(),role:document.getElementById('loginRole').value};sessionStorage.setItem(SESSION_KEY,JSON.stringify(shellSession));document.getElementById('demoLogin')?.remove();renderApp();hideSidebar();}
function logoutDemo(){sessionStorage.removeItem(SESSION_KEY);shellSession=null;closeIfOpen();loginScreen();}
function navigateScreen(id){const x=screenRegistry.find(x=>x.id===id);if(!x)return;shellScreen=id;conceptScreen=x.concept||'';uiState.activeArea=x.area||'';uiState.activeProcess='';if(x.section){currentView='catalogs';uiState.catalogSection=x.section;uiState.itemMode='list';}else if(x.inventory){currentView='inventory';uiState.inventorySubsection=x.inventory;}else currentView=x.target||'catalogs';state.recents=[id,...state.recents.filter(x=>x!==id)].slice(0,20);saveState();closeIfOpen();renderApp();hideSidebar();}
const configuredRender=renderApp;
renderApp=function(){initShell();configuredRender();renderShell();if(conceptScreen)renderConceptScreen();};
function screenName(){const x=screenRegistry.find(x=>x.id===shellScreen);if(currentView==='catalogs'&&uiState.catalogSection==='items'&&uiState.itemMode==='form')return 'Detalle de No Parte';if(currentView==='workcenters'&&uiState.activeProcess)return 'Control Panel / '+uiState.activeProcess;return x?.name||TITLES[currentView];}
function renderShell(){
 document.querySelector('.brand-title').textContent='InsectMES';
 document.querySelector('.topbar').innerHTML=`<div class="shell-identity"><button class="btn soft" aria-label="Abrir menú de módulos" onclick="showSidebar()">☰</button><button class="btn link" onclick="navigateScreen('home')"><b>InsectMES</b></button><span>${esc(shellSession?.user||'Alejandro')}</span><span>${esc(shellSession?.company||'Insetti')}</span><b id="pageTitle">${esc(screenName())}</b></div><div class="shell-tools"><button class="btn soft" aria-label="Pantallas recientes" title="Recientes" onclick="showScreenList('Recientes',state.recents)">◷</button><button class="btn soft" aria-label="Favoritos" title="Favoritos" onclick="showScreenList('Favoritos',state.favorites)">☆</button><button class="btn soft" aria-label="Configuración de pantalla" title="Configuración" onclick="showScreenConfig()">⚙</button><button class="btn soft" aria-label="Ayuda" title="Ayuda" onclick="navigateScreen('help')">?</button><div class="goto-wrap"><input class="input" id="goToInput" placeholder="Go to… buscar pantalla" aria-label="Go to buscar pantalla" oninput="searchScreens(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();showSearchResults(this.value)}"><div id="goToResults"></div></div><button class="btn link" onclick="logoutDemo()">Salir</button></div>`;
 document.getElementById('nav').innerHTML=Object.entries(Object.groupBy(screenRegistry,x=>x.module)).map(([module,screens])=>`<details open><summary>${esc(module)}</summary>${screens.map(x=>`<button class="nav-btn ${x.id===shellScreen?'active':''}" onclick="navigateScreen('${x.id}')">${esc(x.name)}</button>`).join('')}</details>`).join('');
 const side=document.getElementById('sidebarShowBtn');side.textContent='☰';side.setAttribute('aria-label','Abrir menú');side.style.display='none';
 if(currentView==='dashboard')renderHome();
 if(currentView==='workcenters'&&!uiState.activeArea)renderBsfFlow();
}
function showScreenList(title,ids){configDialog(title,`<div class="actionbar"><button class="btn primary" onclick="toggleFavorite()">${state.favorites.includes(shellScreen)?'Quitar pantalla actual de favoritos':'Agregar pantalla actual a favoritos'}</button></div><ul class="screen-list">${ids.map(id=>screenRegistry.find(x=>x.id===id)).filter(Boolean).map(x=>`<li><button class="btn link" onclick="navigateScreen('${x.id}')">${esc(x.name)}</button></li>`).join('')||'<li>Sin pantallas todavía.</li>'}</ul>`);}
function toggleFavorite(){if(state.favorites.includes(shellScreen))state.favorites=state.favorites.filter(x=>x!==shellScreen);else state.favorites.push(shellScreen);saveState();showScreenList('Favoritos',state.favorites);}
function searchScreens(query){searchResults=query.trim()?screenRegistry.filter(x=>(x.name+' '+x.module).toLowerCase().includes(query.toLowerCase())):[];document.getElementById('goToResults').innerHTML=searchResults.slice(0,10).map(x=>`<button onclick="navigateScreen('${x.id}')">${esc(x.name)}</button>`).join('');}
function showSearchResults(query){searchScreens(query);configDialog('Resultados de Go to: '+query,`<p>${searchResults.length} pantallas encontradas</p>${searchResults.map(x=>`<p><button class="btn link" onclick="navigateScreen('${x.id}')">${esc(x.module+' / '+x.name)}</button></p>`).join('')}`);}
function showScreenConfig(){configDialog('Configuración de '+screenName(),`<p>Acceso contextual a Setup Tables, Settings y acciones de pantalla.</p><div class="actionbar">${['Item_Type','Location_Type','Operation_Type','Workcenter_Status','Container_Status'].map(configLink).join('')}</div><button class="btn soft" onclick="openConfigSettings()">Settings de inventario</button> <button class="btn soft" onclick="navigateScreen('hierarchy')">Jerarquía y acciones</button>`);}
function renderHome(){document.getElementById('view-dashboard').innerHTML=`<div class="home-brand"><img alt="Insetti" style="width:260px;max-width:80%;margin:auto" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAEEMAAAfXCAYAAAAqbBZjAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nOzcMQEAIADDMMC/52GjR2Khf++2AwAAAAAAAAAAAAAAAAAAAFDxlAAAAAAAAAAAAAAAAAAAAABKzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAAIMUMAQAAAAAAAAAAAAAAAAAAAEgxQwAAAAAAAAAAAAAAAAAAAABSzBAAAAAAAAAAAAAAAAAAAACAFDMEAAAAAAAAAAAAAAAAAAAA+OzcsQAAAADAIH/raewokFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAHtuXGoAACAASURBVAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAA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AAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAAAAAAAAAAAAAAAAAAACqIoYAAAAAAAAAAAAAAAAAAAAAVEUMAQAAAAAAAAAAAAAAAAAAAKiKGAIAAAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAAAAAAAAAAAAAAAAAAACqIoYAAAAAAAAAAAAAAAAAAAAAVEUMAQAAAAAAAAAAAAAAAAAAAKiKGAIAAAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAAAAAAAAAAAAAAAAAAACqIoYAAAAAAAAAAAAAAAAAAAAAVEUMAQAAAAAAAAAAAAAAAAAAAKiKGAIAAAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAAAAAAAAAAAAAAAAAAACqIoYAAAAAAAAAAAAAAAAAAAAAVEUMAQAAAAAAAAAAAAAAAAAAAKiKGAIAAAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAAAAAAAAAAAAAAAAAAACqIoYAAAAAAAAAAAAAAAAAAAAAVEUMAQAAAAAAAAAAAAAAAAAAAKiKGAIAAAAAAAAAAAAAAAAAAABQFTEEAAAAAAAAAAAAAAAAAAAAoCpiCAAAAAAAAAAAAAAAAAAAAEBVxBAAAAAAAAAAAAAAAAAAAACAqoghAAAAAAAAAAAAAAAAAAAAAFURQwAAgOFdW2MAAAAAAAAAAAAAAACApxNDAACA4d1ZY+illK4sBQAAAAAA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AAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAABq3D+XAAAgAElEQVQAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAAAAAAAAAAAAAAAAAAhFDAEAAAAAAAAAAAAAAAAAAAAIRQwBAAAAAAAAAAAAAAAAAAAACEUMAQAAAPgfO3csAAAAADDI33oaOwokAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAAAAAAAAAAAAAAAAFiRIQAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAABgRYYAAAAAAAAAAAAAAAAAAAAArMgQAAAAAAAAAAAAAAAAAAAAgBUZAgAAAAAAAAAAAAAAAAAAALAiQwAAAAAAAAAAAAAAAAAAAABWZAgAAAAAAAAAAAAAAAAAAADAigwBAAAAAAAAAAAAAAAAAAAAWJEhAAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAAGBFhgAAAAAAAAAAAAAAAAAAAACsyBAAAAAAAAAAAAAAAAAAAACAFRkCAAAAAAAAAAAAAAAAAAAAsCJDAAAAAAAAAAAAAAAAAAAAAFZkCAAAAAAAAAAAAAAAAAAAAMCKDAEAAAAAAAAAAAAAAAAAAABYkSEAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAYEWGAAAAAAAAAAAAAAAAAAAAAKzIEAAAAAAAAAAAAAAAAAAAAIAVGQIAAAAAAAAAAAAAAAAAAACwIkMAAAAAAAAAAAAAAAAAAAAAVmQIAAAAAAAAAAAAAAAAAAAAwIoMAQAAAAConTsmAAAAQBhk/9TW2AFBAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAAAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAAJAiQwAAAAAAAAAAAAAAAAAAAABSZAgAAAAAAAAAAAAAAAAAAABAigwBAAAAAAAAAAAAAAAAAAAASJEhAAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACBFhgAAAAAAAAAAAAAAAAAAAACkyBAAAAAAAAAAAAAAAAAAAACAFBkCAAAAAAAAAAAAAAAAAAAAkCJDAAAAAAAAAAAAAAAAAAAAAFJkCAAAAAAAAAAAAAAAAAAAAECKDAEAAAAAAAAAAAAAANzn0gkAAAD9SURBVAAAAABIkSEAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIEWGAAAAAAAAAAAAAAAAAAAAAKTIEAAAAAAAAAAAAAAAAAAAAIAUGQIAAAAAAAAAAAAAAAAAAACQIkMAAAAAAAAAAAAAAAAAAAAAUmQIAAAAAAAAAAAAAAAAAAAAQIoMAQAAAAAAAAAAAAAAAAAAAEiRIQAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgRYYAAAAAAAAAAAAAAAAAAAAApMgQAAAAAAAAAAAAAAAAAAAAgBQZAgAAAAAAAAAAAAAAAAAAANCx7duGGHXJTnflAAAAAElFTkSuQmCC"><span>Bioconversión · Black Soldier Fly</span></div><div class="grid home-grid"><div class="card"><div class="card-head"><div class="card-title">Mensajes</div></div><div class="card-body">${state.messages.map(x=>`<p>${esc(x)}</p>`).join('')}<small>Mensajes ilustrativos de la demo.</small></div></div><div class="card"><div class="card-head"><div class="card-title">To-dos / Pendientes</div></div><div class="card-body">${state.todos.map((x,i)=>`<label class="concept-check"><input type="checkbox" ${x.done?'checked':''} onchange="state.todos[${i}].done=this.checked;saveState()">${esc(x.text)}</label>`).join('')}<form onsubmit="event.preventDefault();const e=document.getElementById('newTodo');if(e.value.trim()){state.todos.push({text:e.value.trim(),done:false});saveState();renderApp()}"><input id="newTodo" class="input" aria-label="Nuevo pendiente" placeholder="Agregar pendiente"><button class="btn link">Agregar</button></form></div></div><div class="card"><div class="card-head"><div class="card-title">Favoritos</div></div><div class="card-body">${state.favorites.map(id=>screenRegistry.find(x=>x.id===id)).filter(Boolean).map(x=>`<p><button class="btn link" onclick="navigateScreen('${x.id}')">${esc(x.name)}</button></p>`).join('')}</div></div><div class="card"><div class="card-head"><div class="card-title">Accesos de operación</div></div><div class="card-body quick-home">${[['reproduction','Reproducción'],['rearing','Cría'],['control','Control Panel'],['inventory','Inventario']].map(([id,n])=>`<button class="quick-btn" onclick="navigateScreen('${id}')"><b>${n}</b></button>`).join('')}</div></div><div class="card"><div class="card-head"><div class="card-title">Validación UASLP</div></div><div class="card-body"><p>Catálogos, relaciones, configuración y captura del operador.</p><button class="btn primary" onclick="openConfigGuide()">Entender Setup Tables y Settings</button></div></div><div class="card"><div class="card-head"><div class="card-title">Últimas pantallas</div></div><div class="card-body">${state.recents.slice(0,5).map(id=>screenRegistry.find(x=>x.id===id)).filter(Boolean).map(x=>`<p><button class="btn link" onclick="navigateScreen('${x.id}')">${esc(x.name)}</button></p>`).join('')||'<p>Las pantallas que visites aparecerán aquí.</p>'}</div></div></div>`;}
function renderBsfFlow(){document.getElementById('view-workcenters').innerHTML=`${contextBar()}<div class="concept-note"><b>Control Panel · Ciclo de la larva</b><p>Selecciona un proceso para abrir su panel. La cosecha de huevos inicia el lote de producción; los seriales identifican contenedores. Duraciones tomadas del flujo BSF de referencia, pendientes de validación operativa.</p></div><div class="bsf-flow">${bsfFlow.slice(0,13).map((x,i)=>`<button class="flow-card" onclick="openBsfPanel('${x[0]}')"><small>${String((i+1)*10).padStart(2,'0')} · ${esc(x[2])}</small><b>${esc(x[1])}</b><span>Salida: ${esc(x[4])}</span><span>WC: ${esc(x[5])}</span><small>${esc(x[6])} <strong>→</strong></small></button>`).join('')}</div><h3>Retorno a reproducción</h3><div class="bsf-flow">${bsfFlow.slice(13).map(x=>`<button class="flow-card" onclick="openBsfPanel('${x[0]}')"><b>${esc(x[1])}</b><span>${esc(x[4])} · ${esc(x[5])}</span><small>${esc(x[6])} →</small></button>`).join('')}</div><p>Preparación de alimento: Recolección → Recibo → Triturado → Mezcla → Preparación premium. Disponible como flujo auxiliar de la propuesta.</p><button class="btn soft" onclick="uiState.activeArea='Pre-Tratamiento';renderApp()">Abrir preparación de alimento</button>`;}
function openBsfPanel(code){const p=bsfFlow.find(x=>x[0]===code);configDialog('Control Panel / '+p[1],`<p><b>Workcenter:</b> ${esc(p[5])} · <b>Salida:</b> ${esc(p[4])}</p><div class="concept-note">Borrador de captura. Guardar conserva un ejemplo de pantalla; no consume inventario ni genera seriales de producción. Estas validaciones deben implementarse después de acordar Routing y BOM.</div><form onsubmit="event.preventDefault();saveOperatorDraft('${code}')"><div class="form-grid"><label>Workcenter<input class="input" id="draftWC" value="${esc(p[5])}" required></label><label>Seriales de entrada<input class="input" id="draftInputs" placeholder="Escanear o seleccionar contenedores"></label><label>Lote de producción<input class="input" id="draftLot" placeholder="${code==='EGG'?'Se genera al reportar cosecha':'Se hereda de los seriales de entrada'}"></label><label>Cantidad de salida<input class="input" type="number" min="0.001" step="any" id="draftQty" required></label><label>Unidad<select class="select" id="draftUnit"><option>kg</option><option>g</option><option>pc</option></select></label><label>Notas<input class="input" id="draftNotes" placeholder="Jaula, bandeja, merma o referencia"></label></div><div class="actionbar"><button class="btn primary">Guardar ejemplo de captura</button>${configLink('Operation_Type')}${configLink('Container_Status')}</div></form><h3>Últimos ejemplos</h3>${state.operatorDrafts.filter(x=>x.process===code).slice(0,3).map(x=>`<p>${esc(x.qty+' '+x.unit+' · '+x.workcenter+' · '+x.lot)}</p>`).join('')}`);}
function saveOperatorDraft(code){const get=id=>document.getElementById(id).value;state.operatorDrafts.unshift({process:code,workcenter:get('draftWC'),inputs:get('draftInputs'),lot:get('draftLot'),qty:Number(get('draftQty')),unit:get('draftUnit'),notes:get('draftNotes'),at:new Date().toISOString()});saveState();openBsfPanel(code);showMsg('Ejemplo de captura guardado');}
function renderConceptScreen(){const el=document.getElementById('view-'+currentView);if(conceptScreen==='hierarchy'){el.innerHTML=`<div class="card"><div class="card-head"><div class="card-title">Jerarquía de módulos y acciones</div></div><div class="card-body"><p>Propuesta de configuración: módulo → pantalla → acciones. Los detalles se abren desde los resultados, sin aparecer como entradas independientes en el menú. Esta matriz documenta acciones disponibles; los permisos por rol requieren una matriz adicional y validación del servidor.</p><div class="table-wrap"><table><thead><tr><th>Módulo</th><th>Pantalla</th>${['view','add','edit','export'].map(x=>`<th>${({view:'Ver',add:'Agregar',edit:'Editar',export:'Exportar'})[x]}</th>`).join('')}</tr></thead><tbody>${screenRegistry.map(x=>`<tr><td>${esc(x.module)}</td><td>${esc(x.name)}</td>${['view','add','edit','export'].map(a=>`<td><input type="checkbox" aria-label="${esc(x.name+' '+a)}" ${state.screenActions[x.id][a]?'checked':''} onchange="state.screenActions['${x.id}']['${a}']=this.checked;configAudit('Acción propuesta: ${x.id} / ${a}')"></td>`).join('')}</tr>`).join('')}</tbody></table></div><p>Las casillas guardan la propuesta para UASLP. No representan seguridad implementada.</p></div></div>`;return;}
 if(conceptScreen==='help'){el.innerHTML=`<div class="card"><div class="card-head"><div class="card-title">Documentación y significado de iconos</div></div><div class="card-body">${table(['Control','Función'],[['☰','Módulos y pantallas por jerarquía'],['◷','Últimas 20 pantallas visitadas'],['☆','Favoritos del navegador de demo'],['⚙','Setup Tables, Settings y acciones'],['?','Documentación, glosario y videos'],['Go to…','Buscar por nombre; Enter muestra todos los resultados']].map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`))}<p>Los videos y documentación operativa se enlazarán cuando estén disponibles.</p><button class="btn primary" onclick="openConfigGuide()">Guía conceptual de configuración</button></div></div>`;return;}
 const title={operations:'Operations / Operaciones',workcenters:'Workcenters / Centros de trabajo',routing:'Process Routing / Rutas de proceso'}[conceptScreen];
 const data=bsfFlow.map((x,i)=>conceptScreen==='operations'?[x[0],x[1],x[2]]:conceptScreen==='workcenters'?['WC-'+x[0],x[5],x[2],'WC-'+x[0]]:[(i<5?['BSF002','BSF004','WIP-LAR','WIP-LAR','BSF005'][i]:'Por definir'),String((i+1)*10),x[1],x[5],x[4]]);
 const heads=conceptScreen==='operations'?['Código propuesto','Operación','Área']:conceptScreen==='workcenters'?['Código propuesto','Workcenter','Área','Location por defecto']:['Parte de salida','Op No ilustrativo','Operación','Workcenter','Salida / BOM por definir'];
 el.innerHTML=`<div class="card"><div class="card-head"><div class="card-title">${title}</div></div><div class="card-body"><p>Propuesta tomada del flujo BSF. Códigos y relaciones pendientes de acordar con UASLP. El número de operación debe definirse por parte; no es una secuencia global.</p><div class="filters"><label>Buscar<input class="input" aria-label="Filtrar propuesta" oninput="filterProposal(this.value)"></label></div><div class="actionbar"><button class="btn soft" onclick="exportProposal()">Exportar</button>${configLink(conceptScreen==='workcenters'?'Workcenter_Status':'Operation_Type')}</div>${table(heads,data.map((row,i)=>`<tr class="proposal-row"><td><button class="btn link" onclick="proposalDetail(${i})">${esc(row[0])}</button></td>${row.slice(1).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`))}</div></div>`;
}
function filterProposal(text){document.querySelectorAll('.proposal-row').forEach(x=>x.hidden=!x.textContent.toLowerCase().includes(text.toLowerCase()));}
function proposalDetail(i){const p=bsfFlow[i];configDialog('Detalle / '+p[1],`<p>Operación: ${esc(p[1])}<br>Área: ${esc(p[2])}<br>Workcenter: ${esc(p[5])}<br>Salida: ${esc(p[4])}</p><p>La relación se valida por número de parte en Process Routing; el BOM se construye por parte y operación. Cada workcenter tendrá su Location.</p><div class="actionbar">${configLink('Operation_Type')}${configLink('Workcenter_Status')}<button class="btn primary" onclick="openBsfPanel('${p[0]}')">Ver Control Panel</button></div>`);}
function exportProposal(){exportRows('propuesta-flujo-bsf.csv',['Operación','Descripción','Área','Salida','Workcenter'],bsfFlow.map(x=>[x[0],x[1],x[2],x[4],x[5]]));}
const originalItems=renderItemsCatalog;
renderItemsCatalog=function(){const html=originalItems();if(uiState.itemMode==='form')return html;return html.replace('<div class="actionbar">',`<form class="ops-filters" aria-label="Filtros de Parts" onsubmit="searchParts34(event)" onreset="clearParts34(event)"><div class="ops-fields"><label class="field">Parte o descripción<input class="input" id="partFilter" value="${esc(partsQuery34)}"></label></div><div class="ops-filter-actions"><button class="btn soft" type="reset">Limpiar</button><button class="btn primary" type="submit">Buscar</button></div></form><div class="actionbar">`).replace(/onclick="selectItemRow\((\d+)\)"/g,'onclick="uiState.itemSelectedIndex=$1;uiState.itemEditIndex=$1;uiState.itemMode=\'form\';renderApp()"').replace(/(<tr class="data-row [^"]*" onclick="[^"]*">)<td>(.*?)<\/td>/g,'$1<td><button class="btn link">$2</button></td>');};
initShell();
try{shellSession=JSON.parse(sessionStorage.getItem(SESSION_KEY));}catch{}
if(!shellSession)loginScreen();
goHome=function(){navigateScreen('home');};
const originalLocations=renderInventoryLocations;
renderInventoryLocations=function(){originalLocations();if(uiState.locationMode==='form'){const r=uiState.locationEditIndex!==null?state.setupTables.Locations[uiState.locationEditIndex]:null;document.querySelector('#view-inventory .capture .form-grid').insertAdjacentHTML('beforeend',`<label>Tipo de ubicación<select class="select" id="loc_type">${state.setupTables.Location_Type.filter(x=>x.active).map(x=>`<option ${x.code===(r?.locationType||'Almacén')?'selected':''}>${esc(x.code)}</option>`).join('')}</select>${configLink('Location_Type')}</label>`);}};

