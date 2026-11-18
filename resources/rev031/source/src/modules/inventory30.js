const internalInventory30 = {buildings:'locations',areas:'locations','unit-conversion':'units'};
for (const [id,parent] of Object.entries(internalInventory30)) {
  const names = {buildings:'Edificios',areas:'Áreas','unit-conversion':'Unit Conversion'};
  screenRegistry.push({id,module:'Inventario',name:names[id],concept:'inventory-settings30'});
  inheritedAccess29[id] = parent;
}
function subAction30(label,id) {
  return !menuLabels29.has(id) && levelFor(id) ? '<button class="btn r30-sub-action" type="button" data-page="' + id +
    '" onclick="navigateScreen(this.dataset.page)">' + esc(label) + ' <span aria-hidden="true">↗</span></button>' : '';
}
function facility30() {
  if (state.facility30?.initialSitesAdded) return state.facility30;
  const buildings = [...(state.facility30?.buildings || [])];
  const areas = [...(state.facility30?.areas || [])];
  function ensureSite(rows, code, name, building) {
    const existing = rows.find(row => row.building === building &&
      row.name.localeCompare(name,'es',{sensitivity:'base'}) === 0);
    if (existing) return existing;
    const prefix = code;
    for (let i = 2; rows.some(row => row.code.toUpperCase() === code); i++) code = prefix + '-' + i;
    const row = building ? {code,name,building} : {code,name};
    rows.push(row);
    return row;
  }
  const insetti = ensureSite(buildings,'INSETTI','Insetti');
  ensureSite(buildings,'MERCADO-LIBRE','Mercado Libre');
  ensureSite(buildings,'AMAZON','Amazon');
  ensureSite(areas,'ALM','Almacén',insetti.code);
  const production = ensureSite(areas,'PROD','Producción',insetti.code);
  state.facility30 = {buildings,areas,initialSitesAdded:true,
    defaultBuilding:insetti.code,defaultArea:production.code};
  return state.facility30;
}
function facilityLabel30(code,kind='areas') {
  return facility30()[kind].find(row => row.code === code)?.name || '';
}
function facilityForLocation30(location) {
  const area = facility30().areas.find(row => row.code === location?.area);
  return {area:area?.code || '',building:area?.building || ''};
}
function inventoryFacilityLabels30(code) {
  const location = state.setupTables.Locations.find(row => row.code === code);
  const {building,area} = facilityForLocation30(location);
  return {
    building:facilityLabel30(building,'buildings') || building,
    area:facilityLabel30(area) || area,
  };
}
const selectedFacility30 = new Map();
function refreshFacilityEdit30(grid) {
  const selected = selectedFacility30.get(shellScreen);
  const edit = grid.closest('.card-body')?.querySelector('[data-facility-edit30]');
  if (!edit) return;
  let visibleSelection = false;
  for (const row of grid.querySelectorAll('[data-facility-code30]')) {
    const isSelected = row.dataset.facilityCode30 === selected;
    row.classList.toggle('selected',isSelected);
    if (isSelected && !row.hidden) visibleSelection = true;
  }
  edit.disabled = !visibleSelection;
}
function selectFacilityRow30(row) {
  selectedFacility30.set(shellScreen,row.dataset.facilityCode30);
  refreshFacilityEdit30(row.closest('table'));
}
function editSelectedFacility30() {
  if (!requireLevel(2) || !['buildings','areas'].includes(shellScreen)) return;
  const code = selectedFacility30.get(shellScreen);
  const index = facility30()[shellScreen].findIndex(row => row.code === code);
  if (index >= 0) editInventorySettings30(index);
}
function renderInventorySettings30() {
  const type = shellScreen;
  const facilities = type === 'buildings' || type === 'areas';
  const names = {buildings:'Edificios',areas:'Áreas','unit-conversion':'Unit Conversion'};
  const data = type === 'unit-conversion' ? (state.unitConversions30 || []) : facility30()[type];
  const columns = type === 'buildings' ? ['Código','Edificio'] :
    type === 'areas' ? ['Código','Área','Edificio'] : ['Origen','Destino','Factor'];
  const rows = data.map((row,index) => {
    const values = type === 'buildings' ? [row.code,row.name] :
      type === 'areas' ? [row.code,row.name,facilityLabel30(row.building,'buildings')] : [row.from,row.to,row.factor];
    const rowAttributes = facilities ? ' class="data-row" data-facility-code30="'+esc(row.code)+'" onclick="selectFacilityRow30(this)"' : '';
    return '<tr'+rowAttributes+'>' + values.map((value,i) => '<td>' + (i === 0 ? '<button class="btn link" type="button" data-index="' +
      index + '" onclick="editInventorySettings30(Number(this.dataset.index))">' + esc(String(value)) + '</button>' : esc(String(value))) +
      '</td>').join('') + '</tr>';
  });
  document.getElementById('view-' + currentView).innerHTML = cardNavigation29(names[type],
    '<div class="actionbar">' + (levelFor() >= 2 ? '<button class="btn primary" type="button" onclick="editInventorySettings30()">Agregar</button>' +
      (facilities ? '<button class="btn soft" type="button" data-facility-edit30 onclick="editSelectedFacility30()" disabled>Editar</button>' : '') : '') +
    '</div>' +
    (type === 'unit-conversion' ? '<p class="ops-method">Cantidad destino = cantidad origen × factor. La conversión inversa se calcula automáticamente.</p>' : '') +
    resultsTable30(columns,rows,'460px'));
}
function editInventorySettings30(index) {
  if (!requireLevel(index === undefined ? 2 : 1)) return;
  const type = shellScreen;
  const conversion = type === 'unit-conversion';
  const data = conversion ? (state.unitConversions30 || []) : facility30()[type];
  const existing = data[index];
  const editable = levelFor() >= 2;
  const units = state.units.map(x => [x.code,x.code + ' · ' + x.description]);
  const fields = conversion ? [
    choice29('from','Unidad origen',units,true),choice29('to','Unidad destino',units,true),
    field29('factor','Factor','number',{required:true,min:0.000000001}),
  ] : [
    field29('code','Código','text',{required:true}),
    field29('name',type === 'buildings' ? 'Nombre del edificio' : 'Nombre del área','text',{required:true}),
    ...(type === 'areas' ? [choice29('building','Edificio',facility30().buildings.map(x => [x.code,x.name]),true)] : []),
  ];
  if (type === 'areas' && !facility30().buildings.length) return showMsg('Primero da de alta un edificio.',true);
  configDialog(conversion ? 'Conversión de unidades' : (type === 'buildings' ? 'Edificio' : 'Área'),
    '<form class="ops-dialog" data-index="' + (index ?? '') + '" data-original-code="'+esc(existing?.code || '')+
    '" onsubmit="saveInventorySettings30(event)">' +
    '<fieldset class="ops-fields"' + (editable ? '' : ' disabled') + '>' +
    fields.map(field => operationsField29(field,existing?.[field.key])).join('') + '</fieldset>' +
    (editable ? '<p class="ops-inline-error30" role="alert" hidden></p>'+
      '<div class="capture-actions"><button class="btn primary">Guardar</button></div>' : '') + '</form>');
}
const standardAmount30 = amountIn30;
amountIn30 = function (qty,from,to) {
  try { return standardAmount30(qty,from,to); }
  catch (error) {
    if (!Number.isFinite(qty) || qty <= 0 || !from || !to) throw error;
    for (const row of state.unitConversions30 || []) {
      if (row.from.toLowerCase() === from.toLowerCase() && row.to.toLowerCase() === to.toLowerCase()) return qty * row.factor;
      if (row.to.toLowerCase() === from.toLowerCase() && row.from.toLowerCase() === to.toLowerCase()) return qty / row.factor;
    }
    throw error;
  }
};
function saveInventorySettings30(event) {
  event.preventDefault();
  if (!requireLevel(2)) return;
  const type = shellScreen;
  const form = event.currentTarget;
  const record = readOperationsForm29(form.querySelector('fieldset'));
  const storage = facility30();
  const data = type === 'unit-conversion' ? (state.unitConversions30 || []) : storage[type];
  const index = form.dataset.index === '' ? -1 : Number(form.dataset.index);
  if (type === 'unit-conversion') {
    record.factor = Number(record.factor);
    const from = record.from.toLowerCase(),to = record.to.toLowerCase();
    if (from === to || !Number.isFinite(record.factor) || record.factor <= 0) return showMsg('Elige unidades distintas y un factor mayor que cero.',true);
    let standard = false;
    try { standardAmount30(1,from,to); standard = true; } catch {}
    if (standard || data.some((x,i) => i !== index &&
      [x.from.toLowerCase(),x.to.toLowerCase()].sort().join('|') === [from,to].sort().join('|')))
      return showMsg('La conversión o su inversa ya existen.',true);
  } else return saveFacilityRecord30(type,record,form);
  if (index < 0) data.push(record);
  else data[index] = record;
  state.unitConversions30 = data;
  saveState();
  closeConfigDialog();
  showMsg('Registro guardado.');
}
function saveFacilityRecord30(type,record,form) {
  const oldFacility = facility30();
  const oldLocations = state.setupTables.Locations;
  const code = form.dataset.originalCode;
  const index = code ? oldFacility[type].findIndex(row => row.code === code) : -1;
  const feedback = form.querySelector('[role=alert]');
  const fail = text=>{ feedback.textContent=text; feedback.hidden=false; };
  if (code && index < 0) return fail('El registro ya no está disponible.');
  if (!record.code || !record.name || oldFacility[type].some((row,i) => i !== index && row.code.toUpperCase() === record.code.toUpperCase()))
    return fail('Captura un código único y un nombre.');
  if (type === 'areas' && !oldFacility.buildings.some(row => row.code === record.building)) return fail('Selecciona un edificio.');

  const next = structuredClone(oldFacility);
  let locations = oldLocations;
  if (index < 0) next[type].push(record);
  else {
    next[type][index] = {...next[type][index],...record};
    if (type === 'buildings' && code !== record.code) {
      for (const area of next.areas) if (area.building === code) area.building = record.code;
      if (next.defaultBuilding === code) next.defaultBuilding = record.code;
    }
    if (type === 'areas') {
      if (code !== record.code) locations = oldLocations.map(row => row.area === code ? {...row,area:record.code} : row);
      if (next.defaultArea === code) {
        next.defaultArea = record.code;
        next.defaultBuilding = record.building;
      }
    }
  }
  state.facility30 = next;
  state.setupTables.Locations = locations;
  try { saveState(); }
  catch {
    state.facility30 = oldFacility;
    state.setupTables.Locations = oldLocations;
    return fail('No se pudieron guardar los cambios.');
  }
  selectedFacility30.set(type,record.code);
  closeConfigDialog();
  showMsg('Registro guardado.');
}
const locationsBefore30 = renderInventoryLocations;
renderInventoryLocations = function () {
  locationsBefore30();
  const view = document.getElementById('view-inventory');
  const action = view.querySelector('.card:not(.capture) .actionbar');
  action?.insertAdjacentHTML('beforeend',subAction30('Edificios','buildings') + subAction30('Áreas','areas'));
  const form = view.querySelector('.capture .form-grid');
  if (form && document.getElementById('loc_code')) {
    const current = state.setupTables.Locations[uiState.locationEditIndex]?.area;
    const fields = facility30().areas.map(row => [row.code,row.name + ' · ' + facilityLabel30(row.building,'buildings')]);
    form.insertAdjacentHTML('beforeend',operationsField29(choice29('area','Área (opcional)',fields),current));
  }
};
const unitsBefore30 = renderUnitsCatalog;
renderUnitsCatalog = function () {
  const html = unitsBefore30();
  return uiState.unitMode === 'form' ? html : html.replace('<div class="actionbar">','<div class="actionbar">' +
    subAction30('Unit Conversion','unit-conversion'));
};

function traceContainer30() {
  if (!requireLevel(1,'trace')) return;
  const selected = selectedRows30(shellScreen);
  if (selected.length === 1) navigateScreen('trace',selected[0]);
}
function sizeInventoryGrid30() {
  const wrapper = document.querySelector('#view-inventory.active .r30-stock-grid');
  if (wrapper) wrapper.style.maxHeight = Math.max(164,innerHeight - wrapper.getBoundingClientRect().top - 32) + 'px';
}
window.addEventListener('resize',sizeInventoryGrid30);
const stockBefore30 = renderInventory;
renderInventory = function () {
  stockBefore30();
  if (uiState.inventorySubsection === 'locations' || !['inventory','containers'].includes(shellScreen)) return;
  const grid = gridTable34();
  if (!grid) return;
  const wrapper = grid.closest('.table-wrap');
  wrapper.classList.add('r30-stock-grid');
  wrapper.tabIndex = 0;
  wrapper.setAttribute('aria-label','Resultados de inventario');
  requestAnimationFrame(sizeInventoryGrid30);
};
const priorInventoryConcept30 = renderConceptScreen;
renderConceptScreen = function () {
  if (conceptScreen === 'inventory-settings30') return renderInventorySettings30();
  priorInventoryConcept30();
};

