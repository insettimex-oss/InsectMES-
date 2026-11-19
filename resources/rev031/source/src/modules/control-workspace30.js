/* Estación, número de parte y entradas de producción. */
const panelPartSelections30 = new Map();
const basePanelOperation30 = op29;
const basePanelInputs30 = inputRows30;

function panelWorkKey30(station) {
  return station.wc + ':' + station.code;
}
function panelUsesJobs30(station) {
  return productionStations30.postprocess.includes(station.code) || productionStations30.pack.includes(station.code);
}
function panelPartOptions30(station) {
  const singleProduct = ['EGG','NUR'].includes(station.code);
  const routes = engineeringData29().routes.filter(route => route.active && route.operation === station.code &&
    route.centers.includes(station.wc) && getPart(route.part) && (!singleProduct || route.part === station.part));
  const choices = routes.map(route=>({key:route.id,part:route.part,route}));
  if (!choices.some(choice=>choice.part===station.part)) {
    choices.unshift({key:'',part:station.part,route:null});
  }
  return choices;
}
function panelPartChoice30(station) {
  const choices=panelPartOptions30(station);
  const selected=uiState.panelMode30==='capture' ? uiState.panelCapturePart30 :
    panelPartSelections30.get(panelWorkKey30(station));
  return choices.find(choice=>choice.key===selected) || choices.find(choice=>choice.part===station.part) || choices[0];
}
function panelBomInputs30(station, choice) {
  if (['EGG','NUR'].includes(station.code)) return null;
  const components=new Map();
  const matches=state.setupTables.Bom.filter(row=>row.active && row.parentPart===choice.part &&
    (!row.routingId || row.routingId===choice.route?.id));
  for (const row of matches.filter(row=>!row.routingId)) components.set(row.componentPart,row);
  for (const row of matches.filter(row=>row.routingId)) components.set(row.componentPart,row);
  const rows=[...components.values()];
  if (!rows.length) return choice.part===station.part ? null : [];
  const primary=components.get(station.input) ||
    rows.find(row=>['WIP','Producto Terminado'].includes(getPart(row.componentPart)?.itemType)) || rows[0];
  return [primary,...rows.filter(row=>row!==primary)].map(row=>({
    part:row.componentPart,label:getPart(row.componentPart)?.desc || row.componentPart,unit:row.unit,
  }));
}
op29=function () {
  const station=basePanelOperation30();
  const choice=panelPartChoice30(station);
  const materials=panelBomInputs30(station,choice);
  const alternative=choice.part!==station.part;
  const part=getPart(choice.part);
  const unit=alternative ? part?.unit || station.unit : station.unit;
  return {...station,part:choice.part,unit,units:alternative?[unit]:station.units,
    output:alternative ? part?.desc || choice.part : station.output, panelRoute30:choice.route?.id || '',
    input:materials===null ? station.input : materials[0]?.part || '',
    inputName:materials===null ? station.inputName : materials[0]?.label || '',
    panelInputs30:materials?.slice(1).map((row,index)=>({...row,key:'bom'+index})),
    panelMissingBom30:materials?.length===0};
};
inputRows30=function (station) {
  return station.panelInputs30 ?? basePanelInputs30(station);
};
function selectPanelPart30(value) {
  const station=basePanelOperation30();
  const choice=panelPartOptions30(station).find(row=>row.key===value);
  if (!choice || choice.key===panelPartChoice30(station).key) return;
  panelPartSelections30.set(panelWorkKey30(station),value);
  if (levelFor('control')>=2 && state.loadedSources[station.wc]) {
    delete state.loadedSources[station.wc];
    saveState();
  }
  currentJob30.delete(station.code);
  renderControlPanel29();
  document.getElementById('productionPart30')?.focus();
}

function panelRunPart30(run) {
  return run.part || state.serials.find(row=>row.serial===run.serial)?.part ||
    state.cpOperations.find(row=>row.code===run.operation)?.part || '';
}
function openCurrentProduction30() {
  if (!requireLevel(1,'control')) return;
  const station=op29();
  const job=document.querySelector('[name=productionJob30]')?.value || '';
  const runs=state.operationRuns.filter(run=>run.wc===station.wc && run.operation===station.code &&
    panelRunPart30(run)===station.part && (!job || run.jobCode===job));
  const rows=runs.map(run=>({serial:run.serial,part:panelRunPart30(run),at:run.at,qty:run.qty,unit:run.unit,
    lot:run.lot,job:run.jobCode}));
  if (station.code==='NUR') {
    for (const entry of state.nursery.entries) {
      const serial=state.serials.find(row=>row.serial===entry.serial);
      if (serial) rows.push({serial:serial.serial,part:serial.part,at:entry.started,qty:serial.qtyCurrent,
        unit:serial.unit,lot:entry.lot});
    }
  }
  rows.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  const body=rows.map(row=>{
    const serial=state.serials.find(item=>item.serial===row.serial);
    const cells=[row.at?dateDisplay34(row.at):'',row.lot,row.serial,row.part,number34(row.qty)+' '+row.unit,row.job || '—'];
    return '<tr>'+cells.map(value=>'<td>'+esc(value || '—')+'</td>').join('')+
      '<td>'+(serial?badge(serial.status):'—')+'</td></tr>';
  });
  configDialog('Producción actual','<p class="small">'+esc([station.workcenter,station.part,job].filter(Boolean).join(' · '))+
    '</p><div data-catalog-filter30></div><div class="actionbar"><button class="btn soft" type="button" '+
    'onclick="exportDialogGrid30(\'configDialog\',\'produccion-actual\')">Exportar</button></div>'+
    resultsTable30(['Fecha','Lote','Serial','NP','Cantidad','Job','Estado'],body,'650px'));
}

const panelRecordContext30 = recordCP29;
recordCP29=function (db,station,args) {
  if (station.panelMissingBom30) throw Error('Configura las entradas del NP en BOM.');
  const output=panelRecordContext30(db,station,args);
  const run=db.operationRuns[0];
  run.part=output.part;
  if (station.panelRoute30) run.routeId=station.panelRoute30;
  return output;
};
const panelGateContext30 = refreshGate32;
refreshGate32=function () {
  panelGateContext30();
  const station=op29();
  if (station.panelMissingBom30) {
    const button=document.getElementById('reportProduction');
    const fields=document.getElementById('production_fields32');
    if (button) button.disabled=true;
    if (fields) fields.disabled=true;
  }
};

const panelRenderContext30 = renderControlPanel29;
renderControlPanel29=function () {
  panelRenderContext30();
  const view=document.getElementById('view-workcenters');
  const heading=view.querySelector('.cp-heading');
  if (!heading) return;
  const station=basePanelOperation30();
  const selected=panelPartChoice30(station);
  const options=panelPartOptions30(station);
  const controls=document.createElement('div');
  controls.className='cp-workspace-tools30';
  const job=view.querySelector('.r30-job-picker');
  const register=view.querySelector('#reportProduction');
  controls.innerHTML='<label class="field">'+(station.code==='NUR'?'NP de salida':'NP a reportar')+
    '<select class="select" id="productionPart30" onchange="selectPanelPart30(this.value)">'+
    options.map(option=>{
      const duplicate=options.some(other=>other!==option && other.part===option.part);
      const suffix=duplicate && option.route ? ' · Rev. '+option.route.revision+' / '+option.route.sequence : '';
      return '<option value="'+esc(option.key)+'" '+(option.key===selected.key?'selected':'')+'>'+
        esc(option.part+' · '+(getPart(option.part)?.desc || station.output)+suffix)+'</option>';
    }).join('')+'</select></label>'+
    '<div class="cp-workspace-actions30"><button class="btn soft" type="button" onclick="openCurrentProduction30()">Producción actual</button></div>';
  heading.after(controls);
  if (job) {
    const select=job.querySelector('.field');
    if (select && panelUsesJobs30(station)) controls.insertBefore(select,controls.lastElementChild);
    job.remove();
  }
  if (register) controls.lastElementChild.append(register);
  const outputHeading=view.querySelector('.production32 .section-title32 h2');
  if (outputHeading) outputHeading.textContent='Salida';
  view.querySelector('#production_lock32')?.setAttribute('hidden','');
  if (station.code==='EGG') view.querySelector('#parameter_usage')?.closest('label')?.remove();
  if (op29().panelMissingBom30) {
    const sources=view.querySelector('.sources32');
    sources?.querySelector('.card')?.setAttribute('hidden','');
    sources?.insertAdjacentHTML('beforeend','<p class="small" role="status">Configura las entradas del NP en BOM para registrar producción.</p>');
  }
  if (uiState.panelMode30==='capture') {
    heading.querySelector('h1').textContent=station.code==='NUR'?'Guardería':'Registrar producción';
    for (const select of [heading.querySelector('select'),controls.querySelector('#productionPart30'),
      controls.querySelector('[name=productionJob30]')]) if (select) select.disabled=true;
  } else renderPanelOverview30(view,heading,controls);
};

function openPanelCapture30() {
  if (!requireLevel(1,'control')) return;
  uiState.panelCapturePart30=panelPartChoice30(basePanelOperation30()).key;
  uiState.panelCaptureJob30=document.querySelector('[name=productionJob30]')?.value || '';
  uiState.panelCaptureParent30=true;
  uiState.panelMode30='capture';
  renderApp();
}
function returnToPanel30() {
  if (uiState.panelCaptureParent30) { history.back(); return; }
  uiState.panelMode30=undefined;
  lastRouteKey='';
  renderApp();
}
function renderPanelOverview30(view,heading,controls) {
  const station=op29();
  const jobCode=controls.querySelector('[name=productionJob30]')?.value || '';
  const job=jobCode ? jobsForStation30(state,station).find(row=>row.code===jobCode) : null;
  const runs=state.operationRuns.filter(row=>row.wc===station.wc && row.operation===station.code &&
    panelRunPart30(row)===station.part && (!job || row.jobCode===job.code));
  const status=view.querySelector('.wc-status32');
  const log=view.querySelector('.wc-log32');
  const center=heading.querySelector('select')?.closest('label');
  const part=controls.querySelector('#productionPart30').closest('label');
  const jobPicker=controls.querySelector('[name=productionJob30]')?.closest('label');
  const production=controls.querySelector('.cp-workspace-actions30 .btn.soft');
  heading.querySelector('h1').textContent=shellScreen==='control'?'Control Panel':screenName();
  const dashboard=document.createElement('div');
  dashboard.className='cp-overview30';
  const section=(id,title,content)=>'<section class="card cp-overview-card30" data-card="'+id+'"><h2>'+title+'</h2>'+
    '<div class="cp-overview-content30">'+content+'</div></section>';
  dashboard.innerHTML=section('station','Centro de trabajo','<strong>'+esc(station.workcenter)+'</strong>')+
    section('setup','Preparación','<span class="small">'+esc(station.name)+'</span>')+
    section('production','Producción','<button class="btn primary cp-open-capture30" type="button" onclick="openPanelCapture30()">'+
      icon29('box')+(station.code==='NUR'?'Abrir guardería':'Registrar producción')+'</button>'+
      '<dl class="cp-overview-metrics30"><div><dt>Registros</dt><dd>'+runs.length+'</dd></div>'+
      (job?'<div><dt>Cantidad del Job</dt><dd>'+number34(job.qty)+'</dd></div><div><dt>Pendiente</dt><dd>'+
        number34(remainingJob30(job))+'</dd></div>':'')+'</dl>')+
    section('operator','Operador','<strong>'+esc(shellSession?.user || '—')+'</strong>')+
    section('status','Estado del centro de trabajo','')+
    section('reports','Reportes de producción','');
  const content=id=>dashboard.querySelector('[data-card="'+id+'"] .cp-overview-content30');
  if (center) content('station').append(center);
  heading.querySelector('.cp-actions')?.remove();
  content('setup').append(part);
  if (jobPicker) {
    content('setup').append(jobPicker);
    jobPicker.querySelector('select').addEventListener('change',()=>renderControlPanel29());
  }
  if (status) content('status').append(status);
  if (production) content('reports').append(production);
  if (log) content('reports').append(log);
  const checklist=stationChecklistButton30(station);
  if (checklist) content('reports').insertAdjacentHTML('beforeend',checklist);
  view.replaceChildren(heading,dashboard);
}
const navigateBeforePanelMode30=navigateScreen;
navigateScreen=function (id, traceSerial='') {
  if (!shellSession || levelFor(id)>0) {
    uiState.panelMode30=undefined;
    uiState.panelCaptureParent30=false;
    uiState.traceSerial30=id==='trace'?traceSerial:'';
  }
  navigateBeforePanelMode30(id);
};
const restoreBeforePanelMode30=restoreInitialRoute29;
restoreInitialRoute29=function () {
  const direct=location.hash.endsWith('/record-production') && !history.state?.insectmes;
  restoreBeforePanelMode30();
  if (direct && currentView==='workcenters') uiState.panelMode30='capture';
};
const renderBeforePanelFull30=renderShell;
renderShell=function () {
  document.getElementById('app').classList.toggle('cp-full30',currentView==='workcenters');
  renderBeforePanelFull30();
  if (currentView==='workcenters' && uiState.panelMode30==='capture') {
    const title=document.getElementById('pageTitle');
    title.textContent=cpCode==='NUR'?'Guardería':'Registrar producción';
    title.title=title.textContent;
    document.getElementById('back34').onclick=returnToPanel30;
  }
};
