const gridWidths30 = new Map();
function installGridResize30(table, scope) {
  if (table.dataset.resize30 || !table.tHead?.rows[0] || table.tHead.rows.length !== 1) return;
  const headers = [...table.tHead.rows[0].cells];
  if (headers.length < 2 || headers.some(heading=>heading.colSpan !== 1)) return;
  table.dataset.resize30='true';
  const labels=headers.map(heading=>heading.querySelector('.grid-head34 span')?.textContent || heading.textContent.trim());
  const key=scope+':'+labels.join('|')+':'+(table.dataset.inventoryCompact30||'full');
  const inventory = ['inventory','containers'].includes(scope);
  const compact=table.hasAttribute('data-inventory-compact30');
  const preferred = {'Serial':150,'No Parte':130,'Descripción':240,'Cantidad':130,'Unidad':110,
    'Edificio':160,'Área':150,'Ubicación':180,'Estatus':210,'Lote':150,'Notas':240};
  const canvas = document.createElement('canvas').getContext('2d');
  const minimums = headers.map((header,index)=>{
    if (header.classList.contains('setup-select-column30')) return 36;
    if (compact) return header.hidden ? 0 : header.classList.contains('grid-check30') ? 40 : 72;
    if (header.classList.contains('grid-check30')) return 56;
    canvas.font = getComputedStyle(header.querySelector('button') || header).font;
    return Math.max(100,Math.ceil(canvas.measureText(labels[index]).width)+64);
  });
  let columns;
  function apply(widths) {
    widths=widths.map((width,index)=>headers[index].hidden ? 0 : Math.max(minimums[index],width));
    if (!columns) {
      const group=document.createElement('colgroup');
      columns=headers.map(()=>group.appendChild(document.createElement('col')));
      table.insertBefore(group,table.tHead);
    }
    const total=widths.reduce((a,b)=>a+b,0)+'px';
    table.style.tableLayout='fixed';
    table.style.minWidth=total;
    table.style.width=total;
    columns.forEach((column,i)=>{column.style.width=widths[i]+'px';column.style.display=headers[i].hidden?'none':'';});
    gridWidths30.set(key,widths);
  }
  const saved=gridWidths30.get(key);
  if (saved) apply(compact && saved.reduce((a,b)=>a+b,0)>table.closest('.table-wrap').clientWidth ? inventoryCompactWidths30(table,headers) : saved);
  else if (compact) apply(inventoryCompactWidths30(table,headers));
  else if (inventory) apply(labels.map((label,index)=>preferred[label] || minimums[index]));
  headers.forEach((header,i)=>{
    if (header.classList.contains('grid-check30')) return;
    const handle=document.createElement('span');
    handle.className='grid-resize-handle30';
    handle.tabIndex=0;
    handle.setAttribute('role','separator');
    handle.setAttribute('aria-orientation','vertical');
    handle.setAttribute('aria-label','Ajustar ancho de '+(labels[i]||'columna'));
    header.append(handle);
    const measure=()=>headers.map(item=>Math.round(item.getBoundingClientRect().width));
    function adjust(widths,width) {
      const next=widths.slice();
      next[i]=Math.max(minimums[i],Math.min(1600,Math.round(width)));
      apply(next);
      handle.setAttribute('aria-valuenow',next[i]);
    }
    handle.onpointerdown=event=>{
      if(event.button!==0)return;
      event.preventDefault();
      event.stopPropagation();
      const widths=measure(), x=event.clientX;
      handle.setPointerCapture(event.pointerId);
      handle.onpointermove=move=>adjust(widths,widths[i]+move.clientX-x);
      handle.onlostpointercapture=()=>{handle.onpointermove=null;};
    };
    handle.onkeydown=event=>{
      if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
      event.preventDefault();
      const widths=measure();
      adjust(widths,widths[i]+(event.key==='ArrowRight'?16:-16));
    };
  });
}
new MutationObserver(()=>{
  const view=document.querySelector('main .view.active');
  if (!view) return;
  for (const table of view.querySelectorAll('.table-wrap table')) installGridResize30(table,shellScreen);
}).observe(document.querySelector('main'),{childList:true,subtree:true});


