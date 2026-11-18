function installRoles30() {
  initSecurity();
  if (securityData.rolePresets30) return;
  const add = (id,name,permissions) => {
    if (!securityData.profiles.some(row => row.id === id)) securityData.profiles.push({id,name,permissions,admin:false});
  };
  add('everyone30','Everyone',{home:1});
  for (const [id,module] of [['inventory','Inventario'],['buy','Compras'],['production','Producción']]) {
    const screens = [...menuLabels29.entries()].filter(([,item]) => item.trail[0] === module).map(([key]) => key);
    for (const level of [1,2,3]) add(id + '-n' + level + '-30',module + ' nivel ' + level,
      Object.fromEntries(screens.map(key => [key,level])));
  }
  securityData.positions30 ??= [
    {id:'pos-operator-30',name:'Operador',roles:['production-n2-30']},
    {id:'pos-inventory-30',name:'Consulta de inventario',roles:['inventory-n1-30']},
    {id:'pos-purchasing-30',name:'Compras',roles:['buy-n2-30']},
  ];
  securityData.rolePresets30 = true;
  persistSecurity();
}
const securityInit30 = initShell;
initShell = function () {
  securityInit30();
  installRoles30();
};
const previousLevel30 = levelFor;
levelFor = function (screen = shellScreen) {
  const parent = internalInventory30[screen];
  if (parent) return levelFor(parent);
  if (!shellSession) return previousLevel30(screen);
  const account = securityData.users.find(row => row.id === shellSession.accountId);
  if (shellSession.accountId && !account?.active) return 0;
  const original = securityData.profiles.find(row => row.id === (account?.profile || shellSession.profile));
  if (original?.admin) return 4;
  const position = securityData.positions30?.find(row => row.id === account?.position);
  const ids = position ? position.roles : (original ? [original.id] : []);
  const grants = securityData.profiles.filter(row => !row.admin && (row.id === 'everyone30' || ids.includes(row.id)));
  return Math.min(3,Math.max(screen === 'home' ? 1 : 0,...grants.map(row => row.permissions[screen] || 0)));
};
const profileList30 = profileScreen29;
profileScreen29 = function () {
  const profiles = profileList30().replace('Perfiles de seguridad','Roles de seguridad').replace('Nuevo perfil','Nuevo rol');
  const positions = securityData.positions30 || [];
  const rows = positions.map(position => '<tr><td>' + pmButton30(position.name,'editPosition30',position.id,'link') +
    '</td><td>' + esc(['Everyone',...position.roles.map(id => securityData.profiles.find(row => row.id === id)?.name)
      .filter(Boolean)].join(', ')) + '</td></tr>');
  return profiles + cardNavigation29('Puestos',
    '<p>Un puesto agrupa roles. El acceso de mayor nivel se aplica en cada pantalla.</p><div class="actionbar">' +
    pmButton30('Agregar','editPosition30','','primary') + '</div>' + table(['Puesto','Roles'],rows,'480px'));
};
function editPosition30(id) {
  if (!requireLevel(4,'profiles')) return;
  const item = (securityData.positions30 || []).find(row => row.id === id);
  const roles = securityData.profiles.filter(row => !row.admin && row.id !== 'everyone30');
  configDialog(item ? 'Puesto · ' + item.name : 'Nuevo puesto',
    '<form class="ops-dialog" data-id="' + esc(item?.id || '') + '" onsubmit="savePosition30(event)">' +
    operationsField29(field29('name','Nombre del puesto','text',{required:true}),item?.name) +
    '<fieldset class="ops-line engineering-centers"><legend>Roles</legend><span>Everyone · acceso base</span>' +
    roles.map(role => '<label class="ops-check"><input type="checkbox" name="role" value="' + esc(role.id) + '"' +
      (item?.roles.includes(role.id) ? ' checked' : '') + '> ' + esc(role.name) + '</label>').join('') +
    '</fieldset><div class="capture-actions"><button class="btn primary">Guardar</button></div></form>');
}
function savePosition30(event) {
  event.preventDefault();
  if (!requireLevel(4,'profiles')) return;
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const id = form.dataset.id || crypto.randomUUID();
  const rows = securityData.positions30;
  if (!name || rows.some(row => row.id !== id && row.name.toLowerCase() === name.toLowerCase()))
    return showMsg('Captura un nombre de puesto único.',true);
  const roles = [...form.querySelectorAll('[name="role"]:checked')].map(el => el.value)
    .filter(id => securityData.profiles.some(row => row.id === id && !row.admin));
  const index = rows.findIndex(row => row.id === id);
  if (index < 0) rows.push({id,name,roles});
  else rows[index] = {id,name,roles};
  persistSecurity();
  closeConfigDialog();
  showMsg('Puesto guardado.');
}
const editRoleBefore30 = editProfile29;
editProfile29 = function (id = '',focusScreen = '') {
  editRoleBefore30(id,focusScreen);
  const grid = document.querySelector('#configDialog .security-grid');
  if (!grid) return;
  const caption = document.getElementById('profileName')?.closest('label');
  if (caption?.firstChild) caption.firstChild.textContent = 'Nombre del rol';
  const moduleNames = [...new Set(screenRegistry.map(screen => screen.module))].sort();
  const picker = document.createElement('div');
  picker.className = 'actionbar';
  picker.innerHTML = operationsField29(choice29('roleModule','Filtrar por módulo',options29(moduleNames)),'',true);
  grid.before(picker);
  picker.querySelector('select').addEventListener('change',event => {
    for (const row of grid.querySelectorAll('tbody tr')) row.hidden = Boolean(event.target.value && row.cells[0].textContent !== event.target.value);
  });
  for (const select of grid.querySelectorAll('select[data-permission]')) {
    if (select.value === '4') select.value = '3';
    select.querySelector('[value="4"]')?.remove();
    if (!id) select.value = '0';
  }
}
const saveRoleBefore30 = saveProfile29;
saveProfile29 = function (id,apply) {
  if (id === 'everyone30' && document.getElementById('profileAdmin')?.checked)
    return showMsg('Everyone conserva acceso base y no puede ser administrador.',true);
  saveRoleBefore30(id,apply);
};

const editUserBefore30 = editUser29;
editUser29 = function (id = '') {
  editUserBefore30(id);
  const select = document.getElementById('userProfile');
  if (!select) return;
  const user = securityData.users.find(row => row.id === id);
  const positions = (securityData.positions30 || []).map(row => [row.id,row.name]);
  select.closest('label').insertAdjacentHTML('afterend',operationsField29(choice29('userPosition30','Puesto (opcional)',positions),user?.position));
  const position = document.querySelector('[name="userPosition30"]');
  position.options[0].textContent = 'Usar rol directo';
  position.addEventListener('change',() => {
    if (position.value && securityData.profiles.find(row => row.id === select.value)?.admin) select.value = 'everyone30';
  });
};
saveUser29 = async function (id,apply) {
  if (!requireLevel(4,'users')) return;
  const input = name => document.getElementById(name).value;
  const old = securityData.users.find(row => row.id === id);
  const email = input('userEmail').trim().toLowerCase();
  const name = input('userName').trim();
  const company = input('userCompany').trim();
  const password = input('userPassword');
  const profile = input('userProfile');
  const active = document.getElementById('userActive').checked;
  const position = document.querySelector('[name="userPosition30"]')?.value || '';
  const admin = securityData.profiles.find(row => row.id === profile)?.admin;
  if (!name || !company || !/^\S+@\S+\.\S+$/.test(email) || securityData.users.some(row => row.id !== id && row.email === email))
    return showMsg('Revisa el nombre, la compañía y el correo único.',true);
  if ((!old || password) && password.length < 8) return showMsg('La contraseña debe tener al menos 8 caracteres.',true);
  if (admin && position) return showMsg('Un administrador usa el rol directo, sin puesto.',true);
  const otherAdmin = securityData.users.some(row => row.id !== id && row.active &&
    securityData.profiles.find(role => role.id === row.profile)?.admin);
  if (!otherAdmin && (!admin || !active)) return showMsg('Debe quedar un usuario administrador activo.',true);
  const updated = {...old,id:id || 'U-' + crypto.randomUUID(),name,email,company,profile,position,active,
    ...(password ? await passwordRecord(password) : {})};
  const index = securityData.users.findIndex(row => row.id === updated.id);
  if (index < 0) securityData.users.push(updated);
  else securityData.users[index] = updated;
  persistSecurity();
  if (apply) editUser29(updated.id);
  else closeConfigDialog();
  showMsg('Usuario guardado.');
};
const usersBefore30 = usersScreen29;
usersScreen29 = function () {
  const doc = document.createElement('div');
  doc.innerHTML = usersBefore30();
  const header = doc.querySelector('thead tr');
  if (!header) return doc.innerHTML;
  const th = document.createElement('th');
  th.textContent = 'Puesto';
  header.insertBefore(th,header.cells[4]);
  for (const [index,row] of [...doc.querySelectorAll('tbody tr')].entries()) {
    const position = securityData.positions30?.find(item => item.id === securityData.users[index]?.position);
    row.insertCell(4).textContent = position?.name || '—';
  }
  const add=doc.querySelector('.page-intro button');
  return cardNavigation29('Usuarios',
    '<div class="actionbar">'+(add?.outerHTML || '')+'</div>'+
    (doc.querySelector('.table-wrap')?.outerHTML || ''));
};

