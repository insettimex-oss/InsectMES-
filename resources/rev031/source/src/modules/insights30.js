
const insights30 = {
  eggs:{name:'Huevos cosechados',group:'Producción',unit:'g',permission:'control',op:'EGG'},
  transfers:{name:'Larveros transferidos',group:'Producción',unit:'larveros',permission:'control',op:'TRA'},
  larvae:{name:'Larva fresca tamizada',group:'Producción',unit:'kg',permission:'control',op:'HAR'},
  mortality:{name:'Mortalidad',group:'Calidad',unit:'%',permission:'checklist'},
  production:{name:'Historial de producción',group:'Producción',unit:'capturas',permission:'control'},
  movements:{name:'Movimientos de inventario',group:'Inventario',unit:'movimientos',permission:'inventory'},
};
const insightSources30 = {
  forms:'INS005 · Google Forms', excel:'INS020 · Transferencia', mes:'InsectMES',
};
let insightReport30 = null;
let insightCategory30 = '';
let insightSearch30 = '';
let insightFilters30 = {};
let insightHomePeriod30 = 'year';
let insightDetail30 = null;

function canInsight30(key) {
  return Boolean(insights30[key] && levelFor(insights30[key].permission));
}
function insightRange30(period = 'year') {
  const end = dateLot29().id;
  const start = period === 'month' ? end.slice(0,7) + '-01' : period === 'week' ? shiftPlanningDate29(end,-6) : end.slice(0,4) + '-01-01';
  return {start,end,group:period === 'year' ? 'month' : 'day',source:''};
}
function insightDate30(at) {
  return at && Number.isFinite(Date.parse(at)) ? dateLot29(new Date(at)).id : '';
}
function insightEntries30(key, range) {
  if (!canInsight30(key)) return [];
  const spec = insights30[key];
  const imported = key === 'eggs' ? productionHistory30.eggs.map(r => ({...r,source:'forms'})) :
    key === 'transfers' ? productionHistory30.transfers.map(r => ({...r,source:'excel'})) : [];
  let live;
  if (key === 'mortality') {
    live = (state.quality30 || []).filter(row => row.sample > 0 && Number.isFinite(row.dead) && row.dead >= 0 && row.dead <= row.sample)
      .map(row => ({date:row.date,lot:row.lot,serial:row.serial,qty:100*row.dead/row.sample,dead:row.dead,sample:row.sample}));
  } else if (key === 'movements') {
    live = state.movements.map(row => ({date:insightDate30(String(row.ts).replace(' ','T') + 'Z'),
      lot:row.part,serial:row.serial,qty:1,action:row.type,weight:row.qty,movementUnit:row.unit}));
  } else if (key === 'production') {
    live = state.operationRuns.map(row => ({date:insightDate30(row.at),lot:row.lot,serial:row.serial,qty:1,
      action:state.cpOperations.find(op=>op.code===row.operation)?.name || row.operation,
      weight:row.qty,movementUnit:row.unit}));
  } else {
    live = state.operationRuns.filter(row => row.operation === spec.op).flatMap(row => {
      let qty;
      if (key === 'transfers') qty = row.fields?.transferred;
      else {
        try { qty = quantityIn30(Number(row.qty),row.unit,spec.unit); } catch { return []; }
      }
      if (!Number.isFinite(Number(qty)) || qty == null || qty === '' || Number(qty) < 0) return [];
      return [{date:insightDate30(row.at),lot:row.lot,serial:row.serial,qty:Number(qty)}];
    });
  }
  const entries=[...imported,...live.map(r => ({...r,source:'mes'}))]
    .filter(r => r.date && r.date >= range.start && r.date <= range.end && (!range.source || r.source === range.source))
    .sort((a,b) => a.date.localeCompare(b.date) || (a.row || 0) - (b.row || 0));
  const search=range.catalogSearchKey30&&catalogSearchActive30(range.catalogSearchKey30);
  if (!search || !catalogSearchHas30(search)) return entries;
  const {headers,values}=insightDetails30(key,entries);
  return entries.filter((_,i)=>catalogSearchMatches30(Object.fromEntries(headers.map((label,j)=>[
    label,j===3&&typeof values[i][j]==='number'?number34(values[i][j]):String(values[i][j] ?? ''),
  ])),search));
}
function insightValue30(key, rows) {
  const measured = rows.filter(row => Number.isFinite(row.qty));
  if (!measured.length) return null;
  if (key === 'mortality') return 100 * measured.reduce((sum,r) => sum+r.dead,0) / measured.reduce((sum,r) => sum+r.sample,0);
  return measured.reduce((sum,r) => sum+r.qty,0);
}
function insightNumber30(key,value) {
  if (key === 'transfers' || key === 'production' || key === 'movements')
    return new Intl.NumberFormat('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}).format(Number(value));
  if (key === 'eggs')
    return new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value));
  return number34(value);
}
function insightChart30(key, range, rows, compact = false) {
  const spec = insights30[key];
  const total = insightValue30(key,rows);
  if (total === null) return '<div class="insight-empty">Sin registros en este período</div>';
  const group = range.group === 'month' ? 'month' : 'day';
  const buckets = new Map();
  for (const row of rows) {
    const k = group === 'month' ? row.date.slice(0,7) : row.date;
    if (!buckets.has(k)) buckets.set(k,[]);
    buckets.get(k).push(row);
  }
  const points = [...buckets].map(([date,items]) => [date,insightValue30(key,items)]).filter(([,v]) => v !== null);
  const top = Math.max(1,...points.map(([,v]) => v));
  const [x0,y0,w,h] = [56,116,530,90];
  const order = date => group==='month' ? Number(date.slice(0,4))*12+Number(date.slice(5,7)) : Date.parse(date)/864e5;
  const first = order(range.start), span = Math.max(1,order(range.end)-first+1);
  const position = date => x0 + (order(date)-first+.5)*w/span;
  const y = value => y0-h*value/top;
  const label = date => new Intl.DateTimeFormat('es-MX',{month:'short',day:group==='day'?'numeric':undefined,timeZone:'UTC'})
    .format(new Date((group==='day'?date:date+'-01')+'T00:00:00Z')).replace(/\b([a-záéíóúñ])([a-záéíóúñ]{2})\.?/g,(_,a,b)=>a.toUpperCase()+b);
  const ticks = points.map(([date],i) => i % Math.max(1,Math.ceil(points.length/9)) ? '' :
    '<text x="'+position(date)+'" y="139" text-anchor="middle">'+esc(label(date))+'</text>').join('');
  const guides = [0,.5,1].map(f => '<line x1="'+x0+'" x2="586" y1="'+y(top*f)+'" y2="'+y(top*f)+'"/><text x="48" y="'+(y(top*f)+4)+'" text-anchor="end">'+esc(insightNumber30(key,top*f))+'</text>').join('');
  const line = key === 'eggs' || key === 'mortality';
  const series = line ? '<polyline points="'+points.map(([date,v]) => position(date)+','+y(v)).join(' ')+'"/>' : '';
  const marks = points.map(([date,v]) => {
    const message = label(date)+' · '+insightNumber30(key,v)+' '+spec.unit;
    const width = Math.min(30,w/span*.7);
    const shape = line ? '<circle cx="'+position(date)+'" cy="'+y(v)+'" r="'+Math.min(5,w/span/2)+'"/>' :
      '<rect x="'+(position(date)-width/2)+'" y="'+y(v)+'" width="'+width+'" height="'+Math.max(2,y0-y(v))+'" rx="2"/>';
    return '<g class="insight-point" role="button" tabindex="0" aria-label="'+esc(message)+'" data-key="'+key+
      '" data-start="'+date+'" data-end="'+(group==='day'?date:insightMonthEnd30(date))+'" data-range-start="'+esc(range.start)+
      '" data-range-end="'+esc(range.end)+'" data-source="'+esc(range.source || '')+'" data-label="'+esc(message)+
      '" data-catalog-search-key30="'+esc(range.catalogSearchKey30 || '')+
      '" onclick="insightPoint30(this)" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();insightPoint30(this)}" '+
      'onfocus="highlightInsight30(this)" onpointerenter="highlightInsight30(this)"><title>'+esc(message)+'</title>'+shape+'</g>';
  }).join('');
  return '<div class="insight-plot'+(compact?' compact':'')+'"><svg viewBox="0 0 610 148" role="group" aria-label="'+esc(spec.name)+'">'+guides+series+marks+ticks+
    '</svg><output hidden></output></div>';
}
function insightMonthEnd30(month) {
  return new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),0)).toISOString().slice(0,10);
}
function highlightInsight30(point) {
  const output=point.closest('.insight-plot').querySelector('output');output.hidden=false;output.textContent=point.dataset.label;
}
function insightPoint30(point) {
  const d = point.dataset;
  openInsightDetail30(d.key,{start:d.start.length===7 ? [d.start+'-01',d.rangeStart].sort().at(-1) : d.start,
    end:[d.end,d.rangeEnd].sort()[0],source:d.source,catalogSearchKey30:d.catalogSearchKey30});
}
function insightSummary30(key, range, compact = false) {
  const spec = insights30[key], rows = insightEntries30(key,range), value = insightValue30(key,rows);
  return '<article class="card insight-card"><div class="insight-card-title"><h3>'+esc(spec.name)+'</h3>'+
    '<button type="button" class="btn link" data-key="'+key+'" data-start="'+esc(range.start)+'" data-end="'+esc(range.end)+
    '" data-group="'+esc(range.group)+'" data-source="'+esc(range.source || '')+'" onclick="expandInsight30(this)" aria-label="Ampliar '+esc(spec.name)+'">↗</button></div>'+
    '<strong class="insight-total">'+(value===null?'—':insightNumber30(key,value)+' '+esc(spec.unit))+'</strong>'+insightChart30(key,range,rows,compact)+'</article>';
}
function expandInsight30(button) {
  if (!requireLevel(1,'reports') || !canInsight30(button.dataset.key)) return;
  const {key,start,end,group,source} = button.dataset;
  openInsight30(key,{start,end,group,source,view:'both'});
}
function insightDetails30(key, rows) {
  const headers = ['Fecha','Lote / Parte','Serial','Cantidad','Unidad','Fuente','Fila','Detalle'];
  const values = rows.map(row => {
    let detail = '';
    if (row.cages) detail = row.cages.map((n,i) => n == null ? '' : 'Jaula '+(i+1)+': '+n+' g').filter(Boolean).join(' · ');
    if (row.source === 'excel') detail = [
      row.weight == null ? '' : 'Peso larva: '+row.weight+' g',
      row.frass == null ? '' : 'Frass: '+row.frass+' g',
      row.larvae == null ? '' : 'Larvas estimadas: '+number34(row.larvae),
    ].filter(Boolean).join(' · ');
    if (row.sample) detail = row.dead+' muertos / '+row.sample+' revisados';
    if (row.action) detail = row.action+' · '+row.weight+' '+row.movementUnit;
    return [row.date,row.lot || '',row.serial || '',row.qty ?? '',insights30[key].unit,insightSources30[row.source],row.row || '',detail];
  });
  return {headers,values};
}
function insightTable30(key, rows) {
  const {headers,values} = insightDetails30(key,rows);
  return resultsTable30(headers,values.map(row => '<tr>'+row.map((value,i) => '<td>'+
    esc(i===3 && typeof value==='number'?insightNumber30(key,value):String(value ?? ''))+'</td>').join('')+'</tr>'),'780px');
}
function exportInsight30(key, range) {
  if (!canInsight30(key)) return;
  const {headers,values} = insightDetails30(key,insightEntries30(key,range));
  if (!values.length) return showMsg('No hay resultados para exportar.',true);
  exportRows(key+'-'+range.start+'-'+range.end+'.csv',headers,values);
}
function openInsightDetail30(key, range) {
  if (!canInsight30(key)) return;
  insightDetail30 = {key,range};
  const rows = insightEntries30(key,range);
  const link = rows.some(row => row.source==='forms') ? '<a class="btn r30-sub-action" target="_blank" rel="noopener" href="https://docs.google.com/spreadsheets/d/1wAIHT-Wso4FZoyfcTdz0vNESqvgP09HCPit4I3-c15w/edit#gid=1006051593">Abrir respuestas INS005 ↗</a>' : '';
  configDialog(insights30[key].name+' · Detalle',
    '<div data-catalog-filter30></div><div class="actionbar"><button class="btn soft" type="button" onclick="exportInsightDetail30()">Exportar</button>'+link+'</div>'+insightTable30(key,rows));
}
function exportInsightDetail30() {
  if (insightDetail30) exportInsight30(insightDetail30.key,insightDetail30.range);
}
function insightPersonal30() {
  const account = shellSession?.accountId;
  return account ? (state.personalInsights30 || []).filter(report => report.owner === account) : [];
}
function insightCatalog30() {
  return [...Object.entries(insights30).map(([id,spec]) => ({id,name:spec.name,group:spec.group,keys:[id],
    view:['production','movements'].includes(id)?'table':'both'})),...insightPersonal30()]
    .map(report => ({...report,keys:report.keys.filter(canInsight30)})).filter(report => report.keys.length);
}
function openInsight30(id, range) {
  if (!requireLevel(1,'reports')) return;
  const report = insightCatalog30().find(r => r.id===id);
  if (!report) return;
  insightReport30 = id;
  insightFilters30 = range || report.filters || {...insightRange30(),view:report.view};
  if (shellScreen==='reports') { renderReportsNavigation29(); syncRoute29(); }
  else navigateScreen('reports');
}
function resetInsights30() {
  insightReport30 = null;
  renderReportsNavigation29();
}
function renderInsightCatalog30(view) {
  const catalog = insightCatalog30();
  const groups = [...new Set(catalog.map(r => r.group))];
  const category = '<div class="insight-categories">'+['',...groups].map(group => '<button type="button" class="insight-category" data-group="'+esc(group)+
    '" aria-pressed="'+(group===insightCategory30)+'" onclick="setInsightCategory30(this.dataset.group)"><b>'+esc(group || 'Todos')+'</b><small>'+
    catalog.filter(r=>!group||r.group===group).length+' reportes</small></button>').join('')+'</div>';
  view.innerHTML = cardNavigation29('Reportes',
    '<form class="ops-filters insight-toolbar" onsubmit="searchInsights30(event)">'+operationsField29(field29('search','Buscar reporte'),insightSearch30,true)+
    '<button class="btn primary">Buscar</button></form>'+category+
    '<div class="actionbar"><button class="btn primary" data-consult-control30 type="button" onclick="openInsightBuilder30()">Agregar</button></div>'+
    '<div class="insight-categories">'+catalog.filter(r=>(!insightCategory30||r.group===insightCategory30)&&
      containsOperations29(r.name,insightSearch30)).map(r=>'<button type="button" class="insight-category" data-id="'+esc(r.id)+
      '" data-category="'+esc(r.group)+'" onclick="openInsight30(this.dataset.id)"><b>'+esc(r.name)+'</b><small>'+esc(r.kind==='dashboard'?'Dashboard':r.group)+'</small></button>').join('')+'</div>');
}
function setInsightCategory30(group) {
  insightCategory30 = group;
  renderReportsNavigation29();
}
function searchInsights30(event) {
  event.preventDefault();
  insightSearch30 = event.currentTarget.elements.search.value.trim();
  renderReportsNavigation29();
}
renderReportsNavigation29 = function () {
  const view = document.getElementById('view-dashboard');
  const report = insightCatalog30().find(r => r.id===insightReport30);
  if (!report) return renderInsightCatalog30(view);
  const range = {...insightFilters30,catalogSearchKey30:'reports:'+report.id};
  const fields = [
    field29('start','Desde','date',{required:true}),field29('end','Hasta','date',{required:true}),
    choice29('group','Agrupar por',[['day','Día'],['month','Mes']],true),
    choice29('source','Fuente',Object.entries(insightSources30)),
    choice29('view','Vista',[['chart','Gráfica'],['table','Tabla'],['both','Gráfica y tabla']],true),
  ];
  const filters = '<form class="ops-filters" onsubmit="filterInsights30(event)"><div class="ops-fields">'+
    fields.map(f=>operationsField29(f,range[f.key],true)).join('')+
    '</div><div class="ops-filter-actions"><button class="btn primary">Buscar</button></div></form>';
  const actions = '<div class="actionbar"><button type="button" class="btn soft" onclick="exportActiveInsight30()">Exportar</button></div>';
  const details = report.keys.map(key => range.view==='chart'?'':'<section class="insight-report-table"><h3>'+esc(insights30[key].name)+
    '</h3>'+insightTable30(key,insightEntries30(key,range))+'</section>').join('');
  const charts = range.view==='table'?'':'<div class="insight-cards">'+report.keys.map(key=>insightSummary30(key,range)).join('')+'</div>';
  view.innerHTML = cardNavigation29(report.name,filters+actions+charts+details);
};
function filterInsights30(event) {
  event.preventDefault();
  const range = readOperationsForm29(event.currentTarget);
  if (range.start > range.end) return showMsg('Revisa el rango de fechas.',true);
  insightFilters30 = range;
  const personal = insightPersonal30().find(report=>report.id===insightReport30);
  if (personal) {
    personal.filters=range;
    saveState();
  }
  renderReportsNavigation29();
}
function exportActiveInsight30() {
  if (!requireLevel(1,'reports')) return;
  const report = insightCatalog30().find(r=>r.id===insightReport30);
  if (!report) return;
  const range={...insightFilters30,catalogSearchKey30:'reports:'+report.id};
  if (report.keys.length===1) return exportInsight30(report.keys[0],range);
  const all = report.keys.map(key=>insightDetails30(key,insightEntries30(key,range)));
  const rows = all.flatMap((data,i)=>data.values.map(row=>[insights30[report.keys[i]].name,...row]));
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  exportRows('dashboard.csv',['Indicador',...all[0].headers],rows);
}
function openInsightBuilder30(kind = 'report', suggested = '', label = '') {
  if (!requireLevel(1,'reports') || !shellSession?.accountId) return;
  const keys = Object.keys(insights30).filter(canInsight30);
  if (!keys.length) return showMsg('Tu rol no tiene acceso a una fuente de reportes.',true);
  const defaults = [suggested || keys[0]];
  const options = keys.map(key=>'<label class="ops-check"><input type="checkbox" name="metric" value="'+key+'"'+
    (defaults.includes(key)?' checked':'')+'> '+esc(insights30[key].name)+'</label>').join('');
  configDialog('Crear reporte o dashboard','<form class="ops-dialog" data-consult-control30 onsubmit="saveInsightBuilder30(event)"><div class="ops-fields">'+
    operationsField29(field29('name','Nombre','text',{required:true}),label)+
    operationsField29(choice29('kind','Tipo',[['report','Reporte'],['dashboard','Dashboard']],true),kind)+
    operationsField29(choice29('view','Vista',[['chart','Gráfica'],['table','Tabla'],['both','Gráfica y tabla']],true),'both')+
    '</div><fieldset class="ops-line"><legend>Indicadores</legend>'+options+'</fieldset><div class="capture-actions"><button class="btn primary">Guardar</button></div></form>');
}
function saveInsightBuilder30(event) {
  event.preventDefault();
  if (!requireLevel(1,'reports') || !shellSession?.accountId) return;
  const form = event.currentTarget;
  const keys = [...form.querySelectorAll('[name=metric]:checked')].map(input=>input.value).filter(canInsight30);
  const {name,kind,view} = readOperationsForm29(form);
  if (!name || !keys.length || (kind==='report' && keys.length!==1)) return showMsg('Elige un indicador para el reporte o varios para un dashboard.',true);
  if (!['report','dashboard'].includes(kind) || !['chart','table','both'].includes(view)) return;
  const id = 'personal-'+crypto.randomUUID();
  (state.personalInsights30 ??= []).push({id,name:name.slice(0,100),group:'Mis reportes',owner:shellSession.accountId,kind,view,keys});
  saveState();
  closeConfigDialog();
  openInsight30(id);
}
function setInsightHomePeriod30(period) {
  insightHomePeriod30 = period;
  renderHome();
}
const shortcutsBeforeInsights30 = renderHome;
renderHome = function () {
  shortcutsBeforeInsights30();
  const keys = ['eggs','transfers','larvae','mortality'].filter(canInsight30);
  if (!keys.length) return;
  const range = insightRange30(insightHomePeriod30);
  const view = document.getElementById('view-dashboard');
  view.querySelector('.menu29-home').classList.add('r30-home-with-kpis');
  view.insertAdjacentHTML('beforeend','<div class="insight-home"><div class="insight-home-tools"><label>Período <select class="select" data-consult-control30 onchange="setInsightHomePeriod30(this.value)">'+
    [['year','Año actual'],['month','Mes actual'],['week','Últimos 7 días']].map(([id,label])=>'<option value="'+id+'"'+
      (id===insightHomePeriod30?' selected':'')+'>'+label+'</option>').join('')+
    '</select></label></div><div class="insight-cards">'+keys.map(key=>insightSummary30(key,range,true)).join('')+'</div></div>');
};

