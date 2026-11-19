// Menú e iconos aprobados en la maqueta de Sites.
const menuApproved29 = (() => {
const slug=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const app=(name,id=slug(name))=>({name,id,kind:'app'});
const section=(name,items)=>({name,id:slug(name),kind:'section',items});
const modules=[
 {id:'bioingenieria',name:'Bioingeniería',icon:'larva',items:[
   app('BOM'),app('BSF Cycle'),app('Operations'),app('Parámetros'),app('No Parte','parts'),app('Process Routing'),app('Work Centers'),
 ]},
 {id:'calidad',name:'Calidad',icon:'quality',items:[app('Checklist')]},
 {id:'compras',name:'Compras',icon:'purchasing',items:[app('OC'),app('Proveedores'),app('Recibo OC')]},
 {id:'costos',name:'Costos',icon:'costs',items:[app('Cost Structure')]},
 {id:'inventario',name:'Inventario',icon:'inventory',items:[
   app('Contenedores (Move / Split / Merge)','contenedores'),app('Inventario'),app('Lotes'),app('Trazabilidad'),app('Ubicaciones'),app('Unidades'),
 ]},
 {id:'mantenimiento',name:'Mantenimiento',icon:'maintenance',items:[app('Calendario PM'),app('Checklist PM'),app('Equipos')]},
 {id:'planeacion',name:'Planeación',icon:'planning',items:[app('MRP'),app('PRP'),app('Job Manager'),app('Capacity Planning')]},
 {id:'plataforma',name:'Plataforma',icon:'settings',items:[
   section('Configuración',[app('Empresa','empresa'),app('Etiquetas','etiquetas'),app('Settings'),app('Setup Tables')]),
   section('Gobierno',[app('Auditoría'),app('Continuidad'),app('Fase cero'),app('Firmas'),app('Integraciones'),app('Validación')]),
   section('Seguridad',[app('Roles'),app('Usuarios')]),
 ]},
 {id:'produccion',name:'Producción',icon:'production',items:[
   app('Control Panel'),app('Bioconversión'),app('Reproducción'),app('Postproceso'),app('Empaque'),
 ]},
 {id:'reportes',name:'Reportes',icon:'reports',items:[]},
 {id:'ventas',name:'Ventas',icon:'shipping',items:[app('Envíos'),app('Pedidos')]},
];
const shortcuts=[
 ['produccion/control-panel','control-desk'],
 ['produccion/bioconversion','bsf-larva'],
 ['produccion/reproduccion','bsf-adult'],
 ['produccion/postproceso','postprocess'],
 ['produccion/empaque','inventory'],
 ['reportes','reports'],
];
const paths={
 home:'M3 10l9-7 9 7M5 9v11h14V9M9 20v-7h6v7',
 larva:'M2.5 14.5c1-3.4 2.8-5.8 6-7.4 3.5-1.8 8.3-1.8 11.2.8 2.4 2.2 2.8 5.2 1 7-1.5 1.5-3.2.9-4.5-.7-1.4-1.7-3.1-2.4-5.4-1.8-2.6.7-3.6 3.8-5.4 4.9-1.5 1-3.4-.9-2.9-2.8zM5.5 10.2l3 3.8M9.5 6.7l2.6 5.6M14.3 6l.9 7.1M18.5 7.2l-1 8M20.2 12.2h.01',
 'bsf-larva':'M3.1 4.8c-1-.4-1.2-1.2-.1-1.6 3.8-1.3 8.2.4 11.5 3.2 3.2 2.8 5 6.7 6.5 12.4.7 2.7-2.4 3.9-4 2-1.3-1.5-1.6-5.8-3.7-8.6-2.2-3.1-4.7-4.5-7.4-5.5-.9-.4-2.2-1-2.8-1.9zM7.2 3q-1 1.9-.6 4M11.3 4.4q-1.6 1.7-1.6 4.1M14.9 6.8q-2 .9-2.6 4.1M17.5 10.1q-2.4.7-3.1 4.1M19.2 13.7q-2.5.7-3.5 3.5M20.5 17.5q-2.1.2-3.9 2.5',
 'bsf-adult':'M10.8 5.1 8.7 2.8m3.9 2.3 1.6-3.4M9.5 8.6 7.1 7.8l-1-2m8.3 2.8 2.5-.9 1-2M9.1 12l-4.5.3m10.3-.3 4.5.3M9.8 15.8 6.5 20m7.7-4.2 3.3 4.2M12 5c-2.1 0-3.3 1.1-3 2.6.2 1 1.3 1.3 1.9.9-1.8 1.2-2.2 3.1-1.8 5.6.3 3.2 1 6.5 2.9 8 1.9-1.5 2.6-4.8 2.9-8 .4-2.5 0-4.4-1.8-5.6.6.4 1.7.1 1.9-.9.3-1.5-.9-2.6-3-2.6zM10 11.8c.3 2.2 1.2 4.7 2 6.1.8-1.4 1.7-3.9 2-6.1',
 inventory:'M3 7l9-5 9 5v11l-9 4-9-4zM3 7l9 5 9-5M12 12v10M7 4.5l10 5',
 planning:'M5 4h14v17H5zM8 2v4M16 2v4M5 9h14M8 13h3M8 17h6',
 production:'M3 21V9l6 4V7l6 4V3h5v18zM6 17h1M11 17h1M16 17h1',
 'control-desk':'M4 4h16a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 18H4a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4 4zM9 21h6m-3-3v3M6 8h12M6 12h12M9 7v2m6 2v2',
 quality:'M9 3H5v19h14V3h-4M9 2h6v4H9zM8 13l3 3 5-6',
 maintenance:'M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 3-3-3z',
 shipping:'M2 5h13v12H2zM15 10h4l3 4v3h-7M5 17a2 2 0 1 0 4 0M16 17a2 2 0 1 0 4 0',
 purchasing:'M3 3h2l3 12h11l3-9H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2',
 costs:'M12 2v20m5-15H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H7',
 reports:'M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h8',
 settings:'M10.06 4.24L10.26 2.15L13.74 2.15L13.94 4.24L16.12 5.14L17.74 3.81L20.19 6.26L18.86 7.88L19.76 10.06L21.85 10.26L21.85 13.74L19.76 13.94L18.86 16.12L20.19 17.74L17.74 20.19L16.12 18.86L13.94 19.76L13.74 21.85L10.26 21.85L10.06 19.76L7.88 18.86L6.26 20.19L3.81 17.74L5.14 16.12L4.24 13.94L2.15 13.74L2.15 10.26L4.24 10.06L5.14 7.88L3.81 6.26L6.26 3.81L7.88 5.14ZM15.25 12a3.25 3.25 0 1 1-6.5 0 3.25 3.25 0 1 1 6.5 0z',
 arrow:'M9 5l7 7-7 7',
 back:'M19 12H5m6-6-6 6 6 6',
 menu:'M4 6h16M4 12h16M4 18h16',
 recent:'M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 1 1 19 0zM12 6.5v5.5l3.5 2',
 favorites:'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.56L12 17.52l-5.88 3.1 1.12-6.56-4.76-4.64 6.58-.96z',
 help:'M21.5 12a9.5 9.5 0 1 1-19 0 9.5 9.5 0 1 1 19 0zM9.2 9a2.8 2.8 0 0 1 5.6 0c0 2-2.8 2.5-2.8 4.3m0 3.6h.01',
 postprocess:'M4 5h16l-6 8v5l-4 2v-7zM8 8h8',
};
const icon=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.home}"/></svg>`;
const arrow=()=>icon('arrow').replace('<svg ','<svg class="arrow" ');
const href=segments=>'#/'+segments.join('/');
return {modules, shortcuts, icon, arrow};
})();
