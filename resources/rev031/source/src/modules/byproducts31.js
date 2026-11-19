/* Salidas secundarias del BOM: no son componentes consumidos ni demanda MRP. */
const initializeBeforeByproducts31=initShell;
initShell=function(){
 initializeBeforeByproducts31();state.bomOutputs31??=[];
 if(state.byproductsVersion31)return;
 const station=state.cpOperations.find(o=>o.code==='HAR');if(!station)return;
 for(const[field,part]of [['frassA','FRASS-A'],['frassB','FRASS-B']]){if(!state.parts.some(p=>p.part===part))state.parts.push({part,desc:part==='FRASS-A'?'Frass A':'Frass B',unit:'kg',itemType:'WIP',serialPrefix:'BSF'});if(!state.bomOutputs31.some(r=>r.parentPart===station.part&&r.operation==='HAR'&&r.field===field))state.bomOutputs31.push({parentPart:station.part,operation:'HAR',field,part,unit:'kg',type:'byproduct',active:true});}
 state.byproductsVersion31=1;saveState();
};
function bomByproducts31(part,db=state){return (db.bomOutputs31||[]).filter(row=>row.parentPart===part&&row.active!==false);}
const loadBomBeforeByproducts31=loadBomDraft31;
loadBomDraft31=function(part){loadBomBeforeByproducts31(part);bomDraft31.byproducts=structuredClone(bomByproducts31(part));};
const catalogBeforeByproducts31=renderBomCatalog;
renderBomCatalog=function(){
 let html=catalogBeforeByproducts31();if(uiState.bomEditor31)return html;
 const search=catalogSearchActive30('bom'),groups=new Map();
 for(const line of state.bomOutputs31||[]){if(line.active===false)continue;const values={'No Parte':line.parentPart+' '+line.part,'Descripción':(getPart(line.parentPart)?.desc||'')+' '+(getPart(line.part)?.desc||''),'Cantidad':'','Unidad':line.unit};if(!catalogSearchMatches30(values,search))continue;if(uiState.bomPart29&&uiState.bomPart29!==line.parentPart)continue;if(!groups.has(line.parentPart))groups.set(line.parentPart,[]);groups.get(line.parentPart).push(line);}
 if(groups.size)html+='<section class="card"><div class="card-head"><h2>Byproducts</h2></div><div class="card-body">'+resultsTable30(['No Parte','Operación','Byproduct','Descripción','Unidad'],[...groups].flatMap(([part,lines])=>lines.map(line=>'<tr><td><button class="btn link" data-part="'+esc(part)+'" onclick="openBomEditor31(this.dataset.part)">'+esc(part)+'</button></td><td>'+esc(line.operation)+'</td><td>'+esc(line.part)+'</td><td>'+esc(getPart(line.part)?.desc||'')+'</td><td>'+esc(line.unit)+'</td></tr>')),'680px')+'</div></section>';
 return html;
};
const editorBeforeByproducts31=renderBomEditor31;
renderBomEditor31=function(){
 let html=editorBeforeByproducts31(),rows=bomDraft31.byproducts||[];if(!rows.length)return html;
 const section='<section class="bom-byproducts31"><h3>Byproducts</h3><table><thead><tr><th>No Parte</th><th>Descripción</th><th>Tipo</th><th>Unidad</th></tr></thead><tbody>'+rows.map((row,index)=>'<tr><td><select class="select" aria-label="Byproduct '+(index+1)+'" onchange="bomDraft31.byproducts['+index+'].part=this.value;renderApp()">'+state.parts.filter(p=>p.unit===row.unit&&p.part!==bomDraft31.parent).map(p=>'<option value="'+esc(p.part)+'" '+(row.part===p.part?'selected':'')+'>'+esc(p.part)+'</option>').join('')+'</select></td><td>'+esc(getPart(row.part)?.desc||'')+'</td><td>Byproduct</td><td>'+esc(row.unit)+'</td></tr>').join('')+'</tbody></table></section>';
 return html.replace('<div class="capture-actions">',section+'<div class="capture-actions">');
};
const recordBeforeByproducts31=recordCP29;
recordCP29=function(db,station,args){
 const mappings=bomByproducts31(station.part,db).filter(row=>row.operation===station.code);
 for(const row of mappings)if(!db.parts.some(p=>p.part===row.part&&p.unit===row.unit))throw Error('Revisa el No Parte y unidad del Byproduct '+row.part+'.');
 const output=recordBeforeByproducts31(db,station,args);if(!mappings.length)return output;
 const run=db.operationRuns.find(r=>r.serial===output.serial),codes=new Set(run?.outputSerials||[output.serial]);
 output.outputType31='product';
 const originals=db.serials.filter(c=>codes.has(c.serial)&&c.serial!==output.serial).map(container=>({container,part:container.part}));
 for(const row of mappings){const original=({frassA:'FRASS-A',frassB:'FRASS-B'})[row.field];for(const {container}of originals.filter(c=>c.part===original)){container.part=row.part;container.desc=db.parts.find(p=>p.part===row.part)?.desc||row.part;container.outputType31='byproduct';container.bomParentPart31=station.part;}}
 if(run)run.outputs31=db.serials.filter(c=>codes.has(c.serial)).map(c=>({serial:c.serial,part:c.part,type:c.outputType31||'product',qty:c.qtyCurrent,unit:c.unit}));
 return output;
};
const panelBeforeByproducts31=renderControlPanel29;
renderControlPanel29=function(){panelBeforeByproducts31();const station=op29();if(station.code!=='HAR')return;for(const mapping of bomByproducts31(station.part)){const field=document.getElementById('parameter_'+mapping.field);if(field){const text=field.closest('label')?.firstChild;if(text?.nodeType===3)text.textContent=(getPart(mapping.part)?.desc||mapping.part)+' · Byproduct ('+mapping.unit+')';}}};
