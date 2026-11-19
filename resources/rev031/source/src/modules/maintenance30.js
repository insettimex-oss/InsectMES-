const pmRecords30 = () => state.preventive30 || {equipment:[],tasks:[],runs:[]};


function nextPM30(task, records) {
  const last = records.runs.filter(run => run.task === task.code)
    .map(run => run.date).sort().at(-1);
  return last ? shiftPlanningDate29(last,task.interval) : task.firstDue;
}
function pmState30(task,records,today) {
  const equipment = records.equipment.find(item => item.code === task.equipment);
  if (!task.active || !equipment?.active) return 'Inactivo';
  const due = nextPM30(task,records);
  return due < today ? 'Vencido' : due === today ? 'Hoy' : 'Programado';
}
function pmButton30(label,fn,code,style='soft') {
  return '<button class="btn ' + style + '" type="button" data-code="' + esc(code || '') +
    '" onclick="' + fn + '(this.dataset.code)">' + esc(label) + '</button>';
}
function pmEditAllowed30(screen) {
  return levelFor(screen) >= 2;
}
function renderMaintenance30() {
  const records = pmRecords30();
  const today = dateLot29().id;
  let title,actions,body;
  if (shellScreen === 'equipos') {
    title = 'Equipos';
    actions = (pmEditAllowed30('equipos') ? pmButton30('Agregar','openEquipment30','','primary') : '') +
      screenAction29('Checklist PM','checklist-pm') + screenAction29('Work Centers','wcs');
    const centers = engineeringData29().centers;
    body = resultsTable30(['Código','Equipo','Centro','Ubicación','Activo'],records.equipment.map(item => {
      const center = centers.find(row => row.code === item.center);
      return '<tr><td>' + pmButton30(item.code,'openEquipment30',item.code,'link') + '</td>' +
        [item.name,center ? center.code + ' · ' + center.label : item.center,center?.location || '—',item.active ? 'Sí' : 'No']
          .map(value => '<td>' + esc(value) + '</td>').join('') + '</tr>';
    }));
  } else if (shellScreen === 'checklist-pm') {
    title = 'Checklist PM';
    actions = (pmEditAllowed30('checklist-pm') ? pmButton30('Agregar','openPMTask30','','primary') : '') +
      screenAction29('Equipos','equipos') + screenAction29('Calendario PM','calendario-pm');
    body = resultsTable30(['Código','Equipo','Checklist','Pasos','Cada (días)','Primera fecha','Activo'],records.tasks.map(task =>
      '<tr><td>' + pmButton30(task.code,'openPMTask30',task.code,'link') + '</td>' +
      [task.equipment,task.name,task.steps.length,task.interval,task.firstDue,task.active ? 'Sí' : 'No']
        .map(value => '<td>' + esc(String(value)) + '</td>').join('') + '</tr>'));
  } else {
    return renderPMCalendar30();
  }
  document.getElementById('view-' + currentView).innerHTML =
    cardNavigation29(title,'<div class="actionbar">' + actions + '</div>' + body);
}
function openEquipment30(code) {
  if (!requireLevel(code ? 1 : 2,'equipos')) return;
  const record = pmRecords30().equipment.find(row => row.code === code);
  const fields = [
    field29('code','Código','text',{required:true,readonly:Boolean(record)}),
    field29('name','Nombre del equipo','text',{required:true}),
    choice29('center','Centro de trabajo',centerChoices29(),true),
    field29('active','Activo','checkbox'),
  ];
  openPMEditor30('Equipo','equipment',record,fields);
}
function openPMTask30(code) {
  if (!requireLevel(code ? 1 : 2,'checklist-pm')) return;
  const records = pmRecords30();
  const record = records.tasks.find(row => row.code === code);
  if (!records.equipment.length) return showMsg('Da de alta un equipo para configurar su checklist.',true);
  const fields = [
    field29('code','Código','text',{required:true,readonly:Boolean(record)}),
    field29('name','Nombre del checklist','text',{required:true}),
    choice29('equipment','Equipo',records.equipment.map(row => [row.code,row.code + ' · ' + row.name]),true),
    field29('interval','Intervalo en días','number',{required:true,min:1,max:3650,step:1}),
    field29('firstDue','Primera fecha','date',{required:true}),field29('active','Activo','checkbox'),
  ];
  openPMEditor30('Checklist PM','tasks',record,fields);
}
function openPMEditor30(title,kind,record,fields) {
  const editable = pmEditAllowed30(shellScreen);
  const item = record || {active:true,firstDue:dateLot29().id,interval:30};
  const steps = kind === 'tasks' ? '<label class="field">Pasos (uno por línea)<textarea class="input" name="steps" rows="4" required>' +
    esc((item.steps || []).join('\n')) + '</textarea></label>' : '';
  configDialog(title + (record ? ' · ' + record.code : ''),
    '<form class="ops-dialog" data-kind="' + kind + '" data-code="' + esc(record?.code || '') + '" onsubmit="savePMEditor30(event)">' +
    '<fieldset class="ops-fields"' + (editable ? '' : ' disabled') + '>' +
    fields.map(field => operationsField29(field,item[field.key])).join('') + steps + '</fieldset>' +
    (editable ? '<div class="capture-actions"><button class="btn primary">Guardar</button></div>' : '') + '</form>');
}
function savePMEditor30(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const equipment = form.dataset.kind === 'equipment';
  if (!requireLevel(2,equipment ? 'equipos' : 'checklist-pm')) return;
  const values = readOperationsForm29(form.querySelector('fieldset'));
  const records = pmRecords30();
  const list = equipment ? records.equipment : records.tasks;
  const previous = list.find(row => row.code === form.dataset.code);
  if (!values.code || !values.name || list.some(row => row !== previous && row.code.toUpperCase() === values.code.toUpperCase()))
    return showMsg('Captura un código único y el nombre.',true);
  if (equipment && !engineeringData29().centers.some(row => row.code === values.center))
    return showMsg('Selecciona un centro de trabajo existente.',true);
  if (!equipment) {
    values.interval = Number(values.interval);
    values.steps = values.steps.split(/\r?\n/).map(step => step.trim()).filter(Boolean);
    if (!values.steps.length || !records.equipment.some(row => row.code === values.equipment))
      return showMsg('Selecciona un equipo y captura al menos un paso.',true);
    if (previous && previous.equipment !== values.equipment && records.runs.some(run => run.task === previous.code))
      return showMsg('El checklist ya tiene ejecuciones. Crea otro para un equipo distinto.',true);
  }
  if (previous) list[list.indexOf(previous)] = values;
  else list.push(values);
  state.preventive30 = records;
  saveState();
  closeConfigDialog();
  showMsg('Registro guardado.');
}
function openPMRun30(code) {
  if (!requireLevel(2,'calendario-pm')) return;
  const records = pmRecords30();
  const task = records.tasks.find(row => row.code === code);
  if (!task || pmState30(task,records,dateLot29().id) === 'Inactivo') return;
  configDialog(task.name + ' · ' + task.equipment,
    '<form class="ops-dialog" data-code="' + esc(code) + '" onsubmit="savePMRun30(event)">' +
    '<div class="ops-method">Programado para ' + esc(nextPM30(task,records)) + '</div>' +
    task.steps.map((step,index) => '<label class="ops-check"><input type="checkbox" name="step" value="' + index + '" required> ' +
      esc(step) + '</label>').join('') + operationsField29(field29('notes','Nota (opcional)')) +
    '<div class="capture-actions"><button class="btn primary">Registrar ejecución</button></div></form>');
}
function savePMRun30(event) {
  event.preventDefault();
  if (!requireLevel(2,'calendario-pm')) return;
  const form = event.currentTarget;
  const records = pmRecords30();
  const task = records.tasks.find(row => row.code === form.dataset.code);
  const today = dateLot29().id;
  if (!task || pmState30(task,records,today) === 'Inactivo') return;
  const selected = [...form.querySelectorAll('input[name="step"]:checked')];
  if (selected.length !== task.steps.length) return showMsg('Completa todos los pasos del checklist.',true);
  const due = nextPM30(task,records);
  if (records.runs.some(run => run.task === task.code && run.date === today)) return showMsg('Este checklist ya se registró hoy.',true);
  records.runs.push({task:task.code,equipment:task.equipment,name:task.name,steps:[...task.steps],due,date:today,
    operator:shellSession?.user || '',notes:form.elements.notes.value.trim()});
  state.preventive30 = records;
  saveState();
  closeConfigDialog();
  showMsg('Mantenimiento registrado.');
}


let pmCalendarFilters30 = {view:'list',date:'',status:'',equipment:''};
const pmStatuses30 = ['Vencido','Hoy','Programado','Inactivo'];
const pmViews30 = [['list','Lista'],['week','Semana'],['month','Mes'],['year','Año']];
function pmWindow30(filters) {
  const date = filters.date || dateLot29().id;
  if (filters.view==='year') return [date.slice(0,4)+'-01-01',date.slice(0,4)+'-12-31'];
  if (filters.view==='month') {
    const d = new Date(date+'T00:00:00Z');
    return [date.slice(0,7)+'-01',new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10)];
  }
  const weekday = (new Date(date+'T00:00:00Z').getUTCDay()+6)%7;
  const first = shiftPlanningDate29(date,-weekday);
  return [first,shiftPlanningDate29(first,6)];
}
function pmCalendarRows30() {
  const records = pmRecords30();
  const f = pmCalendarFilters30;
  const today = dateLot29().id;
  const [start,end] = pmWindow30(f);
  return records.tasks.filter(task=>!f.equipment || task.equipment===f.equipment).flatMap(task=>{
    const date=nextPM30(task,records), status=pmState30(task,records,today);
    const first={task,date,status,projected:false};
    if (f.view==='list') return [first];
    const rows=date>=start && date<=end ? [first] : [];
    if (status==='Inactivo' || !Number.isSafeInteger(task.interval) || task.interval<1) return rows;
    const distance=(Date.parse(start)-Date.parse(date))/864e5;
    let offset=Math.max(1,Math.ceil(distance/task.interval))*task.interval;
    for (let due=shiftPlanningDate29(date,offset);due<=end;due=shiftPlanningDate29(date,offset+=task.interval)) {
      rows.push({task,date:due,status:'Programado',projected:true});
    }
    return rows;
  }).filter(row=>!f.status||row.status===f.status).sort((a,b)=>a.date.localeCompare(b.date));
}
function pmScheduleView30(rows) {
  const f = pmCalendarFilters30;
  if (f.view==='list') return resultsTable30(['Equipo','Checklist','Próxima fecha','Estado','Ejecución'],
    rows.map(({task,date,status})=>'<tr>'+[task.equipment,task.name,date,status].map(v=>'<td>'+esc(v)+'</td>').join('')+
      '<td>'+pmRunButton30(task,status)+'</td></tr>'),'640px');
  const [start,end] = pmWindow30(f);
  const event = ({task,date,status,projected},withDay) => '<article class="pm-event" data-equipment="'+esc(task.equipment)+
    '" data-task="'+esc(task.name)+'" data-date="'+esc(date)+'" data-status="'+esc(status)+'"><small>'+esc((withDay?date.slice(8)+' · ':'')+status)+
    '</small><b>'+esc(task.name)+'</b>'+(projected?'':pmRunButton30(task,status))+'</article>';
  if (f.view==='year') {
    return '<div class="pm-year">'+Array.from({length:12},(_,i)=>{
      const month = start.slice(0,4)+'-'+String(i+1).padStart(2,'0');
      const name = new Intl.DateTimeFormat('es-MX',{month:'long',timeZone:'UTC'}).format(new Date(month+'-01T00:00:00Z'));
      return '<section><h3>'+esc(name)+'</h3>'+rows.filter(row=>row.date.startsWith(month)).map(row=>event(row,true)).join('')+'</section>';
    }).join('')+'</div>';
  }
  const first = shiftPlanningDate29(start,-(new Date(start+'T00:00:00Z').getUTCDay()+6)%7);
  const slots = Math.ceil(((Date.parse(end)-Date.parse(first))/864e5+1)/7)*7;
  return '<div class="pm-days">'+['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d=>'<b class="pm-weekday">'+d+'</b>').join('')+
    Array.from({length:slots},(_,i)=>{
      const date=shiftPlanningDate29(first,i);
      return '<section'+(date<start||date>end?' class="pm-outside"':'')+'><h3>'+Number(date.slice(8))+
        '</h3>'+rows.filter(row=>row.date===date).map(row=>event(row,false)).join('')+'</section>';
    }).join('')+'</div>';
}
function pmRunButton30(task,status) {
  return pmEditAllowed30('calendario-pm') && status!=='Inactivo' ? pmButton30('Registrar','openPMRun30',task.code) : '—';
}
function renderPMCalendar30() {
  const records = pmRecords30();
  const f = pmCalendarFilters30;
  const fields = [
    choice29('view','Vista',pmViews30,true),field29('date','Fecha de referencia','date'),
    choice29('equipment','Equipo',records.equipment.map(row=>[row.code,row.name])),
    choice29('status','Estado',options29(pmStatuses30)),
  ];
  const filters = '<form class="ops-filters" onsubmit="filterPMCalendar30(event)"><div class="ops-fields">'+
    fields.map(field=>operationsField29(field,f[field.key] || (field.key==='date'?dateLot29().id:''),true)).join('')+
    '</div><div class="ops-filter-actions"><button class="btn primary">Buscar</button></div></form>';
  const actions = '<div class="actionbar">'+(pmEditAllowed30('calendario-pm')&&pmEditAllowed30('checklist-pm')?
    pmButton30('Agregar','openPMTask30','','primary'):'')+
    '<button class="btn soft" type="button" onclick="exportPMCalendar30()">Exportar</button>'+
    screenAction29('Checklist PM','checklist-pm')+screenAction29('Equipos','equipos')+'</div>';
  const history = '<h3>Historial de mantenimiento</h3>'+dataTable29(['Fecha','Equipo','Checklist','Realizó','Nota'],
    [...records.runs].reverse().filter(row=>!f.equipment||row.equipment===f.equipment)
      .map(row=>[row.date,row.equipment,row.name,row.operator,row.notes]));
  document.getElementById('view-'+currentView).innerHTML = cardNavigation29('Calendario PM',
    filters+actions+pmScheduleView30(pmCalendarRows30())+history);
}
function filterPMCalendar30(event) {
  event.preventDefault();
  const f=readOperationsForm29(event.currentTarget);
  if (!pmViews30.some(([id])=>id===f.view)) return;
  pmCalendarFilters30=f;
  renderPMCalendar30();
}
function exportPMCalendar30() {
  if (!requireLevel(1,'calendario-pm')) return;
  const search=catalogSearchActive30('calendario-pm');
  const rows=pmCalendarRows30().filter(({task,date,status})=>catalogSearchMatches30({
    Equipo:task.equipment,Checklist:task.name,'Próxima fecha':date,Estado:status,Ejecución:pmRunButton30(task,status)==='—'?'—':'Registrar',
  },search));
  if (!rows.length) return showMsg('No hay programas para exportar.',true);
  exportRows('calendario-pm.csv',['Equipo','Checklist','Próxima fecha','Estado'],
    rows.map(({task,date,status})=>[task.equipment,task.name,date,status]));
}
