// Common search controls for lists. Screen options still belong to each screen.
const catalogSearchStates30 = new Map();
const catalogSearchBars30 = new WeakMap();
const catalogSearchHidden30 = new WeakSet();
const catalogSearchEmpty30 = () => ({query:'',criteria:[],columns:{},options:{}});
const catalogSearchText30 = value => inventorySearchText30(String(value ?? ''));
const catalogSearchCopy30 = value => JSON.parse(JSON.stringify(value));
const catalogSearchHas30 = active => Boolean(active?.query || active?.criteria.length || Object.keys(active?.columns || {}).length);
function catalogSearchActive30(key) {
  return shellSession?.accountId ? catalogSearchState30(key).active : catalogSearchEmpty30();
}

function catalogSearchState30(key) {
  const id='InsectMES_Rev031_catalog_filters:'+encodeURIComponent(shellSession.accountId)+':'+key;
  if (!catalogSearchStates30.has(id)) {
    let saved={};
    try { saved=JSON.parse(localStorage.getItem(id) || '{}') || {}; } catch {}
    const rename=label=>({'Item':'No Parte','Parte':'No Parte','Item Type':'Tipo de No Parte','Componente / NP padre':'No Parte','Número de parte padre':'No Parte'})[label]||label;
    const migrate=value=>{
      if (!value) return value;
      return {...value,criteria:(value.criteria||[]).map(row=>({...row,column:rename(row.column)})),
        columns:Object.fromEntries(Object.entries(value.columns||{}).map(([label,filter])=>[rename(label),filter]))};
    };
    saved.default=migrate(saved.default);
    saved.named=(saved.named||[]).map(row=>({...row,value:migrate(row.value)}));
    const active={...catalogSearchEmpty30(),...saved.default};
    catalogSearchStates30.set(id,{id,saved,active,draft:catalogSearchCopy30(active.columns)});
  }
  return catalogSearchStates30.get(id);
}
function catalogSearchMatches30(record, active, display=record) {
  const values=Object.values(record);
  const contains=(value,query)=>catalogSearchText30(value).includes(catalogSearchText30(query));
  return (!active.query || [...values,...Object.values(display)].some(value=>contains(value,active.query))) &&
    active.criteria.every(({column,value})=>!(column in record) ||
      contains(record[column],value)||contains(display[column],value)) &&
    Object.entries(active.columns).every(([column,filter])=>!(column in record) ||
      ((!filter.query || catalogSearchText30(record[column]).includes(catalogSearchText30(filter.query))) &&
       (!filter.selected || filter.selected.includes(record[column]))));
}
function catalogSearchColumns30(table) {
  return [...(table.tHead?.rows[0]?.cells || [])].flatMap((th,index)=>{
    const label=(th.querySelector('.grid-head34 span')?.textContent || th.textContent).trim();
    return label && !th.querySelector('[data-select-all30]') ? [{th,index,label}] : [];
  });
}
function catalogSearchTableRows30(table) {
  const columns=catalogSearchColumns30(table);
  return validCatalogRows30(table).map(row=>{
    const group=row.classList.contains('bom-group30');
    const values=Object.fromEntries(columns.flatMap(({index,label})=>{
      const cell=row.cells[index];
      return cell && !group ? [[label,cell.dataset.rawNumber ?? cell.textContent.trim()]] : [];
    }));
    const display=Object.fromEntries(columns.flatMap(({index,label})=>row.cells[index]&&!group?
      [[label,row.cells[index].textContent.trim()]]:[]));
    return {row,values,display,group,table};
  });
}
function catalogSearchTarget30(scope,key) {
  const tables=[...scope.querySelectorAll('table')].filter(table=>table.tHead);
  if (key==='reports:list') return {tables:[],labels:['Reporte','Categoría'],records:
    [...scope.querySelectorAll('.insight-category[data-id]')].map(row=>({row,values:{
      Reporte:row.querySelector('b').textContent,Categoría:row.dataset.category}}))};
  if (key==='calendario-pm' && scope.querySelector('.pm-days,.pm-year')) return {
    tables:[],labels:['Equipo','Checklist','Próxima fecha','Estado'],
    records:[...scope.querySelectorAll('.pm-event')].map(row=>({row,values:{
      Equipo:row.dataset.equipment,Checklist:row.dataset.task,'Próxima fecha':row.dataset.date,Estado:row.dataset.status}}))};
  if (key.startsWith('reports:') && !tables.length && insightReport30) {
    const report=insightCatalog30().find(row=>row.id===insightReport30);
    return {tables:[],labels:[...new Set(report?.keys.flatMap(metric=>insightDetails30(metric,[]).headers) || [])],records:[],dataOnly:true};
  }
  const multiple=key==='setup'||key.startsWith('reports:');
  const selected=multiple?tables:tables.slice(0,1);
  const labels=selected.flatMap(table=>catalogSearchColumns30(table).map(column=>column.label));
  return {tables:selected,labels:[...new Set(labels)],records:selected.flatMap(catalogSearchTableRows30)};
}
function catalogSearchOptions30(source) {
  if (!source?.querySelector('select,input[type=checkbox],input[type=date],input[type=number]')) return [];
  const fields=source.querySelectorAll('select,input:not([type]),input:is([type=checkbox],[type=date],[type=number],[type=text],[type=search])');
  return [...fields].filter(field=>field.name||field.id);
}
function catalogSearchReadOptions30(source) {
  return Object.fromEntries(catalogSearchOptions30(source).map(field=>[field.name||field.id,
    field.type==='checkbox'?field.checked:field.value]));
}
function catalogSearchSetOptions30(source,values) {
  for (const field of catalogSearchOptions30(source)) {
    const key=field.name||field.id;
    if (!Object.hasOwn(values,key)) continue;
    if (field.type==='checkbox') field.checked=Boolean(values[key]);
    else if (field.tagName!=='SELECT'||[...field.options].some(option=>option.value===values[key])) field.value=values[key];
  }
}
function catalogSearchRunOptions30(ctx) {
  const next=catalogSearchReadOptions30(ctx.source);
  if (JSON.stringify(next)===ctx.lastOptions) return true;
  if (!ctx.source.checkValidity?.() && ctx.source.tagName==='FORM') {
    ctx.details.open=true;
    ctx.source.reportValidity();
    return false;
  }
  ctx.lastOptions=JSON.stringify(next);
  if (ctx.source.tagName==='FORM') {
    ctx.source.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  } else {
    const action=ctx.source.querySelector('button');
    if (action) action.click();
    else catalogSearchOptions30(ctx.source).forEach(field=>field.dispatchEvent(new Event('change',{bubbles:true})));
  }
  return true;
}
function catalogSearchCondition30(ctx,{column='',value=''}={}) {
  const labels=[...new Set([...ctx.target.labels,...(column?[column]:[])])];
  return `<div class="inventory-filter-condition30">
    <select class="select" aria-label="Columna"><option value="">Columna</option>
      ${labels.map(label=>`<option ${column===label?'selected':''}>${esc(label)}</option>`).join('')}</select>
    <input class="input" type="search" aria-label="Buscar en la columna" placeholder="Valor en columna" value="${esc(value)}">
    <button class="btn link inventory-remove-condition30" type="button" data-search-action="remove" aria-label="Quitar criterio">×</button>
  </div>`;
}
function catalogSearchCriteria30(form) {
  return [...form.querySelectorAll('.inventory-filter-condition30')].map(row=>({
    column:row.querySelector('select').value,value:row.querySelector('input').value.trim(),
  })).filter(row=>row.column&&row.value);
}
function catalogSearchFill30(ctx,active) {
  ctx.form.elements.query.value=active.query;
  ctx.conditions.innerHTML=(active.criteria.length?active.criteria:[{}]).map(row=>catalogSearchCondition30(ctx,row)).join('');
}
function catalogSearchWrite30(ctx,saved) {
  try { localStorage.setItem(ctx.state.id,JSON.stringify(saved)); }
  catch { showMsg('No se pudieron guardar los filtros.',true); return; }
  ctx.state.saved=saved;
  catalogSearchSavedList30(ctx);
}
function catalogSearchSavedList30(ctx) {
  ctx.form.querySelector('.inventory-saved-list30').innerHTML=(ctx.state.saved.named || []).map(({name},i)=>
    '<div class="inventory-saved-filter30"><button type="button" data-search-action="use" data-index="'+i+'">'+esc(name)+
    '</button><button type="button" class="inventory-remove-filter30" data-search-action="delete" data-index="'+i+
    '" aria-label="'+esc('Borrar filtro '+name)+'">×</button></div>').join('');
  ctx.form.querySelector('[data-search-action="clear-default"]').disabled=!ctx.state.saved.default;
}
function catalogSearchSnapshot30(ctx) {
  return {query:ctx.form.elements.query.value.trim(),criteria:catalogSearchCriteria30(ctx.form),
    columns:catalogSearchCopy30(ctx.state.draft),options:catalogSearchReadOptions30(ctx.source)};
}
function catalogSearchCommit30(ctx,active) {
  const old=ctx.state.active;
  ctx.state.active=catalogSearchCopy30(active);
  ctx.state.draft=catalogSearchCopy30(active.columns);
  catalogSearchSetOptions30(ctx.source,active.options);
  if (!catalogSearchRunOptions30(ctx)) { ctx.state.active=old; return; }
  if (ctx.source.isConnected && (ctx.key==='bom' || ctx.key.startsWith('reports:') && ctx.key!=='reports:list')) {
    if (ctx.key==='bom') renderApp();
    else renderReportsNavigation29();
    return;
  }
  catalogSearchRefresh30(ctx);
}
function catalogSearchAction30(ctx,button) {
  const {form,state,conditions}=ctx;
  const action=button.dataset.searchAction;
  const saved=state.saved;
  const named=saved.named || [];
  const i=Number(button.dataset.index);
  if (action==='add') {
    conditions.insertAdjacentHTML('beforeend',catalogSearchCondition30(ctx));
    conditions.lastElementChild.querySelector('select').focus();
  } else if (action==='remove') {
    if (conditions.children.length===1) conditions.innerHTML=catalogSearchCondition30(ctx);
    else button.closest('.inventory-filter-condition30').remove();
    conditions.lastElementChild.querySelector('select').focus();
  } else if (action==='save') {
    const input=form.elements.filterName;
    const name=input.value.trim();
    if (!name || named.some(item=>catalogSearchText30(item.name)===catalogSearchText30(name))) {
      input.setCustomValidity(name?'Ya hay un filtro con ese nombre.':'Ponle un nombre al filtro.');
      input.reportValidity();
      input.setCustomValidity('');
      return;
    }
    catalogSearchWrite30(ctx,{...saved,named:[...named,{name,value:catalogSearchSnapshot30(ctx)}]});
    input.value='';
  } else if (action==='delete') {
    catalogSearchWrite30(ctx,{...saved,named:named.filter((_,index)=>index!==i)});
  } else if (action==='default') {
    catalogSearchWrite30(ctx,{...saved,default:catalogSearchSnapshot30(ctx)});
    closeInventoryDefaults30(form);
  } else if (action==='clear-default') {
    catalogSearchWrite30(ctx,{...saved,default:null});
    closeInventoryDefaults30(form);
    const active={...catalogSearchEmpty30(),options:state.initialOptions};
    catalogSearchFill30(ctx,active);
    catalogSearchCommit30(ctx,active);
  } else if (action==='use' && named[i]) {
    const active=named[i].value;
    catalogSearchFill30(ctx,active);
    closeInventoryDefaults30(form);
    catalogSearchCommit30(ctx,active);
  }
}
function catalogSearchVisibility30(row,visible) {
  if (!visible && !row.hidden) { row.hidden=true; catalogSearchHidden30.add(row); return true; }
  if (visible && catalogSearchHidden30.has(row)) { row.hidden=false; catalogSearchHidden30.delete(row); return true; }
  return false;
}
function catalogSearchSort30(ctx,table) {
  if (ctx.key==='bom'||!ctx.state.sort) return;
  const {label,desc}=ctx.state.sort;
  const index=catalogSearchColumns30(table).find(column=>column.label===label)?.index;
  if (index==null) return;
  const collator=new Intl.Collator('es',{numeric:true,sensitivity:'base'});
  for (const body of table.tBodies) {
    const current=[...body.rows];
    const sorted=[...current].sort((a,b)=>{
      const value=row=>row.cells[index]?.dataset.rawNumber ?? row.cells[index]?.dataset.dateValue30 ?? row.cells[index]?.textContent.trim() ?? '';
      const x=value(a),y=value(b);
      const clean=s=>s.replaceAll(',','');
      const diff=x&&y&&Number.isFinite(Number(clean(x)))&&Number.isFinite(Number(clean(y)))?
        Number(clean(x))-Number(clean(y)):collator.compare(x,y);
      return desc?-diff:diff;
    });
    if (sorted.some((row,i)=>row!==current[i])) body.append(...sorted);
  }
}
function catalogSearchHeads30(ctx,table) {
  for (const {th,label} of catalogSearchColumns30(table)) {
    let button=th.querySelector('.grid-head34');
    if (!button) {
      button=document.createElement('button');
      button.type='button';
      button.className='grid-head34';
      button.innerHTML='<span>'+esc(label)+'</span><span class="filter-symbol34" aria-hidden="true">▾</span>';
      th.replaceChildren(button);
    }
    button.setAttribute('aria-label','Filtrar '+label);
    button.classList.toggle('filtered34',Boolean(ctx.state.active.columns[label]));
    button.classList.toggle('filter-pending30',JSON.stringify(ctx.state.draft[label]||null)!==JSON.stringify(ctx.state.active.columns[label]||null));
    button.onclick=()=>openGridFilter34(ctx.key,label,label,button,{
      grid:table,filters:ctx.state.draft,values:ctx.key==='bom' ? state.setupTables.Bom.flatMap(line=>
        ['Componente / NP padre','No Parte'].includes(label)?[line.parentPart,line.componentPart]:[bomCatalogValues30(line)[label]]) :
        ctx.target.records.filter(item=>item.table===table).flatMap(({values})=>label in values?[values[label]]:[]),
      refresh:()=>catalogSearchRefresh30(ctx),
      sort:desc=>{ ctx.state.sort={label,desc}; catalogSearchSort30(ctx,table); },
      sortable:ctx.key!=='bom',
    });
  }
}
function catalogSearchRefresh30(ctx) {
  if (!ctx.form.isConnected) return;
  const {active,draft}=ctx.state;
  const target=catalogSearchTarget30(ctx.scope,ctx.key);
  const changed=target.labels.join('|')!==ctx.target.labels.join('|');
  ctx.target=target;
  if (changed && target.labels.length) {
    for (const select of ctx.conditions.querySelectorAll('select')) {
      const value=select.value;
      select.replaceChildren(new Option('Columna',''),...[...new Set([...target.labels,...(value?[value]:[])])].map(label=>new Option(label,label)));
      select.value=value;
    }
  }
  const has=catalogSearchHas30(active);
  let visible=0;
  const visibilityChanges=new Set();
  const dataFiltered=ctx.key==='bom' || ctx.key.startsWith('reports:')&&ctx.key!=='reports:list';
  for (const item of target.records) {
    if(catalogSearchVisibility30(item.row,!has||dataFiltered||catalogSearchMatches30(item.values,active,item.display))) {
      visibilityChanges.add(item.table);
    }
    if (!item.row.hidden) visible+=ctx.key==='bom'?(Number(item.row.dataset.components)||0):1;
  }
  for (const table of target.tables) {
    catalogSearchHeads30(ctx,table);
    catalogSearchSort30(ctx,table);
    if (!visibilityChanges.has(table)) continue;
    if (table.querySelector('[data-select-all30]')) refreshGridChecks30(table);
    if (table.querySelector('[data-facility-code30]')) refreshFacilityEdit30(table);
  }
  const pending=JSON.stringify(active.columns)!==JSON.stringify(draft);
  const status=ctx.form.querySelector('.inventory-search-count30');
  const message=pending?'Filtros de columna pendientes. Pulsa Buscar para aplicarlos.':
    visible?visible+(visible===1?' resultado':' resultados'):'Sin coincidencias';
  status.hidden=(!has||target.dataOnly)&&!pending;
  if (status.textContent!==message) status.textContent=message;
}
function catalogSearchInstall30(source,scope,key) {
  const state=catalogSearchState30(key);
  const target=catalogSearchTarget30(scope,key);
  const ctx={source,scope,key,state,target,lastOptions:JSON.stringify(catalogSearchReadOptions30(source))};
  state.initialOptions ??= catalogSearchReadOptions30(source);
  const form=document.createElement('form');
  form.className='ops-filters catalog-search30';
  form.setAttribute('aria-label','Filtros de búsqueda');
  form.innerHTML=`<input class="input inventory-search-all30" type="search" name="query" aria-label="Buscar en todos los campos" placeholder="Buscar">
    <div class="inventory-search-column30"></div><div class="ops-filter-actions">
    <button class="btn soft inventory-add-filter30" type="button" data-consult-control30 data-search-action="add">Agregar filtro</button>
    <button class="btn primary inventory-search-button30" type="submit">${icon29('search')}<span>Buscar</span></button>
    <details class="inventory-defaults30" data-consult-control30><summary>Filtros guardados <span aria-hidden="true">▾</span></summary>
    <div class="inventory-default-options30"><div class="inventory-saved-list30"></div><div class="inventory-save-filter30">
    <input class="input" type="text" name="filterName" aria-label="Nombre del filtro" placeholder="Nombre del filtro" maxlength="60">
    <button type="button" data-search-action="save">Guardar filtro</button></div>
    <button type="button" data-search-action="default">Guardar como predeterminados</button>
    <button type="button" data-search-action="clear-default">Borrar predeterminados</button></div></details></div>
    <p class="inventory-search-count30" role="status" hidden></p>`;
  Object.assign(ctx,{form,conditions:form.querySelector('.inventory-search-column30')});
  catalogSearchBars30.set(source,ctx);
  catalogSearchFill30(ctx,state.active);
  catalogSearchSavedList30(ctx);
  form.onsubmit=event=>{event.preventDefault();catalogSearchCommit30(ctx,catalogSearchSnapshot30(ctx));};
  form.onclick=event=>{
    const action=event.target.closest('[data-search-action]');
    if (action) catalogSearchAction30(ctx,action);
  };
  form.elements.filterName.onkeydown=event=>{
    if(event.key==='Enter'){event.preventDefault();catalogSearchAction30(ctx,form.querySelector('[data-search-action=save]'));}
  };
  source.before(form);
  if (catalogSearchOptions30(source).length && !source.dataset.standardFilter30) {
    ctx.details=document.createElement('details');
    ctx.details.className='catalog-search-options30';
    ctx.details.innerHTML='<summary>Opciones de pantalla</summary>';
    source.before(ctx.details);
    ctx.details.append(source);
    source.classList.add('catalog-legacy-options30');
    for (const button of source.querySelectorAll('button')) {
      if (button.type==='submit'||button.type==='reset'||button.textContent.trim()==='Buscar') button.hidden=true;
    }
    // Enter in the options also applies the common search and keeps both parts in sync.
    source.addEventListener('keydown',event=>{
      if (event.key==='Enter' && event.target.matches('input')) { event.preventDefault(); form.requestSubmit(); }
    });
    if (!state.optionsRestored) {
      state.optionsRestored=true;
      catalogSearchSetOptions30(source,state.active.options);
      catalogSearchRunOptions30(ctx);
    }
  } else source.hidden=true;
  catalogSearchRefresh30(ctx);
}
function catalogSearchInstallScreens30() {
  if (!shellSession?.accountId) return;
  const view=document.querySelector('main .view.active');
  const dialog=document.querySelector('#configDialog[open]');
  for (const root of [view,dialog].filter(Boolean)) {
    const sources=[...root.querySelectorAll('.ops-filters:not(.inventory-search30,.catalog-search30,.legacy-filters34,.trace-serial-form30),.filters:not(.legacy-filters34),[data-catalog-filter30]')];
    sources.forEach((source,index)=>{
      const scope=source.closest('.card-body') || root;
      if (scope.querySelector('.inventory-search30')) return;
      const existing=catalogSearchBars30.get(source);
      if (existing) { catalogSearchRefresh30(existing); return; }
      const key=root===dialog?'dialog:'+dialog.querySelector('.concept-head h2')?.textContent:
        shellScreen==='reports'?'reports:'+(insightReport30||'list'):shellScreen;
      catalogSearchInstall30(source,scope,key+(index?':'+index:''));
    });
  }
}
new MutationObserver(catalogSearchInstallScreens30).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',event=>{
  const button=event.target.closest('.actionbar button');
  if (button?.textContent.trim()!=='Exportar') return;
  const scope=button.closest('.card-body')||button.closest('dialog[open]')||button.closest('.view.active');
  const source=scope && [...scope.querySelectorAll('.ops-filters:not(.inventory-search30),.filters,[data-catalog-filter30]')].find(node=>catalogSearchBars30.has(node));
  const ctx=source&&catalogSearchBars30.get(source);
  if (!ctx || !catalogSearchHas30(ctx.state.active) || !ctx.target.tables.length ||
    ['setup','bom','calendario-pm','containers'].includes(ctx.key) || ctx.key.startsWith('reports:')) return;
  const grid=ctx.target.tables[0];
  if (!ctx.target.records.some(({row})=>row.hidden)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  exportCatalogGrid30(grid,ctx.key.replace(/[^\p{L}\p{N}-]+/gu,'-'));
},true);
