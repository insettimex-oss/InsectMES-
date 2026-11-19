const engineeringScreens29 = {operations:'operation',workcenters:'center',routing:'route'};
const engineeringPermissions29 = {part:'parts',operation:'operations',center:'wcs',route:'routing',bom:'bom'};
const engineeringCollections29 = {part:'parts',operation:'operations',center:'centers',route:'routes',bom:'bom'};
const engineeringFilters29 = new Map();

function engineeringData29() {
  if (state.engineering29) return state.engineering29;
  const operations = new Map();
  const centers = new Map();
  const nextSequence = new Map();
  const routes = [];
  const areas = new Map(bsfFlow.map(([code,,area]) => [code,area]));
  for (const op of state.cpOperations) {
    const area = op.area || areas.get(op.code) || '';
    operations.set(op.code,{code:op.code,name:op.name,area,active:true});
    centers.set(op.wc,{code:op.wc,label:op.workcenter,location:op.wc,area,active:true});
    if (!getPart(op.part)) continue;
    const sequence = (nextSequence.get(op.part) || 0) + 10;
    nextSequence.set(op.part,sequence);
    routes.push({id:'BASE-' + op.code,part:op.part,revision:'A',sequence,operation:op.code,centers:[op.wc],
      description:'',note:'',active:true});
  }
  state.engineering29 = {operations:[...operations.values()],centers:[...centers.values()],routes};
  return state.engineering29;
}

function engineeringSnapshot29() {
  const {operations,centers,routes} = engineeringData29();
  const {setupTables} = state;
  return structuredClone({operations,centers,routes,parts:state.parts,bom:setupTables.Bom,
    locations:setupTables.Locations,units:state.units,itemTypes:setupTables.Item_Type,prefixes:setupTables.Serial_Prefix,
    jobs:state.operationsDesk29?.jobs || [],facility:facility30()});
}
function centerFacility29(center) {
  return facilityForLocation30(state.setupTables.Locations.find(row => row.code === center.location));
}
function locationInUse29(code) {
  if (!code) return false;
  return engineeringData29().centers.some(center => center.location === code) ||
    state.receipts.some(receipt => receipt.location === code) || state.serials.some(serial => serial.location === code);
}
function engineeringText29(value, name, required = true) {
  if (typeof value !== 'string' || (required && !value.trim())) throw Error('Completa ' + name + '.');
  return value.trim();
}
function engineeringRef29(rows, field, key, label) {
  const row = rows.find(item => item[field] === key);
  if (!row) throw Error(label + ' inexistente: ' + (key || 'sin valor') + '.');
  return row;
}
function engineeringNumber29(value, label, whole = false) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || (whole && !Number.isSafeInteger(number))) throw Error('Revisa ' + label + '.');
  return number;
}
function engineeringDuplicate29(rows, field, key, previous) {
  if (rows.some(row => row !== previous && row[field].toUpperCase() === key.toUpperCase())) {
    throw Error('El código ' + key + ' ya existe.');
  }
}
function validateEngineeringBom29(db, record, previous = null) {
  engineeringRef29(db.parts,'part',record.parentPart,'Parte padre');
  engineeringRef29(db.parts,'part',record.componentPart,'Componente');
  engineeringRef29(db.units,'code',record.unit,'Unidad');
  engineeringNumber29(record.qtyPerUnit,'la cantidad del BOM');
  if (record.routingId) {
    const route = engineeringRef29(db.routes,'id',record.routingId,'Paso de ruta');
    if (route.part !== record.parentPart) throw Error('El paso de ruta pertenece a otra parte.');
  }
  if (record.parentPart === record.componentPart) throw Error('Una parte no puede ser su propio componente.');
  if (!record.active) return;
  const other = db.bom.filter(line => line.active && line !== previous);
  if (other.some(line => line.parentPart === record.parentPart && line.componentPart === record.componentPart &&
      (line.routingId || '') === (record.routingId || ''))) throw Error('Este componente ya existe para el mismo BOM y paso.');
  const queue = [record.componentPart];
  const visited = new Set();
  while (queue.length) {
    const part = queue.pop();
    if (part === record.parentPart) throw Error('Esta partida crea un ciclo en el BOM.');
    if (visited.has(part)) continue;
    visited.add(part);
    queue.push(...other.filter(line => line.parentPart === part).map(line => line.componentPart));
  }
}

function writeEngineeringRecord29(db, type, values, previous = null) {
  const list = db[engineeringCollections29[type]];
  let record;
  if (type === 'part') {
    const part = engineeringText29(values.part,'el número de parte');
    engineeringDuplicate29(list,'part',part,previous);
    engineeringRef29(db.units,'code',values.unit,'Unidad');
    engineeringRef29(db.itemTypes,'code',values.itemType,'Tipo de parte');
    engineeringRef29(db.prefixes,'code',values.serialPrefix,'Prefijo');
    record = {part,desc:engineeringText29(values.desc,'la descripción'),unit:values.unit,
      itemType:values.itemType,serialPrefix:values.serialPrefix};
  } else if (type === 'operation' || type === 'center') {
    const code = engineeringText29(values.code,'el código');
    engineeringDuplicate29(list,'code',code,previous);
    const active = values.active !== false;
    const area = engineeringText29(values.area ?? '','el área',false);
    if (type === 'operation') {
      record = {code,name:engineeringText29(values.name,'el nombre'),area,active};
    } else {
      const label = engineeringText29(values.label,'el nombre');
      const locationCode = previous?.location || code;
      if (values.location && values.location !== locationCode) throw Error('Conserva el código de la ubicación del centro.');
      let location = db.locations.find(row => row.code.toUpperCase() === locationCode.toUpperCase());
      const assignedArea = db.facility.areas.find(row => row.code === location?.area);
      const areaCode = values.facilityArea ?? (previous ? assignedArea?.code || '' : db.facility.defaultArea);
      const building = values.building ?? (previous ? assignedArea?.building || '' : db.facility.defaultBuilding);
      if (!previous || building || areaCode || assignedArea) {
        engineeringRef29(db.facility.buildings,'code',building,'Edificio');
        const chosenArea = engineeringRef29(db.facility.areas,'code',areaCode,'Área');
        if (chosenArea.building !== building) throw Error('El área no pertenece al edificio seleccionado.');
      }
      if (!previous && location && (location.locationType !== 'Workcenter' ||
          db.centers.some(center => center.location === location.code))) {
        throw Error('El código ya está en uso por otra ubicación o centro.');
      }
      if (!previous && location?.area && location.area !== areaCode) {
        throw Error('La ubicación ya pertenece a otra área. Selecciona su edificio y área o usa otro código.');
      }
      if (active && location && !location.active && !previous) throw Error('La ubicación del centro está inactiva.');
      if (!location) {
        location = {code:locationCode,description:label,locationType:'Workcenter',active:true,area:areaCode};
        db.locations.push(location);
      } else if ((location.area || '') !== areaCode && (areaCode || assignedArea)) {
        if (previous && db.centers.some(center => center !== previous && center.location === location.code)) {
          throw Error('La ubicación está compartida. Cambia su área desde Ubicaciones.');
        }
        location.area = areaCode;
      }
      record = {code,label,location:location.code,area:previous?.area ?? area,active};
    }
  } else if (type === 'route') {
    const part = engineeringRef29(db.parts,'part',values.part,'No Parte').part;
    const operation = engineeringRef29(db.operations,'code',values.operation,'Operación');
    if (!operation.active && operation.code !== previous?.operation) throw Error('Selecciona una operación activa.');
    const revision = engineeringText29(values.revision,'la revisión').toUpperCase();
    const sequence = engineeringNumber29(values.sequence,'la secuencia',true);
    if (!Array.isArray(values.centers) || !values.centers.length) throw Error('Selecciona al menos un centro de trabajo.');
    const centers = [...new Set(values.centers)];
    for (const code of centers) {
      const center = engineeringRef29(db.centers,'code',code,'Centro');
      if (!center.active && !previous?.centers.includes(code)) throw Error('Selecciona centros activos.');
    }
    if (list.some(route => route !== previous && route.part === part && route.revision === revision &&
        route.sequence === sequence)) throw Error('La parte y revisión ya tienen esta secuencia.');
    if (previous && previous.part !== part && db.bom.some(line => line.routingId === previous.id)) {
      throw Error('Este paso ya tiene partidas BOM y debe conservar su parte.');
    }
    if (previous && db.jobs.some(job => job.routeId === previous.id && (job.part !== part || !centers.includes(job.center)))) {
      throw Error('Este paso ya se usa en Job Manager. Conserva su parte y sus centros asignados.');
    }
    const id = previous?.id || engineeringText29(values.id,'el identificador del paso');
    engineeringDuplicate29(list,'id',id,previous);
    const packValue = Object.hasOwn(values,'standardPack') ? values.standardPack : previous?.standardPack;
    const standardPack = packValue === '' || packValue == null ? null :
      round(engineeringNumber29(packValue,'Standard Pack'));
    if (standardPack === 0) throw Error('Standard Pack debe ser de al menos 0.01.');
    const standardRate = values.standardRate === '' || values.standardRate == null ? null :
      engineeringNumber29(values.standardRate,'la tasa estándar');
    const standardSetup = values.standardSetup === '' || values.standardSetup == null ? null : Number(values.standardSetup);
    if (standardSetup !== null && (!Number.isFinite(standardSetup) || standardSetup < 0)) throw Error('Revisa el tiempo estándar de preparación.');
    const cycleRate = values.cycleRate == null || values.cycleRate === '' ? null : engineeringNumber29(values.cycleRate,'el ritmo de ciclo');
    const cycleUnit = values.cycleUnit || '';
    const yieldRate = values.yieldPercent == null || values.yieldPercent === '' ? null : Number(values.yieldPercent)/100;
    if (cycleRate !== null && !costUnitChoices30.includes(cycleUnit)) throw Error('Selecciona la unidad de ciclo.');
    if (yieldRate !== null && (!Number.isFinite(yieldRate) || yieldRate <= 0 || yieldRate > 1)) throw Error('Captura un rendimiento mayor que 0% y hasta 100%.');
    record = {id,part,revision,sequence,operation:operation.code,centers,active:values.active !== false,standardRate,standardSetup,standardPack,
      cycleRate,cycleUnit,yieldRate,
      description:engineeringText29(values.description ?? '','la descripción',false),
      note:engineeringText29(values.note ?? '','la nota',false)};
  } else if (type === 'bom') {
    record = {parentPart:values.parentPart,componentPart:values.componentPart,
      qtyPerUnit:engineeringNumber29(values.qtyPerUnit,'la cantidad del BOM'),unit:values.unit,
      routingId:values.routingId || '',active:values.active !== false};
    validateEngineeringBom29(db,record,previous);
  } else {
    throw Error('Tipo de registro no admitido.');
  }
  if (previous) list[list.indexOf(previous)] = record;
  else list.push(record);
  return record;
}

function commitEngineering29(db) {
  const previous = {parts:state.parts,bom:state.setupTables.Bom,locations:state.setupTables.Locations,
    engineering:state.engineering29,stations:state.cpOperations};
  state.parts = db.parts;
  state.setupTables.Bom = db.bom;
  state.setupTables.Locations = db.locations;
  state.engineering29 = {operations:db.operations,centers:db.centers,routes:db.routes};
  state.cpOperations = previous.stations.map(station => ({
    ...station,
    name:db.operations.find(op => op.code === station.code)?.name || station.name,
    workcenter:db.centers.find(center => center.code === station.wc)?.label || station.workcenter,
  }));
  try {
    saveState();
  } catch (error) {
    state.parts = previous.parts;
    state.setupTables.Bom = previous.bom;
    state.setupTables.Locations = previous.locations;
    state.engineering29 = previous.engineering;
    state.cpOperations = previous.stations;
    throw error;
  }
}

/** Interfaz interna para altas propuestas por un asistente o una importación. */
function prepareEngineeringBatch29(request) {
  if (request?.version !== 1 || !Array.isArray(request.records) || !request.records.length || request.records.length > 250) {
    throw Error('Envía una propuesta versión 1 con entre 1 y 250 registros.');
  }
  const db = engineeringSnapshot29();
  const order = ['part','operation','center','route','bom'];
  for (const item of request.records) {
    if (!order.includes(item?.type) || !item.data || typeof item.data !== 'object' || Array.isArray(item.data)) {
      throw Error('La propuesta contiene un tipo o registro no válido.');
    }
  }
  const summary = [];
  for (const type of order) {
    for (const [index,item] of request.records.entries()) {
      if (item.type !== type) continue;
      try {
        const record = writeEngineeringRecord29(db,type,item.data);
        if (type === 'center') {
          const location = db.locations.find(row => row.code === record.location);
          summary.push({type,record,location});
        } else {
          summary.push({type,record});
        }
      } catch (error) {
        throw Error('Registro ' + (index + 1) + ' (' + type + '): ' + error.message);
      }
    }
  }
  return {db,summary};
}
function applyEngineeringBatch29(request, reviewedSummary) {
  if (!Array.isArray(reviewedSummary) || !reviewedSummary.length) throw Error('Primero revisa la vista previa de las altas.');
  const preview = prepareEngineeringBatch29(request);
  if (JSON.stringify(preview.summary) !== JSON.stringify(reviewedSummary)) throw Error('La propuesta cambió. Revisa la vista previa nuevamente.');
  const types = new Set(preview.summary.map(item => item.type));
  for (const type of types) {
    if (!requireLevel(2,engineeringPermissions29[type])) throw Error('Sin permiso para guardar ' + type + '.');
  }
  commitEngineering29(preview.db);
  return preview.summary;
}

function engineeringFilterFields29(type) {
  const data = engineeringData29();
  if (type === 'route') return [field29('part','No Parte'),field29('revision','Revisión'),
    choice29('operation','Operación',data.operations.map(op => [op.code,op.name])),
    choice29('center','Centro de trabajo',data.centers.map(center => [center.code,center.label])),
    field29('active','Solo pasos activos','checkbox')];
  if (type === 'center') return [field29('code','Código'),field29('name','Centro de trabajo'),
    choice29('building','Edificio',facility30().buildings.map(row => [row.code,row.name])),
    field29('area','Área'),field29('active','Solo activos','checkbox')];
  return [field29('code','Código'),field29('name','Nombre'),field29('area','Área'),field29('active','Solo activos','checkbox')];
}
function currentEngineeringFilters29(type) {
  return engineeringFilters29.get(type) || {active:true};
}
function visibleEngineering29(type) {
  const filters = currentEngineeringFilters29(type);
  const list = engineeringData29()[engineeringCollections29[type]].filter(row => !filters.active || row.active);
  if (type !== 'route') return list.filter(row => {
    if (!containsOperations29(row.code,filters.code) || !containsOperations29(row.name || row.label,filters.name)) return false;
    if (type !== 'center') return containsOperations29(row.area,filters.area);
    const assignment = centerFacility29(row);
    return (!filters.building || assignment.building === filters.building) &&
      containsOperations29(facilityLabel30(assignment.area),filters.area);
  });
  return list.filter(row => (filters.exactPart ? row.part === filters.part : containsOperations29(row.part,filters.part)) &&
    containsOperations29(row.revision,filters.revision) &&
    (!filters.operation || row.operation === filters.operation) && (!filters.center || row.centers.includes(filters.center)))
    .sort((a,b) => a.part.localeCompare(b.part) || a.revision.localeCompare(b.revision) || a.sequence - b.sequence);
}
function searchEngineering29(event) {
  event.preventDefault();
  const type = engineeringScreens29[conceptScreen];
  engineeringFilters29.set(type,readOperationsForm29(event.currentTarget));
  renderEngineeringResults29(type);
}
function clearEngineering29() {
  engineeringFilters29.delete(engineeringScreens29[conceptScreen]);
  renderApp();
}
function engineeringTable29(type) {
  const rows = visibleEngineering29(type);
  if (type === 'operation') return {headers:['Código','Operación','Área','Activo'],
    rows:rows.map(x => ({key:x.code,cells:[x.code,x.name,x.area,x.active?'Sí':'No']}))};
  if (type === 'center') return {headers:['Código','Centro de trabajo','Edificio','Área','Ubicación','Activo'],
    rows:rows.map(x => {
      const {building,area} = centerFacility29(x);
      return {key:x.code,cells:[x.code,x.label,facilityLabel30(building,'buildings'),facilityLabel30(area),
        x.location,x.active?'Sí':'No']};
    })};
  const data = engineeringData29();
  const bom = state.setupTables.Bom.filter(line => line.active);
  return {headers:['No Parte','Rev.','Op. No.','Operación','Descripción','Centros de trabajo','BOM','Área','Ritmo de ciclo','Unidad','Rendimiento','Ritmo efectivo','Standard Pack','Activo'],
    rows:rows.map(x => {
      const op=data.operations.find(row=>row.code===x.operation);
      const std=costCycleStandard30(x);
      return ({
      key:x.id, part:x.part,
      cells:[x.part,x.revision,x.sequence,x.operation + ' · ' + (op?.name || ''),
        x.description || getPart(x.part)?.desc,x.centers.join(', '),
        bom.filter(line => line.parentPart === x.part && (!line.routingId || line.routingId === x.id)).length,
        costReference30.route[x.operation]?.area || op?.area || '',std.rate==null?'':number34(std.rate),std.unit,
        std.yieldRate==null?'':number34(std.yieldRate*100)+' %',std.rate==null||std.yieldRate==null?'':number34(std.rate*std.yieldRate),x.standardPack==null?'':number34(x.standardPack)+' '+(getPart(x.part)?.unit || ''),x.active?'Sí':'No'],
    });})};
}
function renderEngineeringResults29(type) {
  const {headers,rows} = engineeringTable29(type);
  const grid = document.getElementById('engineering29-results');
  grid.innerHTML = '<div class="ops-count" role="status">' + rows.length + (rows.length === 1 ? ' resultado' : ' resultados') + '</div>' +
    table(headers,rows.map(row => '<tr>' + row.cells.map((value,index) => {
      const label = esc(String(value ?? ''));
      if (index === (type === 'route' ? 2 : 0)) {
        return '<td><button class="btn link" type="button" data-key="' + esc(row.key) +
          '" onclick="openEngineeringRecord29(this.dataset.key)">' + label + '</button></td>';
      }
      if (type === 'route' && index === 6 && levelFor('bom')) {
        return '<td><button class="btn link" type="button" data-key="' + esc(row.key) + '" data-part="' +
          esc(row.part) + '" onclick="openPartBom29(this.dataset.part,this.dataset.key)">' + label + ' partidas</button></td>';
      }
      return '<td>' + label + '</td>';
    }).join('') + '</tr>'),type === 'route' ? '1050px' : '660px');
}
function exportEngineering29() {
  if (!requireLevel(1)) return;
  const type = engineeringScreens29[conceptScreen];
  const {headers,rows} = engineeringTable29(type);
  exportRows(shellScreen + '.csv',headers,rows.map(row => row.cells));
}
function renderEngineeringDesk29(type) {
  const title = {operation:'Operations',center:'Work Centers',route:'Process Routing'}[type];
  const filters = currentEngineeringFilters29(type);
  document.getElementById('view-' + currentView).innerHTML = cardNavigation29(title,
    '<form class="ops-filters" aria-label="Filtros" onsubmit="searchEngineering29(event)"><div class="ops-fields">' +
    engineeringFilterFields29(type).map(field => operationsField29(field,filters[field.key],true)).join('') +
    '</div><div class="ops-filter-actions"><button type="button" class="btn soft" onclick="clearEngineering29()">Limpiar</button>' +
    '<button class="btn primary">Buscar</button></div></form><div class="actionbar ops-actions">' +
    (levelFor() >= 2 ? '<button class="btn primary" type="button" onclick="openEngineeringRecord29()">Agregar</button>' : '') +
    '<button class="btn soft" type="button" onclick="exportEngineering29()">Exportar</button>' +
    (type === 'route' ? screenAction29('Operations','operations') + screenAction29('Work Centers','wcs') : screenAction29('Process Routing','routing')) +
    '</div><div id="engineering29-results"></div>');
  renderEngineeringResults29(type);
}
function engineeringRecordFields29(type, record, initial) {
  const data = engineeringData29();
  if (type === 'route') return [
    choice29('part','No Parte',partChoices29(),true),field29('revision','Revisión','text',{required:true}),
    field29('sequence','Número de operación','number',{min:1,step:1,required:true}),
    choice29('operation','Operación',data.operations.filter(op => op.active || op.code === record.operation)
      .map(op => [op.code,op.code + ' · ' + op.name]),true),
    field29('standardRate','Tasa estándar (unidades/h)','number',{min:0.000001}),
    field29('standardSetup','Preparación estándar (h)','number',{min:0}),
    field29('standardPack','Standard Pack (unidad de la parte)','number',{min:0.01,step:0.01}),
    field29('cycleRate','Ritmo de ciclo','number',{min:0.000001}),
    choice29('cycleUnit','Unidad de ciclo',options29(costUnitChoices30)),
    field29('yieldPercent','Rendimiento (%)','number',{min:0.000001,max:100}),
    field29('description','Descripción de la operación'),field29('note','Nota'),
    field29('active','Activo','checkbox'),
  ];
  const fields = [
    field29('code','Código','text',{required:true,readonly:Boolean(record.code)}),
    field29(type === 'operation' ? 'name' : 'label','Nombre','text',{required:true}),
  ];
  if (type === 'operation') fields.push(field29('area','Área'));
  if (type === 'center') {
    const required = !record.code || Boolean(initial.facilityArea);
    fields.push(choice29('building','Edificio',facility30().buildings.map(row => [row.code,row.name]),required),
      choice29('facilityArea','Área',centerAreaChoices29(initial.building),required));
    if (record.code) fields.push(field29('location','Ubicación','text',{readonly:true}));
  }
  return [...fields,field29('active','Activo','checkbox')];
}
function centerAreaChoices29(building) {
  return facility30().areas.filter(row => row.building === building).map(row => [row.code,row.name]);
}
function openEngineeringRecord29(key) {
  const type = engineeringScreens29[conceptScreen];
  if (!type || !requireLevel(key ? 1 : 2)) return;
  const list = engineeringData29()[engineeringCollections29[type]];
  const record = list.find(row => (type === 'route' ? row.id : row.code) === key);
  if (key && !record) return;
  const initial = {...(record || {part:currentEngineeringFilters29(type).part || '',revision:'A',sequence:10,active:true})};
  if (type === 'center') {
    const facility = facility30();
    const assignment = record ? centerFacility29(record) : {building:facility.defaultBuilding,area:facility.defaultArea};
    initial.building = assignment.building;
    initial.facilityArea = assignment.area;
  }
  if (type==='route' && record) {
    const standard=costCycleStandard30(record);
    initial.cycleRate=standard.rate ?? '';
    initial.cycleUnit=standard.unit;
    initial.yieldPercent=standard.yieldRate==null?'':standard.yieldRate*100;
  }
  const editable = levelFor() >= 2;
  const title = {operation:'Operación',center:'Centro de trabajo',route:'Paso de Process Routing'}[type];
  const centers = type === 'route' ? '<fieldset class="ops-line engineering-centers"><legend>Centros de trabajo</legend>' +
    engineeringData29().centers.filter(row => row.active || initial.centers?.includes(row.code)).map(row =>
      '<label class="ops-check"><input type="checkbox" name="center" value="' + esc(row.code) + '"' +
      (initial.centers?.includes(row.code) ? ' checked' : '') + '> ' + esc(row.code + ' · ' + row.label) + '</label>').join('') + '</fieldset>' : '';
  configDialog(title,
    '<form class="ops-dialog" data-key="' + esc(key || '') + '" onsubmit="saveEngineeringRecord29(event)">' +
    '<fieldset class="ops-fields"' + (editable ? '' : ' disabled') + '>' +
    engineeringRecordFields29(type,record || {},initial).map(field => operationsField29(field,initial[field.key])).join('') +
    '</fieldset>' + (editable ? centers : centers.replace('<fieldset ','<fieldset disabled ')) +
    (type === 'center' && !record ? '<p class="small">La ubicación se crea con el código del centro.</p>' : '') +
    '<p class="ops-inline-error30" role="alert" hidden></p>' +
    (editable ? '<div class="capture-actions"><button class="btn primary">Guardar</button></div>' : '') + '</form>');
  if (type === 'center' && editable) {
    const form = document.querySelector('#configDialog form');
    form.elements.building.addEventListener('change',() => {
      const select = form.elements.facilityArea;
      const choices = centerAreaChoices29(form.elements.building.value);
      select.replaceChildren(new Option(choices.length || !form.elements.building.value ? 'Seleccionar' : 'Sin áreas registradas',''),
        ...choices.map(([code,label]) => new Option(label,code)));
      select.required = Boolean(form.elements.building.value);
    });
  }
}
function saveEngineeringRecord29(event) {
  event.preventDefault();
  if (!requireLevel(2)) return;
  const type = engineeringScreens29[conceptScreen];
  const form = event.currentTarget;
  const values = readOperationsForm29(form.querySelector('.ops-fields'));
  if (type === 'route') {
    values.id = crypto.randomUUID();
    values.centers = [...form.querySelectorAll('[name="center"]:checked')].map(el => el.value);
  }
  const db = engineeringSnapshot29();
  const previous = db[engineeringCollections29[type]].find(row => (type === 'route' ? row.id : row.code) === form.dataset.key);
  if (form.dataset.key && !previous) return showMsg('El registro ya no está disponible.',true);
  try {
    writeEngineeringRecord29(db,type,values,previous);
    commitEngineering29(db);
  } catch (error) {
    const feedback = form.querySelector('.ops-inline-error30');
    feedback.textContent = error.message;
    feedback.hidden = false;
    return;
  }
  closeConfigDialog();
  showMsg('Registro guardado.');
}

function bomRouteLabel29(id) {
  const route = id && engineeringData29().routes.find(row => row.id === id);
  return route ? route.revision + ' / ' + route.sequence + ' · ' + route.operation : 'BOM general';
}
function refreshBomRoute29(selected) {
  const input = document.getElementById('bom_routing29');
  const part = document.getElementById('bom_parent');
  if (!input || !part) return;
  const current = selected ?? input.value;
  const options = engineeringData29().routes.filter(row => row.part === part.value && (row.active || row.id === current))
    .map(row => ({value:row.id,label:bomRouteLabel29(row.id)}));
  input.innerHTML = '<option value="">BOM general</option>' + selectOptions(options,false);
  input.value = options.some(row => row.value === current) ? current : '';
}
function openPartBom29(part, route = '') {
  if (!requireLevel(1,'bom')) return;
  uiState.bomPart29 = part;
  uiState.bomRoute29 = route;
  uiState.bomMode = 'list';
  uiState.bomSelectedIndex = null;
  uiState.bomEditIndex = null;
  navigateScreen('bom');
}
function openPartRouting29(part) {
  if (!requireLevel(1,'routing')) return;
  engineeringFilters29.set('route',{active:true,part,exactPart:true});
  navigateScreen('routing');
}
function bomContext29() {
  if (!uiState.bomPart29) return '';
  const part = esc(uiState.bomPart29);
  const route = uiState.bomRoute29 ? ' · ' + esc(bomRouteLabel29(uiState.bomRoute29)) : '';
  return '<div class="actionbar"><strong>BOM de ' + part + route + '</strong>' +
    '<button class="btn soft" type="button" onclick="openPartBom29(\'\')">Ver todos</button></div>';
}

function jobRoutingOptions29(part, current = '') {
  return engineeringData29().routes.filter(row => row.part === part && (row.active || row.id === current))
    .sort((a,b) => a.revision.localeCompare(b.revision) || a.sequence - b.sequence)
    .map(row => [row.id,bomRouteLabel29(row.id)]);
}
function refreshJobRouting29(form, selected = '') {
  const part = form.elements.part.value;
  const route = form.elements.routeId;
  const centers = form.elements.center;
  const existingCenter = centers.value;
  const options = jobRoutingOptions29(part,selected);
  route.innerHTML = '<option value="">Sin paso asignado</option>' +
    selectOptions(options.map(([value,label]) => ({value,label})),false);
  route.value = options.some(([value]) => value === selected) ? selected : '';
  const step = engineeringData29().routes.find(row => row.id === route.value);
  const allowed = centerChoices29().filter(([code]) => !step || step.centers.includes(code));
  centers.innerHTML = '<option value="">Seleccionar</option>' +
    selectOptions(allowed.map(([value,label]) => ({value,label})),false);
  centers.value = allowed.some(([code]) => code === existingCenter) ? existingCenter : (allowed.length === 1 ? allowed[0][0] : '');
  const unit=getPart(part)?.unit||'';
  for(const [key,label]of [['qty','Cantidad'],['rate','Tasa']]){const input=form.elements[key];const text=input?.closest('label')?.firstChild;if(text?.nodeType===3)text.textContent=label+(unit?' ('+unit+(key==='rate'?'/h':'')+')':'')+' ';}
}

const renderPriorEngineering29 = renderConceptScreen;
renderConceptScreen = function () {
  const type = engineeringScreens29[conceptScreen];
  if (type) renderEngineeringDesk29(type);
  else renderPriorEngineering29();
};

