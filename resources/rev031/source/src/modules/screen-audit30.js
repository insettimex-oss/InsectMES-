
const standardCatalogScreens30 = new Set(['lots','trace','locations','units','equipos','checklist-pm','audit',
  'profiles','users','settings','setup','pedidos','buildings','areas','unit-conversion','hierarchy','movement-capture',
  'mrp','prp','shipping','checklist']);
const standardCatalogQuery30 = new Map();
const previousDataTable30 = dataTable29;
dataTable29 = function (columns,rows) {
  return rows.length ? previousDataTable30(columns,rows) : resultsTable30(columns,[]);
};
renderTraceNavigation29 = function () {
  const view=document.getElementById('view-genealogy');
  const serial=uiState.traceSerial30 || '';
  const matches=value=>String(value || '').toLowerCase()===serial.toLowerCase();
  const rows=state.genealogy.filter(x=>!serial || matches(x.parent) || matches(x.child))
    .map(x=>[x.ts,x.parent,x.child,x.action,number34(x.qty),x.ref]);
  if (serial) {
    rows.push(...state.movements.filter(x=>matches(x.serial))
      .map(x=>[x.ts,x.serial,'',x.type,number34(x.qty),x.ref]));
    rows.sort((a,b)=>String(b[0]).localeCompare(String(a[0])));
  }
  const filter='<form class="ops-filters trace-serial-form30" onsubmit="event.preventDefault();navigateScreen(\'trace\',this.elements.serial.value.trim())">'+
    '<label>Serial <input class="input" type="search" name="serial" value="'+esc(serial)+'"></label>'+
    '<button class="btn primary" type="submit">Buscar</button></form>';
  view.innerHTML=cardNavigation29('Trazabilidad',filter+dataTable29(['Fecha','Origen','Destino','Movimiento','Cantidad','Referencia'],rows.map(row=>[dateDisplay34(row[0]),...row.slice(1)])));
};
const auditConceptBefore30=renderConceptScreen;
renderConceptScreen=function () {
  if (conceptScreen==='settings') {
    const values=[
      ['Decimales en cantidades',state.settings.numberDecimals??2],
      ['Estatus al recibir una OC',receiptStatusLabel30(state.settings.receiptStatus30 || 'RECIBO')],
      ['Estatus al finalizar un recibo',receiptStatusLabel30(state.settings.finalReceiptStatus30 || 'OK')],
      ['Mezcla de lotes en Merge',state.settings.allowMixedLotsMerge?'Permitida':'Bloqueada'],
    ];
    document.getElementById('view-'+currentView).innerHTML=cardNavigation29('Settings',
      '<div class="actionbar">'+(levelFor('setup')>=4?'<button class="btn primary" onclick="openConfigSettings()">Editar</button>':'')+
      screenAction29('Jerarquía de módulos y acciones','hierarchy')+'</div>'+dataTable29(['Configuración','Valor'],values));
    return;
  }
  auditConceptBefore30();
};
function validCatalogRows30(grid) {
  return [...grid.tBodies].flatMap(body=>[...body.rows]).filter(row=>!row.querySelector('.r30-empty-row'));
}
function exportCatalogGrid30(grid, name) {
  if (!requireLevel(1)) return;
  const visible=validCatalogRows30(grid).filter(row=>!row.hidden),selected=visible.filter(exportRowSelected31);
  const rows=selected.length?selected:visible;
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  const values=row=>exportDataCells31(row).map(cell=>{
    const text=cell.textContent.trim();
    return text === '☑' ? 'Sí' : text === '☐' ? 'No' : text;
  });
  exportRows(name+'.csv',values(grid.tHead.rows[0]),rows.map(values));
}
function exportDialogGrid30(id,name) {
  const grid=document.getElementById(id)?.querySelector('table');
  if (grid) exportCatalogGrid30(grid,name);
}
function catalogFilters30(screen) {
  const buildings = () => facility30().buildings.map(row => [row.name,row.name]);
  if (screen === 'buildings') return [[0,field29('code','Código')],[1,field29('building','Edificio')]];
  if (screen === 'areas') return [
    [0,field29('code','Código')],[1,field29('area','Área')],[2,choice29('building','Edificio',buildings())],
  ];
  if (screen === 'locations') return [
    [1,field29('code','Código')],[2,field29('description','Descripción')],[3,field29('area','Área')],
    [4,choice29('building','Edificio',buildings())],
    [5,choice29('type','Tipo de ubicación',state.setupTables.Location_Type.map(row => [row.code,row.code]))],
  ];
  if (screen === 'units') return [[0,field29('unit','Unidad')],[1,field29('description','Descripción')]];
  if (screen === 'unit-conversion') return [[0,field29('from','Origen')],[1,field29('to','Destino')]];
  return [[null,field29('query','Buscar en resultados')]];
}
function standardCatalogGrid30(card,grid,index) {
  if (!grid?.tHead || grid.dataset.standardCatalog30) return;
  grid.dataset.standardCatalog30='true';
  const wrap=grid.closest('.table-wrap') || grid;
  const body=card.querySelector(':scope > .card-body') || wrap.parentElement;
  const heading=card.querySelector(':scope > .card-head');
  const title=heading?.querySelector('.card-title')?.textContent?.trim() || shellScreen;
  let bar=body.querySelector(':scope > .actionbar');
  if (!bar) {
    bar=document.createElement('div');
    bar.className='actionbar';
    const existing=heading ? [...heading.querySelectorAll('button')].filter(button=>/^Nuev[oa]|^Agregar/.test(button.textContent.trim())) : [];
    bar.append(...existing);
    body.insertBefore(bar,body.firstChild);
  }
  let exportButton=[...bar.querySelectorAll('button')].find(button=>/exportar/i.test(button.textContent));
  if (!exportButton) {
    exportButton=document.createElement('button');
    exportButton.type='button';
    exportButton.className='btn soft';
    exportButton.textContent='Exportar';
    bar.append(exportButton);
  }
  exportButton.onclick=()=>exportCatalogGrid30(grid,shellScreen);
  if (body.querySelector(':scope > .ops-filters,:scope > .filters,:scope > .catalog-search-options30')) return;
  const key=shellScreen+'-'+index;
  const fields=catalogFilters30(shellScreen);
  const filters=standardCatalogQuery30.get(key) || {};
  const filter=document.createElement('form');
  filter.className='ops-filters';
  filter.dataset.standardFilter30='';
  filter.setAttribute('aria-label','Filtros · '+title);
  filter.innerHTML='<div class="ops-fields">'+fields.map(([,field])=>operationsField29(field,filters[field.key])).join('')+
    '</div><div class="ops-filter-actions"><button class="btn soft" type="reset">Limpiar</button>'+
    '<button class="btn primary" type="submit">Buscar</button></div>';
  for (const [,field] of fields) {
    const select=filter.elements[field.key];
    if (field.type === 'select') select.options[0].textContent='Todos';
  }
  const apply=values=>{
    standardCatalogQuery30.set(key,values);
    for (const row of validCatalogRows30(grid)) row.hidden=fields.some(([column,field])=>{
      const value=values[field.key];
      if (!value) return false;
      const text=column === null ? row.textContent : row.cells[column]?.textContent.trim();
      return field.type === 'select' ? text !== value : !containsOperations29(text,value);
    });
    if (grid.querySelector('[data-facility-code30]')) refreshFacilityEdit30(grid);
  };
  filter.onsubmit=event=>{event.preventDefault();apply(readOperationsForm29(filter));};
  filter.onreset=event=>{
    event.preventDefault();
    for (const [,field] of fields) filter.elements[field.key].value='';
    apply({});
  };
  body.insertBefore(filter,bar);
  apply(filters);
}
function standardCatalogScreensInstall30() {
  if (!standardCatalogScreens30.has(shellScreen)) return;
  const view=document.querySelector('.view.active');
  if (!view) return;
  if (shellScreen==='setup') {
    const filters=view.querySelector('.ops-filters');
    if (!filters||view.querySelector('[data-setup-export30]')) return;
    const bar=document.createElement('div');
    bar.className='actionbar';
    bar.innerHTML='<button class="btn soft" type="button" data-setup-export30>Exportar</button>';
    bar.firstChild.onclick=()=>{
      if (!requireLevel(1,'setup')) return;
      const rows=[...view.querySelectorAll('.r30-setup-group tbody tr:not([hidden])')].map(row=>
        [row.closest('section')?.querySelector('h3')?.textContent,...[...row.cells].map(cell=>cell.textContent.trim())]);
      if (rows.length) exportRows('setup-tables.csv',['Grupo','Tabla','Usada en','Registros'],rows);
      else showMsg('No hay resultados para exportar.',true);
    };
    filters.after(bar);
    return;
  }
  const cards=[...view.querySelectorAll('.card')].filter(card=>!card.classList.contains('capture')&&card.querySelector('table'));
  cards.forEach((card,index)=>standardCatalogGrid30(card,card.querySelector('table'),index));
}
new MutationObserver(standardCatalogScreensInstall30).observe(document.querySelector('main'),{childList:true,subtree:true});
