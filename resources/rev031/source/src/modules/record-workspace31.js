// Master records have their own workspace; bulk changes remain modal.
const recordOpeners31={operations:'openEngineeringRecord29',wcs:'openEngineeringRecord29',routing:'openEngineeringRecord29',proveedores:'openOperationsRecord29',oc:'openOperationsRecord29','job-manager':'openOperationsRecord29',equipos:'openEquipment30','checklist-pm':'openPMTask30'};
let rebuildingRecord31=false,applyingRecord31=false;
const dialogBeforeRecord31=configDialog;
configDialog=function(title,body){
  dialogBeforeRecord31(title,body);
  const dialog=ensureConfigDialog(),form=dialog.querySelector('form.ops-dialog'),opener=recordOpeners31[shellScreen];
  if(!form||!opener||form.hasAttribute('data-bulk-inventory30'))return;
  const descriptor={screen:shellScreen,opener,key:form.dataset.key||form.dataset.code||'',title};
  dialog.close();dialog.classList.add('record-workspace31');
  const view=document.getElementById('view-'+currentView);
  dialog.querySelector('.concept-head').hidden=true;
  view.innerHTML='<div class="card record-card31"><div class="card-head"><div class="card-title">'+esc(title)+'</div></div><div class="card-body" id="record-mount31"></div></div>';
  view.querySelector('#record-mount31').append(dialog);
  const bar=form.querySelector('.capture-actions');
  if(bar){bar.insertAdjacentHTML('afterbegin','<button type="button" class="btn soft" onclick="closeConfigDialog()">Cancelar</button><button type="button" class="btn soft" onclick="applyRecordWorkspace31(this.form)">Aplicar</button>');}
  document.getElementById('pageTitle').textContent=title;
  if(!rebuildingRecord31){const snapshot=snapshot29();history.pushState({insectmes:snapshot,record31:descriptor},'', '#/'+shellScreen+'/detail/'+encodeURIComponent(descriptor.key||'new'));}
};
function applyRecordWorkspace31(form){
  if(!form.reportValidity())return;applyingRecord31=true;
  try{form.requestSubmit();}finally{applyingRecord31=false;}
}
function detachRecordWorkspace31(){
  const dialog=document.getElementById('configDialog');if(!dialog?.classList.contains('record-workspace31'))return;
  document.body.append(dialog);dialog.classList.remove('record-workspace31');dialog.querySelector('.concept-head').hidden=false;dialog.close();
}
const closeBeforeRecord31=closeConfigDialog;
closeConfigDialog=function(){
  const dialog=document.getElementById('configDialog');if(!dialog?.classList.contains('record-workspace31'))return closeBeforeRecord31();
  const descriptor=history.state?.record31;
  if(applyingRecord31&&descriptor){
    const form=dialog.querySelector('form');
    if(!descriptor.key){
      if(descriptor.screen==='routing')descriptor.key=engineeringData29().routes.find(row=>row.part===form.elements.part.value&&row.operation===form.elements.operation.value&&row.sequence===Number(form.elements.sequence.value))?.id||'';
      else descriptor.key=form.elements.code?.value||'';
    }
    detachRecordWorkspace31();history.replaceState({...history.state,record31:descriptor},'',location.hash);renderApp();return;
  }
  detachRecordWorkspace31();
  if(descriptor)history.back();else renderApp();
};
const renderBeforeRecord31=renderApp;
renderApp=function(){
  detachRecordWorkspace31();renderBeforeRecord31();
  const descriptor=history.state?.record31;
  if(!descriptor||descriptor.screen!==shellScreen||rebuildingRecord31)return;
  rebuildingRecord31=true;
  try{window[descriptor.opener](descriptor.key);}finally{rebuildingRecord31=false;}
};
