/* Filtros de columnas, formato numérico y captura de lotes. */
icons29.search='<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>';
const initGrid34=initShell;
initShell=function(){initGrid34();state.settings.numberDecimals??=2;};
function number34(value){return new Intl.NumberFormat('en-US',{minimumFractionDigits:state.settings.numberDecimals,maximumFractionDigits:state.settings.numberDecimals}).format(Number(value));}
const settingsGrid34=openConfigSettings;
openConfigSettings=function(){settingsGrid34();const body=ensureConfigDialog();body.querySelector('.capture-actions').insertAdjacentHTML('beforebegin','<label class="field">Decimales en cantidades<input class="input" id="number_decimals34" type="number" min="0" max="6" step="1" value="'+state.settings.numberDecimals+'"></label>');};
const saveSettingsGrid34=saveSettings29;
saveSettings29=function(apply){if(!requireLevel(4,'setup'))return;const n=Number(document.getElementById('number_decimals34').value);if(!Number.isInteger(n)||n<0||n>6){showMsg('Usa de 0 a 6 decimales.',true);return;}state.settings.numberDecimals=n;saveSettingsGrid34(apply);if(apply)formatGrid34();};
let filtersGrid34={},sortGrid34={};
let partsQuery34='';
function searchParts34(event) {
  event.preventDefault();
  partsQuery34=event.currentTarget.elements.partFilter.value.trim();
  applyGrid34();
}
function clearParts34(event) {
  event.preventDefault();
  event.currentTarget.elements.partFilter.value='';
  partsQuery34='';
  applyGrid34();
}
let inventorySearch30 = {query:'',criteria:[],active:true};
let inventoryColumnDraft30 = {};
let inventoryFilterOwner30;
let inventoryHasDefaults30 = false;
let inventorySavedFilters30 = [];
function inventoryDefaultsKey30() {
  return 'InsectMES_Rev031_inventory_filters:' + shellSession.accountId;
}
function inventorySavedKey30() {
  return inventoryDefaultsKey30() + ':named';
}
function inventoryFilterCriteria30(saved) {
  // Earlier saved filters addressed the old nine-column order by index.
  const oldIndex = [0,1,2,3,4,7,8,10,9];
  const indexFor = key => /^\d+$/.test(key) ? (saved?.layout === 2 ? Number(key) : oldIndex[Number(key)]) : undefined;
  const {query='',criteria,column='',value='',active=true} = saved?.search || {};
  const conditions = (Array.isArray(criteria)?criteria:[{column,value}]).filter(row=>
    inventoryHeaders30[indexFor(row?.column)] && typeof row.value==='string' && row.value.trim())
    .map(row=>({column:String(indexFor(row.column)),value:row.value.trim()}));
  const columns = Object.fromEntries(Object.entries(saved?.columns || {}).filter(([index,filter])=>
    inventoryHeaders30[indexFor(index)] && filter && typeof filter.query === 'string' &&
    (filter.selected === null || (Array.isArray(filter.selected) && filter.selected.every(value=>typeof value === 'string')))).map(([index,filter])=>[indexFor(index),filter]));
  return {layout:2,search:{query:String(query),criteria:conditions,active:active!==false},columns};
}
function loadInventoryDefaults30() {
  const owner = shellSession?.accountId || '';
  if (inventoryFilterOwner30 === owner) return;
  inventoryFilterOwner30 = owner;
  let saved = null;
  inventorySavedFilters30 = [];
  if (owner) {
    try { saved = JSON.parse(localStorage.getItem(inventoryDefaultsKey30())); } catch {}
    try {
      const named = JSON.parse(localStorage.getItem(inventorySavedKey30()));
      if (Array.isArray(named)) inventorySavedFilters30 = named.filter(row=>typeof row?.name === 'string' && row.name.trim());
    } catch {}
  }
  const {search,columns} = inventoryFilterCriteria30(saved);
  inventorySearch30 = search;
  filtersGrid34.inventory = columns;
  inventoryColumnDraft30 = structuredClone(filtersGrid34.inventory);
  inventoryHasDefaults30 = Boolean(saved);
}
function inventorySavedFilterList30() {
  return inventorySavedFilters30.map(({name},index) =>
    '<div class="inventory-saved-filter30"><button type="button" data-index="'+index+
    '" onclick="useInventorySavedFilter30(this.form,Number(this.dataset.index))">'+esc(name)+
    '</button><button class="inventory-remove-filter30" type="button" data-index="'+index+
    '" aria-label="'+esc('Borrar filtro '+name)+'" title="Borrar filtro" onclick="removeInventorySavedFilter30(this.form,Number(this.dataset.index))">×</button></div>'
  ).join('');
}
function inventoryCondition30({column='',value=''}={}) {
  const columns = inventoryHeaders30.map((label,index) => `<option value="${index}" ${column===String(index)?'selected':''}>${esc(label)}</option>`);
  return `<div class="inventory-filter-condition30">
    <select class="select" name="column" aria-label="Columna"><option value="">Columna</option>${columns.join('')}</select>
    <input class="input" type="search" name="value" aria-label="Buscar en la columna"
      value="${esc(value)}" placeholder="Valor en columna">
    <button type="button" class="btn link inventory-remove-condition30" aria-label="Quitar criterio"
      onclick="removeInventoryCondition30(this)">×</button>
  </div>`;
}
function fillInventoryConditions30(form,criteria) {
  form.querySelector('.inventory-search-column30').innerHTML =
    (criteria.length?criteria:[{}]).map(inventoryCondition30).join('');
}
function addInventoryCondition30(form) {
  const group=form.querySelector('.inventory-search-column30');
  group.insertAdjacentHTML('beforeend',inventoryCondition30());
  group.lastElementChild.querySelector('select').focus();
}
function removeInventoryCondition30(button) {
  const form=button.form;
  const row=button.closest('.inventory-filter-condition30');
  if (row.parentElement.children.length>1) row.remove();
  else fillInventoryConditions30(form,[]);
  form.querySelector('.inventory-filter-condition30 select').focus();
}
function inventorySearchForm30() {
  loadInventoryDefaults30();
  const {query,criteria} = inventorySearch30;
  return `<form class="ops-filters inventory-search30" aria-label="Filtros de inventario"
    onsubmit="event.preventDefault(); applyInventorySearch30(this)">
    <input class="input inventory-search-all30" type="search" name="query" aria-label="Buscar en todo el inventario"
      value="${esc(query)}" placeholder="Buscar">
    <div class="inventory-search-column30">${(criteria.length?criteria:[{}]).map(inventoryCondition30).join('')}</div>
    <label class="inventory-active30"><input type="checkbox" name="activeOnly" data-consult-control30 ${inventorySearch30.active!==false?'checked':''} onchange="this.form.requestSubmit()">Activo</label>
    <div class="ops-filter-actions">
      <button class="btn soft inventory-add-filter30" type="button" data-consult-control30 onclick="addInventoryCondition30(this.form)">Agregar filtro</button>
      <button class="btn primary inventory-search-button30" type="submit">${icon29('search')}<span>Buscar</span></button>
      <details class="inventory-defaults30" data-consult-control30>
        <summary>Filtros guardados <span aria-hidden="true">▾</span></summary>
        <div class="inventory-default-options30">
          <div class="inventory-saved-list30">${inventorySavedFilterList30()}</div>
          <div class="inventory-save-filter30">
            <input class="input" type="text" name="filterName" aria-label="Nombre del filtro" placeholder="Nombre del filtro"
              maxlength="60" onkeydown="if(event.key==='Enter'){event.preventDefault();saveInventoryNamedFilter30(this.form)}">
            <button type="button" onclick="saveInventoryNamedFilter30(this.form)">Guardar filtro</button>
          </div>
          <button type="button" onclick="saveInventoryDefaults30(this.form)">Guardar como predeterminados</button>
          <button type="button" data-clear-defaults ${inventoryHasDefaults30?'':'disabled'}
            onclick="clearInventoryDefaults30(this.form)">Borrar predeterminados</button>
        </div>
      </details>
    </div>
    <p class="inventory-search-count30" role="status" hidden></p>
  </form>`;
}
function writeInventorySavedFilters30(form,filters) {
  try { localStorage.setItem(inventorySavedKey30(),JSON.stringify(filters)); }
  catch { showMsg('No se pudieron guardar los filtros.',true); return false; }
  inventorySavedFilters30 = filters;
  form.querySelector('.inventory-saved-list30').innerHTML = inventorySavedFilterList30();
  return true;
}
function saveInventoryNamedFilter30(form) {
  if (!shellSession?.accountId) return;
  const input = form.elements.filterName;
  const name = input.value.trim();
  const exists = inventorySavedFilters30.some(row=>row.name.localeCompare(name,'es',{sensitivity:'base'}) === 0);
  if (!name || exists) {
    input.setCustomValidity(exists ? 'Ya hay un filtro con ese nombre.' : 'Ponle un nombre al filtro.');
    input.reportValidity();
    input.setCustomValidity('');
    return;
  }
  if (!applyInventorySearch30(form)) { form.querySelector('.inventory-defaults30').open = false; return; }
  const saved = {name,layout:2,search:inventorySearch30,columns:filtersGrid34.inventory};
  if (!writeInventorySavedFilters30(form,[...inventorySavedFilters30,saved])) return;
  input.value = '';
  closeInventoryDefaults30(form);
  showMsg('Filtro guardado.');
}
function useInventorySavedFilter30(form,index) {
  const saved = inventorySavedFilters30[index];
  if (!saved) return;
  const {search,columns} = inventoryFilterCriteria30(saved);
  form.elements.query.value = search.query;
  if(form.elements.activeOnly)form.elements.activeOnly.checked=search.active!==false;
  fillInventoryConditions30(form,search.criteria);
  inventoryColumnDraft30 = columns;
  applyInventorySearch30(form);
  closeInventoryDefaults30(form);
}
function removeInventorySavedFilter30(form,index) {
  if (!shellSession?.accountId || !inventorySavedFilters30[index]) return;
  if (writeInventorySavedFilters30(form,inventorySavedFilters30.filter((_,i)=>i !== index))) {
    form.elements.filterName.focus();
    showMsg('Filtro borrado.');
  }
}
function applyInventorySearch30(form) {
  const criteria=[];
  for (const row of form.querySelectorAll('.inventory-filter-condition30')) {
    const column=row.querySelector('select');
    const value=row.querySelector('input').value.trim();
    if (!value) continue;
    if (!column.value) {
      column.setCustomValidity('Elige la columna donde quieres buscar.');
      column.reportValidity();
      column.setCustomValidity('');
      return false;
    }
    criteria.push({column:column.value,value});
  }
  clearInventoryChecks30();
  inventorySearch30 = {query:form.elements.query.value.trim(),criteria,active:form.elements.activeOnly?.checked!==false};
  filtersGrid34.inventory = structuredClone(inventoryColumnDraft30);
  closeGridFilter34();
  applyGrid34();
  return true;
}
function saveInventoryDefaults30(form) {
  if (!shellSession?.accountId || !applyInventorySearch30(form)) return;
  try {
    localStorage.setItem(inventoryDefaultsKey30(),JSON.stringify({layout:2,search:inventorySearch30,columns:filtersGrid34.inventory}));
  } catch { return showMsg('No se pudieron guardar los filtros predeterminados.',true); }
  inventoryHasDefaults30 = true;
  form.querySelector('[data-clear-defaults]').disabled = false;
  closeInventoryDefaults30(form);
  showMsg('Filtros guardados como predeterminados.');
}
function clearInventoryDefaults30(form) {
  if (!shellSession?.accountId) return;
  try { localStorage.removeItem(inventoryDefaultsKey30()); }
  catch { return showMsg('No se pudieron borrar los filtros predeterminados.',true); }
  form.elements.query.value = '';
  if(form.elements.activeOnly)form.elements.activeOnly.checked=true;
  fillInventoryConditions30(form,[]);
  inventoryColumnDraft30 = {};
  inventoryHasDefaults30 = false;
  form.querySelector('[data-clear-defaults]').disabled = true;
  closeInventoryDefaults30(form);
  applyInventorySearch30(form);
  showMsg('Filtros predeterminados borrados.');
}
function closeInventoryDefaults30(form) {
  const menu = form.querySelector('.inventory-defaults30');
  menu.open = false;
  menu.querySelector('summary').focus();
}
function inventorySearchText30(value) {
  return value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('es-MX');
}
function inventoryRowMatches30(cells,query,criteria) {
  const matches = (cell,text) => inventorySearchText30(cell.textContent).includes(text) ||
    (cell.dataset.rawNumber !== undefined && inventorySearchText30(cell.dataset.rawNumber).includes(text));
  return (!query || cells.slice(0,inventoryHeaders30.length).some(cell=>matches(cell,query))) &&
    criteria.every(({column,value})=>matches(cells[column],value));
}
function rowsMatch34(values,filters){return Object.entries(filters).every(([i,f])=>(!f.query||String(values[i]).toLowerCase().includes(f.query.toLowerCase()))&&(!f.selected||f.selected.includes(String(values[i]))));}
function inventoryDataRows30(grid) { return [...(grid?.tBodies[0]?.rows || [])].filter(row=>!row.hasAttribute('data-inventory-group30')); }
function inventoryGridCells30(row) { return [...row.cells].filter(cell => !cell.classList.contains('grid-check30')).sort((a,b)=>Number(a.dataset.inventoryColumn30??a.cellIndex)-Number(b.dataset.inventoryColumn30??b.cellIndex)); }
function gridTable34(){const view=document.getElementById(['inventory','containers'].includes(shellScreen)?'view-inventory':'view-catalogs');return [...(view?.querySelectorAll('table')||[])].find(t=>t.dataset.grid34||t.tHead && inventoryGridCells30(t.tHead.rows[0])[0]?.textContent.trim()===(['inventory','containers'].includes(shellScreen)?'Serial':'No Parte'));}
function formatGrid34(){if(shellScreen!=='inventory')return;const t=gridTable34();if(!t)return;for(const row of inventoryDataRows30(t)){const cell=inventoryGridCells30(row)[3];cell.dataset.rawNumber??=cell.textContent.trim();cell.textContent=number34(cell.dataset.rawNumber);}if(t.tFoot){const cell=t.querySelector("[data-inventory-total]");cell.dataset.rawNumber??=cell.textContent.trim();cell.textContent=number34(cell.dataset.rawNumber);}}
function installGrid34(){if(!['inventory','parts'].includes(shellScreen))return;const t=gridTable34();if(!t||t.dataset.grid34)return;t.dataset.grid34='true';t.classList.add('excel-grid34');const screen=shellScreen;filtersGrid34[screen]??={};for(const [i,h]of inventoryGridCells30(t.tHead.rows[0]).entries()){const text=h.textContent;h.textContent='';const b=document.createElement('button');b.className='grid-head34';b.type='button';b.setAttribute('aria-label','Filtrar '+text);b.innerHTML='<span>'+esc(text)+'</span><span class="filter-symbol34">▾</span>';b.onclick=e=>openGridFilter34(screen,i,text,b);h.append(b);}for(const row of inventoryDataRows30(t)){const td=inventoryGridCells30(row)[0],code=td.textContent.trim();const a=document.createElement('a');a.href=screen==='inventory'?'#inventory/'+encodeURIComponent(code):'#parts/'+encodeURIComponent(code);a.textContent=code;a.onclick=e=>{e.preventDefault();e.stopPropagation();if(screen==='inventory'){uiState.inventorySelectedIndex=state.serials.findIndex(x=>x.serial===code);uiState.inventoryAction='Edit';}else{uiState.itemSelectedIndex=state.parts.findIndex(x=>x.part===code);uiState.itemEditIndex=uiState.itemSelectedIndex;uiState.itemMode='form';}renderApp();};td.textContent='';td.append(a);}if(screen==='inventory')t.closest('.card-body')?.querySelector('.filters')?.classList.add('legacy-filters34');formatGrid34();applyGrid34();}
function applyGrid34() {
  const grid = gridTable34();
  if (!grid) return;
  const screen = shellScreen;
  const filters = filtersGrid34[screen] || {};
  const inventory = screen === 'inventory';
  const {query,criteria} = inventorySearch30;
  const searching = inventory && Boolean(query || criteria.length);
  const general = searching ? inventorySearchText30(query) : '';
  const conditions = searching ? criteria.map(({column,value})=>({column,value:inventorySearchText30(value)})) : [];
  const rows = inventoryDataRows30(grid);
  for (const row of rows) {
    const cells = inventoryGridCells30(row);
    row.hidden = (inventory && inventorySearch30.active!==false && !inventoryRecordActive30(state.serials.find(record=>record.serial===cells[0].textContent.trim()))) || !rowsMatch34(cells.map(cell => cell.dataset.rawNumber ?? cell.textContent.trim()),filters) ||
      (screen === 'parts' && !containsOperations29(cells[0].textContent+' '+cells[1].textContent,partsQuery34)) ||
      (searching && !inventoryRowMatches30(cells,general,conditions));
  }
  for (const [index,heading] of inventoryGridCells30(grid.tHead.rows[0]).entries()) {
    const active = Boolean(filters[index]?.query || filters[index]?.selected);
    const button = heading.querySelector('button');
    button?.classList.toggle('filtered34',active);
  }
  const sort = sortGrid34[screen];
  if (sort) {
    rows.sort((a,b) => {
      const left = inventoryGridCells30(a)[sort.i], right = inventoryGridCells30(b)[sort.i];
      const order = left.dataset.rawNumber !== undefined
        ? Number(left.dataset.rawNumber)-Number(right.dataset.rawNumber)
        : left.textContent.localeCompare(right.textContent,'es',{numeric:true});
      return sort.desc ? -order : order;
    });
    rows.forEach(row => grid.tBodies[0].append(row));
  }
  if (inventory) {
    const visible = rows.filter(row => !row.hidden);
    if (grid.tFoot) {
      const total = visible.reduce((sum,row) => sum+Number(inventoryGridCells30(row)[3].dataset.rawNumber),0);
      grid.querySelector("[data-inventory-total]").textContent = number34(total);
    }
    refreshInventoryFilterIndicators30(grid,visible.length);
    if (grid.querySelector('[data-select-all30]')) refreshGridChecks30(grid);
  }
}
function refreshInventoryFilterIndicators30(grid,visible) {
  const form = grid.closest('.card-body')?.querySelector('.inventory-search30');
  if (!form) return;
  const applied = filtersGrid34.inventory || {};
  let pending = 0;
  for (const [i,heading] of inventoryGridCells30(grid.tHead.rows[0]).entries()) {
    const differs = JSON.stringify(inventoryColumnDraft30[i] ?? null) !== JSON.stringify(applied[i] ?? null);
    heading.querySelector('.grid-head34')?.classList.toggle('filter-pending30',differs);
    if (differs) pending++;
  }
  const count = form.querySelector('.inventory-search-count30');
  const hasFilters = inventorySearch30.query || inventorySearch30.criteria.length || Object.keys(applied).length;
  count.hidden = !pending && !hasFilters;
  count.textContent = pending ? 'Filtros de columna pendientes. Pulsa la lupa para aplicarlos.' :
    visible ? visible + (visible===1 ? ' resultado' : ' resultados') : 'Sin coincidencias';
}
function closeGridFilter34(){document.querySelector('.grid-popup34')?.remove();}
function openGridFilter34(screen,index,title,button,context) {
  closeGridFilter34();
  const grid = context?.grid || gridTable34();
  const inventory = screen === 'inventory' || Boolean(context);
  const filters = context?.filters || (inventory ? inventoryColumnDraft30 : filtersGrid34[screen]);
  const filter = filters[index] || {};
  const cells = context ? [] : inventoryDataRows30(grid).map(row => inventoryGridCells30(row)[index]).filter(Boolean);
  const candidates=context?.values || cells.map(cell=>cell.dataset.rawNumber ?? cell.textContent.trim());
  const values = [...new Set([...candidates.map(value=>String(value ?? '')),...(inventory && filter.selected || [])])]
    .sort((a,b)=>a.localeCompare(b,'es',{numeric:true}));
  const popup = document.createElement('div');
  popup.className = 'grid-popup34';
  popup.setAttribute('role','dialog');
  popup.setAttribute('aria-label','Filtro '+title);
  popup.innerHTML = '<div class="grid-popup-head34"><strong>'+esc(title)+'</strong><button aria-label="Cerrar filtro">×</button></div>'+
    '<button data-sort="asc">Ordenar de menor a mayor / A–Z</button><button data-sort="desc">Ordenar de mayor a menor / Z–A</button>'+
    '<input class="input" aria-label="Buscar en '+esc(title)+'" placeholder="Buscar" value="'+esc(filter.query || '')+'">'+
    '<label><input type="checkbox" class="grid-all34">Seleccionar todos</label><div class="grid-values34"></div>'+
    '<div class="grid-popup-actions34"><button class="btn soft" data-clear>'+(inventory?'Quitar filtro':'Limpiar')+'</button>'+
    '<button class="btn primary" data-apply>'+(inventory?'Listo':'Aplicar')+'</button></div>';
  (button.closest('dialog[open]') || document.body).append(popup);
  const rect = button.getBoundingClientRect();
  popup.style.left = Math.max(8,Math.min(rect.left,innerWidth-300))+'px';
  popup.style.top = Math.max(8,Math.min(rect.bottom+5,innerHeight-430))+'px';
  const list = popup.querySelector('.grid-values34');
  const query = popup.querySelector('.input');
  const all = popup.querySelector('.grid-all34');
  const checks = values.map(value=>{
    const label = document.createElement('label');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.value = value;
    check.checked = !filter.selected || filter.selected.includes(value);
    label.append(check,document.createTextNode(value || '(Vacío)'));
    list.append(label);
    return check;
  });
  const syncAll = ()=>{
    const count = checks.filter(check=>check.checked).length;
    all.checked = count === checks.length;
    all.indeterminate = count > 0 && count < checks.length;
  };
  const hideUnmatched = ()=>{
    const normalize = inventory ? inventorySearchText30 : text=>text.toLowerCase();
    const text = normalize(query.value);
    for (const check of checks) check.parentElement.hidden = !normalize(check.parentElement.textContent).includes(text);
  };
  syncAll();
  hideUnmatched();
  all.onchange = () => { for (const check of checks) check.checked = all.checked; };
  list.onchange = syncAll;
  query.oninput = hideUnmatched;
  const finish = ()=>{
    closeGridFilter34();
    button.focus();
  };
  const update = (next)=>{
    if (next) filters[index] = next;
    else delete filters[index];
    if (context) context.refresh();
    else if (inventory) refreshInventoryFilterIndicators30(grid,inventoryDataRows30(grid).filter(row=>!row.hidden).length);
    else applyGrid34();
    finish();
  };
  popup.querySelector('.grid-popup-head34 button').onclick = finish;
  popup.querySelector('[data-clear]').onclick = () => update(null);
  popup.querySelector('[data-apply]').onclick = () => {
    const selected = checks.filter(check=>check.checked).map(check=>check.value);
    const text = query.value.trim();
    const narrowed = selected.length !== values.length;
    update(text || narrowed ? {query:text,selected:narrowed?selected:null} : null);
  };
  for (const sort of popup.querySelectorAll('[data-sort]')) sort.onclick = ()=>{
    if (context) { context.sort(sort.dataset.sort==='desc'); finish(); return; }
    sortGrid34[screen] = {i:index,desc:sort.dataset.sort==='desc'};
    applyGrid34();
    finish();
  };
  if (context?.sortable === false) for (const sort of popup.querySelectorAll('[data-sort]')) sort.remove();
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeGridFilter34();});
document.addEventListener('click',e=>{if(!e.target.closest('.grid-popup34,.grid-head34'))closeGridFilter34();});
document.addEventListener('click',event=>{
  const menu = document.querySelector('.inventory-defaults30[open]');
  if (menu && !event.composedPath().includes(menu)) menu.open = false;
});
document.addEventListener('keydown',event=>{
  const menu = document.querySelector('.inventory-defaults30[open]');
  if (menu && event.key === 'Escape') closeInventoryDefaults30(menu.closest('form'));
});
function addInventoryLot34(){if(!document.getElementById('inv_qty')||document.getElementById('inv_lot34'))return;const serial=state.serials[uiState.inventorySelectedIndex],value=uiState.inventoryAction==='Edit'?(serial?.productionLot||''):'';document.getElementById('inv_qty').closest('.form-grid').insertAdjacentHTML('beforeend','<div class="field"><label for="inv_lot34">Fecha del lote de producción</label><input class="input" id="inv_lot34" type="date" value="'+esc(value)+'"></div>');}
const inventoryGrid34=renderInventory;
renderInventory=function(){inventoryGrid34();installGrid34();addInventoryLot34();};
const appGrid34=renderApp;
renderApp=function(){closeGridFilter34();appGrid34();installGrid34();addInventoryLot34();};
const inventorySave34=saveInventoryAction;
saveInventoryAction=function(){const action=uiState.inventoryAction,lot=document.getElementById('inv_lot34')?.value,index=uiState.inventorySelectedIndex,part=document.getElementById('inv_part')?.value,location=document.getElementById('inv_location')?.value,n=state.serials.length;if(['Edit','New'].includes(action)&&(!state.setupTables.Locations.some(l=>l.active&&l.code===location))){showMsg('Selecciona una ubicación del listado.',true);return;}if(action==='New'&&['BSF004','WIP-LAR','BSF005'].includes(part)&&!lot){showMsg('Captura la fecha del lote de producción.',true);return;}inventorySave34();const c=action==='New'&&state.serials.length>n?state.serials[state.serials.length-1]:action==='Edit'&&!uiState.inventoryAction?state.serials[index]:null;if(c&&lot){c.productionLot=lot;c.lot=dateLot29(new Date(lot+'T12:00:00')).label;saveState();renderApp();}};
function dateDisplay34(value) { if (!value) return ''; const date=value instanceof Date ? value : new Date(String(value).length===10?value+'T12:00:00':value); if (!Number.isFinite(date.getTime())) return String(value); const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']; return String(date.getDate()).padStart(2,'0')+' '+months[date.getMonth()]+', '+String(date.getFullYear()).slice(-2); }
const initLots34=initShell;
initShell=function(){initLots34();if(!state.priorLots34){const today=dateLot29().id;for(const [days,qty]of [[5,0.32],[6,0.40],[7,0.28]]){const d=new Date(today+'T12:00:00');d.setDate(d.getDate()-days);const lot=dateLot29(d),c=nextContainer30(state,{part:'BSF004',desc:'5-DOL',qtyCurrent:qty,unit:'kg',location:'WC-NUR',lot:lot.label,productionLot:lot.id,status:'READY',origin:'MANUAL',notes:''});state.nursery.entries.push({serial:c.serial,lot:lot.label,rack:state.setupTables.Nursery_Rack.find(x=>x.active)?.code,level:5,levelAt:new Date(d.getTime()+5*86400000).toISOString(),container:'Negra',maintenance:[],recipe:structuredClone(state.setupTables.Nursery_Recipe.find(x=>x.active&&x.maxEggs===0)||state.setupTables.Nursery_Recipe[0])});}if(!state.serials.some(c=>c.part==='F001'&&c.active&&c.qtyCurrent>0))nextContainer30(state,{part:'F-001',desc:getPart('F-001')?.desc||'Alimento',qtyCurrent:50,unit:'kg',location:'ALM-RM-01',lot:'08 OCT',productionLot:'2026-10-08',origin:'MANUAL'});state.priorLots34=true;saveState();}};
const nurseryGrid34=renderNursery30;
renderNursery30=function(){nurseryGrid34();const view=document.getElementById('view-workcenters');view.querySelector('.cp-actions .soft')?.remove();const body=view.querySelector('.calculator-card .card-body');if(!body)return;const projection=body.querySelector('.eclosion-result span');if(projection)projection.textContent='Eclosión proyectada · '+dateDisplay34(dateLot29().id);for(const title of body.querySelectorAll('h3')){if(title.textContent==='Próximos días')title.textContent='Proyección de eclosión por fecha';if(title.textContent==='Cosechas base')title.textContent='Registro de cosecha de huevos';}const lines=body.querySelector('.recipe-lines');if(lines)lines.insertAdjacentHTML('beforebegin','<h3>Ingredientes para preparar el alimento de N0</h3>');const tray=body.querySelector('.recipe-tray');if(tray)tray.textContent='Contenedor recomendado: '+tray.textContent;for(const b of body.querySelectorAll('.nursery-forecast b')){const m=b.textContent.match(/^(\d{2}) (\w{3})$/);if(m){const months=['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'],d=new Date();d.setMonth(months.indexOf(m[2]),Number(m[1]));b.textContent=dateDisplay34(d);}}for(const row of body.querySelectorAll('tbody tr'))if(/^\d{4}-\d{2}-\d{2}$/.test(row.cells[0]?.textContent))row.cells[0].textContent=dateDisplay34(row.cells[0].textContent);for(const dd of body.querySelectorAll('.recipe-lines dd')){const m=dd.textContent.match(/^([\d.]+) (.+)$/);if(m)dd.textContent=number34(m[1])+' '+m[2];}};
function backButton34(){const brand=document.querySelector('.wordmark');if(!brand||document.getElementById('back34'))return;const b=document.createElement('button');b.id='back34';b.className='back-universal34';b.setAttribute('aria-label','Volver a la pantalla anterior');b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14 5-7 7 7 7M7 12h14"/></svg>';b.onclick=()=>history.back();brand.before(b);}
const renderBack34=renderApp;
renderApp=function(){renderBack34();backButton34();};
const fixFeedInit34=initShell;
initShell=function(){fixFeedInit34();for(const c of state.serials)if(c.part==='F001'&&c.origin==='MANUAL'&&c.desc==='Alimento'){c.part='F-001';c.desc=getPart('F-001')?.desc||'Alimento';}saveState();};

const inventoryStatus34=renderInventory;
renderInventory=function(){inventoryStatus34();const select=document.getElementById('inv_status');if(select){select.innerHTML=state.setupTables.Container_Status.filter(x=>x.active).map(x=>'<option value="'+esc(x.code)+'">'+esc(x.description||x.code)+'</option>').join('');select.value=uiState.inventoryAction==='Edit'?state.serials[uiState.inventorySelectedIndex]?.status||'OK':'OK';}};
function formatOtherGrids34(){for(const t of document.querySelectorAll('.view.active table:not(.excel-grid34)')){const headers=[...(t.tHead?.rows[0]?.cells||[])].map(c=>c.textContent.trim());for(const row of t.tBodies[0]?.rows||[])for(const [i,c]of [...row.cells].entries()){if(/Cantidad|Costo|Coste|Precio|Peso|Importe|Saldo|Horas|Mezcla|Agua \(|Alimento.*\(|Salvado.*\(/i.test(headers[i]||'')){const raw=c.dataset.rawNumber??c.textContent.trim();if(/^-?\d+(\.\d+)?$/.test(raw)){c.dataset.rawNumber=raw;c.textContent=number34(raw);}}}}}
const appNumber34=renderApp;
renderApp=function(){appNumber34();formatOtherGrids34();};
fmtDateDisplay=function(iso){return iso?dateDisplay34(iso):'';};
