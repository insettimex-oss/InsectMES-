const nurserySettingsInit31=initShell;
initShell=function(){nurserySettingsInit31();state.settings.nurseryReadyStatus31??=containerStatusCode30('OK');};
function nurseryReadyStatuses31(){return state.setupTables.Container_Status.filter(row=>row.active&&row.activeStatus!==false&&row.okStatus&&row.allowProduction&&!row.receivingStatus);}
const openNurserySettingsBefore31=openConfigSettings;
openConfigSettings=function(){
  openNurserySettingsBefore31();
  ensureConfigDialog().querySelector('.capture-actions').insertAdjacentHTML('beforebegin','<label class="field">Estatus de salida de guardería<select class="select" id="nurseryReadyStatus31" required><option value="">Seleccionar estatus</option>'+nurseryReadyStatuses31().map(row=>'<option value="'+esc(row.code)+'" '+(row.code===state.settings.nurseryReadyStatus31?'selected':'')+'>'+esc(row.code)+'</option>').join('')+'</select></label>');
};
const saveNurserySettingsBefore31=saveSettings29;
saveSettings29=function(apply){
  if(!requireLevel(4,'setup'))return;
  const value=document.getElementById('nurseryReadyStatus31')?.value;
  if(!nurseryReadyStatuses31().some(row=>row.code===value))return showMsg('Selecciona un estatus disponible para la salida de guardería.',true);
  const previous=state.settings.nurseryReadyStatus31;state.settings.nurseryReadyStatus31=value;
  try{return saveNurserySettingsBefore31(apply);}catch(error){state.settings.nurseryReadyStatus31=previous;throw error;}
};
const renderNurserySettingsBefore31=renderConceptScreen;
renderConceptScreen=function(){
  renderNurserySettingsBefore31();if(conceptScreen!=='settings')return;
  const body=document.getElementById('view-'+currentView)?.querySelector('tbody');
  if(body&&!body.querySelector('[data-nursery-ready31]'))body.insertAdjacentHTML('beforeend','<tr data-nursery-ready31><td>Estatus de salida de guardería</td><td>'+esc(state.settings.nurseryReadyStatus31)+'</td></tr>');
};
