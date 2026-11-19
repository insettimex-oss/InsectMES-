const exportLibraries30 = new Map();
function loadExportLibrary30(filename) {
  if (!exportLibraries30.has(filename)) {
    const script = document.createElement('script');
    script.src = 'assets/vendor/' + filename;
    exportLibraries30.set(filename,new Promise((resolve,reject) => {
      script.onload = resolve;
      script.onerror = () => {
        exportLibraries30.delete(filename);
        script.remove();
        reject(Error('No se pudo cargar el formato.'));
      };
      document.head.append(script);
    }));
  }
  return exportLibraries30.get(filename);
}

function downloadExport30(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href),1000);
}

async function saveExport30(format, filename, headers, rows) {
  if (format === 'csv') {
    const quote = value => {
      const text = typeof value === 'string' && /^(?:\s*[=+\-@]|[\t\r\n])/.test(value) ? "'" + value : String(value ?? '');
      return '"' + text.replaceAll('"','""') + '"';
    };
    const csv = [headers,...rows].map(row => row.map(quote).join(',')).join('\r\n');
    downloadExport30(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}),filename+'.csv');
    return;
  }
  if (format === 'xlsx') {
    await loadExportLibrary30('exceljs.min.js');
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('Resultados',{views:[{state:'frozen',ySplit:1}]});
    sheet.addRows([headers,...rows]);
    headers.forEach((heading,column) => {
      const max = rows.reduce((width,row) => Math.max(width,String(row[column] ?? '').length),String(heading).length);
      sheet.getColumn(column+1).width = Math.min(55,Math.max(10,max+2));
    });
    sheet.autoFilter = {from:{row:1,column:1},to:{row:rows.length+1,column:headers.length}};
    sheet.getRow(1).font = {bold:true};
    const bytes = await book.xlsx.writeBuffer();
    downloadExport30(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename+'.xlsx');
    return;
  }
  await loadExportLibrary30('jspdf.umd.min.js');
  await loadExportLibrary30('jspdf.plugin.autotable.min.js');
  const pdf = new jspdf.jsPDF({orientation:headers.length>5?'landscape':'portrait',compress:true});
  pdf.setProperties({title:filename});
  pdf.setFontSize(14);
  pdf.text(filename,12,13);
  pdf.autoTable({
    head:[headers],
    body:rows.map(row => row.map(value => String(value ?? ''))),
    startY:19, margin:{top:12,right:12,bottom:12,left:12},
    styles:{fontSize:8,cellPadding:2,overflow:'linebreak',minCellWidth:12},
    headStyles:{fillColor:[28,93,68]},rowPageBreak:'avoid',
  });
  pdf.save(filename+'.pdf');
}

let exportMenuAnchor31=null;
function closeExportMenu31(focus=false){const menu=document.getElementById('export-menu31');if(!menu)return;if(menu.hidePopover&&menu.matches(':popover-open'))menu.hidePopover();menu.remove();exportMenuAnchor31?.setAttribute('aria-expanded','false');if(focus&&exportMenuAnchor31?.isConnected)exportMenuAnchor31.focus();exportMenuAnchor31=null;}
function positionExportMenu31(){const menu=document.getElementById('export-menu31');if(!menu)return;const rect=exportMenuAnchor31?.getBoundingClientRect()||{left:innerWidth/2-90,bottom:100,top:60};const height=menu.getBoundingClientRect().height;menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=(rect.bottom+height+5<innerHeight?rect.bottom+5:Math.max(8,rect.top-height-5))+'px';}
function exportRows(filename, headers, rows) {
  const anchor=document.activeElement?.closest('button')||[...document.querySelectorAll('.view.active button,dialog[open] button')].find(button=>button.textContent.trim()==='Exportar');
  const previous=document.getElementById('export-menu31');if(previous&&anchor===exportMenuAnchor31){closeExportMenu31(true);return;}closeExportMenu31();closeCompactFilter31?.();
  const menu=document.createElement('div');menu.id='export-menu31';menu.className='export-menu31';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Exportar');
  const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h8"/></svg>';
  menu.innerHTML=[['csv','CSV'],['xlsx','Excel'],['pdf','PDF']].map(([format,label])=>'<button type="button" role="menuitem" data-format="'+format+'"><span class="export-file31">'+icon+'</span><span>'+label+'</span></button>').join('')+'<p role="alert" hidden></p>';
  exportMenuAnchor31=anchor;if(anchor){anchor.setAttribute('aria-haspopup','menu');anchor.setAttribute('aria-expanded','true');}
  const options=[...menu.querySelectorAll('[data-format]')],message=menu.querySelector('[role=alert]');
  for (const button of options) button.onclick = async () => {
    options.forEach(option => {option.disabled = true;});
    menu.setAttribute('aria-busy','true');button.classList.add('exporting31');
    message.hidden = true;
    try {
      await saveExport30(button.dataset.format,filename.replace(/\.csv$/i,''),headers,rows);
      closeExportMenu31(true);
    } catch {
      message.textContent = 'No se pudo exportar. Vuelve a intentarlo.';
      message.hidden = false;
      menu.removeAttribute('aria-busy');button.classList.remove('exporting31');
      options.forEach(option => {option.disabled = false;});
      button.focus();
    }
  };
  menu.onkeydown=event=>{const index=options.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();closeExportMenu31(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();options[event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length].focus();}else if(event.key==='Tab')closeExportMenu31();};
  (anchor?.closest('dialog[open]')||document.body).append(menu);
  if(menu.showPopover){menu.setAttribute('popover','manual');menu.showPopover();}
  positionExportMenu31();
  options[0].focus();
}
document.addEventListener('pointerdown',event=>{const menu=document.getElementById('export-menu31');if(menu&&!menu.contains(event.target)&&!exportMenuAnchor31?.contains(event.target))closeExportMenu31();});
window.addEventListener('resize',positionExportMenu31);
window.addEventListener('scroll',event=>{if(!event.target.closest?.('#export-menu31'))closeExportMenu31();},true);
