
const bsfStages30 = [
  ['egg','Huevo','<ellipse cx="8" cy="11" rx="3" ry="6" transform="rotate(-25 8 11)"/><ellipse cx="17" cy="13" rx="3" ry="6" transform="rotate(24 17 13)"/>'],
  ['larva','Larva',null],
  ['prepupa','Prepupa','<path d="M6 18c-4-4-1-11 4-13s10 0 11 4c1 3-2 5-5 4-4-1-6 0-7 4-1 3-2 3-3 1ZM6 9l5 2m-2-5 4 4m1-6 1 6m4-4-2 5"/>'],
  ['pupa','Pupa','<path d="M17 3c4 2 3 7 0 12-3 5-7 8-10 6-4-2-4-7-1-12 3-5 8-8 11-6ZM8 6l11 6M6 10l11 6M4 14l10 6"/>'],
  ['adult','Adulto',null],
];
const bsfIndustrialDefaults30 = [
  ['EGG','egg'], ['NUR','larva'], ['TRA','larva'], ['REA','larva'], ['HAR','larva'],
  ['USE','larva'], ['PUP','prepupa'], ['DAR','pupa'], ['LOV','adult'],
  ['WAS','post'], ['SAN','post'], ['DRY','post'], ['OVN','post'], ['FRA','post'],
  ['GRI','post'], ['PAC','post'], ['BOX','post'], ['FED','support'], ['ATR','support'],
];
const bsfWorkbookOrder30 = ['PUP','DAR','LOV','EGG','NUR','TRA','REA','HAR','USE',
  'WAS','SAN','DRY','OVN','FRA','GRI','PAC','BOX','FED','ATR'];
const cyclePhases30 = [...bsfStages30.map(([id,label]) => [id,label]), ['post','Postproceso y empaque'], ['support','Insumos']];
const cycleDurationUnits30 = [['day','Días'],['hour','Horas'],['minute','Minutos']];
let cycleFilters30 = {};

const initBeforeCycleSequence30 = initShell;
initShell = function () {
  initBeforeCycleSequence30();
  if (state.bsfEggFirst30) return;
  state.bsfEggFirst30 = true;
  const overrides = state.bsfPlan30 || {};
  const extra = state.bsfExtraSteps30 || [];
  if (!Object.keys(overrides).length && !extra.length) return;
  const defaults = bsfIndustrialDefaults30.map(([code])=>code);
  const legacy = Object.keys(overrides).length && !state.bsfWorkbookOrder30 ? defaults : bsfWorkbookOrder30;
  const custom = defaults.some(code=>overrides[code]?.sequence != null &&
    overrides[code].sequence !== (legacy.indexOf(code)+1)*10);
  const steps = defaults.map((code,index)=>({code,sequence:custom ?
    overrides[code]?.sequence ?? (legacy.indexOf(code)+1)*10 : (index+1)*10}));
  steps.push(...extra.map(row=>({extra:row,sequence:custom?row.sequence:defaults.length*10+row.sequence})));
  steps.sort((a,b)=>(b.code==='EGG')-(a.code==='EGG') || a.sequence-b.sequence);
  steps.forEach(({code,extra},index)=>{
    const sequence=(index+1)*10;
    if (extra) extra.sequence=sequence;
    else if (overrides[code] || custom) overrides[code]={...overrides[code],sequence};
  });
  state.bsfPlan30=overrides;
  saveState();
};

function cycleDuration30(raw,unit,legacy='') {
  const normalized=cycleDurationUnits30.some(([id])=>id===unit) ? unit : 'day';
  if (typeof raw === 'number' && Number.isFinite(raw) && raw>=0) return {duration:raw,durationUnit:normalized};
  const text=String(raw ?? '').trim();
  const match=text.match(/^(\d+(?:[.,]\d+)?)\s*(d[ií]as?|d|horas?|h|minutos?|min)?$/i);
  if (match) {
    const suffix=match[2]?.toLowerCase() || '';
    return {duration:Number(match[1].replace(',','.')),durationUnit:
      suffix.startsWith('h') ? 'hour' : suffix.startsWith('min') ? 'minute' : suffix ? 'day' : normalized};
  }
  return {duration:null,durationUnit:normalized,durationLegacy:['','—','Por definir'].includes(text)?legacy:text};
}
function cycleDurationLabel30(plan) {
  return cycleDurationUnits30.find(([key])=>key===plan.durationUnit)?.[1] || '';
}
function cycleDurationText30(plan) {
  if (plan.duration==null) return plan.durationLegacy || '—';
  const unit=cycleDurationLabel30(plan).toLocaleLowerCase('es');
  return plan.duration+' '+(plan.duration===1?unit.slice(0,-1):unit);
}

function resultsTable30(headers, rows, width) {
  return table(headers,rows.length ? rows : [
    '<tr><td colspan="' + headers.length + '" class="r30-empty-row">Sin registros</td></tr>',
  ],width);
}
function cyclePlan30(op) {
  const index = bsfIndustrialDefaults30.findIndex(([code]) => code === op.code);
  const plan = {
    sequence: index < 0 ? (bsfIndustrialDefaults30.length + 1) * 10 : (index + 1) * 10,
    phase: bsfIndustrialDefaults30[index]?.[1] || 'support',
    duration: op.duration === 'Por definir' ? '' : op.duration,
    center:op.wc,
    ...cycleParts30(op),
    ...state.bsfPlan30?.[op.code],
  };
  return {...plan,...cycleDuration30(plan.duration,plan.durationUnit,plan.durationLegacy)};
}
function cycleSteps30() {
  const catalog = engineeringData29();
  const base = panelStations30('control').map(op=>({id:op.code,op,plan:cyclePlan30(op)}));
  const extra = (state.bsfExtraSteps30 || []).map(plan=>({id:plan.id,
    op:{code:plan.operation,name:catalog.operations.find(row=>row.code===plan.operation)?.name || plan.operation},
    plan:{...plan,...cycleDuration30(plan.duration,plan.durationUnit,plan.durationLegacy)}}));
  return [...base,...extra];
}
function visibleCycleSteps30() {
  const {phase='',query='',active=false} = cycleFilters30;
  return cycleSteps30().filter(({op,plan})=>
    (!phase || plan.phase===phase) && (!active || plan.active!==false) &&
    containsOperations29([op.name,op.code,plan.center,...plan.input,...plan.output].join(' '),query))
    .sort((a,b)=>a.plan.sequence-b.plan.sequence);
}
function cycleParts30(op) {
  const nursery = op.code === 'NUR' ? ['PREMIUM-FEED','MP-004','MP-003'] : [];
  const input = [op.input || (op.code === 'EGG' ? 'EGG-RAW' : ''),
    ...nursery, ...inputRows30(op).map(row => row.part)].filter(Boolean);
  const output = op.code === 'HAR' ? [op.part,'FRASS-A','FRASS-B'] : [op.part];
  return {input,output};
}
function cycleMaterials30(parts) {
  const descriptions = {'FRASS-A':'Frass fino','FRASS-B':'Frass grueso','BSF005':'Larva 17-DOL'};
  return parts.map(code => '<span class="r30-cycle-material"><b>' + esc(code) + '</b>' +
    esc(descriptions[code] || getPart(code)?.desc || '') + '</span>').join('') || '—';
}
function cycleNatural30(phase) {
  const svg = (path) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + '</svg>';
  const marks = bsfStages30.map(([id,label,path],index) => {
    const a = (index * 72 - 90) * Math.PI / 180;
    const icon = path ? svg(path) : menuApproved29.icon(id === 'adult' ? 'bsf-adult' : 'bsf-larva');
    return '<button type="button" class="r30-cycle-node" style="--x:' + (50+36*Math.cos(a)) + '%;--y:' +
      (50+36*Math.sin(a)) + '%" aria-pressed="' + (phase === id) + '" onclick="filterCyclePhase30(\'' +
      id + '\')">' + icon + '<span>' + esc(label) + '</span></button>';
  }).join('');
  const arrows = bsfStages30.map((_,i) => {
    const a = (i * 72 - 54) * Math.PI / 180;
    const x = 150 + 108 * Math.cos(a);
    const y = 150 + 108 * Math.sin(a);
    return '<path d="M-4 -5 2 0 -4 5" transform="translate(' + x + ' ' + y + ') rotate(' + (i*72+36) + ')"/>';
  }).join('');
  return '<aside class="r30-cycle-natural"><h2>Ciclo natural</h2><div class="r30-cycle-wheel">' +
    '<svg viewBox="0 0 300 300" class="r30-cycle-track" aria-hidden="true"><circle cx="150" cy="150" r="108"/>' +
    arrows + '</svg><div class="r30-cycle-species"><b>Mosca soldado negra</b><i>Hermetia illucens</i></div>' +
    marks + '</div></aside>';
}
function filterCyclePhase30(phase) {
  cycleFilters30.phase = cycleFilters30.phase === phase ? '' : phase;
  renderBiologicalCycle30();
  document.querySelector('.r30-cycle-node[aria-pressed=true], .r30-cycle-filters select[name=phase]')?.focus();
}
function filterCycle30(event) {
  event.preventDefault();
  cycleFilters30 = readOperationsForm29(event.currentTarget);
  renderBiologicalCycle30();
}
function cycleCohorts30() {
  const entries = [...state.productionLots, ...state.serials.filter(row => row.productionLot)
    .map(row => ({id:row.productionLot,label:row.lot}))];
  const byId = new Map(entries.filter(row => row.id).map(row => [row.id,row.label || row.id]));
  return [...byId].sort(([a],[b]) => b.localeCompare(a)).map(([id,label]) => [id,label === id ? id : label + ' · ' + id]);
}
function cycleCohortEvents30(op, cohort) {
  if (!cohort || !levelFor('control')) return '—';
  const runs = state.operationRuns.filter(run => run.operation === op.code && run.productionLot === cohort);
  const date = value => value ? dateDisplay34(value) : '—';
  if (op.code === 'NUR') {
    const entries = state.nursery.entries.filter(row =>
      state.serials.some(serial => serial.serial === row.serial && serial.productionLot === cohort));
    return entries.map(row => '<span class="r30-cycle-material"><b>' + esc(row.serial) +
      '</b>Ingreso: ' + esc(date(row.started)) + '<small>' +
      (row.level === 5 ? 'N5 · ' : 'N' + row.level + ' · ') + esc(date(row.levelAt)) + '</small></span>').join('') || '—';
  }
  return runs.map(run => {
    const serials = run.outputSerials?.length ? run.outputSerials : [run.serial].filter(Boolean);
    return '<span class="r30-cycle-material"><b>' + esc(serials.join(' · ')) + '</b><small>' +
      esc(date(run.at)) + '</small></span>';
  }).join('') || '—';
}
function renderBiologicalCycle30() {
  const {phase = '',cohort = '',query='',active=false} = cycleFilters30;
  const canEdit = levelFor('bsf-cycle') >= 2;
  const rows = visibleCycleSteps30().map(({id,op,plan}) => {
    const center = engineeringData29().centers.find(row=>row.code===plan.center);
    return '<tr><td>' + plan.sequence + '</td><td><b>' +
      pmButton30(op.name,'editCycleStep30',id,'link') + '</b><small>' +
      esc(cyclePhases30.find(([id]) => id === plan.phase)?.[1] || '') + '</small></td><td>' + esc(plan.center) +
      '<small>' + esc(center?.label || '') + '</small></td><td>' + cycleMaterials30(plan.input) + '</td><td>' +
      cycleMaterials30(plan.output) + '</td><td>' + esc(plan.duration ?? '—') + '</td><td>' +
      esc(plan.duration==null ? '—' : cycleDurationLabel30(plan)) + '</td><td>' +
      (plan.active===false?'Inactivo':'Activo') + '</td>' +
      (cohort ? '<td>' + (id===op.code ? cycleCohortEvents30(op,cohort) : '—') + '</td>' : '') + '</tr>';
  });
  const headers = ['Sec.','Operación','Work Center','Entrada · NP','Salida · NP','Duración','Unidad','Estado'];
  if (cohort) headers.push('Seriales de la cohorte');
  const filters = '<form class="ops-filters r30-cycle-filters" onsubmit="filterCycle30(event)">' +
    operationsField29(field29('query','Operación, centro o NP'),query,true) +
    operationsField29(choice29('phase','Fase',cyclePhases30),phase,true) +
    (levelFor('control') ? operationsField29(choice29('cohort','Cohorte',cycleCohorts30()),cohort,true) : '') +
    operationsField29(field29('active','Solo activos','checkbox'),active,true) +
    '<button class="btn primary">Buscar</button></form>';
  const actions = '<div class="actionbar">' + (canEdit?pmButton30('Agregar','editCycleStep30','','primary'):'') +
    '<button class="btn soft" type="button" onclick="exportCycle30()">Exportar</button></div>';
  document.getElementById('view-' + currentView).innerHTML = '<div class="r30-cycle-layout">' +
    cycleNatural30(phase) + cardNavigation29('Ciclo industrial', filters + actions +
      '<div class="r30-cycle-grid">' + resultsTable30(headers,rows,cohort ? '990px' : '820px') + '</div>') + '</div>';
}
function exportCycle30() {
  if (!requireLevel(1,'bsf-cycle')) return;
  exportRows('bsf-cycle.csv',['Secuencia','Operación','Fase','Centro','Entrada','Salida','Duración','Unidad','Estado'],
    visibleCycleSteps30().map(({op,plan})=>[plan.sequence,op.name,plan.phase,plan.center,plan.input.join(', '),
      plan.output.join(', '),plan.duration,plan.duration==null?'':cycleDurationLabel30(plan),plan.active===false?'Inactivo':'Activo']));
}
function editCycleStep30(id) {
  if (!requireLevel(id?1:2,'bsf-cycle')) return;
  const steps=cycleSteps30();
  const step=steps.find(row=>row.id===id);
  if (id && !step) return;
  const catalog=engineeringData29();
  const plan=step?.plan || {sequence:Math.max(0,...steps.map(row=>row.plan.sequence))+10,phase:'',active:true,input:[],output:[]};
  const editable=levelFor('bsf-cycle')>=2;
  const selectParts=(key,label)=>'<label class="field">'+label+
    '<select class="select" name="'+key+'" multiple size="5">'+[...partChoices29(),
      ...plan[key].filter(code=>!getPart(code)).map(code=>[code,code])].map(([value,text])=>
      '<option value="'+esc(value)+'"'+(plan[key].includes(value)?' selected':'')+'>'+esc(text)+'</option>').join('')+'</select></label>';
  configDialog(step?.op.name || 'Nuevo paso del ciclo',
    '<form class="ops-dialog" data-code="' + esc(id || '') + '" onsubmit="saveCycleStep30(event)"><fieldset class="ops-fields"'+(editable?'':' disabled')+'>'+
    (step && step.id===step.op.code?'<label class="field">Operación<input class="input" readonly value="'+esc(step.op.name)+'"></label>':
      operationsField29(choice29('operation','Operación',catalog.operations.filter(op=>op.active||op.code===step?.op.code).map(op=>[op.code,op.name]),true),step?.op.code))+
    operationsField29(field29('sequence','Secuencia','number',{required:true,min:id==='EGG'?10:11,step:1,readonly:id==='EGG'}),plan.sequence)+
    operationsField29(choice29('phase','Fase',cyclePhases30,true),plan.phase)+
    operationsField29(choice29('center','Work Center',catalog.centers.filter(w=>w.active||w.code===plan.center).map(w=>[w.code,w.code+' · '+w.label]),true),plan.center)+
    operationsField29(field29('duration','Duración','number',{min:0}),plan.duration ?? '')+
    operationsField29(choice29('durationUnit','Unidad de duración',cycleDurationUnits30,true),plan.durationUnit || 'day')+
    operationsField29(field29('active','Activo','checkbox'),plan.active!==false)+
    selectParts('input','Entradas del plan')+selectParts('output','Salidas del plan')+'</fieldset>'+
    (plan.durationLegacy?'<p class="small">Duración anterior: '+esc(plan.durationLegacy)+'</p>':'')+
    (editable?'<div class="capture-actions"><button class="btn primary">Guardar</button></div>':'')+'</form>');
}
function saveCycleStep30(event) {
  event.preventDefault();
  if (!requireLevel(2,'bsf-cycle')) return;
  const form=event.currentTarget;
  const id=form.dataset.code;
  const steps=cycleSteps30();
  const previous=steps.find(row=>row.id===id);
  if (id&&!previous) return;
  const {sequence,phase,duration,durationUnit,operation,center,active}=readOperationsForm29(form);
  const base=previous && previous.id===previous.op.code;
  const operationCode=base?previous.op.code:operation;
  const catalog=engineeringData29();
  const parts=key=>[...form.elements[key].selectedOptions].map(el=>el.value);
  const numericDuration=duration==='' ? null : Number(duration);
  if (numericDuration!==null && (!Number.isFinite(numericDuration) || numericDuration<0))
    return showMsg('Captura una duración de cero o más.',true);
  if (!Number.isSafeInteger(Number(sequence)) || (id==='EGG' ? Number(sequence)!==10 : Number(sequence)<=10) ||
      !cycleDurationUnits30.some(([id])=>id===durationUnit) ||
      !cyclePhases30.some(([id]) => phase === id) || !catalog.centers.some(w=>w.code===center) ||
      !catalog.operations.some(op=>op.code===operationCode) || !parts('output').length)
    return showMsg('Revisa secuencia, fase, operación, centro y salida.',true);
  const other=steps.find(row=>row.id!==id && row.plan.sequence===Number(sequence));
  if (other) return showMsg('La secuencia ya está asignada a ' + other.op.name + '.',true);
  const plan={sequence:Number(sequence),phase,duration:numericDuration,durationUnit,
    durationLegacy:numericDuration===null ? previous?.plan.durationLegacy || '' : '',
    center,active,input:parts('input'),output:parts('output')};
  if (base) {
    (state.bsfPlan30 ??= {})[id]=plan;
  } else {
    const extra=state.bsfExtraSteps30 ??= [];
    const next={...plan,id:id || crypto.randomUUID(),operation:operationCode};
    if (previous) extra[extra.findIndex(row=>row.id===id)]=next; else extra.push(next);
  }
  saveState();
  closeConfigDialog();
  showMsg('Operación actualizada.');
}

let setupQuery30 = '';
const setupGroups30 = [
  ['Inventario y compras',['Item_Type','Location_Type','Container_Type','Container_Status','Serial_Prefix','Locations','Units']],
  ['Producción y Guardería',['Operation_Type','Workcenter_Status_Control','Workcenter_Status','Nursery_Recipe','Nursery_Rack','Maintenance_Checklist','Bom']],
  ['Administración',['Screen_Field','Users']],
];
const setupTargets30 = {Locations:'locations',Bom:'bom',Users:'users',Units:'units'};
const setupNames30 = {Locations:'Ubicaciones',Bom:'BOM',Users:'Usuarios',Units:'Unidades',
  Maintenance_Checklist:'Checklist de operación / Guardería'};
function setupRows30(keys) {
  const rows = [];
  for (const name of keys) {
    const schema = state.setupSchemas?.[name];
    const target = setupTargets30[name];
    const label = setupNames30[name] || schema?.title || name;
    if (!containsOperations29(label + ' ' + name,setupQuery30)) continue;
    const action = target ? screenAction29(label,target) : pmButton30(label,'openSetupEntry30',name,'link');
    if (!action) continue;
    rows.push('<tr><td>' + action + '</td><td>' + esc(schema?.owner || (target ? 'Catálogo' : 'Configuración')) +
      '</td><td>' + state.setupTables[name].length + '</td></tr>');
  }
  return rows;
}
function openSetupEntry30(key) {
  if (requireLevel(1,'setup') && Object.hasOwn(state.setupTables,key)) openSetupTable(key);
}
function filterSetup30(event) {
  event.preventDefault();
  setupQuery30 = event.currentTarget.elements.query.value.trim();
  renderApp();
}
const legacySetupList30 = renderSetupTablesCatalog;
renderSetupTablesCatalog = function () {
  if (uiState.setupTable) return legacySetupList30();
  const keys = Object.keys(state.setupTables).filter(key => key !== 'Move_Type');
  const known = new Set(setupGroups30.flatMap(([,names]) => names));
  const groups = [...setupGroups30,['Otros catálogos',keys.filter(key => !known.has(key))]];
  const sections = groups.flatMap(([title,names]) => {
    const rows = setupRows30(names.filter(name => keys.includes(name)));
    return rows.length ? ['<section class="r30-setup-group"><h3>' + esc(title) + '</h3>' +
      table(['Tabla','Usada en','Registros'],rows,'460px') + '</section>'] : [];
  }).join('');
  return cardNavigation29('Setup Tables',
    '<form class="ops-filters r30-setup-search" onsubmit="filterSetup30(event)">' +
    operationsField29(field29('query','Buscar tabla'),setupQuery30,true) +
    '<button class="btn primary">Buscar</button></form>' +
    (sections || '<div class="empty-state">Sin tablas para esta búsqueda.</div>'));
};

const priorRev30Concept = renderConceptScreen;
renderConceptScreen = function () {
  if (conceptScreen === 'requirements30') return renderRequirements30();
  if (conceptScreen === 'maintenance30') return renderMaintenance30();
  if (conceptScreen === 'sales30') return renderSales30();
  if (conceptScreen === 'shipping30') return renderShipments30();
  if (conceptScreen === 'bsf-cycle') return renderBiologicalCycle30();
  priorRev30Concept();
};


const renderStationBefore30 = renderControlPanel29;
renderControlPanel29 = function () {
  normalizePanelRoute30();
  renderStationBefore30();
  const op = op29();
  const view = document.getElementById('view-workcenters');
  const heading = view.querySelector('.cp-heading');
  if (op.code !== 'NUR' && shellScreen !== 'control') heading.querySelector('h1').textContent = screenName();
  view.querySelector('.cp-route')?.remove();
  const select = heading.querySelector('select[aria-label="Workcenter"]');
  if (select) {
    const stations = panelStations30().sort((a,b) => cyclePlan30(a).sequence - cyclePlan30(b).sequence);
    select.replaceChildren(...stations.map(station =>
      new Option(station.wc + ' · ' + station.workcenter + ' / ' + station.name,station.code,false,station.code === op.code)));
  }
  const buttons = screenAction29('BSF Cycle','bsf-cycle') + stationChecklistButton30(op);
  if (buttons) view.querySelector('.wc-header32').insertAdjacentHTML('afterend',
    '<div class="r30-station-tools">' + buttons + '</div>');
  const center = view.querySelector('.station32');
  if (!center) return;
  center.classList.add('r30-station');
  center.querySelector('.station-art')?.remove();
  center.querySelector('.flow-arrow32')?.remove();
  const {input,output} = cycleParts30(op);
  center.querySelector('h2').insertAdjacentHTML('afterend','<div class="r30-station-flow"><div><small>Entrada</small>' +
    cycleMaterials30(input) + '</div><span aria-hidden="true">→</span><div><small>Salida</small>' +
    cycleMaterials30(output) + '</div></div>');
  center.querySelector('.duration strong').textContent = cycleDurationText30(cyclePlan30(op));
  view.querySelectorAll('.section-title32 > svg, .record32 > svg, .load-source32 > svg').forEach(svg => svg.remove());
};

