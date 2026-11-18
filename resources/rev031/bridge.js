// Authentication, permissions, persistence and native sections belong to Laravel.
const copiedScreen40 = new URL(location.href);
const copiedHash40 = copiedScreen40.searchParams.get('_mes_screen');
if (copiedHash40 && copiedHash40.startsWith('#/')) {
 copiedScreen40.hash=copiedHash40;copiedScreen40.searchParams.delete('_mes_screen');
 history.replaceState(null,'',copiedScreen40.href);
}
shellSession=window.insectLaravel.session;
sessionStorage.setItem(SESSION_KEY,JSON.stringify(shellSession));
securityData=window.insectLaravel.security;
initSecurity=function(){securityData=window.insectLaravel.security;};
persistSecurity=function(){};
loginScreen=function(){};
levelFor=function(screen=shellScreen){return window.insectLaravel.levels[screen]??window.insectLaravel.levels[inheritedAccess29[screen]]??(window.insectLaravel.isAdministrator?4:0);};
currentProfile=function(){return securityData.profiles[0];};
logoutDemo=function(){window.dispatchEvent(new Event('insectmes:logout'));};
const nativeScreens031={audit:'/mes/audit',continuidad:'/mes/continuity','fase-cero':'/mes/governance',firmas:'/mes/validation',validacion:'/mes/validation',integraciones:'/mes/integrations',users:'/mes/users',profiles:'/mes/roles'};
const siteNavigate031=navigateScreen;
navigateScreen=function(screen,...args){
 if(nativeScreens031[screen]){location.href=nativeScreens031[screen];return;}
 if(window.insectLaravel.booted&&window.insectLaravel.nativePage){location.href='/dashboard#/'+encodeURIComponent(screen);return;}
 return siteNavigate031(screen,...args);
};
const siteRenderMenu031=renderMenuNode29;
renderMenuNode29=function(node){
 if(node.id==='plataforma'||node.id==='gobierno'||node.id==='seguridad')return '';
 return siteRenderMenu031(node);
};
const siteMenuTree031=renderMenuTree29;
renderMenuTree29=function(){
 siteMenuTree031();
 const config=window.insectLaravel.nativeNavigation;
 const nav=document.getElementById('nav');
 const entries=config.filter(item=>item.id!=='users');
 if(entries.length)nav.insertAdjacentHTML('beforeend','<details class="menu29-group native-govern"><summary>'+menuApproved29.icon('quality')+'<span>Gobernar</span>'+menuApproved29.arrow()+'</summary><div class="menu29-children">'+entries.map(item=>'<a class="menu29-link" href="'+esc(item.href)+'" data-native-href="'+esc(item.href)+'"><span>'+esc(item.name)+'</span></a>').join('')+'</div></details>');
 for(const link of nav.querySelectorAll('[data-native-href]')){
  if(link.getAttribute('href')===location.pathname){link.setAttribute('aria-current','page');const section=link.closest('details');if(section)section.open=true;}
 }
};
document.getElementById('sidebar').addEventListener('click',event=>{
 const link=event.target.closest('[data-native-href]');if(!link)return;
 event.preventDefault();event.stopImmediatePropagation();location.href=link.dataset.nativeHref;
},true);
const siteShell031=renderShell;
renderShell=function(){
 const controls=document.getElementById('laravel-native-controls');
 const appearance=document.getElementById('laravel-appearance-control');
 if(controls)controls.remove();
 if(appearance)appearance.remove();
 siteShell031();
 const brand=document.querySelector('.menu29-bar .menu29-wordmark');
 if(brand){
  const home=document.createElement('a');
  home.className=brand.className;home.href='/dashboard#/home';
  home.setAttribute('aria-label','InsectMES, Inicio');home.innerHTML=brand.innerHTML;
  home.addEventListener('click',event=>{
   if(location.pathname==='/dashboard'){
    event.preventDefault();navigateScreen('home');
   }
  });
  brand.replaceWith(home);
 }
 document.querySelector('.session-exit')?.remove();
 if(controls)document.querySelector('.menu29-tools')?.append(controls);
 if(appearance){const tools=document.querySelector('.menu29-tools');tools?.insertBefore(appearance,tools.querySelector('.assistant-launch30')||tools.querySelector('.goto-wrap'));}
 if(window.insectLaravel.nativePage){const title=document.getElementById('pageTitle');if(title)title.textContent=window.insectLaravel.nativeTitle||nativeScreens031Title();}
 window.dispatchEvent(new Event('insectmes:shell'));
};
function nativeScreens031Title(){return {'/mes/governance':'Fase 0','/mes/validation':'Validación y firmas','/mes/integrations':'Integraciones','/mes/audit':'Auditoría','/mes/continuity':'Continuidad','/mes/users':'Usuarios','/mes/roles':'Roles','/settings/appearance':'Apariencia','/settings/profile':'Perfil','/settings/security':'Seguridad'}[location.pathname]||'InsectMES';}
const siteApp031=renderApp;
renderApp=function(){
 const content=window.insectLaravel.nativePage?document.getElementById('laravel-native-page'):null;
 if(content)content.remove();
 siteApp031();
 if(window.insectLaravel.nativePage){
  const main=document.querySelector('#rev031-application .main')||document.querySelector('.app .main');
  if(main){for(const view of main.querySelectorAll('.view'))view.style.display='none';const pane=content||document.createElement('div');pane.id='laravel-native-page';main.append(pane);window.dispatchEvent(new Event('insectmes:shell'));}
 }
};
// Libraries remain local to this project, including PDF/Excel/QR exports.
const loadLibrary031=typeof loadExportLibrary30==='function'?loadExportLibrary30:null;
if(loadLibrary031)loadExportLibrary30=function(name){
 if(document.querySelector('script[data-laravel-vendor="'+name+'"]'))return Promise.resolve();
 return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/rev031/assets/vendor/'+name;script.dataset.laravelVendor=name;script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar '+name));document.head.append(script);});
};
// Native identity is authoritative; prototype account/permission editors cannot change it.
for(const name of ['editUser29','saveUser29','editProfile29','saveProfile29','editSecurityUser30','saveSecurityUser30']){
 if(typeof window[name]==='function')window[name]=()=>{location.href='/mes/users';};
}
document.getElementById('demoLogin')?.remove();
window.addEventListener('insectmes:navigate',event=>{
 if(typeof event.detail==='string')navigateScreen(event.detail);
});
