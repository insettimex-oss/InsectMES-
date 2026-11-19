function panelIcon31(name){return menuApproved29.icon(({factory:'production',box:'inventory',check:'quality',clock:'recent'})[name]||name);}
/* Control Panel overview only. Capture workflow and source loading stay unchanged. */
function panelSelectionCards31(kind){
  if(uiState.panelMode30==='capture')return;
  const station=op29(),selected=panelPartChoice30(basePanelOperation30());
  const choices=kind==='station'?panelStations30().slice().sort((a,b)=>cyclePlan30(a).sequence-cyclePlan30(b).sequence).map(row=>({value:row.code,code:row.wc,name:row.workcenter,detail:row.name,selected:row.code===station.code,icon:'factory'})):
    panelPartOptions30(basePanelOperation30()).map(row=>({value:row.key,code:row.part,name:getPart(row.part)?.desc||row.part,detail:row.route?'Op No '+row.route.sequence+' · '+station.name:station.name,selected:row.key===selected.key,icon:'box'}));
  configDialog(kind==='station'?'Centro de trabajo':'No Parte','<div class="cp-picker31"><label class="cp-picker-search31">Buscar<input class="input" type="search" aria-label="Buscar en tarjetas" placeholder="Buscar" oninput="filterPanelCards31(this.value)"></label><div class="cp-picker-grid31">'+choices.map(row=>'<button type="button" class="cp-choice31 '+(row.selected?'is-selected':'')+'" data-kind="'+kind+'" data-value="'+esc(row.value)+'" onclick="choosePanelCard31(this.dataset.kind,this.dataset.value)"><span class="cp-choice-icon31">'+panelIcon31(row.icon)+'</span><span class="cp-choice-code31">'+esc(row.code)+'</span><strong>'+esc(row.name)+'</strong><small>'+esc(row.detail)+'</small>'+(row.selected?'<span class="cp-choice-check31" aria-label="Seleccionado">✓</span>':'')+'</button>').join('')+'</div></div>');
  ensureConfigDialog().classList.add('cp-picker-dialog31');
}
function filterPanelCards31(value){const query=value.trim().toLocaleLowerCase('es');for(const card of ensureConfigDialog().querySelectorAll('.cp-choice31'))card.hidden=!card.textContent.toLocaleLowerCase('es').includes(query);}
function choosePanelCard31(kind,value){
  const select=document.querySelector(kind==='station'?'#view-workcenters select[aria-label="Workcenter"]':'#productionPart30');
  if(!select||select.disabled||![...select.options].some(option=>option.value===value))return;
  closeConfigDialog();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));
}
function panelSelectedCard31(kind,code,name,detail,icon){return '<button type="button" class="cp-selected31" onclick="panelSelectionCards31(\''+kind+'\')"><span class="cp-selected-icon31">'+panelIcon31(icon)+'</span><span class="cp-selected-copy31"><small>'+esc(code)+'</small><strong>'+esc(name)+'</strong><span>'+esc(detail)+'</span></span><span class="cp-selected-change31">Cambiar '+panelIcon31('arrow')+'</span></button>';}
const panelOverviewBefore31=renderControlPanel29;
renderControlPanel29=function(){
  panelOverviewBefore31();if(uiState.panelMode30==='capture')return;
  const view=document.getElementById('view-workcenters'),dashboard=view.querySelector('.cp-overview30');if(!dashboard)return;
  dashboard.classList.add('cp-dashboard31');
  const station=op29(),rule=wcRule32(),part=getPart(station.part),section=id=>dashboard.querySelector('[data-card="'+id+'"] .cp-overview-content30');
  const center=section('station'),centerPicker=center.querySelector('label');if(centerPicker)centerPicker.hidden=true;
  center.querySelector(':scope > strong')?.remove();
  center.insertAdjacentHTML('afterbegin',panelSelectedCard31('station',station.wc,station.workcenter,station.name,'factory'));
  const setup=section('setup'),partPicker=setup.querySelector('#productionPart30')?.closest('label');if(partPicker)partPicker.hidden=true;
  setup.querySelector(':scope > span.small')?.remove();
  setup.insertAdjacentHTML('afterbegin',panelSelectedCard31('part',station.part,part?.desc||station.output,station.name,'box'));
  const strayJob=view.querySelector('.cp-heading [name=productionJob30]');if(strayJob)setup.append(strayJob.closest('label'));
  const job=setup.querySelector('[name=productionJob30]');if(job)job.closest('label').classList.add('cp-job31');
  const status=section('status'),statusButton=status.querySelector('.wc-status32');
  if(statusButton){statusButton.innerHTML='<span class="cp-status-symbol31">'+panelIcon31(rule.code==='PRODUCTION'?'factory':'clock')+'</span><span class="cp-status-copy31"><small>Work Center Status</small><strong>'+esc(rule.description||rule.code)+'</strong><span>'+esc(station.wc)+'</span></span><span class="cp-status-edit31">Cambiar</span>';statusButton.style.background=safeColor32(rule.color);}
  const reports=section('reports');for(const button of reports.querySelectorAll('button')){button.classList.add('cp-report31');if(button.classList.contains('wc-log32'))button.innerHTML=panelIcon31('clock')+'<span>Work Center Log</span>';else if(!button.querySelector('svg'))button.insertAdjacentHTML('afterbegin',panelIcon31(button.textContent.includes('Checklist')?'check':'box'));}
  const operator=section('operator');operator.innerHTML='<span class="cp-operator-avatar31">'+esc((shellSession?.user||'O').slice(0,1))+'</span><div><strong>'+esc(shellSession?.user||'—')+'</strong><small>Operador</small></div>';
  const production=section('production');production.querySelector('.cp-open-capture30')?.classList.add('cp-start31');
  const duration=cycleDurationText30(cyclePlan30(station));
  production.insertAdjacentHTML('afterbegin','<div class="cp-production-heading31"><span>'+panelIcon31('clock')+'Tiempo de proceso</span><strong>'+esc(duration)+'</strong></div>');
  const title=dashboard.querySelector('[data-card="setup"] > h2');if(title)title.textContent='No Parte y operación';
};

