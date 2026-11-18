
const gridSelections30 = new Map();
function selectedRows30(scope) {
  const selector = ['inventory','containers'].includes(scope) ? '#view-inventory' : '#ops29-results';
  return [...document.querySelectorAll(selector+' input[data-select-row30]:checked')]
    .filter(input => !input.closest('tr').hidden).map(input=>input.value);
}
function refreshGridChecks30(grid) {
  const checks = [...grid.querySelectorAll('input[data-select-row30]')].filter(input=>!input.closest('tr').hidden);
  const selected = checks.filter(input=>input.checked).length;
  const all = grid.querySelector('[data-select-all30]');
  all.checked = Boolean(checks.length) && selected===checks.length;
  all.indeterminate = selected>0 && selected<checks.length;
  all.disabled = !checks.length;
  if(['inventory','containers'].includes(shellScreen)&&grid.closest('#view-inventory')) {
    const chosen=checks.filter(input=>input.checked).map(input=>input.value);
    if(uiState.inventoryAction!=='Edit')uiState.inventorySelectedIndex=chosen.length===1?state.serials.findIndex(row=>row.serial===chosen[0]):null;
    const bar=grid.closest('.card-body')?.querySelector(':scope > .actionbar');
    for(const button of bar?.querySelectorAll('button')||[]) {
      if(button.textContent.trim()==='Editar'){button.disabled=!chosen.length||levelFor()<2;button.onclick=editCheckedInventory30;}
      if(button.textContent.trim()==='Inactivar')button.disabled=!chosen.length||levelFor()<2;
      if(button.textContent.trim()==='Eliminar')button.disabled=!chosen.length||levelFor()<3;
    }
    for(const input of checks)input.closest('tr').classList.toggle('selected',input.checked);
  }
  const trace=grid.closest('.card')?.querySelector('[data-inventory-trace]');
  if (trace) trace.disabled=selected!==1;
  const count = grid.closest('.table-wrap')?.nextElementSibling;
  if (count?.matches('.grid-selected30')) count.textContent = selected ? selected+' seleccionadas' : '';
}
function installGridChecks30(grid, scope, keyFor) {
  if (!grid?.tHead || grid.querySelector('[data-select-all30]')) return;
  const keys = gridSelections30.get(scope) || new Set();
  gridSelections30.set(scope,keys);
  const heading = document.createElement('th');
  heading.scope = 'col';
  heading.className = 'grid-check30';
  heading.innerHTML = '<input type="checkbox" data-select-all30 data-consult-control30 aria-label="Seleccionar todas las filas visibles">';
  const first = ['inventory','containers'].includes(scope);
  const column = first ? 0 : -1;
  if (first) grid.tHead.rows[0].prepend(heading); else grid.tHead.rows[0].append(heading);
  const wrap = grid.closest('.table-wrap');
  wrap.insertAdjacentHTML('afterend','<div class="grid-selected30" role="status"></div>');
  if (grid.tFoot) grid.tFoot.rows[0].insertCell(column).className='grid-check30';
  for (const row of grid.tBodies[0].rows) {
    const key = keyFor(row);
    const cell = row.insertCell(column);
    cell.className='grid-check30';
    if (!key) continue;
    const input = document.createElement('input');
    input.type='checkbox';
    input.value=key;
    input.dataset.selectRow30=''; input.dataset.consultControl30='';
    input.checked=keys.has(key);
    input.setAttribute('aria-label','Seleccionar '+key);
    input.addEventListener('click',e=>e.stopPropagation());
    input.addEventListener('change',()=>{
      if (input.checked) keys.add(key); else keys.delete(key);
      row.classList.toggle('grid-marked30',input.checked);
      refreshGridChecks30(grid);
    });
    row.classList.toggle('grid-marked30',input.checked);
    cell.append(input);
  }
  heading.firstChild.addEventListener('change',()=>{
    for (const input of grid.querySelectorAll('[data-select-row30]')) {
      if (input.closest('tr').hidden) continue;
      input.checked=heading.firstChild.checked;
      if (input.checked) keys.add(input.value); else keys.delete(input.value);
      input.closest('tr').classList.toggle('grid-marked30',input.checked);
    }
    refreshGridChecks30(grid);
  });
  refreshGridChecks30(grid);
}
const opsBeforeChecks30 = renderOperationsResults29;
renderOperationsResults29 = function (id) {
  opsBeforeChecks30(id);
  if (['job-manager','oc','proveedores'].includes(id)) installGridChecks30(
    document.querySelector('#ops29-results table'),id,row=>row.cells[0]?.querySelector('[data-code]')?.dataset.code);
};
const exportBeforeChecks30 = exportOperations29;
exportOperations29 = function () {
  if (!requireLevel(1)) return;
  const selected = selectedRows30(shellScreen);
  if (!selected.length) return exportBeforeChecks30();
  const {headers,rows} = operationsTable29(shellScreen,currentOperationsFilters29(shellScreen));
  exportRows(shellScreen+'-seleccion.csv',headers,rows.filter(row=>selected.includes(row.key)).map(row=>row.cells));
};
function exportInventory() {
  if (!['inventory','containers'].includes(shellScreen) || !requireLevel(1)) return;
  const grid = gridTable34();
  const visible = inventoryDataRows30(grid).filter(row=>!row.hidden).map(row=>inventoryGridCells30(row)[0].textContent.trim());
  const selected = selectedRows30(shellScreen);
  const rows = state.serials.filter(row=>(selected.length?selected:visible).includes(row.serial));
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  exportRows('inventario.csv',inventoryHeaders30, rows.map(row=>{
    const {building,area}=inventoryFacilityLabels30(row.location);
    return [row.serial,row.part,row.desc,row.qtyCurrent,row.unit,building,area,row.location,row.status,row.lot,row.notes,inventoryOperation30(row).number,inventoryOperation30(row).name,containerAddDateDisplay31(row)];
  }));
}
function launchSelectedInventory30(action) {
  if (!requireLevel(2)) return;
  const selected = selectedRows30(shellScreen);
  if (action!=='Merge' && selected.length>1) return showMsg('Selecciona un solo serial para '+action+'.',true);
  uiState.inventoryAction=action;
  renderApp();
  const field=document.getElementById({Move:'move_serial',Split:'split_serial',Merge:'merge_serials'}[action]);
  if (field && selected.length) field.value=selected.join(', ');
}
const inventoryBeforeChecks30 = renderInventory;
renderInventory = function () {
  inventoryBeforeChecks30();
  if (!['inventory','containers'].includes(shellScreen) || uiState.inventorySubsection==='locations') return;
  const view=document.getElementById('view-inventory');
  const grid=gridTable34();
  if (grid) installGridChecks30(grid,shellScreen,row=>row.cells[0]?.textContent.trim());
  const body=grid?.closest('.card-body');
  const filters=body?.querySelector(':scope > .ops-filters');
  const toolbar=body?.querySelector(':scope > .actionbar');
  if (toolbar && grid && levelFor('trace')>0) {
    toolbar.insertAdjacentHTML('beforeend','<button class="btn r30-sub-action" type="button" data-inventory-trace onclick="traceContainer30()">Trazabilidad <span aria-hidden="true">↗</span></button>');
    refreshGridChecks30(grid);
  }
  if (filters && toolbar) {
    filters.classList.remove('legacy-filters34');
    body.insertBefore(filters,toolbar);
  }
  const actions=view.querySelector('.card:not(.capture) .actions-right');
  if (actions) {
    if (shellScreen === 'inventory') {
      actions.remove();
      return;
    }
    const buttons=[...actions.querySelectorAll('button')];
    const title=actions.closest('.card-head')?.querySelector('.card-title');
    if (title) title.textContent='Contenedores';
    const bar=actions.closest('.card')?.querySelector('.card-body > .actionbar');
    for (const action of ['Move','Split','Merge']) {
      const button=buttons.find(b=>b.textContent.trim()===action);
      if (!button) continue;
      button.onclick=()=>launchSelectedInventory30(action);
      (bar || actions).append(button);
    }
    if (bar) actions.remove();
  }
};
const gridBeforeChecks30 = applyGrid34;
applyGrid34 = function () {
  gridBeforeChecks30();
  const grid=gridTable34();
  if (grid?.querySelector('[data-select-all30]')) refreshGridChecks30(grid);
};
const bomBeforeGroups30 = renderBomCatalog;
let bomFilter30 = '';
let bomAll30 = false;
const bomExpanded30 = new Set();
function bomCatalogValues30(line) {
  return {
    'Componente / NP padre':line.componentPart,
    'Descripción':getPart(line.componentPart)?.desc || '',
    'Cantidad por unidad':line.qtyPerUnit==null?'—':number34(line.qtyPerUnit),
    'Unidad':line.unit,
    'Paso de ruta':bomRouteLabel29(line.routingId),
    'Estado':line.active?'Activo':'Inactivo',
  };
}
function bomMatchesCatalogSearch30(line,search) {
  if (!catalogSearchHas30(search)) return true;
  const parent=line.parentPart+' '+(getPart(line.parentPart)?.desc || '');
  const values=bomCatalogValues30(line);
  const query=search.query&&catalogSearchText30(parent).includes(catalogSearchText30(search.query))?'':search.query;
  const criteria=search.criteria.filter(({column,value})=>column!=='Componente / NP padre'||
    !catalogSearchText30(line.parentPart).includes(catalogSearchText30(value)));
  const columns={...search.columns};
  const filter=columns['Componente / NP padre'];
  if (filter && catalogSearchMatches30({'Componente / NP padre':line.parentPart},{query:'',criteria:[],columns:{'Componente / NP padre':filter}})) {
    delete columns['Componente / NP padre'];
  }
  return catalogSearchMatches30(values,{...search,query,criteria,columns});
}
function filterBom30(event) {
  event.preventDefault();
  const form=event.currentTarget;
  bomFilter30=form.elements.parent.value.trim();
  bomAll30=form.elements.expand.checked;
  if (!bomAll30) bomExpanded30.clear();
  uiState.bomSelectedIndex=null;
  renderApp();
}
function expandAllBom30(value) {
  bomAll30=value;
  bomExpanded30.clear();
  uiState.bomSelectedIndex=null;
  renderApp();
}
function toggleBomGroup30(code) {
  if (bomAll30) {
    bomAll30=false;
    for (const line of state.setupTables.Bom) bomExpanded30.add(line.parentPart);
  }
  if (bomExpanded30.has(code)) bomExpanded30.delete(code); else bomExpanded30.add(code);
  uiState.bomSelectedIndex=null;
  renderApp();
}
renderBomCatalog = function () {
  if (uiState.bomMode==='form' || shellScreen!=='bom') return bomBeforeGroups30();
  const list=state.setupTables.Bom || [];
  const search=catalogSearchActive30('bom');
  const groups=new Map();
  list.forEach((line,index)=>{
    if (uiState.bomPart29 && line.parentPart!==uiState.bomPart29) return;
    if (uiState.bomRoute29 && line.routingId && line.routingId!==uiState.bomRoute29) return;
    if (!containsOperations29(line.parentPart+' '+(getPart(line.parentPart)?.desc || ''),bomFilter30)) return;
    if (!bomMatchesCatalogSearch30(line,search)) return;
    if (!groups.has(line.parentPart)) groups.set(line.parentPart,[]);
    groups.get(line.parentPart).push({line,index});
  });
  const filters='<form class="ops-filters insight-toolbar" onsubmit="filterBom30(event)">'+
    operationsField29(field29('parent','Número de parte padre'),bomFilter30,true)+
    '<label class="ops-check"><input type="checkbox" id="filter-expand-bom30" name="expand" '+(bomAll30?'checked':'')+
    '> Expandir componentes</label><button class="btn primary">Buscar</button></form>';
  const edit=levelFor('bom')>=2;
  const actions='<div class="actionbar">'+(edit?'<button class="btn new" onclick="uiState.bomMode=\'form\';uiState.bomEditIndex=null;renderApp()">Agregar</button>':'')+
    '<button class="btn soft" onclick="exportGroupedBom30()">Exportar</button>'+
    '<button class="btn soft" onclick="expandAllBom30(true)">Expandir todos</button><button class="btn soft" onclick="expandAllBom30(false)">Contraer todos</button>'+
    (levelFor('bom')>=3?'<button class="btn danger" '+(uiState.bomSelectedIndex==null?'disabled':'')+' onclick="deleteBom()">Eliminar</button>':'')+'</div>';
  const rows=[...groups].flatMap(([code,items])=>{
    const open=bomAll30 || bomExpanded30.has(code);
    const head='<tr class="bom-group30" data-components="'+items.length+'"><td colspan="6"><button class="btn link" type="button" data-code="'+esc(code)+
      '" aria-expanded="'+open+'" onclick="toggleBomGroup30(this.dataset.code)">'+(open?'▾ ':'▸ ')+esc(code)+' · '+
      esc(getPart(code)?.desc || '')+'</button> <small>'+items.length+' componentes</small></td></tr>';
    if (!open) return [head];
    return [head,...items.map(({line,index})=>{
      const component=edit?'<button class="btn link" onclick="event.stopPropagation();uiState.bomSelectedIndex='+index+';editBom()">'+esc(line.componentPart)+'</button>':esc(line.componentPart);
      return dataRow([component,esc(getPart(line.componentPart)?.desc || ''),esc(line.qtyPerUnit==null?'—':number34(line.qtyPerUnit)),
        esc(line.unit),esc(bomRouteLabel29(line.routingId)),line.active?'Activo':'Inactivo'],
        'selectBomRow('+index+')',uiState.bomSelectedIndex===index);
    })];
  });
  return cardNavigation29('Recetas / BOM',filters+actions+bomContext29()+
    resultsTable30(['Componente / NP padre','Descripción','Cantidad por unidad','Unidad','Paso de ruta','Estado'],rows,'720px'));
};
function exportGroupedBom30() {
  if (!requireLevel(1,'bom')) return;
  const search=catalogSearchActive30('bom');
  const rows=state.setupTables.Bom.filter(row=>(!uiState.bomPart29 || row.parentPart===uiState.bomPart29)&&
    (!uiState.bomRoute29 || !row.routingId || row.routingId===uiState.bomRoute29)&&
    containsOperations29(row.parentPart+' '+(getPart(row.parentPart)?.desc || ''),bomFilter30)&&bomMatchesCatalogSearch30(row,search));
  if (!rows.length) return showMsg('No hay resultados para exportar.',true);
  exportRows('bom.csv',['NP padre','Componente','Cantidad por unidad','Unidad','Paso de ruta'],
    rows.map(row=>[row.parentPart,row.componentPart,row.qtyPerUnit,row.unit,bomRouteLabel29(row.routingId)]));
}


const assistantSpark30 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2l2.2 6.8L19 11l-6.8 2.2L10 20l-2.2-6.8L1 11l6.8-2.2L10 2ZM19 2v6m-3-3h6m-3 10v5m-2.5-2.5h5"/></svg>';
const navPanelIcon30 = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>';
let desktopMenuOpen30 = false;
const desktopNav30 = matchMedia('(min-width:681px)');
const originalToggle30 = toggleMenu29;
const mobileHide30 = hideSidebar;

function desktopMenu30() {
  if (!desktopNav30.matches) return;
  const app = document.getElementById('app');
  app.classList.remove('sidebar-hidden');
  app.classList.toggle('menu-rail30',!desktopMenuOpen30);
  document.getElementById('sidebar').inert = false;
  const button=document.getElementById('menuToggle29');
  if (!button) return;
  button.setAttribute('aria-expanded',String(desktopMenuOpen30));
  const label=desktopMenuOpen30?'Ocultar menú':'Mostrar menú';
  button.setAttribute('aria-label',label);
  button.title=label;
}
hideSidebar = function () {
  if (desktopNav30.matches) desktopMenu30();
  else mobileHide30();
};
toggleMenu29 = function () {
  if (!desktopNav30.matches) return originalToggle30();
  desktopMenuOpen30 = !desktopMenuOpen30;
  desktopMenu30();
};
desktopNav30.addEventListener('change',()=>{
  document.getElementById('app').classList.remove('menu-rail30');
  hideSidebar();
});
document.getElementById('nav').addEventListener('click',event=>{
  if (!desktopNav30.matches || desktopMenuOpen30) return;
  const target=event.target.closest('.menu29-group > summary');
  if (!target) return;
  event.preventDefault();
  desktopMenuOpen30=true;
  target.parentElement.open=true;
  desktopMenu30();
});

function promoteScreenLinks30(root) {
  for (const bar of root.querySelectorAll('.actionbar')) {
    const links=[...bar.children].filter(el=>el.matches('.r30-sub-action'));
    if (!links.length) continue;
    const head=bar.closest('.card')?.querySelector(':scope > .card-head');
    if (!head) continue;
    let slot=head.querySelector(':scope > .screen-links30');
    if (!slot) {
      slot=document.createElement('div');
      slot.className='screen-links30';
      head.append(slot);
    }
    slot.append(...links);
    if (!bar.children.length) bar.remove();
  }
}
const rootScreens30=document.querySelector('main');
new MutationObserver(()=>promoteScreenLinks30(rootScreens30)).observe(rootScreens30,{childList:true,subtree:true});

// SAT, CFDI 4.0, hoja c_RegimenFiscal del catálogo del 6 de noviembre de 2026.
// http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI_V_4_20261106.xls
const satTaxRegimes30 = new Map([
  ['601','General de Ley Personas Morales'],
  ['603','Personas Morales con Fines no Lucrativos'],
  ['605','Sueldos y Salarios e Ingresos Asimilados a Salarios'],
  ['606','Arrendamiento'],
  ['607','Régimen de Enajenación o Adquisición de Bienes'],
  ['608','Demás ingresos'],
  ['610','Residentes en el Extranjero sin Establecimiento Permanente en México'],
  ['611','Ingresos por Dividendos (socios y accionistas)'],
  ['612','Personas Físicas con Actividades Empresariales y Profesionales'],
  ['614','Ingresos por intereses'],
  ['615','Régimen de los ingresos por obtención de premios'],
  ['616','Sin obligaciones fiscales'],
  ['620','Sociedades Cooperativas de Producción que optan por diferir sus ingresos'],
  ['621','Incorporación Fiscal'],
  ['622','Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras'],
  ['623','Opcional para Grupos de Sociedades'],
  ['624','Coordinados'],
  ['625','Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas'],
  ['626','Régimen Simplificado de Confianza'],
]);
const companyTaxChoices30 = Array.from(satTaxRegimes30, ([code, label]) => [code, code+' · '+label]);
function companyTaxRegime30(value) {
  const saved=String(value ?? '').trim();
  if (!saved || satTaxRegimes30.has(saved)) return saved;
  const match=Array.from(satTaxRegimes30).find(([,label])=>
    label.localeCompare(saved,'es',{sensitivity:'base'})===0);
  return match?.[0] ?? saved;
}
const companyGeneral30 = [
  ['legalName','Razón social'],['tradeName','Nombre comercial'],['taxId','RFC'],
  ['taxRegime','Régimen fiscal','select',{choices:companyTaxChoices30}],
  ['phone','Teléfono','tel'],['email','Correo electrónico','email'],['website','Sitio web','url'],
];
const companyAddress30 = [
  ['country','País'],['roadType','Tipo de vialidad'],['street','Calle'],['external','Número exterior'],
  ['internal','Número interior'],['neighborhood','Colonia'],['locality','Localidad'],['city','Municipio'],
  ['region','Estado'],['postal','Código postal'],
];
function company30() {
  return state.companyProfile30 || {tradeName:shellSession?.company || 'Insetti'};
}
function companyLogo30() {
  const logo=company30().logo || '';
  return /^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/=]+$/i.test(logo) ? logo : 'assets/insetti-logo.png';
}
inheritedAccess29.empresa = 'setup';
function renderCompany30() {
  const profile=company30();
  const edit=levelFor('empresa')>=2;
  const taxCode=companyTaxRegime30(profile.taxRegime);
  const taxLabel=satTaxRegimes30.get(taxCode);
  const display={...profile,taxRegime:taxLabel ? taxCode+' · '+taxLabel : profile.taxRegime};
  const renderFields=fields=>'<dl class="company-data30">'+fields.map(([id,label])=>'<div><dt>'+esc(label)+
    '</dt><dd>'+esc(display[id]||'—')+'</dd></div>').join('')+'</dl>';
  const action=section=>edit?pmButton30('Editar','openCompanyEditor30',section):'';
  const card=(title,content,section)=>'<div class="card"><div class="card-head"><h2 class="card-title">'+title+'</h2>'+
    action(section)+'</div><div class="card-body">'+content+'</div></div>';
  document.getElementById('view-'+currentView).innerHTML='<div class="company-layout30">'+
    card('Datos generales','<div class="company-general30"><div class="company-logo30"><img alt="Logo de la empresa" src="'+
      esc(companyLogo30())+'"></div>'+renderFields(companyGeneral30)+'</div>','general')+
    card('Datos de ubicación',renderFields(companyAddress30),'address')+'</div>';
}
function openCompanyEditor30(section) {
  if (!requireLevel(2,'empresa')) return;
  const fields=section==='address'?companyAddress30:companyGeneral30;
  const profile=company30();
  configDialog(section==='address'?'Datos de ubicación':'Datos generales',
    '<form class="ops-dialog" data-section="'+esc(section)+'" onsubmit="saveCompany30(event)"><div class="ops-fields">'+
    fields.map(([id,label,type,extra])=>operationsField29(field29(id,label,type,extra),
      id==='taxRegime' ? companyTaxRegime30(profile[id]) : profile[id])).join('')+
    (section==='general'?'<label class="field">Logo de la empresa<input class="input" type="file" name="logo" accept="image/png,image/jpeg,image/webp"></label>':'')+
    '</div><div class="capture-actions"><button class="btn primary">Guardar</button></div></form>');
}
async function saveCompany30(event) {
  event.preventDefault();
  if (!requireLevel(2,'empresa')) return;
  const form=event.currentTarget;
  const account=shellSession.accountId;
  const fields=form.dataset.section==='address'?companyAddress30:companyGeneral30;
  const values=Object.fromEntries(fields.map(([id])=>[id,form.elements[id].value.trim()]));
  const file=form.elements.logo?.files?.[0];
  if (file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>600*1024) {
      return showMsg('Usa un logo PNG, JPG o WebP de hasta 600 KB.',true);
    }
    try {
      values.logo=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=reject;
        reader.readAsDataURL(file);
      });
    } catch { return showMsg('No se pudo leer el logo.',true); }
  }
  if (shellSession?.accountId!==account || !requireLevel(2,'empresa')) return;
  const previous=state.companyProfile30;
  state.companyProfile30={...company30(),...values};
  try { saveState(); } catch {
    state.companyProfile30=previous;
    return showMsg('No se pudieron guardar los datos de la empresa.',true);
  }
  closeConfigDialog();
  showMsg('Datos de la empresa guardados.');
}
const companyConceptBefore30 = renderConceptScreen;
renderConceptScreen = function () {
  if (conceptScreen==='empresa30') return renderCompany30();
  companyConceptBefore30();
};

const assistantMessages30=new Map();
const assistantPanel30=document.getElementById('assistant-panel30');
const assistantGrip30=assistantPanel30.querySelector('.assistant-grip30');
const assistantDesktop30=matchMedia('(min-width:1000px)');
const assistantApp30=document.getElementById('app');
let assistantOwner30='';
let assistantWidth30=380;
let assistantDrag30=null;
function setAssistantWidth30(width) {
  const max=Math.max(300,Math.min(680,innerWidth-570));
  const next=Math.round(Math.max(300,Math.min(width,max)));
  assistantWidth30=next;
  assistantApp30.style.setProperty('--assistant-width30',next+'px');
  assistantGrip30.setAttribute('aria-valuemin','300');
  assistantGrip30.setAttribute('aria-valuemax',String(max));
  assistantGrip30.setAttribute('aria-valuenow',String(next));
  const button=assistantPanel30.querySelector('.assistant-width30');
  const label=next>=max-1?'Contraer panel':'Ampliar panel';
  button.setAttribute('aria-label',label);
  button.title=label;
  button.innerHTML=assistantIcon30(next>=max-1?'contract':'expand');
}
function toggleAssistantWidth30() {
  const max=Number(assistantGrip30.getAttribute('aria-valuemax'));
  setAssistantWidth30(assistantWidth30>=max-1?360:max);
}
assistantGrip30.addEventListener('pointerdown',event=>{
  if (!assistantDesktop30.matches || event.button!==0) return;
  assistantDrag30={id:event.pointerId,x:event.clientX,width:assistantWidth30};
  assistantGrip30.setPointerCapture(event.pointerId);
  event.preventDefault();
});
assistantGrip30.addEventListener('pointermove',event=>{
  if (assistantDrag30?.id!==event.pointerId) return;
  setAssistantWidth30(assistantDrag30.width+assistantDrag30.x-event.clientX);
});
assistantGrip30.addEventListener('lostpointercapture',()=>{assistantDrag30=null;});
assistantGrip30.addEventListener('keydown',event=>{
  const moves={ArrowLeft:assistantWidth30+24,ArrowRight:assistantWidth30-24,Home:300,End:680};
  if (!(event.key in moves)) return;
  event.preventDefault();
  setAssistantWidth30(moves[event.key]);
});
window.addEventListener('resize',()=>{
  if (assistantDesktop30.matches && !assistantPanel30.hidden) setAssistantWidth30(assistantWidth30);
});
function syncAssistant30() {
  const open=Boolean(shellSession) && !assistantPanel30.hidden;
  assistantApp30.classList.toggle('assistant-open30',open);
  document.querySelector('.assistant-launch30')?.setAttribute('aria-expanded',String(open));
}
function toggleAssistant30() {
  if (!shellSession) return;
  if (!assistantPanel30.hidden) {
    assistantPanel30.hidden=true;
    syncAssistant30();
    document.querySelector('.assistant-launch30')?.focus();
    return;
  }
  if (assistantOwner30!==shellSession.accountId || !assistantPanel30.querySelector('form')) {
    assistantOwner30=shellSession.accountId;
    renderAssistant30();
  }
  assistantPanel30.hidden=false;
  if (assistantDesktop30.matches) setAssistantWidth30(assistantWidth30);
  syncAssistant30();
  assistantPanel30.querySelector('[name=prompt]')?.focus({preventScroll:true});
}
assistantPanel30.addEventListener('keydown',event=>{
  if (event.key==='Escape') toggleAssistant30();
});
const logoutBeforeAssistant30=logoutDemo;
logoutDemo=function () {
  assistantPanel30.hidden=true;
  assistantPanel30.querySelector('.assistant-body30').replaceChildren();
  assistantOwner30='';
  assistantDraft30=null;
  inventoryFilterOwner30=undefined;
  logoutBeforeAssistant30();
  syncAssistant30();
};
function assistantLog30() {
  const owner=shellSession?.accountId;
  if (!assistantMessages30.has(owner)) assistantMessages30.set(owner,[]);
  return assistantMessages30.get(owner);
}
function renderAssistant30() {
  if (!shellSession) return;
  const messages=assistantLog30().map(({who,text})=>'<div class="assistant-message30 '+who+'"><b>'+
    (who==='you'?'Tú':'Asistente')+'</b><span>'+esc(text)+'</span></div>').join('');
  assistantPanel30.querySelector('.assistant-body30').innerHTML=
    (messages?'':'<div class="assistant-welcome30"><span class="assistant-welcome-mark30">'+assistantSpark30+'</span><h3>InsectMES hace tu trabajo más simple</h3><div class="assistant-starters30">'+[
      ['Dashboards','Visualiza tus indicadores','dashboard','Crea un dashboard de producción'],
      ['Tareas recurrentes','Organiza tus revisiones','clock','Quiero preparar una tarea recurrente'],
      ['Reportes','Explora los datos del proceso','report','Crea un reporte de huevos cosechados']
    ].map(([title,description,icon,prompt])=>'<button type="button" data-prompt="'+esc(prompt)+'" onclick="assistantExample30(this.dataset.prompt)">'+assistantIcon30(icon)+'<b>'+title+'</b><span>'+description+'</span></button>').join('')+'</div></div>')+
    '<div class="assistant-messages30" aria-live="polite">'+messages+'</div>'+
    '<form class="assistant-form30 assistant-composer30" novalidate data-consult-control30 onsubmit="sendAssistant30(event)"><textarea class="input" name="prompt" aria-label="¿En qué te puedo ayudar?" placeholder="¿En qué te puedo ayudar?" rows="3" maxlength="700" required onkeydown="if(event.key===\'Enter\'&&!event.shiftKey&&!event.isComposing){event.preventDefault();this.form.requestSubmit()}"></textarea>'+
    '<div class="assistant-compose-actions30"><span class="assistant-voice-message30" role="status"></span><button class="assistant-mic30" type="button" aria-label="Iniciar dictado" title="Iniciar dictado" aria-pressed="false" onclick="toggleAssistantDictation30()">'+assistantIcon30('mic')+'</button><button class="assistant-send30" type="submit" aria-label="Enviar mensaje" title="Enviar mensaje">'+assistantIcon30('send')+'</button></div></form><div id="assistant-next30" class="actionbar"></div>';
  const next=assistantPanel30.querySelector('#assistant-next30');
  if (assistantDraft30?.owner===shellSession.accountId) next.innerHTML=
    '<button type="button" class="btn primary" onclick="openAssistantDraft30()">Abrir borrador</button>';
  const thread=assistantPanel30.querySelector('.assistant-messages30');
  thread.scrollTop=thread.scrollHeight;
}
function assistantExample30(text) {
  const input=assistantPanel30.querySelector('[name=prompt]');
  input.value=text;
  input.focus();
}
let assistantDraft30=null;
function sendAssistant30(event) {
  event.preventDefault();
  if(assistantDictation30?.kind==='server'){assistantDictation30.sendAfterStop=true;stopAssistantDictation30();return;}
  if(assistantServerBusy30)return;
  stopAssistantDictation30();
  if (!shellSession) return;
  const prompt=event.currentTarget.elements.prompt.value.trim();
  if (!prompt) return;
  const normalized=prompt.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  let reply='Puedo preparar altas de Process Routing, operaciones o centros de trabajo, y crear reportes o dashboards. ¿Qué necesitas preparar?';
  assistantDraft30=null;
  if(/tarea.*recurrent|recurrent.*tarea/.test(normalized)){reply='Podemos definir qué revisar y con qué frecuencia. La programación automática de tareas todavía no está conectada.';}
  else if (/\b(reporte|dashboard|grafica)\b/.test(normalized)) {
    const key=/huevo/.test(normalized)?'eggs':/transfer|larvero/.test(normalized)?'transfers':
      /mortali/.test(normalized)?'mortality':/tamiz|larva/.test(normalized)?'larvae':/inventario|movimiento/.test(normalized)?'movements':'';
    if (levelFor('reports')<1 || (key&&!canInsight30(key))) reply='Tu rol no tiene acceso a ese reporte o fuente.';
    else {
      assistantDraft30={owner:shellSession.accountId,type:'insight',kind:/dashboard/.test(normalized)?'dashboard':'report',key};
      reply='Preparé el editor. Puedes revisar los indicadores, la vista y el nombre antes de guardar.';
    }
  } else if (/\b(alta|crear?|agrega|prepara|registrar|registra|nuevo|nueva)\b/.test(normalized)) {
    const screen=/process routing|ruta/.test(normalized)?'routing':/centro de trabajo|work center/.test(normalized)?'wcs':
      /operaci[oó]n/.test(normalized)?'operations':'';
    if (screen && levelFor(screen)<2) reply='Tu rol no permite altas en esta pantalla.';
    else if (screen) {
      const fields={};
      const aliases={part:'(?:parte|np)',revision:'revisi[oó]n',sequence:'secuencia',operation:'operaci[oó]n',
        center:'(?:centro|work center)',code:'c[oó]digo'};
      for (const [key,alias] of Object.entries(aliases)) {
        const match=prompt.match(new RegExp('(?:^|[\\s,;])'+alias+'\\s*[:=]\\s*([A-Za-z0-9_.-]+)','i'));
        if (match) fields[key]=match[1];
      }
      assistantDraft30={owner:shellSession.accountId,type:'record',screen,fields};
      reply='Preparé el formulario de alta. Revisa los campos y guarda para registrar el cambio.';
    }
  }
  assistantLog30().push({who:'you',text:prompt},{who:'agent',text:reply});
  renderAssistant30();
  assistantPanel30.querySelector('[name=prompt]').focus({preventScroll:true});
}
function openAssistantDraft30() {
  const draft=assistantDraft30;
  if (!draft || draft.owner!==shellSession?.accountId) return;
  if (draft.type==='insight') return openInsightBuilder30(draft.kind,draft.key,draft.key?insights30[draft.key].name:'');
  if (!requireLevel(2,draft.screen)) return;
  navigateScreen(draft.screen);
  openEngineeringRecord29();
  const form=document.querySelector('#configDialog form');
  if (!form) return;
  for (const [key,value] of Object.entries(draft.fields)) {
    const field=form.elements[key];
    if (!field) continue;
    if (key==='center') {
      [...form.querySelectorAll('[name=center]')].forEach(input=>{if (input.value.toLowerCase()===value.toLowerCase()) input.checked=true;});
    } else if (field.options) {
      const option=[...field.options].find(x=>x.value.toLowerCase()===value.toLowerCase());
      if (option) field.value=option.value;
    } else field.value=value;
  }
}

const shellBeforePolish30 = renderShell;
renderShell = function () {
  shellBeforePolish30();
  const menu=document.getElementById('menuToggle29');
  if (menu) menu.innerHTML=navPanelIcon30;
  const header=document.querySelector('.menu29-bar');
  header?.querySelector('.menu29-tools .goto-wrap')?.insertAdjacentHTML('beforebegin',
    '<button type="button" class="toolbar-icon assistant-launch30" onclick="toggleAssistant30()" title="Asistente de IA" aria-label="Asistente de IA" aria-controls="assistant-panel30">'+assistantSpark30+'</button>');
  header?.querySelector('.menu29-tools')?.insertAdjacentHTML('beforebegin',
    '<div class="company-header30"><img src="'+esc(companyLogo30())+'" alt="'+esc(company30().tradeName || 'Empresa')+'"></div>');
  for (const item of document.querySelectorAll('#nav > details > summary,#nav > a')) {
    item.title=item.querySelector('span')?.textContent || '';
    item.setAttribute('aria-label',item.title);
  }
  desktopMenu30();
  syncAssistant30();
};

