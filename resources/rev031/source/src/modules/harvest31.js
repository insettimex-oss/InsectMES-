// Harvest takes a scanned rearing container directly; feeding never creates an intermediate serial.
function harvestInputParts31(db=state){const rearing=db.cpOperations.find(o=>o.code==='REA');return [...new Set([rearing?.input,rearing?.part].filter(Boolean))];}
const operationBeforeHarvest31=op29;
op29=function(){const station=operationBeforeHarvest31();if(station.code!=='HAR')return station;const accepted=harvestInputParts31();const loaded=state.loadedSources[station.wc]?.cpInput?.part;const part=accepted.includes(uiState.harvestInputPart31)?uiState.harvestInputPart31:accepted.includes(loaded)?loaded:accepted[0];return {...station,input:part,inputName:getPart(part)?.desc||'Larvero',panelInputs30:[]};};
const scanBeforeHarvest31=resolveScan30;
resolveScan30=function(id){
 if(op29().code!=='HAR'||id!=='cpInput')return scanBeforeHarvest31(id);
 const serial=document.getElementById('scan_'+id)?.value.trim(),container=state.serials.find(c=>c.serial===serial);
 try{panelContainerRule31(state,container);if(!harvestInputParts31().includes(container.part))throw Error('Selecciona un contenedor de larvero para Tamizado.');
  if(op29().input!==container.part){uiState.harvestInputPart31=container.part;renderControlPanel29();const toggle=document.getElementById('toggle_'+id);if(toggle?.getAttribute('aria-pressed')!=='true')toggleScan32(id);document.getElementById('scan_'+id).value=serial;}
  return scanBeforeHarvest31(id);
 }catch(error){showMsg(error.message,true);}
};
const materialCardsBeforeHarvest31=materialCards31;
materialCards31=function(id){if(op29().code!=='HAR'||id!=='cpInput')return materialCardsBeforeHarvest31(id);const accepted=harvestInputParts31(),rows=state.serials.filter(c=>accepted.includes(c.part)&&c.active&&c.qtyCurrent>0);
 configDialog('Cargar larvero','<div class="cp-picker31"><label class="cp-picker-search31">Buscar<input class="input" type="search" oninput="filterPanelCards31(this.value)" placeholder="Serial o lote"></label><div class="cp-picker-grid31">'+rows.map(c=>{let ready=true;try{panelContainerRule31(state,c);}catch{ready=false;}return '<button type="button" class="cp-choice31" '+(!ready?'disabled':'')+' data-source-id="cpInput" data-serial="'+esc(c.serial)+'" onclick="chooseMaterialCard31(this.dataset.sourceId,this.dataset.serial)"><small>'+esc(c.lot||c.productionLot)+'</small><strong>'+esc(c.serial)+'</strong><span>'+esc(feedingQuantityText31(c))+'</span>'+badge(c.status)+'</button>';}).join('')+'</div></div>');ensureConfigDialog().classList.add('cp-picker-dialog31');};
const chooseMaterialBeforeHarvest31=chooseMaterialCard31;
chooseMaterialCard31=function(id,serial){if(op29().code==='HAR'&&id==='cpInput'){const c=state.serials.find(c=>c.serial===serial);if(!c||!harvestInputParts31().includes(c.part))return;uiState.harvestInputPart31=c.part;closeConfigDialog();renderControlPanel29();}return chooseMaterialBeforeHarvest31(id,serial);};
