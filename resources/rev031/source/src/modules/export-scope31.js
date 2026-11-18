/* Apply the visible screen's selection and filters before choosing a file format. */
function exportHeading31(value){const key=catalogSearchText30(value).replace(/[^a-z0-9]/g,'');return ({np:'noparte',partno:'noparte',part:'noparte',numerodeparte:'noparte',status:'estatus',estado:'estatus',codigo:'codigo',adddate:'fecha',operationnumber:'opno',npadre:'noparte',nppadre:'noparte'})[key]||key;}
function exportCellText31(cell){const control=cell.querySelector('input:not([type=checkbox],[type=color]),select');return control?control.value:cell.textContent.trim();}
function exportDataCells31(row){const table=row.closest('table'),head=table?.tHead?.rows[0];return [...row.cells].filter(cell=>{const heading=head?.cells[cell.cellIndex];return !cell.classList.contains('grid-check30')&&!cell.classList.contains('setup-select-column30')&&(cell.cellIndex!==0||Boolean(heading?.textContent.trim()));});}
function exportRowSelected31(row){return Boolean(row.querySelector('[data-select-row30]:checked,[data-setup-select30]:checked,input[name=labelSelection]:checked')||row.matches('[data-facility-code30].selected'));}
function exportScope31(anchor){return anchor?.closest('dialog[open]')||anchor?.closest('.card-body')||anchor?.closest('.view.active')||document.querySelector('main .view.active');}
function scopedExportRows31(headers,rows,anchor){
 if(['inventory','containers','setup-table','bom'].includes(shellScreen)&&!anchor?.closest('dialog[open]'))return rows;
 const scope=exportScope31(anchor);if(!scope)return rows;
 const cells=exportDataCells31;
 const tables=[...scope.querySelectorAll('table')].filter(table=>table.tHead);
 let result=rows,uniqueGridMatched=false;
 for(const table of tables){
  const headings=cells(table.tHead.rows[0]).map(cell=>exportHeading31(cell.querySelector('.grid-head34 span')?.textContent||cell.textContent));
  const priorities=['serial','codigo','job','noparte','unidad'],shared=headers.map((header,index)=>({index,key:exportHeading31(header)})).filter(item=>headings.includes(item.key));if(!shared.length)continue;shared.sort((a,b)=>(priorities.includes(a.key)?priorities.indexOf(a.key):99)-(priorities.includes(b.key)?priorities.indexOf(b.key):99));
  const identity=shared[0],column=headings.indexOf(identity.key);
  const data=validCatalogRows30(table).filter(row=>cells(row).length===headings.length),keys=new Set(data.map(row=>exportCellText31(cells(row)[column])));
  if(!rows.some(row=>keys.has(String(row[identity.index]??'')))&&data.length)continue;
  const visible=data.filter(row=>!row.hidden),selected=visible.filter(exportRowSelected31);
  const allowed=new Set((selected.length?selected:visible).map(row=>exportCellText31(cells(row)[column])));result=result.filter(row=>allowed.has(String(row[identity.index]??'')));uniqueGridMatched=keys.size===data.length;break;
 }
 let ctx=null;for(const source of scope.querySelectorAll('[data-catalog-filter30],.ops-filters:not(.catalog-search30),.filters')){const candidate=catalogSearchBars30.get(source);if(candidate){ctx=candidate;break;}}
 if(ctx&&!uniqueGridMatched&&catalogSearchHas30(ctx.state.active)){
  const labels=ctx.target.labels;
  result=result.filter(row=>{const record=Object.fromEntries(headers.map((header,index)=>[header,row[index]]));for(const label of labels){const index=headers.findIndex(header=>exportHeading31(header)===exportHeading31(label));if(index>=0)record[label]=row[index];}const display={...record};for(const [label,value]of Object.entries(record)){if(value==='Sí')display[label]='☑';else if(value==='No')display[label]='☐';else if(filterKind31(label)==='date'&&value)display[label]=dateDisplay34(String(value));}return catalogSearchMatches30(record,ctx.state.active,display);});
 }
 return result;
}
const exportRowsBeforeScope31=exportRows;
exportRows=function(filename,headers,rows){const anchor=document.activeElement?.closest('button'),filtered=scopedExportRows31(headers,rows,anchor);if(!filtered.length)return showMsg('No hay resultados para exportar.',true);return exportRowsBeforeScope31(filename,headers,filtered);};
const exportBomBeforeScope31=exportGroupedBom30;
exportGroupedBom30=function(){
 if(!requireLevel(1,'bom'))return;
 const search=catalogSearchActive30('bom'),selected=selectedBomPart31;
 const components=state.setupTables.Bom.filter(row=>(!selected||row.parentPart===selected)&&bomMatchesCatalogSearch30(row,search));
 const byproducts=(state.bomOutputs31||[]).filter(row=>row.active!==false&&(!selected||row.parentPart===selected)&&(!uiState.bomPart29||row.parentPart===uiState.bomPart29)).filter(row=>catalogSearchMatches30({'No Parte':row.parentPart+' '+row.part,'Descripción':(getPart(row.parentPart)?.desc||'')+' '+(getPart(row.part)?.desc||''),'Cantidad':'','Unidad':row.unit},search));
 exportRows('bom.csv',['No Parte','Componente','Descripción','Tipo','Cantidad','Unidad','BOM variable','Validar total 100%'],[
 ...components.map(row=>[row.parentPart,row.componentPart,getPart(row.componentPart)?.desc||'','Componente',bomLineAmount31(row),bomProfile31(row.parentPart).basis==='percent'?'%':row.unit,bomProfile31(row.parentPart).variable?'Sí':'No',bomProfile31(row.parentPart).validateTotal100?'Sí':'No']),
 ...byproducts.map(row=>[row.parentPart,row.part,getPart(row.part)?.desc||'','Byproduct','',row.unit,'',''])]);
};
