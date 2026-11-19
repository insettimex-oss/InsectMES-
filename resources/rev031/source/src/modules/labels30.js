/* Label catalogue, visual layouts in millimetres and local vector PDF output. */
const labelFields30={literal:'Texto fijo',serial:'Serial',part:'No Parte',description:'Descripción',quantity:'Cantidad',lot:'Lote',location:'Ubicación',date:'Fecha',company:'Empresa'};
let labelDraft30=null,labelSelected30='',labelElement30='',labelCatalogSelection30='';
const labelsInitBefore30=initConcept;
initConcept=function(){
  labelsInitBefore30();
  state.labels30??={templates:[defaultLabel30()],assignments:[],defaultCode:'ETI-014'};
};
screenRegistry.push({id:'label-designer',name:'Diseñador de etiquetas',module:'Plataforma / Configuración',concept:'label-designer30'});
inheritedAccess29['label-designer']='labels';
function defaultLabel30(){return {code:'ETI-014',name:'Inventario QR',width:36,height:24,active:true,elements:[
  {id:'brand',type:'text',field:'literal',text:'INSETTI',x:1,y:1,w:18,h:3,font:7,bold:true},
  {id:'part',type:'text',field:'part',prefix:'NP ',x:1,y:5,w:18,h:3,font:6,bold:true},
  {id:'serial',type:'text',field:'serial',x:1,y:9,w:18,h:3,font:6,bold:true},
  {id:'qty',type:'text',field:'quantity',x:1,y:13,w:18,h:3,font:6},
  {id:'lot',type:'text',field:'lot',prefix:'Lote ',x:1,y:17,w:18,h:3,font:5},
  {id:'location',type:'text',field:'location',x:1,y:21,w:34,h:2,font:5},
  {id:'qr',type:'qr',field:'serial',x:21,y:3,w:14,h:14},
]};}
function labelTemplate30(code){return state.labels30.templates.find(row=>row.code===code);}
function labelForContainer30(row){
  const operation=row.operationCode||row.operation||((state.operationRuns||[]).find(run=>run.serial===row.serial)?.operation);
  const assignments=state.labels30.assignments;
  const candidates=[assignments.find(a=>a.scope==='operation'&&a.code===operation)?.label,assignments.find(a=>a.scope==='part'&&a.code===row.part)?.label,state.labels30.defaultCode];
  const result=candidates.map(labelTemplate30).find(template=>template?.active);
  if(!result)throw Error('Asigna una etiqueta activa al No Parte o a la operación.');
  return result;
}
function labelSample30(){return state.serials.find(row=>row.serial===labelSelected30)||state.serials[0]||{serial:'BSF000001',part:'BSF002',desc:'Huevos',qtyCurrent:25,unit:'g',lot:'',location:''};}
function labelValue30(element,row){
  const values={serial:row.serial,part:row.part,description:row.desc||getPart(row.part)?.desc,quantity:number34(row.qtyCurrent)+' '+(row.unit||''),lot:row.lot,location:row.location,date:new Date().toLocaleDateString('es-MX'),company:shellSession?.company||'Insetti',literal:element.text};
  return (element.prefix||'')+String(values[element.field]??'');
}
function labelQR30(value){const qr=qrcode(0,'M');qr.addData(String(value),'Byte');qr.make();return qr;}
const labelMeasureCanvas30=document.createElement('canvas');
function labelFittedText30(value,element){
  const ctx=labelMeasureCanvas30.getContext('2d');ctx.font=(element.bold?'bold ':'')+(element.font||6)+'px Arial';
  const max=element.w/.352778;let text=String(value);
  if(ctx.measureText(text).width<=max)return text;
  while(text.length&&ctx.measureText(text+'...').width>max)text=text.slice(0,-1);
  return text+'...';
}
function labelElementSVG30(element,row){
  if(element.type==='qr'){
    if(typeof qrcode==='undefined')return '<rect x="'+element.x+'" y="'+element.y+'" width="'+element.w+'" height="'+element.h+'" fill="#e9efeb"/>';
    const qr=labelQR30(labelValue30(element,row)),count=qr.getModuleCount(),size=Math.min(element.w,element.h),unit=size/(count+8);let path='';
    for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))path+='M'+(element.x+(x+4)*unit)+' '+(element.y+(y+4)*unit)+'h'+unit+'v'+unit+'h-'+unit+'z';
    return '<rect x="'+element.x+'" y="'+element.y+'" width="'+element.w+'" height="'+element.h+'" fill="white"/><path d="'+path+'" fill="black" shape-rendering="crispEdges"/>';
  }
  if(element.type==='line')return '<rect x="'+element.x+'" y="'+element.y+'" width="'+element.w+'" height="'+element.h+'" fill="black"/>';
  return '<text x="'+element.x+'" y="'+(element.y+(element.font||6)*.352778*.82)+'" font-family="Arial, sans-serif" font-size="'+((element.font||6)*.352778)+'" font-weight="'+(element.bold?'700':'400')+'" fill="black">'+esc(labelFittedText30(labelValue30(element,row),element))+'</text>';
}
function labelSVG30(template,row,editing=false){return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+template.width+' '+template.height+'" role="img" aria-label="Etiqueta '+esc(template.code)+'"><rect width="100%" height="100%" fill="white"/>'+template.elements.map(element=>'<g '+(editing?'data-label-element30="'+esc(element.id)+'" tabindex="0" role="button" aria-label="'+esc(element.type==='qr'?'QR':labelFields30[element.field]||'Línea')+'"':'')+'>'+labelElementSVG30(element,row)+(editing?'<rect class="label-hit30 '+(labelElement30===element.id?'is-selected':'')+'" x="'+element.x+'" y="'+element.y+'" width="'+element.w+'" height="'+element.h+'"/>':'')+'</g>').join('')+'</svg>';}
function renderLabels30(){
  const rows=state.labels30.templates.map(template=>'<tr data-label-row30="'+esc(template.code)+'" onclick="selectLabelCatalog30(this.dataset.labelRow30)"><td><input type="radio" name="labelSelection" aria-label="Seleccionar '+esc(template.code)+'" '+(labelCatalogSelection30===template.code?'checked':'')+'></td><td><a href="#/label-designer" data-label-code30="'+esc(template.code)+'" onclick="event.stopPropagation();event.preventDefault();openLabelDesigner30(this.dataset.labelCode30)">'+esc(template.code)+'</a></td><td>'+esc(template.name)+'</td><td>'+template.width+'</td><td>'+template.height+'</td><td>'+(template.active?'Sí':'No')+'</td><td>'+(state.labels30.defaultCode===template.code?'Sí':'')+'</td><td>'+state.labels30.assignments.filter(a=>a.label===template.code).length+'</td></tr>');
  document.getElementById('view-'+currentView).innerHTML=cardNavigation29('Etiquetas','<form class="ops-filters" onsubmit="event.preventDefault()"><input class="input" name="query" placeholder="Buscar" aria-label="Buscar etiquetas"><button class="btn primary" type="submit">Buscar</button></form><div class="actionbar">'+(levelFor('labels')>=2?'<button class="btn primary" onclick="openLabelDesigner30()">Agregar</button><button class="btn soft" data-label-edit30 '+(!labelCatalogSelection30?'disabled':'')+' onclick="openLabelDesigner30(labelCatalogSelection30)">Editar</button><button class="btn danger" data-label-delete30 '+(!labelCatalogSelection30||levelFor('labels')<3?'disabled':'')+' onclick="deleteLabel30()">Eliminar</button>':'')+'<button class="btn soft" onclick="exportLabels30()">Exportar</button>'+(levelFor('labels')>=2?'<button class="btn soft" onclick="openLabelImport30()">Importar diseño</button>':'')+'</div>'+resultsTable30(['','Código','Nombre','Ancho (mm)','Alto (mm)','Activo','Predeterminada','Asignaciones'],rows,'760px'));
}
function selectLabelCatalog30(code){labelCatalogSelection30=code;const view=document.getElementById('view-'+currentView);view.querySelectorAll('tbody tr').forEach(row=>{const checked=row.querySelector('[data-label-code30]')?.dataset.labelCode30===code;row.querySelector('input[type=radio]').checked=checked;row.classList.toggle('selected',checked);});const edit=view.querySelector('[data-label-edit30]'),del=view.querySelector('[data-label-delete30]');if(edit)edit.disabled=levelFor('labels')<2;if(del)del.disabled=levelFor('labels')<3;}
function openLabelDesigner30(code=''){
  if(!requireLevel(2,'labels'))return;
  labelDraft30=structuredClone(labelTemplate30(code)||defaultLabel30());
  if(!code){let n=1;while(labelTemplate30('ETI-'+String(n).padStart(3,'0')))n++;labelDraft30.code='ETI-'+String(n).padStart(3,'0');labelDraft30.name='';}
  labelDraft30.previousCode=code;labelElement30=labelDraft30.elements[0]?.id||'';navigateScreen('label-designer');
}
function labelProperty30(label,key,value,type='number',attrs=''){return '<label>'+label+'<input class="input" type="'+type+'" value="'+esc(value??'')+'" '+attrs+' onchange="setLabelElement30(\''+key+'\',this.'+(type==='checkbox'?'checked':'value')+')"></label>';}
function renderLabelDesigner30(){
  if(!labelDraft30){navigateScreen('labels');return;}
  const t=labelDraft30;
  document.getElementById('view-'+currentView).innerHTML=cardNavigation29('Diseñador de etiquetas','<form id="label-designer-form30" onsubmit="event.preventDefault();saveLabelDesign30(false)"><div class="label-meta30"><label>Código <span class="req">*</span><input class="input" name="code" value="'+esc(t.code)+'" required></label><label>Nombre <span class="req">*</span><input class="input" name="name" value="'+esc(t.name)+'" required></label><label>Ancho (mm)<input class="input" name="width" type="number" min="10" max="210" step=".1" value="'+t.width+'" required onchange="resizeLabel30(this.form)"></label><label>Alto (mm)<input class="input" name="height" type="number" min="10" max="297" step=".1" value="'+t.height+'" required onchange="resizeLabel30(this.form)"></label><label class="label-check30"><input type="checkbox" name="active" '+(t.active?'checked':'')+'>Activo</label><label class="label-check30"><input type="checkbox" name="defaultLabel" '+(state.labels30.defaultCode===t.previousCode?'checked':'')+'>Predeterminada</label></div><div class="actionbar"><button type="button" class="btn soft" onclick="addLabelElement30(\'text\')">Agregar texto</button><button type="button" class="btn soft" onclick="addLabelElement30(\'qr\')">Agregar QR</button><button type="button" class="btn soft" onclick="addLabelElement30(\'line\')">Agregar línea</button><button type="button" class="btn danger" onclick="removeLabelElement30()">Eliminar elemento</button><button type="button" class="btn soft" onclick="previewLabelDraft30()">Vista PDF</button><button type="button" class="btn soft" onclick="downloadLabelDesign30()">Descargar diseño</button></div><div class="label-studio30"><aside class="label-layers30"><h3>Elementos</h3><div id="label-layers-list30"></div></aside><section class="label-workbench30"><div class="label-ruler30" id="label-size30"></div><div id="label-canvas30"></div></section><aside id="label-properties30" class="label-properties30"></aside></div><div class="capture-actions"><button type="button" class="btn soft" onclick="history.back()">Cancelar</button><button type="button" class="btn soft" onclick="saveLabelDesign30(true)">Aplicar</button><button type="submit" class="btn primary">Guardar</button></div></form><div class="label-assignments30"><h3>Asignaciones</h3><form onsubmit="event.preventDefault();assignLabel30(this)"><label>Nivel<select class="select" name="scope" onchange="labelAssignmentChoices30(this.form)"><option value="part">No Parte</option><option value="operation">Operación</option></select></label><div id="label-assignment-search30"></div><button class="btn soft" type="submit">Asignar</button></form><div id="label-assignments-grid30"></div></div>');
  renderLabelCanvas30();renderLabelProperties30();labelAssignmentChoices30(document.querySelector('.label-assignments30 form'));renderLabelAssignments30();
  loadExportLibrary30('qrcode.js').then(()=>{if(shellScreen==='label-designer')renderLabelCanvas30();}).catch(()=>showMsg('No se pudo cargar el generador QR.',true));
}
function resizeLabel30(form){const width=Number(form.elements.width.value),height=Number(form.elements.height.value);if(width>=10&&width<=210&&height>=10&&height<=297){labelDraft30.width=width;labelDraft30.height=height;renderLabelCanvas30();}}
function renderLabelCanvas30(){
  const canvas=document.getElementById('label-canvas30');if(!canvas||!labelDraft30)return;
  document.getElementById('label-size30').textContent=labelDraft30.width+' × '+labelDraft30.height+' mm';
  canvas.style.aspectRatio=labelDraft30.width+'/'+labelDraft30.height;canvas.innerHTML=labelSVG30(labelDraft30,labelSample30(),true);
  document.getElementById('label-layers-list30').innerHTML=labelDraft30.elements.map(e=>'<button type="button" data-element30="'+esc(e.id)+'" class="'+(e.id===labelElement30?'is-selected':'')+'">'+esc(e.type==='qr'?'QR · '+labelFields30[e.field]:e.type==='line'?'Línea':labelFields30[e.field])+'</button>').join('');
  for(const button of document.querySelectorAll('[data-element30]'))button.onclick=()=>selectLabelElement30(button.dataset.element30);
  for(const group of canvas.querySelectorAll('[data-label-element30]')){
    group.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectLabelElement30(group.dataset.labelElement30);}if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();labelElement30=group.dataset.labelElement30;const e=labelDraft30.elements.find(e=>e.id===labelElement30);e.x=Math.max(0,Math.min(labelDraft30.width-e.w,e.x+(event.key==='ArrowRight'?.25:event.key==='ArrowLeft'?-.25:0)));e.y=Math.max(0,Math.min(labelDraft30.height-e.h,e.y+(event.key==='ArrowDown'?.25:event.key==='ArrowUp'?-.25:0)));renderLabelCanvas30();renderLabelProperties30();canvas.querySelector('[data-label-element30="'+labelElement30+'"]')?.focus();}};
    group.onpointerdown=event=>{
      event.preventDefault();const element=labelDraft30.elements.find(e=>e.id===group.dataset.labelElement30),rect=canvas.getBoundingClientRect(),start={x:event.clientX,y:event.clientY,ex:element.x,ey:element.y};labelElement30=element.id;
      const move=event=>{element.x=Number(Math.max(0,Math.min(labelDraft30.width-element.w,start.ex+(event.clientX-start.x)/rect.width*labelDraft30.width)).toFixed(2));element.y=Number(Math.max(0,Math.min(labelDraft30.height-element.h,start.ey+(event.clientY-start.y)/rect.height*labelDraft30.height)).toFixed(2));renderLabelCanvas30();};
      const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);renderLabelCanvas30();renderLabelProperties30();};
      document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});document.addEventListener('pointercancel',up,{once:true});renderLabelCanvas30();renderLabelProperties30();
    };
  }
}
function selectLabelElement30(id){labelElement30=id;renderLabelCanvas30();renderLabelProperties30();}
function renderLabelProperties30(){
  const target=document.getElementById('label-properties30'),e=labelDraft30.elements.find(e=>e.id===labelElement30);if(!target)return;
  if(!e){target.innerHTML='<h3>Propiedades</h3>';return;}
  target.innerHTML='<h3>Propiedades</h3>'+(e.type!=='line'?'<label>Dato<select class="select" onchange="setLabelElement30(\'field\',this.value)">'+Object.entries(labelFields30).filter(([key])=>e.type!=='qr'||['serial','part','lot'].includes(key)).map(([key,label])=>'<option value="'+key+'" '+(e.field===key?'selected':'')+'>'+label+'</option>').join('')+'</select></label>':'')+(e.field==='literal'?labelProperty30('Texto','text',e.text,'text'):e.type==='text'?labelProperty30('Prefijo','prefix',e.prefix||'','text'):'')+'<div class="label-positions30">'+labelProperty30('X (mm)','x',e.x,'number','min="0" step=".1"')+labelProperty30('Y (mm)','y',e.y,'number','min="0" step=".1"')+labelProperty30('Ancho (mm)','w',e.w,'number','min=".2" step=".1"')+labelProperty30('Alto (mm)','h',e.h,'number','min=".2" step=".1"')+'</div>'+(e.type==='text'?labelProperty30('Fuente (pt)','font',e.font,'number','min="4" max="36" step=".5"')+'<label class="label-check30"><input type="checkbox" '+(e.bold?'checked':'')+' onchange="setLabelElement30(\'bold\',this.checked)">Negrita</label>':'');
}
function setLabelElement30(key,value){const e=labelDraft30.elements.find(e=>e.id===labelElement30);if(!e)return;if(['x','y','w','h','font'].includes(key)){value=Number(value);if(!Number.isFinite(value))return;}e[key]=value;if(e.type==='qr'&&['w','h'].includes(key))e.w=e.h=value;renderLabelCanvas30();if(key==='field')renderLabelProperties30();}
function addLabelElement30(type){const e={id:'e'+Date.now(),type,x:1,y:1,w:type==='qr'?12:15,h:type==='qr'?12:type==='line'?.3:3,...(type==='text'?{field:'literal',text:'Texto',font:6}:type==='qr'?{field:'serial'}:{})};labelDraft30.elements.push(e);selectLabelElement30(e.id);}
function removeLabelElement30(){labelDraft30.elements=labelDraft30.elements.filter(e=>e.id!==labelElement30);labelElement30=labelDraft30.elements[0]?.id||'';renderLabelCanvas30();renderLabelProperties30();}
function validateLabel30(template){
  if(!template||typeof template.code!=='string'||!template.code.trim()||typeof template.name!=='string'||!template.name.trim())throw Error('Completa código y nombre.');
  if(!Number.isFinite(template.width)||!Number.isFinite(template.height)||template.width<10||template.width>210||template.height<10||template.height>297)throw Error('Revisa las dimensiones de la etiqueta.');
  if(!Array.isArray(template.elements)||!template.elements.length||template.elements.length>50)throw Error('El diseño debe tener entre 1 y 50 elementos.');
  const ids=new Set();for(const e of template.elements){
    if(!['text','qr','line'].includes(e.type)||!e.id||!/^[a-zA-Z0-9_-]+$/.test(e.id)||ids.has(e.id)||![e.x,e.y,e.w,e.h].every(Number.isFinite)||e.x<0||e.y<0||e.w<=0||e.h<=0||e.x+e.w>template.width+.01||e.y+e.h>template.height+.01)throw Error('Hay un elemento fuera de la etiqueta o con medidas inválidas.');
    ids.add(e.id);if(e.type!=='line'&&!Object.hasOwn(labelFields30,e.field))throw Error('El campo del elemento no existe.');
    if(e.type==='text'&&(!Number.isFinite(e.font)||e.font<4||e.font>36||e.h<e.font*.352778))throw Error('Ajusta el alto o la fuente del texto.');
    if(e.type==='qr'&&(Math.abs(e.w-e.h)>.01||e.w<10))throw Error('El QR debe ser cuadrado y medir al menos 10 mm.');
  }
  return template;
}
function currentLabelDraft30(){const f=document.getElementById('label-designer-form30');const t=structuredClone(labelDraft30);if(f){t.code=f.elements.code.value.trim();t.name=f.elements.name.value.trim();t.active=f.elements.active.checked;t.width=Number(f.elements.width.value);t.height=Number(f.elements.height.value);}return validateLabel30(t);}
function saveLabelDesign30(stay){
  if(!requireLevel(2,'labels'))return;
  try{
    const t=currentLabelDraft30(),old=labelDraft30.previousCode;
    if(state.labels30.templates.some(row=>row.code!==old&&row.code.toLowerCase()===t.code.toLowerCase()))throw Error('El código ya existe.');
    const makeDefault=document.getElementById('label-designer-form30').elements.defaultLabel.checked;
    if(makeDefault&&!t.active)throw Error('La etiqueta predeterminada debe estar activa.');
    saveReceivingState30(()=>{delete t.previousCode;const index=state.labels30.templates.findIndex(row=>row.code===old);if(index<0)state.labels30.templates.push(t);else state.labels30.templates[index]=t;state.labels30.assignments.forEach(a=>{if(a.label===old)a.label=t.code;});if(makeDefault)state.labels30.defaultCode=t.code;else if(state.labels30.defaultCode===old)state.labels30.defaultCode='';});
    labelDraft30={...structuredClone(t),previousCode:t.code};labelCatalogSelection30=t.code;
    if(!stay)history.back();showMsg('Etiqueta guardada.');
  }catch(error){showMsg(error.message,true);}
}
function deleteLabel30(){
  if(!requireLevel(3,'labels'))return;const code=labelCatalogSelection30;
  if(state.labels30.assignments.some(row=>row.label===code)||state.labels30.defaultCode===code||(state.labelPrints30||[]).some(row=>row.labels.includes(code)))return showMsg('La etiqueta tiene asignaciones o impresiones. Puedes inactivarla en el diseñador.',true);
  try{saveReceivingState30(()=>state.labels30.templates=state.labels30.templates.filter(row=>row.code!==code));labelCatalogSelection30='';renderApp();}catch{showMsg('No se pudo eliminar la etiqueta.',true);}
}
function labelAssignmentChoices30(form){const scope=form.elements.scope.value;document.getElementById('label-assignment-search30').innerHTML=scope==='part'?inventorySearchField30('label_assignment_code30','No Parte','','part',true):'<label>Operación<select class="select" name="operation" required><option value="">Seleccionar operación</option>'+engineeringData29().operations.filter(row=>row.active).map(row=>'<option value="'+esc(row.code)+'">'+esc(row.code+' · '+row.name)+'</option>').join('')+'</select></label>';installInventoryLookups30(form);}
function assignLabel30(form){
  if(!requireLevel(2,'labels'))return;
  if(!labelTemplate30(labelDraft30.previousCode))return showMsg('Guarda la etiqueta antes de asignarla.',true);
  const scope=form.elements.scope.value,code=scope==='part'?document.getElementById('label_assignment_code30').value.trim():form.elements.operation.value;
  if(scope==='part'?!getPart(code):!engineeringData29().operations.some(row=>row.code===code&&row.active))return showMsg('Selecciona un registro del catálogo.',true);
  try{saveReceivingState30(()=>{const old=state.labels30.assignments.find(a=>a.scope===scope&&a.code===code);if(old)old.label=labelDraft30.previousCode;else state.labels30.assignments.push({scope,code,label:labelDraft30.previousCode});});renderLabelAssignments30();showMsg('Asignación guardada.');}catch{showMsg('No se pudo guardar la asignación.',true);}
}
function renderLabelAssignments30(){const target=document.getElementById('label-assignments-grid30');if(!target)return;const rows=state.labels30.assignments.filter(a=>a.label===labelDraft30.previousCode);target.innerHTML=resultsTable30(['Nivel','Código','Nombre',''],rows.map(a=>'<tr><td>'+(a.scope==='part'?'No Parte':'Operación')+'</td><td>'+esc(a.code)+'</td><td>'+esc(a.scope==='part'?getPart(a.code)?.desc:engineeringData29().operations.find(row=>row.code===a.code)?.name)+'</td><td><button type="button" class="btn danger" data-label-unassign30="'+esc(a.scope+'|'+a.code)+'">Eliminar</button></td></tr>'),'450px');for(const b of target.querySelectorAll('[data-label-unassign30]'))b.onclick=()=>{if(!requireLevel(2,'labels'))return;const [scope,code]=b.dataset.labelUnassign30.split('|');try{saveReceivingState30(()=>state.labels30.assignments=state.labels30.assignments.filter(a=>!(a.scope===scope&&a.code===code)));renderLabelAssignments30();}catch{showMsg('No se pudo quitar la asignación.',true);}};}
function exportLabels30(){if(!requireLevel(1,'labels'))return;exportRows('etiquetas.csv',['Código','Nombre','Ancho (mm)','Alto (mm)','Activo'],state.labels30.templates.map(t=>[t.code,t.name,t.width,t.height,t.active?'Sí':'No']));}
function downloadLabelDesign30(){try{const t=currentLabelDraft30();downloadExport30(new Blob([JSON.stringify({format:'InsectMES-label-v1',template:t},null,2)],{type:'application/json'}),t.code+'.json');}catch(error){showMsg(error.message,true);}}
function openLabelImport30(){if(!requireLevel(2,'labels'))return;const input=document.createElement('input');input.type='file';input.accept='.json,.zpl,.prn,.nlbl';input.onchange=async()=>{const file=input.files[0];if(!file)return;try{if(file.size>1024*1024)throw Error('El archivo excede 1 MB.');if(/\.nlbl$/i.test(file.name))throw Error('Exporta el diseño de Zebra a ZPL. El formato .nlbl no permite importación directa.');const text=await file.text();let template;if(/\.(zpl|prn)$/i.test(file.name))template=parseLabelZPL30(text,file.name);else{const data=JSON.parse(text);if(data.format!=='InsectMES-label-v1')throw Error('El archivo no es un diseño de InsectMES.');template=data.template;}validateLabel30(template);labelDraft30=structuredClone(template);labelDraft30.previousCode='';labelElement30=template.elements[0].id;navigateScreen('label-designer');}catch(error){showMsg(error.message||'No se pudo importar el diseño.',true);}};input.click();}
function parseLabelZPL30(text,filename){
  const commands=[...text.matchAll(/\^([A-Z0-9]{2})/g)].map(match=>match[1]);
  if(commands.some(code=>!['XA','XZ','PW','LL','FO','A0','FD','FS','BQ'].includes(code)))throw Error('Ese ZPL usa comandos que este importador todavía no admite. Usa texto ^A0N y QR ^BQN, o un diseño JSON de InsectMES.');
  if(/\^(GF|XG|DG|B[AC3E]|FW|FP|PO|PM|FR|FB)/.test(text)||!text.includes('^XA')||!text.includes('^XZ'))throw Error('Ese ZPL contiene gráficos o comandos no compatibles. Exporta un diseño con texto y QR.');
  const width=Number(text.match(/\^PW(\d+)/)?.[1]),height=Number(text.match(/\^LL0*(\d+)/)?.[1]);if(!width||!height)throw Error('El ZPL debe incluir ancho ^PW y alto ^LL.');
  const template={code:filename.replace(/\.(zpl|prn)$/i,'').slice(0,50),name:filename.replace(/\.(zpl|prn)$/i,''),width:width/8,height:height/8,active:true,elements:[]};
  for(const [index,block] of [...text.matchAll(/\^FO(\d+),(\d+)([\s\S]*?)\^FS/g)].entries()){
    const content=block[3],value=content.match(/\^FD([\s\S]*)/)?.[1];if(value===undefined)throw Error('El ZPL tiene un elemento no compatible.');
    const qr=content.match(/\^BQN,2,(\d+)/),font=content.match(/\^A0N,(\d+),(\d+)/);let field='literal',data=value;
    if(qr)data=data.replace(/^(LA,|MA,|HA,|QA,)/,'');
    const binding=data.match(/^\{\{(serial|part|lot|location|quantity)\}\}$/);if(binding)field=binding[1];
    const element={id:'import'+index,type:qr?'qr':'text',field,text:data,x:Number(block[1])/8,y:Number(block[2])/8,w:qr?14:Math.min(20,template.width-Number(block[1])/8),h:qr?14:3,font:font?Math.max(4,Number(font[1])/8/.352778):6};
    if(!qr&&!font)throw Error('El ZPL debe usar fuente ^A0N para importar texto.');
    if(!qr)element.h=element.font*.352778+.3;template.elements.push(element);
  }
  if(!template.elements.length)throw Error('No se encontraron elementos de texto o QR.');return template;
}
async function makeLabelPDF30(jobs){
  await Promise.all([loadExportLibrary30('jspdf.umd.min.js'),loadExportLibrary30('qrcode.js')]);
  if(!jobs.length)throw Error('Selecciona al menos un contenedor.');
  jobs.forEach(({template})=>validateLabel30(template));
  const first=jobs[0].template,pdf=new jspdf.jsPDF({unit:'mm',format:[first.width,first.height],orientation:first.width>=first.height?'landscape':'portrait',compress:true});
  pdf.setProperties({title:'Etiquetas InsectMES',creator:'InsectMES'});
  for(const [index,{template,row}]of jobs.entries()){
    if(index)pdf.addPage([template.width,template.height],template.width>=template.height?'landscape':'portrait');
    for(const e of template.elements){
      pdf.setFillColor(0);pdf.setTextColor(0);
      if(e.type==='qr'){const qr=labelQR30(labelValue30(e,row)),count=qr.getModuleCount(),unit=Math.min(e.w,e.h)/(count+8);for(let y=0;y<count;y++)for(let x=0;x<count;x++)if(qr.isDark(y,x))pdf.rect(e.x+(x+4)*unit,e.y+(y+4)*unit,unit+.005,unit+.005,'F');}
      else if(e.type==='line')pdf.rect(e.x,e.y,e.w,e.h,'F');
      else {pdf.setFont('helvetica',e.bold?'bold':'normal');pdf.setFontSize(e.font);let text=labelValue30(e,row);while(text.length&&pdf.getTextWidth(text)>e.w)text=text.slice(0,-1);pdf.text(text,e.x,e.y+e.font*.352778*.82);}
    }
  }
  return pdf.output('blob');
}
let labelPdfURL30='';
function showLabelPDF30(blob){
  let dialog=document.getElementById('label-pdf30');if(!dialog){dialog=document.createElement('dialog');dialog.id='label-pdf30';dialog.className='label-pdf30';document.body.append(dialog);dialog.addEventListener('close',()=>{URL.revokeObjectURL(labelPdfURL30);labelPdfURL30='';dialog.innerHTML='';});}
  if(labelPdfURL30)URL.revokeObjectURL(labelPdfURL30);labelPdfURL30=URL.createObjectURL(blob);
  dialog.innerHTML='<div class="concept-head"><h2>Etiquetas · PDF</h2><button class="btn soft" aria-label="Cerrar PDF" onclick="this.closest(\'dialog\').close()">×</button></div><div class="label-pdf-actions30"><a class="btn soft" download="InsectMES-etiquetas.pdf" href="'+labelPdfURL30+'">Descargar PDF</a></div><iframe title="Vista previa PDF de etiquetas" src="'+labelPdfURL30+'"></iframe>';if(!dialog.open)dialog.showModal();
}
async function previewLabelDraft30(){try{showLabelPDF30(await makeLabelPDF30([{template:currentLabelDraft30(),row:labelSample30()}]));}catch(error){showMsg(error.message||'No se pudo generar el PDF.',true);}}
async function printInventoryLabels30(){
  if(!requireLevel(1,'inventory'))return;const serials=selectedRows30(shellScreen);if(!serials.length)return showMsg('Selecciona los contenedores que vas a etiquetar.',true);
  try{const jobs=serials.map(serial=>{const row=state.serials.find(row=>row.serial===serial);if(!row)throw Error('El contenedor ya no existe.');return {row,template:labelForContainer30(row)};});const blob=await makeLabelPDF30(jobs);showLabelPDF30(blob);saveReceivingState30(()=>{state.labelPrints30??=[];state.labelPrints30.unshift({date:new Date().toISOString(),serials,labels:jobs.map(job=>job.template.code)});});}catch(error){showMsg(error.message||'No se pudo generar el PDF.',true);}
}
const labelConceptBefore30=renderConceptScreen;
renderConceptScreen=function(){if(conceptScreen==='labels30')return renderLabels30();if(conceptScreen==='label-designer30')return renderLabelDesigner30();labelConceptBefore30();};
const labelInventoryBefore30=renderInventory;
renderInventory=function(){labelInventoryBefore30();if(!['inventory','containers'].includes(shellScreen)||uiState.inventoryAction)return;const bar=document.querySelector('#view-inventory .card-body>.actionbar');if(bar&&!bar.querySelector('[data-label-print30]'))bar.insertAdjacentHTML('beforeend','<button type="button" class="btn soft" data-label-print30 onclick="printInventoryLabels30()" '+(!selectedRows30(shellScreen).length?'disabled':'')+'>Imprimir etiqueta</button>');};
const labelGridChecksBefore30=refreshGridChecks30;
refreshGridChecks30=function(grid){labelGridChecksBefore30(grid);const button=document.querySelector('#view-inventory [data-label-print30]');if(button)button.disabled=!selectedRows30(shellScreen).length;};
