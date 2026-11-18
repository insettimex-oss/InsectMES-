function formatDateText30(value) {
  const iso=String(value).trim().match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/);
  if (iso) return {date:iso[1],label:dateDisplay34(iso[1])+(iso[2]?' '+iso[2]:'')};
  const local=String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(.+))?$/);
  if (!local) return null;
  const date=local[3]+'-'+local[2].padStart(2,'0')+'-'+local[1].padStart(2,'0');
  return {date,label:dateDisplay34(date)+(local[4]?' '+local[4]:'')};
}
const datesBeforeTable30=table;
table=function(headers,rowHtml,minWidth,footerHtml) {
  const indices=headers.flatMap((label,index)=>/fecha|date|inicio|vence|entrega|desde|hasta|próxim/i.test(String(label))?[index]:[]);
  if (!indices.length || !rowHtml.length) return datesBeforeTable30(headers,rowHtml,minWidth,footerHtml);
  const template=document.createElement('template');
  template.innerHTML='<table><tbody>'+rowHtml.join('')+'</tbody></table>';
  for (const row of template.content.querySelectorAll('tbody > tr')) {
    for (const index of indices) {
      const cell=row.cells[index];
      if (!cell || cell.colSpan!==1) continue;
      const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);
      let text;
      while ((text=walker.nextNode())) {
        const value=formatDateText30(text.nodeValue);
        if (!value) continue;
        cell.dataset.dateValue30=value.date;
        text.nodeValue=value.label;
      }
    }
  }
  const rows=[...template.content.querySelector('tbody').children].map(row=>row.outerHTML);
  return datesBeforeTable30(headers,rows,minWidth,footerHtml);
};

