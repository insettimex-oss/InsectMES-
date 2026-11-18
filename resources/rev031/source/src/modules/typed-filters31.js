/* Shared typed filter controls. Existing saved criteria remain strings. */
let filterPickerRow31=null,filterPickerItems31=[];
let typedFilterId31=0;
const closeDialogBeforeTypedFilters31=closeConfigDialog;
closeConfigDialog=function(){const dialog=document.getElementById('configDialog');if(dialog?.open&&dialog.querySelector('.typed-pick31,#typed-range31')){dialog.close();filterPickerRow31?.querySelector('input')?.focus();return;}return closeDialogBeforeTypedFilters31();};
function filterColumnLabel31(row){const select=row.querySelector('select');return select?.selectedOptions[0]?.textContent.trim()||'';}
function filterCatalog31(label,screen=shellScreen){
 const key=catalogSearchText30(label),rows=(items,code='code',description='description')=>(items||[]).filter(x=>x.active!==false).map(x=>({value:String(x[code]??''),label:String(x[description]??x.name??x.label??'')})).filter(x=>x.value);
 if(/^(estatus|estado|status|container status)$/.test(key)){
  if(['inventory','containers','trace'].includes(screen))return rows(state.setupTables.Container_Status);
  if(screen==='wcs')return rows(state.setupTables.Workcenter_Status_Control);
  if(['job-manager','jobs'].includes(screen))return jobStatus29.map(value=>({value,label:''}));
  if(['purchase-orders','po','orders'].includes(screen))return orderStatus29.map(value=>({value,label:''}));
  return null;
 }
 if(/^(no parte|np|numero de parte|componente|producto|byproduct)$/.test(key))return rows(state.parts,'part','desc');
 if(/ubicacion|^location$/.test(key))return rows(state.setupTables.Locations);
 if(/^unidad$|^unit$/.test(key))return rows(state.units);
 if(/^edificio$|^building$/.test(key))return rows(state.facility30?.buildings,'code','name');
 if(/^area$/.test(key))return rows(state.facility30?.areas,'code','name');
 if(/^proveedor$/.test(key))return rows(operationsData29().suppliers,'code','name');
 if(/^job$|^job no$/.test(key))return rows(operationsData29().jobs,'code','name');
 if(/^equipo$/.test(key))return rows(pmRecords30().equipment,'code','name');
 if(/work ?center|centro de trabajo/.test(key))return rows(engineeringData29().centers,'code','label');
 if(/^operation$|^operacion$/.test(key))return rows(engineeringData29().operations,'code','name');
 if(/tipo de.*parte|part type/.test(key))return rows(state.setupTables.Item_Type||state.setupTables.Part_Type);
 if(/container type|tipo de contenedor/.test(key))return rows(state.setupTables.Container_Type);
 if(/^serial$|serial no/.test(key))return rows(state.serials,'serial','desc');
 if(/^lote$/.test(key))return [...new Set(state.serials.map(c=>c.lot).filter(Boolean))].map(value=>({value,label:''}));
 return null;
}
function filterKind31(label){const key=catalogSearchText30(label);return /fecha|\bdate\b|vencimiento|^desde$|^hasta$|^inicio$|^fin$|^entrega$/.test(key)?'date':/cantidad|peso|costo|precio|importe|rendimiento|duracion|^dol$/.test(key)?'number':'text';}
function filterChoices31(row){
 const label=filterColumnLabel31(row),catalog=filterCatalog31(label);if(catalog!==null)return catalog;
 const form=row.closest('form'),scope=form?.closest('.card-body')||form?.closest('dialog')||document.querySelector('main .view.active');
 const values=new Set();for(const table of scope?.querySelectorAll('table')||[]){const cols=catalogSearchColumns30(table),column=cols.find(c=>catalogSearchText30(c.label)===catalogSearchText30(label));if(!column)continue;for(const item of catalogSearchTableRows30(table)){const value=item.values[label];if(value!=null&&value!=='')values.add(String(value));}}
 return [...values].map(value=>({value,label:''}));
}
function refreshTypedCondition31(row){
 const label=filterColumnLabel31(row),input=row.querySelector('input'),kind=filterKind31(label);if(!input)return;
 let wrap=row.querySelector('.typed-value31');if(!wrap){wrap=document.createElement('span');wrap.className='typed-value31';input.before(wrap);wrap.append(input);const button=document.createElement('button');button.type='button';button.className='typed-lookup31';button.onclick=()=>openFilterPicker31(row);wrap.append(button);}
 const button=wrap.querySelector('button'),catalog=filterCatalog31(label),choices=filterChoices31(row);
 button.hidden=!label||(!choices.length&&kind==='text');button.setAttribute('aria-label',kind==='date'?'Seleccionar rango de fechas':kind==='number'?'Seleccionar rango numérico':'Buscar '+label);button.title=button.getAttribute('aria-label');button.innerHTML=kind==='date'?'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>':icon29('search');
 input.placeholder=kind==='date'?'Desde .. Hasta':kind==='number'?'Valor o rango':label&&label!=='Columna'?'Buscar '+label:'Valor en columna';input.autocomplete='off';
 input.removeAttribute('list');wrap.querySelector('datalist')?.remove();
 installCompactFilter31(row,input,wrap,kind,Boolean(choices.length));
 row.dataset.filterKind31=kind;row.dataset.filterCatalog31=String(catalog!==null);
}
function openFilterPicker31(row){
 closeCompactFilter31();
 filterPickerRow31=row;const label=filterColumnLabel31(row),kind=filterKind31(label);
 if(kind==='date'||kind==='number'){
  const values=row.querySelector('input').value.split('..');
  configDialog(label,'<form id="typed-range31" onsubmit="event.preventDefault();applyTypedRange31()"><div class="typed-range31"><label>Desde<input class="input" name="from" type="'+(kind==='date'?'date':'number')+'" step="any" value="'+esc(values[0]||'')+'"></label><label>Hasta<input class="input" name="to" type="'+(kind==='date'?'date':'number')+'" step="any" value="'+esc(values[1]||'')+'"></label></div><div class="capture-actions"><button class="btn soft" type="submit">Aplicar</button></div><p id="typed-range-error31" role="alert"></p></form>');return;
 }
 configDialog('Buscar '+label,'<div class="typed-pick31"><label>Buscar<input class="input" type="search" aria-label="Buscar en catálogo" oninput="searchFilterPicker31(this.value)"></label><div class="typed-pick-results31" role="listbox" aria-label="'+esc(label)+'"></div><p class="typed-pick-summary31" role="status"></p></div>');searchFilterPicker31('');
}
function limitedFilterChoices31(row,query,limit){const result=[],normalized=catalogSearchText30(query);for(const item of filterChoices31(row)){if(normalized&&!catalogSearchText30(item.value+' '+item.label).includes(normalized))continue;result.push(item);if(result.length>limit)break;}return {items:result.slice(0,limit),more:result.length>limit};}
function searchFilterPicker31(query){const result=limitedFilterChoices31(filterPickerRow31,query,50);filterPickerItems31=result.items;const dialog=ensureConfigDialog();dialog.querySelector('.typed-pick-results31').innerHTML=result.items.map((item,index)=>'<button type="button" role="option" data-filter-choice31="'+index+'" onclick="chooseFilterValue31('+index+')"><strong>'+esc(item.value)+'</strong><span>'+esc(item.label)+'</span></button>').join('');dialog.querySelector('.typed-pick-summary31').textContent=result.more?'50 resultados · Escribe para precisar la búsqueda.':result.items.length?'':'Sin coincidencias';}
let compactFilterRow31=null,compactFilterItems31=[],compactFilterIndex31=-1,compactFilterTimer31,compactFilterChoosing31=false;
function compactFilterPopup31(){let node=document.getElementById('compact-filter-list31');if(!node){node=document.createElement('div');node.id='compact-filter-list31';node.className='compact-filter-list31';node.hidden=true;node.setAttribute('role','listbox');document.body.append(node);}return node;}
function closeCompactFilter31(){clearTimeout(compactFilterTimer31);const popup=document.getElementById('compact-filter-list31');if(popup)popup.hidden=true;compactFilterRow31?.querySelector('input')?.setAttribute('aria-expanded','false');compactFilterRow31=null;compactFilterIndex31=-1;}
function positionCompactFilter31(){const popup=document.getElementById('compact-filter-list31'),input=compactFilterRow31?.querySelector('input');if(!popup||popup.hidden||!input?.isConnected){closeCompactFilter31();return;}const rect=input.getBoundingClientRect(),below=innerHeight-rect.bottom-12,above=rect.top-12,up=below<200&&above>below,max=Math.min(260,up?above:below);popup.style.width=Math.min(Math.max(rect.width,240),innerWidth-24)+'px';popup.style.left=Math.max(12,Math.min(rect.left,innerWidth-parseFloat(popup.style.width)-12))+'px';popup.style.maxHeight=Math.max(80,max)+'px';popup.style.top=up?'auto':(rect.bottom+4)+'px';popup.style.bottom=up?(innerHeight-rect.top+4)+'px':'auto';}
function showCompactFilter31(row){if(row.dataset.filterKind31!=='text')return;compactFilterRow31=row;const input=row.querySelector('input'),result=limitedFilterChoices31(row,input.value,20),popup=compactFilterPopup31();compactFilterItems31=result.items;compactFilterIndex31=-1;popup.innerHTML=result.items.map((item,index)=>'<button type="button" role="option" id="compact-filter-option31-'+index+'" data-compact-choice31="'+index+'"><strong>'+esc(item.value)+'</strong><span>'+esc(item.label)+'</span></button>').join('')+(result.more?'<div class="compact-filter-summary31">20 resultados · Escribe para precisar.</div>':result.items.length?'':'<div class="compact-filter-summary31">Sin coincidencias</div>');popup.hidden=false;input.setAttribute('aria-expanded','true');positionCompactFilter31();}
function chooseCompactFilter31(index){const item=compactFilterItems31[index],input=compactFilterRow31?.querySelector('input');if(!item||!input)return;input.value=item.value;closeCompactFilter31();compactFilterChoosing31=true;input.focus();compactFilterChoosing31=false;}
function installCompactFilter31(row,input,wrap,kind,hasChoices){
 let toggle=wrap.querySelector('.typed-dropdown31');if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='typed-dropdown31';toggle.textContent='▾';toggle.setAttribute('aria-label','Mostrar opciones');toggle.onclick=()=>compactFilterRow31===row?closeCompactFilter31():showCompactFilter31(row);wrap.append(toggle);}
 toggle.hidden=kind!=='text'||!hasChoices;
 if(kind==='text'&&hasChoices){input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls','compact-filter-list31');input.setAttribute('aria-expanded','false');}else{input.removeAttribute('role');input.removeAttribute('aria-controls');}
 if(input.dataset.compactInstalled31)return;input.dataset.compactInstalled31='true';
 input.addEventListener('focus',()=>{if(!compactFilterChoosing31&&row.dataset.filterKind31==='text'&&!toggle.hidden)showCompactFilter31(row);});
 input.addEventListener('input',()=>{clearTimeout(compactFilterTimer31);if(row.dataset.filterKind31==='text'&&!toggle.hidden)compactFilterTimer31=setTimeout(()=>showCompactFilter31(row),120);});
 input.addEventListener('keydown',event=>{const popup=document.getElementById('compact-filter-list31');if(event.key==='Escape'){closeCompactFilter31();return;}if(!popup||popup.hidden||compactFilterRow31!==row)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();compactFilterIndex31=Math.max(0,Math.min(compactFilterItems31.length-1,compactFilterIndex31+(event.key==='ArrowDown'?1:-1)));for(const [i,option]of [...popup.querySelectorAll('[role=option]')].entries())option.setAttribute('aria-selected',String(i===compactFilterIndex31));const selected=popup.querySelector('[aria-selected=true]');if(selected){input.setAttribute('aria-activedescendant',selected.id);selected.scrollIntoView({block:'nearest'});}}else if(event.key==='Enter'&&compactFilterIndex31>=0){event.preventDefault();chooseCompactFilter31(compactFilterIndex31);}else if(event.key==='Tab')closeCompactFilter31();});
}
document.addEventListener('mousedown',event=>{const option=event.target.closest('[data-compact-choice31]');if(option){event.preventDefault();chooseCompactFilter31(Number(option.dataset.compactChoice31));return;}if(!event.target.closest('.typed-value31'))closeCompactFilter31();});
window.addEventListener('resize',positionCompactFilter31);window.addEventListener('scroll',event=>{if(!event.target.closest?.('#compact-filter-list31'))closeCompactFilter31();},true);
function chooseFilterValue31(index){const choice=filterPickerItems31[index];if(!choice||!filterPickerRow31?.isConnected)return;const input=filterPickerRow31.querySelector('input');input.value=choice.value;input.dispatchEvent(new Event('input',{bubbles:true}));closeConfigDialog();input.focus();}
function applyTypedRange31(){const form=document.getElementById('typed-range31'),from=form.elements.from.value,to=form.elements.to.value;if(!from&&!to){document.getElementById('typed-range-error31').textContent='Captura al menos un límite.';return;}const date=filterPickerRow31.dataset.filterKind31==='date';if(from&&to&&(date?from>to:Number(from)>Number(to))){document.getElementById('typed-range-error31').textContent='Desde debe ser menor o igual que Hasta.';return;}filterPickerRow31.querySelector('input').value=from+'..'+to;closeConfigDialog();filterPickerRow31.querySelector('input').focus();}
function filterDateValue31(value){
 const text=String(value||'').trim(),iso=text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);if(iso)return iso[0];
 const monthNames={ene:'01',jan:'01',feb:'02',mar:'03',abr:'04',apr:'04',may:'05',jun:'06',jul:'07',ago:'08',aug:'08',sep:'09',oct:'10',nov:'11',dic:'12',dec:'12'};
 const match=catalogSearchText30(text).match(/\b(\d{1,2})\s+([a-z]{3})[a-z]*[,.]?\s+(\d{2}|\d{4})\b/);if(match&&monthNames[match[2]])return (match[3].length===2?'20':'')+match[3]+'-'+monthNames[match[2]]+'-'+match[1].padStart(2,'0');
 return null;
}
function typedFilterMatches31(value,query,label){
 const text=String(query??'').trim(),kind=filterKind31(label),range=text.split('..');
 if(kind==='date'&&range.length===2){const date=filterDateValue31(value);return !!date&&(!range[0]||date>=range[0])&&(!range[1]||date<=range[1]);}
 if(kind==='number'){
  const number=Number(String(value??'').replace(/[^0-9.\-]/g,''));if(range.length===2)return Number.isFinite(number)&&(!range[0]||number>=Number(range[0]))&&(!range[1]||number<=Number(range[1]));
  const op=text.match(/^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/);if(op){const n=Number(op[2]);return ({'>=':number>=n,'<=':number<=n,'>':number>n,'<':number<n,'=':number===n})[op[1]];}
 }
 return catalogSearchText30(value).includes(catalogSearchText30(text));
}
catalogSearchMatches30=function(record,active,display=record){return (!active.query||[...Object.values(record),...Object.values(display)].some(value=>catalogSearchText30(value).includes(catalogSearchText30(active.query))))&&(active.criteria||[]).every(({column,value})=>!(column in record)||typedFilterMatches31(record[column],value,column)||typedFilterMatches31(display[column],value,column))&&Object.entries(active.columns||{}).every(([column,filter])=>!(column in record)||((!filter.query||typedFilterMatches31(record[column],filter.query,column))&&(!filter.selected||filter.selected.includes(record[column]))));};
inventoryRowMatches30=function(cells,query,criteria){const matches=(cell,text,label='')=>!!cell&&(typedFilterMatches31(cell.textContent,text,label)||(cell.dataset.rawNumber!==undefined&&typedFilterMatches31(cell.dataset.rawNumber,text,label)));return (!query||cells.slice(0,inventoryHeaders30.length).some(cell=>matches(cell,query)))&&criteria.every(({column,value})=>matches(cells[column],value,inventoryHeaders30[column]));};
document.addEventListener('change',event=>{const row=event.target.closest('.inventory-filter-condition30');if(row&&event.target===row.querySelector('select')){row.querySelector('input').value='';refreshTypedCondition31(row);}});
let typedFilterScheduled31=false;
new MutationObserver(()=>{if(typedFilterScheduled31)return;typedFilterScheduled31=true;queueMicrotask(()=>{typedFilterScheduled31=false;for(const row of document.querySelectorAll('.inventory-filter-condition30')){const label=filterColumnLabel31(row);if(!row.querySelector('.typed-value31')||row.dataset.typedLabel31!==label){row.dataset.typedLabel31=label;refreshTypedCondition31(row);}}});}).observe(document.body,{childList:true,subtree:true});
