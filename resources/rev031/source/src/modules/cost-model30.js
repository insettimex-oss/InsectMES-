
const costRateKeys30 = {EGG:'RATE_EGG',NUR:'RATE_NUR',TRA:'RATE_TRA',REA:'RATE_REA',SHR:'RATE_SHR',
  FED:'RATE_FPR',PPR:'RATE_PPR',HAR:'RATE_HAR'};
const costUnitChoices30 = ['g/h','kg/h','bandejas/h','pzas/h'];
const costDrivers30 = [
  ['MO_SALARY','Sueldo mensual',9500,'MXN/mes','MO!B8'],
  ['MO_WEEK_DAYS','Días por semana',7,'días','MO!B10'],
  ['MO_MONTH_DAYS','Días promedio por mes',30.4,'días','MO!B11'],
  ['MO_MONTHS','Meses por año',12,'meses','MO!B12'],
  ['MO_IMSS','Tasa de IMSS',.3375,'fracción','MO!B13'],
  ['MO_BENEFITS','Prestaciones',.1,'fracción','MO!B14'],
  ['MO_HOURS','Horas semanales',48,'h','MO!B15'],
  ['FUEL_PRICE','Precio de gasolina',23,'MXN/L','Combustible!D3:D23'],
  ['FUEL_TRUCK','Rendimiento camioneta',8,'km/L','Combustible!E1'],
  ['FUEL_CAR','Rendimiento auto',14,'km/L','Combustible!F1'],
  ['RECIPE_PREMIUM_WATER','Agua en alimento Premium',.6,'fracción','MP!B18'],
  ['RECIPE_F1_WHEY','Suero de leche en alimento Engorda F1',.6,'fracción','MP!B23'],
  ['GIF_POST','Indirectos de lavado y neutralizado',.25489333333333336,'MXN/kg','GIF!U23'],
  ['GIF_DRY','Indirectos de deshidratado',12.003205128205128,'MXN/kg','GIF!U25'],
];
for (const material of costReference30.materials) {
  const r=material.row;
  costDrivers30.push(
    ['MP_PRICE_'+r,material.name+' · Precio por compra',material.price,'MXN','MP!D'+r],
    ['MP_QTY_'+r,material.name+' · Cantidad por compra',material.qty,material.unit,'MP!E'+r],
    ['MP_HOURS_'+r,material.name+' · Horas de flete',material.hours,'h','MP!K'+r],
    ['MP_VOLUME_'+r,material.name+' · Volumen por viaje',material.volume,material.unit,'MP!M'+r]);
}
for (const trip of costReference30.fuel) {
  costDrivers30.push(['FUEL_KM_'+trip.row,trip.name+' · Distancia',trip.km,'km','Combustible!C'+trip.row]);
}
for (const [code,label,value,unit,source] of costDrivers30) {
  parameterSeed31.push([code,label,value,unit,'COST',source]);
}
function validateCostDriver30(code,value) {
  const fraction=/^(MO_(IMSS|BENEFITS)|RECIPE_)/.test(code);
  const canBeZero=fraction || /^(MP_PRICE_\d+|MP_HOURS_\d+|FUEL_KM_\d+|GIF_(POST|DRY))$/.test(code);
  if (!Number.isFinite(value) || value<0 || (!canBeZero && value===0)) throw Error('Revisa el parámetro '+code);
  if (fraction && value>1) throw Error('Captura una fracción entre 0 y 1.');
  return value;
}
function costDriver30(code) {
  const row=state.parameters.find(p=>p.code===code&&p.active);
  return validateCostDriver30(code,row?.value);
}
function costOverride30(code,calculate) {
  const row=state.parameters.find(p=>p.code===code);
  const seed=parameterSeed31.find(p=>p[0]===code);
  if (row && (!row.active || row.updated || row.value!==seed?.[2])) return parameter31(code);
  return calculate();
}
function costLabor30() {
  const salary=costDriver30('MO_SALARY');
  const imss=costDriver30('MO_IMSS'), benefits=costDriver30('MO_BENEFITS');
  const weekly=salary/costDriver30('MO_MONTH_DAYS')*costDriver30('MO_WEEK_DAYS');
  const annual=salary*costDriver30('MO_MONTHS');
  const hourly=costOverride30('LABOR',()=>(weekly*(1+imss+benefits))/costDriver30('MO_HOURS'));
  return {hourly,rows:[['Semanal',weekly],['Mensual',salary],['Anual',annual]]
    .map(([name,net])=>[name,net,net*imss,net*benefits,net*(1+imss+benefits),name==='Semanal'?hourly:null])};
}
function costFuel30() {
  const price=costDriver30('FUEL_PRICE'), truck=costDriver30('FUEL_TRUCK'), car=costDriver30('FUEL_CAR');
  return costReference30.fuel.map(trip=>{
    const km=costDriver30('FUEL_KM_'+trip.row);
    return {...trip,km,price,truckLiters:km/truck,carLiters:km/car,truckCost:km/truck*price*2,carCost:km/car*price*2};
  });
}
function costMaterials30() {
  const trips=costFuel30();
  const {hourly}=costLabor30();
  return costReference30.materials.map(ref=>{
    const r=ref.row;
    const price=costDriver30('MP_PRICE_'+r), qty=costDriver30('MP_QTY_'+r), volume=costDriver30('MP_VOLUME_'+r);
    const hours=costDriver30('MP_HOURS_'+r);
    const fuel=trips.find(trip=>trip.name===ref.vendor)?.truckCost;
    if (fuel==null) throw Error('Falta una ruta de combustible para '+ref.vendor);
    const mp=price/qty, fuelUnit=fuel/volume, laborUnit=hours*hourly/volume;
    return {...ref,price,qty,volume,hours,mp,fuelUnit,laborUnit,total:mp+fuelUnit+laborUnit};
  });
}
function costRecipes30(materials) {
  const water=costDriver30('RECIPE_PREMIUM_WATER'), whey=costDriver30('RECIPE_F1_WHEY');
  const recipes=[['Alimento Premium',[[11,water],[8,1-water]]],['Alimento Engorda F1',[[2,whey],[4,1-whey]]]];
  return recipes.map(([name,items])=>{
    const lines=items.map(([row,ratio])=>{
      const r=materials.find(m=>m.row===row);
      return {name:r.name,ratio,mp:ratio*r.mp,fuel:ratio*r.fuelUnit,labor:ratio*r.laborUnit,total:ratio*r.total};
    });
    const total=lines.reduce((sum,row)=>sum+row.total,0);
    return {name,lines,total};
  });
}
function costCycleStandard30(route, op = route?.operation) {
  const ref=costReference30.route[op];
  let rate=null, unit='', yieldRate=null;
  if (ref?.rate!=null) {
    const lookup=code=>state.parameters.find(p=>p.code===code && p.active)?.value ?? null;
    rate=costRateKeys30[op] ? lookup(costRateKeys30[op]) : ref.rate;
    unit=ref.unit;
    yieldRate=op==='HAR'?lookup('YIELD_HAR'):ref.yieldRate;
  }
  return {rate:route?.cycleRate ?? rate,unit:route?.cycleUnit || unit,yieldRate:route?.yieldRate ?? yieldRate};
}
function standardRateForCost30(op,tray) {
  const ref=costReference30.route[op];
  const route=engineeringData29().routes.find(row=>row.id==='BASE-'+op && row.active);
  const standard=costCycleStandard30(route,op);
  let rate=standard.rate;
  if (standard.unit!==ref.unit) {
    const mass={'g/h':.001,'kg/h':1,'bandejas/h':tray};
    if (!mass[standard.unit] || !mass[ref.unit]) throw Error('La unidad del ciclo de '+op+' no coincide con el modelo.');
    rate*=mass[standard.unit]/mass[ref.unit];
  }
  if (!(rate>0) || !(standard.yieldRate>0 && standard.yieldRate<=1)) throw Error('Revisa ritmo y rendimiento de '+op);
  return {...standard,effective:rate*standard.yieldRate};
}
function productionCosts30() {
  const labor=costLabor30().hourly;
  const recipes=costRecipes30(costMaterials30());
  const egg=parameter31('EGG_YIELD'),tray=parameter31('TRAY_KG');
  const feed=parameter31('FEED_KG')/tray,premium=parameter31('PREMIUM_RATIO');
  const premiumCost=costOverride30('PREMIUM_COST',()=>recipes[0].total);
  const feedCost=costOverride30('FEED_COST',()=>recipes[1].total);
  const rows=[];
  let accumulated=0;
  for (const [op,ref] of Object.entries(costReference30.route)) {
    const standard=ref.rate==null?null:standardRateForCost30(op,tray);
    let mo=standard ? labor/standard.effective : null;
    if (['EGG','NUR'].includes(op)) mo/=egg;
    if (['TRA','REA','HAR'].includes(op)) mo/=tray;
    if (['SHR','FED'].includes(op)) mo*=feed;
    if (op==='PPR') mo*=premium;
    const mp={NUR:premium*premiumCost,REA:feed*feedCost}[op];
    const gifKeys={NUR:'GIF_NUR',REA:'GIF_REA',PPR:'GIF_FPR',HAR:'GIF_HAR',SAN:'GIF_POST',DRY:'GIF_DRY'};
    const gif=gifKeys[op] ? costDriver30(gifKeys[op]) : null;
    const allocated=Boolean(standard && ref.row<=24);
    const direct=allocated ? (mo||0)+(mp||0)+(gif||0) : null;
    if (allocated) accumulated=(op==='DRY'?accumulated/standard.yieldRate:accumulated)+direct;
    rows.push({op,...ref,part:state.cpOperations.find(row=>row.code===op)?.part || '',
      standard,mo,mp:mp??null,gif,direct,accumulated:allocated?accumulated:null});
  }
  return rows;
}
let costsFilter30={type:'process',query:'',area:''};
function costData30() {
  const {type,query,area}=costsFilter30;
  if (type==='labor') {
    const {rows}=costLabor30();
    return {headers:['Período','Salario neto','IMSS','Prestaciones','Costo total','MXN/h'],
      rows:rows.filter(row=>containsOperations29(row[0],query)),numeric:[1,2,3,4,5]};
  }
  if (type==='fuel') return {headers:['Destino','Minutos ida','Km ida','MXN/L','Litros camioneta','Litros auto','Camioneta ida y vuelta','Auto ida y vuelta','Origen'],
    rows:costFuel30().filter(row=>containsOperations29(row.name,query)).map(r=>[r.name,r.minutes,r.km,r.price,r.truckLiters,
      r.carLiters,r.truckCost,r.carCost,'Combustible!'+r.row]),numeric:[1,2,3,4,5,6,7]};
  if (type==='materials') return {headers:['Proveedor','Insumo','Unidad','Precio compra','Cantidad compra','Vol. por viaje','Horas flete','MP/unidad','Combustible/unidad','MO flete/unidad','Total/unidad','Origen'],
    rows:costMaterials30().filter(row=>containsOperations29(row.vendor+' '+row.name,query)).map(r=>[r.vendor,r.name,r.unit,r.price,r.qty,r.volume,
      r.hours,r.mp,r.fuelUnit,r.laborUnit,r.total,'MP!'+r.row]),numeric:[3,4,5,6,7,8,9,10]};
  if (type==='recipes') return {headers:['Receta','Componente','Fracción','MP','Combustible','MO flete','MXN/kg'],
    rows:costRecipes30(costMaterials30()).filter(r=>containsOperations29(r.name+' '+r.lines.map(l=>l.name).join(' '),query))
      .flatMap(r=>[...r.lines.map(l=>[r.name,l.name,l.ratio,l.mp,l.fuel,l.labor,l.total]),[r.name,'Total',null,null,null,null,r.total]]),
    numeric:[2,3,4,5,6]};
  const all=productionCosts30();
  return {all,headers:['Área','Operación','NP','Ritmo','Unidad de ciclo','Rendimiento','MO','MP','GIF','Costo imputado','Acumulado','Unidad de costo','Origen'],
    rows:all.filter(r=>(!area||r.area===area)&&containsOperations29([r.op,r.name,r.part].join(' '),query))
      .map(r=>[r.area,r.name,r.part,r.standard?.rate,r.standard?.unit,r.standard?.yieldRate==null?'':number34(r.standard.yieldRate*100)+' %',
        r.mo,r.mp,r.gif,r.direct,r.accumulated,r.standard?(r.unit==='pzas/h'?'MXN/pza':'MXN/kg'):'',
        'Process Routing (2)!'+r.row]),numeric:[3,6,7,8,9,10]};
}
function filterCosts30(event) {
  event.preventDefault();
  costsFilter30=readOperationsForm29(event.currentTarget);
  renderApp();
}
function exportCosts30() {
  if (!requireLevel(1,'coststructure')) return;
  try {
    const {headers,rows}=costData30();
    exportRows('costos-'+costsFilter30.type+'.csv',headers,rows);
  } catch(error) { showMsg(error.message,true); }
}
costScreen31 = function () {
  const fields=[choice29('type','Vista',[['process','Por proceso'],['materials','Materia prima'],['recipes','Recetas de costo'],
    ['labor','Mano de obra'],['fuel','Combustible']],true),field29('query','Buscar'),
    ...(costsFilter30.type==='process'?[choice29('area','Área',options29([...new Set(Object.values(costReference30.route).map(r=>r.area))]))]:[])];
  const filters='<form class="ops-filters insight-toolbar" onsubmit="filterCosts30(event)">'+
    fields.map(field=>operationsField29(field,costsFilter30[field.key],true)).join('')+
    '<button class="btn primary">Buscar</button></form>';
  const actions='<div class="actionbar"><button class="btn soft" onclick="exportCosts30()">Exportar</button></div>';
  let data;
  try { data=costData30(); }
  catch(error) { return cardNavigation29('Cost Structure',filters+actions+'<div class="empty-state">'+esc(error.message)+'</div>'); }
  const summary=data.all?'<div class="cost-summary">'+[['HAR','Larva 17-DOL'],['SAN','Larva lavada y neutralizada'],['DRY','Pop Larvae']]
    .map(([code,label])=>'<div><span>'+label+'</span><strong>$'+number34(data.all.find(r=>r.op===code).accumulated)+' <small>MXN/kg</small></strong></div>').join('')+'</div>':'';
  const rows=data.rows.map(row=>'<tr>'+row.map((v,i)=>'<td>'+esc(v==null||v===''?'—':data.numeric.includes(i)?number34(v):String(v))+'</td>').join('')+'</tr>');
  return cardNavigation29('Cost Structure',filters+actions+summary+resultsTable30(data.headers,rows,'760px')+
    '<details class="cost-source"><summary>Base de cálculo</summary><p>002. BSFL Cost Calculator Rev02.xlsx. Las recetas de costo reproducen las proporciones de MP. En secado, el acumulado anterior se divide por el rendimiento. Fraccionado, molienda y empaque tienen referencia de mano de obra sin imputación al acumulado del libro.</p></details>');
};
let parametersFilter30={query:'',status:'',source:''};
function parameterRows30() {
  const f=parametersFilter30;
  return state.parameters.filter(p=>(!parameterScope31||p.operation===parameterScope31)&&
    (!f.status||(p.active?'active':'inactive')===f.status)&&
    containsOperations29(p.code+' '+p.name,f.query || '')&&containsOperations29(p.source || '',f.source || ''));
}
function filterParameters30(event) {
  event.preventDefault();
  parametersFilter30=readOperationsForm29(event.currentTarget);
  parameterScope31=parametersFilter30.operation;
  renderApp();
}
function exportParameters30() {
  if (!requireLevel(1,'parameters')) return;
  exportRows('parametros.csv',['Código','Parámetro','Proceso','Valor','Unidad','Estado','Origen'],
    parameterRows30().map(p=>[p.code,p.name,p.operation,p.value,p.unit,p.active?'Activo':'Inactivo',p.source]));
}
parametersScreen31 = function () {
  const fields=[field29('query','Código o nombre'),choice29('operation','Proceso',
    [['COST','Costos'],...state.cpOperations.map(o=>[o.code,o.name])]),field29('source','Origen'),
    choice29('status','Estado',[['active','Activo'],['inactive','Inactivo']])];
  const filters='<form class="ops-filters insight-toolbar" onsubmit="filterParameters30(event)">'+fields.map(field=>
    operationsField29(field,field.key==='operation'?parameterScope31:parametersFilter30[field.key],true)).join('')+
    '<button class="btn primary">Buscar</button></form>';
  const actions='<div class="actionbar">'+(levelFor('parameters')>=2?pmButton30('Agregar','editParameter31','','primary'):'')+
    '<button class="btn soft" type="button" onclick="exportParameters30()">Exportar</button></div>';
  const rows=parameterRows30().map(p=>'<tr><td>'+pmButton30(p.code,'editParameter31',p.code,'link')+'</td>'+
    [p.name,p.operation,new Intl.NumberFormat('en-US',{maximumFractionDigits:6}).format(p.value),p.unit,p.active?'Activo':'Inactivo',p.source]
      .map(v=>'<td>'+esc(String(v??''))+'</td>').join('')+'</tr>');
  return cardNavigation29('Parámetros',filters+actions+resultsTable30(['Código','Parámetro','Proceso','Valor','Unidad','Estado','Origen'],rows,'760px'));
};
