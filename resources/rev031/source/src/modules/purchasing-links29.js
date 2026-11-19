let receiptOrderFilter29 = '';
let receiptDraftOrder29 = '';

function purchaseLineIds29(data) {
  for (const order of data.orders) {
    for (const [index, line] of order.lines.entries()) {
      line.id ??= 'L' + (index + 1);
      line.unit ||= getPart(line.part)?.unit || '';
    }
  }
  return data;
}
function purchaseLineReceived29(order, line) {
  return state.receipts.filter(receipt => receipt.orderCode === order.code && receipt.orderLineId === line.id)
    .reduce((sum, receipt) => sum + Number(receipt.qty), 0);
}
function purchaseLineBalance29(order, line) {
  return Math.max(0, Number((line.qty - purchaseLineReceived29(order, line)).toFixed(8)));
}
function purchaseReceiptStatus29(order) {
  const hasReceipt = order.lines.some(line => purchaseLineReceived29(order,line) > 0);
  if (!hasReceipt) return 'Sin recibir';
  if (order.lines.some(line=>purchaseLineBalance29(order,line)>0)) return 'Parcial';
  return state.receipts.some(receipt=>receipt.orderCode===order.code&&receipt.status==='Por finalizar')
    ? 'Por finalizar' : 'Completa';
}
function checkPurchasedLines29(previous, updated) {
  if (!previous) return '';
  for (const line of previous.lines) {
    const received = purchaseLineReceived29(previous,line);
    if (!received) continue;
    const replacement = updated.lines.find(item => item.id === line.id);
    if (!replacement || replacement.part !== line.part || replacement.unit !== line.unit || replacement.qty + 1e-8 < received) {
      return 'Una partida con recibos debe conservar su parte, unidad y al menos la cantidad recibida.';
    }
    if (updated.supplier !== previous.supplier) return 'La orden ya tiene recibos. Conserva su proveedor.';
  }
  return '';
}
function openPurchaseReceiving29(code, newReceipt) {
  if (!requireLevel(newReceipt ? 2 : 1,'receive')) return;
  receiptOrderFilter29 = code;
  receiptDraftOrder29 = newReceipt ? code : '';
  uiState.receiptsMode = newReceipt ? 'new' : 'list';
  navigateScreen('receive');
}
function purchaseReceiptDetail29(order) {
  if (!levelFor('receive')) return '';
  const hasBalance = order.status === 'Abierta' && order.lines.some(line => purchaseLineBalance29(order,line) > 0);
  const link = (label, mode) => '<button type="button" class="btn soft" data-order="' + esc(order.code) +
    '" onclick="openPurchaseReceiving29(this.dataset.order,' + mode + ')">' + label + '</button>';
  return '<h3>Recepción por partida</h3>' + dataTable29(['No Parte','Unidad','Ordenado','Recibido','Pendiente'],
    order.lines.map(line => [line.part,line.unit,number34(line.qty),number34(purchaseLineReceived29(order,line)),
      number34(purchaseLineBalance29(order,line))])) +
    '<div class="actionbar">' + (hasBalance && levelFor('receive') >= 2 ? link('Recibir contra OC',true) : '') +
    link('Ver recibos de esta OC',false) + '</div>';
}
function eligiblePurchaseOrders29() {
  return operationsData29().orders.filter(order => order.status === 'Abierta' &&
    order.lines.some(line => getPart(line.part) && purchaseLineBalance29(order,line) > 0));
}
function validatePurchaseReceipt29(part, unit, quantity) {
  const orderCode = document.getElementById('r_order29')?.value;
  if (!orderCode) return null;
  const order = operationsData29().orders.find(row => row.code === orderCode);
  const lineId = document.getElementById('r_order_line29').value;
  const line = order?.lines.find(row => row.id === lineId);
  if (order?.status !== 'Abierta' || !line || line.part !== part || line.unit !== unit) {
    showMsg('Selecciona una partida válida de una orden abierta.',true);
    return false;
  }
  if (quantity > purchaseLineBalance29(order,line) + 1e-8) {
    showMsg('La cantidad supera el saldo de la partida.',true);
    return false;
  }
  return {orderCode:order.code,orderLineId:line.id,supplierCode:order.supplier};
}
function updatePurchaseReceiptOrder29() {
  const orderSelect = document.getElementById('r_order29');
  const order = eligiblePurchaseOrders29().find(row => row.code === orderSelect.value);
  const lineSelect = document.getElementById('r_order_line29');
  const labels = operationsData29().suppliers;
  const supplier = labels.find(row => row.code === order?.supplier);
  document.getElementById('r_supplier29').value = supplier ? supplier.code + ' · ' + supplier.name : '';
  lineSelect.disabled = !order;
  lineSelect.innerHTML = '<option value="">Seleccionar partida</option>' + (order?.lines || []).flatMap((line,index) => {
    if (!getPart(line.part) || purchaseLineBalance29(order,line) <= 0) return [];
    const text = (index + 1) + ' · ' + line.part + ' · Pendiente ' + number34(purchaseLineBalance29(order,line)) + ' ' + line.unit;
    return '<option value="' + esc(line.id) + '">' + esc(text) + '</option>';
  }).join('');
  if (lineSelect.options.length === 2) lineSelect.selectedIndex = 1;
  updatePurchaseReceiptLine29();
}
function updatePurchaseReceiptLine29() {
  const orderCode = document.getElementById('r_order29').value;
  const lineId = document.getElementById('r_order_line29').value;
  const order = eligiblePurchaseOrders29().find(row => row.code === orderCode);
  const line = order?.lines.find(row => row.id === lineId);
  const part = document.getElementById('r_part');
  part.readOnly = Boolean(order);
  part.value = line?.part || '';
  syncReceiptItem();
  if (line) document.getElementById('r_unit').value = line.unit;
  const note = document.getElementById('r_balance29');
  note.textContent = line ? 'Pendiente en esta partida: ' + number34(purchaseLineBalance29(order,line)) + ' ' + line.unit : '';
}
const receiptWithLocations29 = getReceiptFormHtml;
getReceiptFormHtml = function (back) {
  if (currentView !== 'receipts') return receiptWithLocations29(back);
  const options = eligiblePurchaseOrders29().map(order => [order.code,order.code + ' · ' +
    (operationsData29().suppliers.find(x => x.code === order.supplier)?.name || order.supplier)]);
  return receiptWithLocations29(back).replace('<div class="form-grid">','<div class="form-grid">' +
    '<label class="field" for="r_order29">Orden de compra<select class="select" id="r_order29" onchange="updatePurchaseReceiptOrder29()">' +
    '<option value="">Sin orden de compra</option>' + options.map(([code,label]) =>
      '<option value="' + esc(code) + '"' + (code === receiptDraftOrder29 ? ' selected' : '') + '>' + esc(label) + '</option>').join('') +
    '</select></label><label class="field" for="r_order_line29">Partida<select class="select" id="r_order_line29" onchange="updatePurchaseReceiptLine29()" disabled></select></label>' +
    '<label class="field" for="r_supplier29">Proveedor<input class="input" id="r_supplier29" readonly></label>')
    .replace('<div class="capture-actions">','<div class="ops-method" id="r_balance29" aria-live="polite"></div><div class="capture-actions">');
};

function selectReceiptOrderFilter29(event) {
  event.preventDefault();
  receiptOrderFilter29 = event.currentTarget.elements.r_order_filter29.value;
  renderReceipts();
  document.getElementById('r_order_filter29')?.focus();
}
function openNewPurchaseReceipt29() {
  receiptDraftOrder29 = receiptOrderFilter29;
  uiState.receiptsMode = 'new';
  renderApp();
}
function visiblePurchaseReceipts29() {
  return state.receipts.filter(row => !receiptOrderFilter29 || row.orderCode === receiptOrderFilter29);
}
const receiptHeaders29 = ['Recibo','Fecha','OC','Proveedor','No Parte','Descripción','Contenedores','Cantidad por contenedor','Cantidad total','Unidad','Ubicación','Lote proveedor','Estado'];
function purchaseReceiptCells29(receipt) {
  const supplier = operationsData29().suppliers.find(x => x.code === receipt.supplierCode);
  return [receipt.id,fmtDateDisplay(receipt.date),receipt.orderCode || '—',supplier?.name || receipt.supplierCode || '—',receipt.part,
    receipt.desc,receipt.containers,receipt.qtyPerContainer,receipt.qty,receipt.unit,receipt.location,receipt.lot || '',receipt.status];
}
function exportPurchaseReceipts29() {
  if (!requireLevel(1,'receive')) return;
  exportRows('recibos.csv',receiptHeaders29,visiblePurchaseReceipts29().map(purchaseReceiptCells29));
}
function openReceiptOrder29(code) {
  if (!requireLevel(1,'oc')) return;
  navigateScreen('oc');
  openOperationsRecord29(code);
}
const renderLegacyReceipts29 = renderReceipts;
renderReceipts = function () {
  if (currentView !== 'receipts') return renderLegacyReceipts29();
  if (uiState.receiptsMode === 'new') {
    renderLegacyReceipts29();
    updatePurchaseReceiptOrder29();
    return;
  }
  const orders = operationsData29().orders.map(row => ({value:row.code,label:row.code}));
  document.getElementById('view-receipts').innerHTML = cardNavigation29('Recibo OC',
    '<form class="ops-filters" aria-label="Filtros de recibos" onsubmit="selectReceiptOrderFilter29(event)"><div class="ops-fields">' +
    '<label class="field">Orden de compra<select class="select" id="r_order_filter29"><option value="">Todas</option>' +
    selectOptions(orders,false) + '</select></label></div><div class="ops-filter-actions"><button class="btn primary" type="submit">Buscar</button></div>' +
    '</form><div class="actionbar">' +
    (levelFor('receive') >= 2 ? '<button class="btn primary" type="button" onclick="openNewPurchaseReceipt29()">Agregar</button>' : '') +
    '<button class="btn soft" type="button" onclick="exportPurchaseReceipts29()">Exportar</button>' +
    screenAction29('Órdenes de compra','oc') + '</div>' +
    table(receiptHeaders29,visiblePurchaseReceipts29().map(receipt => '<tr>' +
      purchaseReceiptCells29(receipt).map((value,index) => {
        const label = esc(String(value ?? ''));
        if (index !== 2 || !receipt.orderCode || !levelFor('oc')) return '<td>' + label + '</td>';
        return '<td><button class="btn link" type="button" data-code="' + label +
          '" onclick="openReceiptOrder29(this.dataset.code)">' + label + '</button></td>';
      }).join('') + '</tr>')));
  document.getElementById('r_order_filter29').value = receiptOrderFilter29;
};

