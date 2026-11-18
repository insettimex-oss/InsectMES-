
const qualityTemplates30 = [
  {id:'nursery',operation:'NUR',name:'Guardería · revisión de neonatos',
    steps:['Lote y bandeja identificados','Condición de la muestra revisada','Bandeja y área limpias']},
  {id:'harvest',operation:'HAR',name:'Tamizado · verificación de salida',
    steps:['Lote y bandejas identificados','Pesaje de larva fresca verificado','Frass fino y grueso separados']},
];
const qualityAnswers30 = ['Conforme','No conforme','No aplica'];
let qualityFilters30 = {};

function qualityTemplate30(id) {
  return qualityTemplates30.find(template => template.id === id);
}
function qualityOperation30(template) {
  return state.cpOperations.find(op => op.code === template?.operation);
}
function qualityResult30(row) {
  if (!row.answers) return 'Registrado';
  if (row.answers.includes('No conforme')) return 'No conforme';
  return row.answers.every(answer => answer === 'No aplica') ? 'No aplica' : 'Conforme';
}
function qualityRows30(filters, operation = '') {
  return (state.quality30 || []).map((row,index) => ({row,index})).reverse().filter(({row}) =>
    (!operation || qualityTemplate30(row.template)?.operation === operation) &&
    (!filters.template || row.template === filters.template) && (!filters.date || row.date === filters.date) &&
    containsOperations29((row.lot || '') + ' ' + (row.serial || ''),filters.lot || '') &&
    (!filters.result || qualityResult30(row) === filters.result));
}
function qualityGrid30(records, inStation = false) {
  return resultsTable30(['Fecha','Checklist','Work Center','NP','Lote / Serial','Resultado','Muertos / Muestra','Operador'],
    records.map(({row,index}) => {
      const template = qualityTemplate30(row.template);
      const op = qualityOperation30(template);
      return '<tr><td>' + esc(dateDisplay34(row.date)) + '</td><td><button type="button" class="btn link" onclick="detailQuality30(' +
        index + ',' + inStation + ')">' + esc(template?.name || row.template) + '</button></td><td>' +
        esc(row.wc || op?.wc || '—') + '</td><td>' + esc(row.part || op?.part || '—') + '</td><td>' +
        esc([row.lot,row.serial].filter(Boolean).join(' · ')) + '</td><td>' + esc(qualityResult30(row)) +
        '</td><td>' + (row.sample == null ? '—' : esc(row.dead + ' / ' + row.sample)) +
        '</td><td>' + esc(row.operator || '') + '</td></tr>';
    }),'790px');
}
function renderQuality30() {
  const fields = [
    choice29('template','Checklist',qualityTemplates30.map(template => [template.id,template.name])),
    field29('lot','Lote o serial'),field29('date','Fecha','date'),
    choice29('result','Resultado',options29([...qualityAnswers30,'Registrado'])),
  ];
  const filters = '<form class="ops-filters" onsubmit="searchQuality30(event)"><div class="ops-fields">' +
    fields.map(field => operationsField29(field,qualityFilters30[field.key],true)).join('') +
    '</div><div class="ops-filter-actions"><button class="btn primary">Buscar</button></div></form>';
  const actions = '<div class="actionbar">' + (levelFor('checklist') >= 2 ?
    '<button class="btn primary" type="button" onclick="chooseQuality30()">Agregar</button>' : '') +
    '<button class="btn r30-sub-action" type="button" onclick="openChecklist30()">Actividades de guardería ↗</button></div>';
  document.getElementById('view-' + currentView).innerHTML = cardNavigation29('Checklist de calidad',
    filters + actions + qualityGrid30(qualityRows30(qualityFilters30)));
}
function searchQuality30(event) {
  event.preventDefault();
  qualityFilters30 = readOperationsForm29(event.currentTarget);
  renderQuality30();
}
function chooseQuality30() {
  if (!requireLevel(2,'checklist')) return;
  configDialog('Nuevo checklist','<div class="actionbar">' +
    qualityTemplates30.map(template => pmButton30(template.name,'openQuality30',template.id)).join('') + '</div>');
}
function stationChecklistButton30(op) {
  if (!levelFor('checklist') || !qualityTemplates30.some(template => template.operation === op.code)) return '';
  return '<button class="btn soft" type="button" onclick="openStationChecklist30()">Checklist</button>';
}
function openStationChecklist30() {
  if (!requireLevel(1,'checklist')) return;
  const op = op29();
  const template = qualityTemplates30.find(row => row.operation === op.code);
  if (!template) return;
  const add = levelFor('checklist') >= 2 ? '<button class="btn primary" type="button" ' +
    'onclick="openQuality30(\'' + template.id + '\',true)">Agregar</button>' : '';
  const filters = '<form class="ops-filters r30-cycle-filters" onsubmit="filterStationChecklist30(event)">' +
    operationsField29(field29('lot','Lote o serial'),'',true) +
    operationsField29(field29('date','Fecha','date'),'',true) +
    '<button class="btn primary">Buscar</button></form>';
  configDialog('Checklist · ' + op.name,filters + '<div class="actionbar">' + add +
    '<button class="btn soft" type="button" onclick="exportDialogGrid30(\'station-checklist-results30\',\'checklist\')">Exportar</button></div>' +
    '<div id="station-checklist-results30">' + qualityGrid30(qualityRows30({},op.code),true) + '</div>');
}
function filterStationChecklist30(event) {
  event.preventDefault();
  if (!requireLevel(1,'checklist')) return;
  const filters = readOperationsForm29(event.currentTarget);
  document.getElementById('station-checklist-results30').innerHTML = qualityGrid30(qualityRows30(filters,op29().code),true);
}
function openQuality30(id, inStation = false) {
  if (!requireLevel(2,'checklist')) return;
  const template = qualityTemplate30(id);
  const op = qualityOperation30(template);
  if (!op || (inStation && op29().code !== op.code)) return;
  const eligible = state.serials.filter(row => row.lot && [op.part,op.input].includes(row.part));
  const last = inStation && state.operationRuns.find(row => row.operation === op.code);
  const current = inStation && state.loadedSources[op.wc]?.cpInput?.serial;
  const linked = eligible.find(row => row.serial === (current || last?.serial));
  const options = [...new Set(eligible.map(row => row.lot))].map(lot => ({value:lot,label:lot}));
  const fields = [
    field29('lot','Lote','text',{required:true}),
    choice29('serial','Serial',eligible.map(row => [row.serial,row.serial + ' · ' + row.lot])),
    ...(id === 'nursery' ? [field29('sample','Larvas revisadas (opcional)','number',{min:1,step:1}),
      field29('dead','Larvas muertas en la muestra','number',{min:0,step:1})] : []),
    field29('note','Observación'),
  ];
  configDialog(template.name,
    '<form class="ops-dialog" data-template="' + esc(id) + '" data-station="' + inStation + '" onsubmit="saveQuality30(event)">' +
    '<div class="actionbar"><b>' + esc(op.wc) + '</b><span>' + esc(op.part) + '</span></div>' +
    '<fieldset class="ops-fields">' + fields.map(field => operationsField29(field,linked?.[field.key])).join('') +
    '</fieldset><datalist id="qualityLots30">' + selectOptions(options,false) + '</datalist>' +
    table(['Verificación','Resultado'],template.steps.map((step,index) => '<tr><td>' + esc(step) + '</td><td>' +
      operationsField29(choice29('check' + index,'Resultado ' + (index+1),options29(qualityAnswers30),true)) + '</td></tr>'),'400px') +
    '<div class="capture-actions"><button class="btn primary">Guardar</button></div></form>');
  const form = document.querySelector('#configDialog form');
  form.elements.lot.setAttribute('list','qualityLots30');
  form.elements.serial.addEventListener('change',() => {
    const serial = eligible.find(row => row.serial === form.elements.serial.value);
    if (serial) form.elements.lot.value = serial.lot;
  });
}
function saveQuality30(event) {
  event.preventDefault();
  if (!requireLevel(2,'checklist')) return;
  const form = event.currentTarget;
  const template = qualityTemplate30(form.dataset.template);
  const op = qualityOperation30(template);
  if (!op) return;
  const values = readOperationsForm29(form);
  const answers = template.steps.map((_,i) => values['check' + i]);
  if (!values.lot || answers.some(answer => !qualityAnswers30.includes(answer))) return showMsg('Completa el lote y los resultados.',true);
  if (values.serial && !state.serials.some(row => row.serial === values.serial && row.lot === values.lot &&
      [op.part,op.input].includes(row.part))) return showMsg('El serial no corresponde al lote o a la operación.',true);
  if (answers.includes('No conforme') && !values.note) return showMsg('Registra una observación para la no conformidad.',true);
  let sample = null,dead = null;
  if (template.id === 'nursery' && (values.sample !== '' || values.dead !== '')) {
    sample = Number(values.sample);
    dead = Number(values.dead);
    if (values.sample === '' || values.dead === '' || !Number.isSafeInteger(sample) || !Number.isSafeInteger(dead) ||
      sample <= 0 || dead < 0 || dead > sample) return showMsg('Captura el tamaño de la muestra y los muertos observados.',true);
  }
  (state.quality30 ??= []).push({template:template.id,lot:values.lot,serial:values.serial,steps:[...template.steps],
    answers,sample,dead,note:values.note,part:op.part,wc:op.wc,operator:shellSession?.user || '',date:dateLot29().id});
  saveState();
  closeConfigDialog();
  if (form.dataset.station === 'true') openStationChecklist30();
  showMsg('Checklist guardado.');
}
function detailQuality30(index, inStation) {
  if (!requireLevel(1,'checklist')) return;
  const row = state.quality30?.[index];
  if (!row) return;
  const template = qualityTemplate30(row.template);
  const back = '';
  configDialog(template?.name || 'Checklist',
    dataTable29(['Fecha','Lote','Serial','Resultado','Operador','Observación'],
      [[dateDisplay34(row.date),row.lot,row.serial || '—',qualityResult30(row),row.operator,row.note]]) +
    table(['Verificación','Resultado'],(row.steps || []).map((step,i) => '<tr><td>' + esc(step) +
      '</td><td>' + esc(row.answers?.[i] || 'Realizada') + '</td></tr>'),'420px') + back);
}
const referenceParameters30 = [
  ['REF_EGGS_FLY','Huevos por mosca · supuesto de costos',250,'huevos/mosca','EGG','002. BSFL Cost Calculator Rev02.xlsx · Sheet1!K3'],
  ['REF_HATCH_COST','Eclosión · supuesto de costos',0.6,'fracción','NUR','002. BSFL Cost Calculator Rev02.xlsx · Sheet1!K4'],
  ['REF_REARING_CONVERSION','Conversión a larva · supuesto de costos',0.15,'kg/kg','REA','002. BSFL Cost Calculator Rev02.xlsx · Sheet1!C5'],
  ['REF_MORTALITY','Mortalidad · supuesto del modelo KPI',0.3,'fracción','NUR',"KPI's - Template.xlsx · Calcs !J2"],
  ['REF_EGGS_GRAM','Huevos por gramo · supuesto del modelo KPI',21000,'huevos/g','EGG',"KPI's - Template.xlsx · Calcs !I2"],
  ['REF_EAWAG_EGGS_GRAM','Huevos por gramo · escenario Eawag',40000,'huevos/g','EGG','006. Datos Eawag.xlsx · Datos Eawag!I17'],
  ['REF_EAWAG_HATCH','Eclosión · escenario Eawag',0.6,'fracción','NUR','006. Datos Eawag.xlsx · Datos Eawag!I19'],
];
const parameterInit30 = initShell;
initShell = function () {
  parameterInit30();
  for (const [code,name,value,unit,operation,source] of referenceParameters30) {
    if (!state.parameters.some(row => row.code === code)) state.parameters.push({code,name,value,unit,operation,source,active:true,part:'',workcenter:''});
  }
};

const jobsForStation30 = (db,station) => (db.operationsDesk29?.jobs || []).filter(job => {
  if (!panelUsesJobs30(station)) return false;
  if (!planningStates30.includes(job.status) || job.center !== station.wc || job.part !== station.part) return false;
  if (!job.routeId) return true;
  if (station.panelRoute30 && job.routeId !== station.panelRoute30) return false;
  const route = db.engineering29?.routes.find(row => row.id === job.routeId);
  return route?.active && route.operation === station.code;
});
function remainingJob30(job,db=state) {
  return Math.max(0,job.qty - (db.operationRuns || []).filter(row => row.jobCode === job.code)
    .reduce((total,row) => total + (row.jobQty30 || 0),0));
}
const currentJob30 = new Map();
const priorControl30 = renderControlPanel29;
renderControlPanel29 = function () {
  priorControl30();
  if (!levelFor('job-manager')) return;
  const heading = document.querySelector('#view-workcenters .cp-heading');
  const output = document.getElementById('cpOutputQty');
  if (!heading || !output) return;
  const station = op29();
  const selectedJob=uiState.panelMode30==='capture' ? uiState.panelCaptureJob30 : currentJob30.get(station.code);
  const jobs = jobsForStation30(state,station).filter(job => remainingJob30(job) > 1e-8 || job.code===selectedJob);
  if (!jobs.length) return;
  heading.insertAdjacentHTML('afterend','<div class="actionbar r30-job-picker">' +
    operationsField29(choice29('productionJob30','Job de producción (opcional)',jobs.map(job => [job.code,
      job.code + ' · Pendiente ' + number34(remainingJob30(job)) + ' ' + (getPart(job.part)?.unit || '')])),
      jobs.some(job => job.code === selectedJob) ? selectedJob : '') +
    subAction30('Job Manager','job-manager') + '</div>');
  document.querySelector('[name="productionJob30"]').addEventListener('change',event => {
    currentJob30.set(station.code,event.target.value);
  });
};
const recordBeforeJob30 = recordCP29;
recordCP29 = function (db,station,record) {
  const code = record.jobCode || (typeof document !== 'undefined' ? document.querySelector('[name="productionJob30"]')?.value : '');
  const job = code ? jobsForStation30(db,station).find(row => row.code === code) : null;
  let quantity;
  if (code) {
    if (!job) throw Error('El job ya no está disponible para esta operación.');
    const part = db.parts.find(row => row.part === job.part);
    quantity = quantityIn30(record.qty,station.unit,part.unit);
    if (quantity > remainingJob30(job,db) + 1e-8) throw Error('La producción supera la cantidad pendiente del job.');
  }
  const output = recordBeforeJob30(db,station,record);
  if (job) {
    db.operationRuns[0].jobCode = job.code;
    db.operationRuns[0].jobQty30 = quantity;
  }
  return output;
};
const priorQualityConcept30 = renderConceptScreen;
renderConceptScreen = function () {
  if (conceptScreen === 'checklist') return renderQuality30();
  priorQualityConcept30();
};

