function selectedProductionJob31(station=op29()){
  const code=document.querySelector('[name=productionJob30]')?.value||'';
  return jobsForStation30(state,station).find(job=>job.code===code&&remainingJob30(job)>1e-8);
}
const recordProductionBefore31=recordCP29;
recordCP29=function(db,station,args){
  if(panelUsesJobs30(station)){
    const code=args.jobCode||document.querySelector('[name=productionJob30]')?.value||'';
    if(!jobsForStation30(db,station).some(job=>job.code===code&&remainingJob30(job,db)>1e-8))throw Error('Selecciona un Job disponible para este No Parte y Work Center.');
    args={...args,jobCode:code};
  }
  return recordProductionBefore31(db,station,args);
};
const gateProductionBefore31=refreshGate32;
refreshGate32=function(){
  gateProductionBefore31();
  if(!panelUsesJobs30(op29())||selectedProductionJob31())return;
  const field=document.getElementById('production_fields32'),button=document.getElementById('reportProduction');
  if(field)field.disabled=true;if(button)button.disabled=true;
  const message=document.getElementById('production_lock32');if(message)message.textContent='Selecciona un Job para registrar producción.';
};
const panelProductionBefore31=renderControlPanel29;
renderControlPanel29=function(){
  panelProductionBefore31();const station=op29();if(!panelUsesJobs30(station))return;
  const view=document.getElementById('view-workcenters');let select=view.querySelector('[name=productionJob30]');
  if(!select){
    const jobs=jobsForStation30(state,station).filter(job=>remainingJob30(job)>1e-8);
    const label=document.createElement('label');label.className='field';label.innerHTML='Job <span class="req">*</span><select class="select" name="productionJob30" aria-label="Job" required><option value="">Seleccionar Job</option>'+jobs.map(job=>'<option value="'+esc(job.code)+'">'+esc(job.code)+'</option>').join('')+'</select>';
    const area=view.querySelector('.cp-workspace-tools30')||view.querySelector('.cp-heading');area?.append(label);select=label.querySelector('select');
  }
  select.required=true;select.setAttribute('aria-label','Job');
  for(const node of select.closest('label')?.childNodes||[])if(node.nodeType===3&&/opcional/i.test(node.textContent))node.textContent='Job ';
  select.addEventListener('change',()=>{currentJob30.set(station.code,select.value);refreshGate32();const capture=view.querySelector('[onclick="openPanelCapture30()"]');if(capture)capture.disabled=!selectedProductionJob31(station);});
  const capture=view.querySelector('[onclick="openPanelCapture30()"]');if(capture)capture.disabled=!selectedProductionJob31(station);
  refreshGate32();
};
const openProductionBefore31=openPanelCapture30;
openPanelCapture30=function(){if(panelUsesJobs30(op29())&&!selectedProductionJob31())return showMsg('Selecciona un Job antes de registrar producción.',true);openProductionBefore31();};
