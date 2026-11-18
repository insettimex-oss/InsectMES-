const menuBindings29 = {
  bom: 'bom', 'bsf-cycle': 'bsf-cycle', operations: 'operations', parametros: 'parameters',
  parts: 'parts', 'process-routing': 'routing', 'work-centers': 'wcs',
  checklist: 'checklist', oc: 'oc', proveedores: 'proveedores', 'recibo-oc': 'receive',
  'cost-structure': 'coststructure', contenedores: 'containers', inventario: 'inventory',
  lotes: 'lots', trazabilidad: 'trace', ubicaciones: 'locations', unidades: 'units',
  'calendario-pm': 'calendario-pm', 'checklist-pm': 'checklist-pm', equipos: 'equipos',
  mrp: 'mrp', prp: 'prp', 'job-manager': 'job-manager', 'capacity-planning': 'capacity-planning',
  settings: 'settings', empresa: 'empresa', etiquetas:'labels', 'setup-tables': 'setup', auditoria: 'audit', continuidad: 'continuidad',
  'fase-cero': 'fase-cero', firmas: 'firmas', integraciones: 'integraciones', validacion: 'validacion',
  roles: 'profiles', usuarios: 'users', 'control-panel': 'control',
  bioconversion: 'rearing', reproduccion: 'reproduction', postproceso: 'postprocess', empaque: 'pack',
  reportes: 'reports', envios: 'shipping', pedidos: 'pedidos',
};

const newScreens29 = {
  oc: {concept: 'operations-list'},
  proveedores: {concept: 'operations-list'},
  'job-manager': {concept: 'operations-list'},
  'capacity-planning': {concept: 'operations-list'},
  mrp: {concept: 'requirements30'},
  prp: {concept: 'requirements30'},
  equipos: {concept: 'maintenance30'},
  'calendario-pm': {concept: 'maintenance30'},
  'checklist-pm': {concept: 'maintenance30'},
  pedidos: {concept: 'sales30'},
  'bsf-cycle': {concept: 'bsf-cycle'},
  checklist: {concept: 'checklist'},
  containers: {inventory: 'serials'},
  lots: {concept: 'lots'},
  settings: {concept: 'settings'},
  empresa: {concept: 'empresa30'},
  labels: {concept:'labels30'},
  audit: {concept: 'audit'},
  postprocess: {target: 'workcenters', area: 'Post-Proceso'},
  pack: {target: 'workcenters'},
  shipping: {concept: 'shipping30'},
  reports: {target: 'dashboard'},
};

const inheritedAccess29 = {
  'bsf-cycle': 'routing', checklist: 'setup', containers: 'inventory', lots: 'inventory',
  settings: 'setup', labels:'setup', finalizar: 'receive', audit: 'setup', postprocess: 'control', pack: 'control',
  shipping: 'control', reports: 'home', 'movement-capture': 'inventory',
};
const productionStations30 = {
  reproduction: ['EGG','NUR','PUP','DAR','LOV'],
  rearing: ['TRA','REA','HAR','FED','ATR','USE'],
  postprocess: ['WAS','SAN','DRY','OVN','FRA','GRI'],
  pack: ['PAC','BOX'],
};
const startStation29 = Object.fromEntries(Object.entries(productionStations30).map(([id,codes]) => [id,codes[0]]));
function panelStations30(screen = shellScreen) {
  const codes = productionStations30[screen];
  return state.cpOperations.filter(op => codes ? codes.includes(op.code) : op.code !== 'SHP');
}
function normalizePanelRoute30() {
  if (shellScreen === 'shipping') {
    conceptScreen = 'shipping30';
    currentView = 'catalogs';
  } else if (currentView === 'workcenters') {
    const stations = panelStations30();
    if (!stations.some(op => op.code === cpCode)) cpCode = stations[0]?.code || 'EGG';
  }
}
const menuLabels29 = new Map([['home', {name: 'Inicio', trail: ['Inicio']}]]);
const visitMenu29 = (node, trail = []) => {
  const path = [...trail, node.name];
  if (node.items?.length) {
    node.items.forEach(child => visitMenu29(child, path));
    return;
  }
  const id = menuBindings29[node.id];
  if (!id) throw Error('Falta vincular la opción de menú: ' + path.join(' / '));
  const screen = screenRegistry.find(item => item.id === id);
  menuLabels29.set(id, {name: node.name, trail: path});
  if (screen) {
    screen.name = node.name;
    screen.module = trail.join(' / ');
  } else {
    screenRegistry.push({
      id, name: node.name, module: trail.join(' / '),
      ...(newScreens29[id] || {concept: 'unavailable'}),
    });
  }
};
menuApproved29.modules.forEach(node => visitMenu29(node));
screenRegistry.push({id:'movement-capture', name:'Captura de movimientos', module:'Inventario', target:'movements'});
screenRegistry.find(x => x.id === 'home').name = 'Inicio';
screenRegistry.find(x => x.id === 'hierarchy').module = 'Plataforma / Configuración';

const initNavigation29 = initShell;
initShell = function () {
  initNavigation29();
  for (const screen of screenRegistry) {
    state.screenActions[screen.id] ??= {view:true, add:true, edit:true, export:true};
  }
  let updated = false;
  for (const profile of securityData.profiles) {
    for (const screen of screenRegistry) {
      if (profile.permissions[screen.id] !== undefined) continue;
      profile.permissions[screen.id] = profile.admin ? 4 : (profile.permissions[inheritedAccess29[screen.id]] ?? 0);
      updated = true;
    }
  }
  if (updated) persistSecurity();
};

const requireBeforeNavigation29 = requireLevel;
requireLevel = function (level, id = shellScreen) {
  if (id !== shellScreen && inheritedAccess29[shellScreen] === id && !requireBeforeNavigation29(level, shellScreen)) {
    return false;
  }
  return requireBeforeNavigation29(level, id);
};

const navigateBeforeMenu29 = navigateScreen;
navigateScreen = function (id) {
  if (shellSession && levelFor(id) > 0) {
    if (startStation29[id]) cpCode = startStation29[id];
    if (['inventory','containers'].includes(id)) uiState.inventoryAction = '';
    if(id==='inventory'){uiState.inventorySelectedIndex=null;gridSelections30.delete('inventory');}
  }
  navigateBeforeMenu29(id);
};

const restoreBeforeMenu29 = restoreInitialRoute29;
restoreInitialRoute29 = function () {
  const [,screen,station] = location.hash.split('/');
  const snapshot = history.state?.insectmes;
  restoreBeforeMenu29();
  if (!snapshot && station && startStation29[screen] &&
      panelStations30(screen).some(op => op.code === station.toUpperCase())) cpCode = station.toUpperCase();
  normalizePanelRoute30();
  if (shellScreen === 'shipping' && station) {
    history.replaceState({insectmes:snapshot29()},'', '#/shipping');
  }
  if (!snapshot || keyRoute29(snapshot29()) !== keyRoute29(snapshot)) lastRouteKey = '';
};

const showBeforeMenu29 = showSidebar;
const hideBeforeMenu29 = hideSidebar;
showSidebar = function () {
  showBeforeMenu29();
  syncMenuToggle29();
};
hideSidebar = function () {
  hideBeforeMenu29();
  syncMenuToggle29();
};
function syncMenuToggle29() {
  const open = !document.getElementById('app').classList.contains('sidebar-hidden');
  const button = document.getElementById('menuToggle29');
  const sidebar = document.getElementById('sidebar');
  sidebar.inert = !open;
  if (button) {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }
}
function toggleMenu29() {
  const button = document.getElementById('menuToggle29');
  if (button.getAttribute('aria-expanded') === 'true') {
    hideSidebar();
    return;
  }
  closeTopMenus();
  showSidebar();
  document.getElementById('nav').querySelector('a, summary')?.focus({preventScroll:true});
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.activeElement?.closest('#sidebar')) {
    document.getElementById('menuToggle29')?.focus();
  }
}, true);

function renderMenuNode29(node) {
  const {icon, arrow} = menuApproved29;
  const symbol = node.icon ? icon(node.icon) : '';
  if (node.items?.length) {
    const content = node.items.map(renderMenuNode29).join('');
    if (!content) return '';
    const active = menuLabels29.get(shellScreen)?.trail.includes(node.name);
    return '<details class="menu29-group" data-group="' + esc(node.id) + '"' +
      (active ? ' data-active="true"' : '') + '><summary>' + symbol + '<span>' +
      esc(node.name) + '</span>' + arrow() + '</summary><div class="menu29-children">' + content + '</div></details>';
  }
  const id = node.id === 'home' ? 'home' : menuBindings29[node.id];
  if (!levelFor(id)) return '';
  return '<a class="' + (node.icon ? 'menu29-direct' : 'menu29-link') + '" href="#/' + id +
    '" data-screen="' + id + '"' + (shellScreen === id ? ' aria-current="page"' : '') + '>' +
    symbol + '<span>' + esc(node.name) + '</span></a>';
}
function renderMenuTree29() {
  const nav = document.getElementById('nav');
  const openGroups = new Set([...nav.querySelectorAll('details[open]')].map(el => el.dataset.group));
  nav.innerHTML = renderMenuNode29({id:'home', name:'Inicio', icon:'home'}) +
    menuApproved29.modules.map(renderMenuNode29).join('');
  for (const group of nav.querySelectorAll('details')) group.open = openGroups.has(group.dataset.group);
}
document.getElementById('sidebar').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link) return;
  event.preventDefault();
  if(desktopNav30.matches)desktopMenuOpen30=false;
  navigateScreen(link.dataset.screen || 'home');
  hideSidebar();
  document.getElementById('menuToggle29')?.focus({preventScroll:true});
});

function headerTool29(type, label, iconName) {
  return '<div class="menu-anchor"><button type="button" class="toolbar-icon" aria-label="' + label +
    '" title="' + label + '" aria-expanded="false" onclick="toggleTopMenu(\'' + type + '\',this)">' +
    menuApproved29.icon(iconName) + '</button></div>';
}
renderNav = function () {
  renderMenuTree29();
};
renderShell = function () {
  const {icon} = menuApproved29;
  const label = shellScreen === 'parts' && uiState.itemMode === 'form'
    ? 'Detalle de No Parte' : screenRegistry.find(screen => screen.id === shellScreen)?.name || screenName();
  const activeStation = currentView === 'workcenters' && shellScreen !== 'control' ? op29()?.name : '';
  document.querySelector('.menu29-bar').innerHTML =
    '<div class="menu29-identity"><button id="menuToggle29" class="menu29-icon" type="button" title="Menú" aria-controls="sidebar" onclick="toggleMenu29()">' + icon('menu') + '</button>' +
    '<button id="back34" class="menu29-icon menu29-back" type="button" aria-label="Volver a la pantalla anterior" title="Volver" onclick="history.back()">' + icon('back') + '</button>' +
    '<button type="button" class="wordmark menu29-wordmark" aria-label="InsectMES, Inicio" onclick="navigateScreen(\'home\')"><strong>Insect</strong><span>MES</span></button>' +
    '<div class="menu29-account"><span>' + esc(shellSession?.user || 'Alejandro') + '</span><span>' + esc(shellSession?.company || 'Insetti') + '</span></div>' +
    '<b id="pageTitle" title="' + esc(activeStation ? label + ' / ' + activeStation : label) + '">' + esc(label) + '</b></div>' +
    '<div class="menu29-tools">' +
    headerTool29('recent','Pantallas recientes','recent') + headerTool29('favorites','Favoritos','favorites') +
    headerTool29('config','Configuración','settings') + headerTool29('help','Ayuda','help') +
    '<div class="goto-wrap"><input class="input" id="goToInput" type="search" placeholder="Go to..." aria-label="Buscar pantallas" autocomplete="off" oninput="searchScreens(this.value)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();showSearchResults(this.value)}"><div id="goToResults"></div></div>' +
    '<button class="session-exit" type="button" onclick="logoutDemo()">Cerrar sesión</button></div>';
  syncMenuToggle29();
  if (currentView === 'dashboard' && shellScreen === 'home') renderHome();
  if (currentView === 'workcenters') renderControlPanel29();
  if (shellScreen === 'reports') renderReportsNavigation29();
  if (shellScreen === 'trace') renderTraceNavigation29();
};

const searchBeforeMenu29 = searchScreens;
searchScreens = function (query) {
  searchBeforeMenu29(query);
  searchResults = searchResults.filter(x => levelFor(x.id) > 0);
  document.getElementById('goToResults').innerHTML = searchResults.slice(0,10)
    .map(x => '<button type="button" onclick="navigateScreen(\'' + x.id + '\')">' + esc(x.name) + '</button>').join('');
};

renderHome = function () {
  const view = document.getElementById('view-dashboard');
  const cards = menuApproved29.shortcuts.map(([path, iconName]) => {
    const id = menuBindings29[path.split('/').at(-1)];
    if (!levelFor(id)) return '';
    return '<button class="menu29-card" type="button" onclick="navigateScreen(\'' + id + '\')">' +
      '<span class="menu29-card-icon">' + menuApproved29.icon(iconName) + '</span>' +
      '<span class="menu29-card-label">' + esc(menuLabels29.get(id).name) + menuApproved29.arrow() + '</span></button>';
  }).join('');
  view.innerHTML = '<div class="menu29-home" aria-label="Accesos rápidos">' + cards + '</div>';
};

function screenAction29(label, id) {
  return !menuLabels29.has(id) && levelFor(id) > 0
    ? '<button class="btn r30-sub-action" type="button" onclick="navigateScreen(\'' + id + '\')">' + esc(label) +
      ' <span aria-hidden="true">↗</span></button>' : '';
}
function cardNavigation29(title, content) {
  return '<div class="card"><div class="card-head"><div class="card-title">' + esc(title) +
    '</div></div><div class="card-body">' + content + '</div></div>';
}
function dataTable29(columns, rows) {
  if (!rows.length) return '<div class="empty-state">Sin registros.</div>';
  return table(columns, rows.map(row => '<tr>' +
    row.map(value => '<td>' + esc(String(value ?? '')) + '</td>').join('') + '</tr>'));
}
function renderLotNavigation29() {
  const lots = new Map();
  for (const serial of state.serials) {
    const key = serial.productionLot || serial.lot;
    if (!key) continue;
    const group = lots.get(key) || {label:serial.lot || key, date:serial.productionLot || '', serials:[], active:0};
    group.serials.push(serial.serial);
    if (serial.active) group.active++;
    lots.set(key, group);
  }
  const rows = [...lots.values()].sort((a,b) => b.date.localeCompare(a.date))
    .map(x => [x.label, x.date, x.active, x.serials.join(', ')]);
  return cardNavigation29('Lotes', dataTable29(['Lote','Fecha de producción','Seriales activos','Seriales'], rows));
}
function renderTraceNavigation29() {
  const view = document.getElementById('view-genealogy');
  const rows = state.genealogy.map(x => [x.ts, x.parent, x.child, x.action, number34(x.qty), x.ref]);
  view.insertAdjacentHTML('afterbegin', cardNavigation29('Trazabilidad',
    dataTable29(['Fecha','Origen','Destino','Movimiento','Cantidad','Referencia'], rows)));
}
function renderReportsNavigation29() {
  const view = document.getElementById('view-dashboard');
  view.querySelector('.quick')?.remove();
  if (levelFor('control') > 0) {
    const rows = state.operationRuns.map(x => [x.at && dateDisplay34(x.at), x.operation, x.serial,
      x.lot, number34(x.qty) + ' ' + x.unit, x.operator]);
    view.insertAdjacentHTML('beforeend', cardNavigation29('Historial de producción',
      dataTable29(['Fecha','Operación','Serial','Lote','Cantidad','Operador'], rows)));
  }
  if (levelFor('inventory') > 0) {
    const rows = state.movements.map(x => [x.ts,x.type,x.serial,x.part,number34(x.qty),x.unit,x.ref]);
    view.insertAdjacentHTML('beforeend', cardNavigation29('Historial de movimientos',
      dataTable29(['Fecha','Movimiento','Serial','No Parte','Cantidad','Unidad','Notas'], rows)));
  }
}

const conceptBeforeNavigation29 = renderConceptScreen;
renderConceptScreen = function () {
  const el = document.getElementById('view-' + currentView);
  if (conceptScreen === 'settings') {
    el.innerHTML = cardNavigation29('Settings',
      '<div class="actionbar"><button class="btn primary" type="button" onclick="openConfigSettings()">Settings de inventario</button>' +
      screenAction29('Jerarquía de módulos y acciones','hierarchy') + '</div>');
  } else if (conceptScreen === 'audit') {
    el.innerHTML = cardNavigation29('Auditoría de configuración',
      dataTable29(['Fecha','Acción'],state.configHistory.map(x => [x.at, x.action])));
  } else if (conceptScreen === 'lots') {
    el.innerHTML = renderLotNavigation29();
  } else if (conceptScreen === 'checklist') {
    const rows = state.setupTables.Maintenance_Checklist.map(x =>
      [x.operation, x.part, x.description, x.active ? 'Activo' : 'Inactivo']);
    el.innerHTML = cardNavigation29('Checklist de operación', dataTable29(['Operación','No Parte','Actividad','Estado'],rows) +
      '<div class="actionbar"><button class="btn soft" type="button" onclick="openChecklist30()">Configurar checklist</button></div>');
  } else if (conceptScreen === 'bsf-cycle') {
    const areas = new Map(bsfFlow.map(([code,,area]) => [code, area]));
    const rows = state.cpOperations.map(op => [op.code, op.name, op.area || areas.get(op.code) || '—', op.inputName, op.output, op.duration]);
    el.innerHTML = cardNavigation29('BSF Cycle', dataTable29(['Código','Operación','Área','Entrada','Salida','Duración'],rows) +
      '<div class="actionbar">' + screenAction29('Abrir Control Panel','control') + '</div>');
  } else if (conceptScreen === 'unavailable') {
    el.innerHTML = cardNavigation29(menuLabels29.get(shellScreen).name,
      '<div class="empty-state">Flujo por definir para esta función.</div>');
  } else {
    conceptBeforeNavigation29();
    if (conceptScreen === 'help') {
      el.insertAdjacentHTML('beforeend', cardNavigation29('Créditos de íconos',
        '<div class="actionbar"><a class="btn link" href="https://www.phylopic.org/images/8fa77803-7f94-4f0c-b2fd-66c2f70a03b4/hermetia-illucens" target="_blank" rel="noopener">Mosca adulta · Edwin Price, PhyloPic</a>' +
        '<a class="btn link" href="https://doi.org/10.7875/togopic.2024.133" target="_blank" rel="noopener">Larva · こひるか, DBCLS</a>' +
        '<a class="btn link" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0 · Adaptación a íconos de línea</a></div>'));
    }
  }
};

