// Requisition summaries and a separate editable worksheet share Laravel's workspace.
menuBindings29.requisitions = 'requisitions';
newScreens29.requisitions = { concept: 'requisitions' };
const purchasesMenu031 = menuApproved29.modules.find(
    (node) => node.id === 'compras',
);
const requestMenu031 = {
    id: 'requisitions',
    name: 'Requisiciones',
    kind: 'app',
};
purchasesMenu031.items.unshift(requestMenu031);
visitMenu29(requestMenu031, ['Compras']);
recordOpeners31.requisitions = 'openRequisition31';
let requisitionFilter031 = { query: '', status: '' };
const requisitionDrafts38 = new Map();
const requisitionRows031 = () => state.requisitions31 || [];
const requisitionStatus031 = (row) =>
    row.lines.every((line) => line.purchased)
        ? 'Completada'
        : row.lines.some((line) => line.purchased)
          ? 'Parcial'
          : 'Pendiente';
const requisitionCanBuy031 = () =>
    Boolean(window.insectLaravel.canCompleteRequisitions);
const requisitionCanEdit38 = () => levelFor('requisitions') >= 2;
function requisitionNext031() {
    return (
        'REQ-' +
        String(
            Math.max(
                0,
                ...requisitionRows031().map((row) => Number(row.code.slice(4))),
            ) + 1,
        ).padStart(6, '0')
    );
}
function filteredRequisitions031() {
    return requisitionRows031().filter(
        (row) =>
            (!requisitionFilter031.status ||
                requisitionStatus031(row) === requisitionFilter031.status) &&
            containsOperations29(
                [
                    row.code,
                    row.date,
                    row.requester,
                    row.reference,
                    ...row.lines.flatMap((line) => [
                        line.description,
                        line.quantity,
                        line.unit,
                        line.notes,
                    ]),
                ].join(' '),
                requisitionFilter031.query,
            ),
    );
}
function filterRequisitions031(event) {
    event.preventDefault();
    requisitionFilter031 = readOperationsForm29(event.currentTarget);
    renderApp();
}
function emptyRequisitionLine38() {
    return {
        id: crypto.randomUUID(),
        description: '',
        quantity: '',
        unit: '',
        notes: '',
        purchased: false,
    };
}
function requisitionDraft38() {
    const key = uiState.requisitionKey38 || 'new';
    if (!requisitionDrafts38.has(key)) {
        const saved = requisitionRows031().find((row) => row.code === key);
        if (key !== 'new' && !saved) return null;
        if (!saved && !requisitionCanEdit38()) return null;
        const row = saved
            ? structuredClone(saved)
            : {
                  id: crypto.randomUUID(),
                  code: requisitionNext031(),
                  date: dateLot29().id,
                  requester: shellSession.user,
                  reference: '',
                  lines: [emptyRequisitionLine38()],
              };
        requisitionDrafts38.set(key, { row, dirty: !saved });
    }
    return requisitionDrafts38.get(key);
}
function openRequisition31(code = '') {
    if (!requireLevel(code ? 1 : 2, 'requisitions')) return;
    if (code && !requisitionRows031().some((row) => row.code === code))
        return showMsg('No se encontró la requisición.', true);
    uiState.requisitionKey38 = code || 'new';
    conceptScreen = 'requisition-grid38';
    shellScreen = 'requisitions';
    renderApp();
    document
        .querySelector('.requisition-sheet38 [data-field=description]')
        ?.focus();
}
function requisitionBack38() {
    navigateScreen('requisitions');
}
function requisitionDiscard38() {
    requisitionDrafts38.delete(uiState.requisitionKey38 || 'new');
    requisitionBack38();
}
function updateRequisition38(input) {
    const draft = requisitionDraft38();
    if (!draft) return;
    const field = input.dataset.field;
    if (
        field === 'purchased'
            ? !requisitionCanBuy031()
            : !requisitionCanEdit38()
    )
        return;
    const row = input.closest('[data-line-id]');
    const target = row
        ? draft.row.lines.find((line) => line.id === row.dataset.lineId)
        : draft.row;
    if (!target) return;
    target[field] = field === 'purchased' ? input.checked : input.value;
    draft.dirty = true;
    requisitionSummary38();
}
function requisitionSummary38() {
    const draft = requisitionDraft38();
    if (!draft) return;
    const save = document.querySelector('[data-requisition-save38]');
    if (save) save.disabled = !draft.dirty;
    const progress = document.querySelector('[data-requisition-progress38]');
    if (progress)
        progress.textContent = `${draft.row.lines.filter((line) => line.purchased).length}/${draft.row.lines.length} compradas · ${requisitionStatus031(draft.row)}`;
    const status = document.querySelector('[data-requisition-status38]');
    if (status)
        status.textContent = draft.dirty ? 'Cambios sin guardar' : 'Guardado';
}
function requisitionCells38(line, index) {
    const editable = requisitionCanEdit38();
    const cell = (field, label, max) =>
        `<td><input data-field="${field}" aria-label="${label}, partida ${index + 1}" maxlength="${max}" ${field === 'description' ? 'required' : ''} value="${esc(line[field] || '')}" ${editable ? '' : 'readonly'} oninput="updateRequisition38(this)"></td>`;
    return (
        `<tr data-line-id="${esc(line.id)}"><td class="sheet-number38">${index + 1}</td><td class="sheet-check38"><input type="checkbox" data-field="purchased" aria-label="Comprada, partida ${index + 1}" ${line.purchased ? 'checked' : ''} ${requisitionCanBuy031() ? '' : 'disabled'} onchange="updateRequisition38(this)"></td>` +
        cell('description', 'Artículo o servicio', 500) +
        cell('quantity', 'Cantidad', 80) +
        cell('unit', 'Unidad', 80) +
        cell('notes', 'Notas', 1000) +
        `<td class="sheet-remove38">${editable ? `<button type="button" class="sheet-delete38" aria-label="Eliminar partida ${index + 1}" ${line.purchased && !requisitionCanBuy031() ? 'disabled' : ''} onclick="removeRequisitionLine031(this)">×</button>` : ''}</td></tr>`
    );
}
function refreshRequisitionSheet38(focusIndex, field = 'description') {
    const draft = requisitionDraft38();
    const body = document.querySelector('.requisition-sheet38 tbody');
    if (!draft || !body) return;
    body.innerHTML = draft.row.lines.map(requisitionCells38).join('');
    requisitionSummary38();
    body.rows[focusIndex]?.querySelector(`[data-field="${field}"]`)?.focus();
}
function addRequisitionLine031() {
    if (!requireLevel(2, 'requisitions')) return;
    const draft = requisitionDraft38();
    if (draft.row.lines.length >= 500)
        return showMsg('Una requisición admite hasta 500 partidas.', true);
    draft.row.lines.push(emptyRequisitionLine38());
    draft.dirty = true;
    refreshRequisitionSheet38(draft.row.lines.length - 1);
}
function removeRequisitionLine031(button) {
    if (!requireLevel(2, 'requisitions')) return;
    const draft = requisitionDraft38();
    if (draft.row.lines.length === 1)
        return showMsg(
            'La requisición debe conservar al menos una partida.',
            true,
        );
    const index = draft.row.lines.findIndex(
        (line) => line.id === button.closest('tr').dataset.lineId,
    );
    if (
        index < 0 ||
        (draft.row.lines[index].purchased && !requisitionCanBuy031())
    )
        return;
    draft.row.lines.splice(index, 1);
    draft.dirty = true;
    refreshRequisitionSheet38(Math.min(index, draft.row.lines.length - 1));
}
function requisitionKeydown38(event) {
    const input = event.target.closest('input[data-field]');
    if (
        !input ||
        input.type === 'checkbox' ||
        event.isComposing ||
        event.key !== 'Enter'
    )
        return;
    event.preventDefault();
    const row = input.closest('tr');
    const rows = [...row.parentElement.rows];
    const next = rows.indexOf(row) + (event.shiftKey ? -1 : 1);
    if (next === rows.length && requisitionCanEdit38()) addRequisitionLine031();
    const body = document.querySelector('.requisition-sheet38 tbody');
    body.rows[next]
        ?.querySelector(`[data-field="${input.dataset.field}"]`)
        ?.focus();
}
function requisitionPaste38(event) {
    const input = event.target.closest(
        'input[data-field]:not([type=checkbox])',
    );
    const text = event.clipboardData?.getData('text/plain');
    if (!input || !requisitionCanEdit38() || !text || !/[\t\r\n]/.test(text))
        return;
    event.preventDefault();
    const fields = ['description', 'quantity', 'unit', 'notes'];
    const startColumn = fields.indexOf(input.dataset.field);
    const values = text
        .replace(/\r\n?/g, '\n')
        .replace(/\n+$/, '')
        .split('\n')
        .map((row) => row.split('\t'));
    const draft = requisitionDraft38();
    const startRow = draft.row.lines.findIndex(
        (line) => line.id === input.closest('tr').dataset.lineId,
    );
    if (startRow + values.length > 500)
        return showMsg('Una requisición admite hasta 500 partidas.', true);
    const limits = [500, 80, 80, 1000];
    if (
        values.some(
            (row) =>
                row.length + startColumn > fields.length ||
                row.some(
                    (value, column) =>
                        value.length > limits[startColumn + column],
                ),
        )
    )
        return showMsg(
            'Pega las columnas Artículo o servicio, Cantidad, Unidad y Notas. El texto debe respetar el tamaño de cada campo.',
            true,
        );
    values.forEach((cells, offset) => {
        while (draft.row.lines.length <= startRow + offset)
            draft.row.lines.push(emptyRequisitionLine38());
        cells.forEach((value, column) => {
            draft.row.lines[startRow + offset][fields[startColumn + column]] =
                value;
        });
    });
    draft.dirty = true;
    refreshRequisitionSheet38(
        startRow + values.length - 1,
        fields[startColumn],
    );
}
function commitRequisition031(row) {
    const previous = state.requisitions31;
    const rows = requisitionRows031().slice(),
        index = rows.findIndex((item) => item.id === row.id);
    if (index < 0) rows.push(row);
    else rows[index] = row;
    state.requisitions31 = rows;
    try {
        saveState();
    } catch (error) {
        if (previous === undefined) delete state.requisitions31;
        else state.requisitions31 = previous;
        throw error;
    }
}
function saveRequisition031(event) {
    event.preventDefault();
    const draft = requisitionDraft38();
    if (!draft || !event.currentTarget.reportValidity()) return;
    const row = structuredClone(draft.row);
    row.requester = row.requester.trim();
    row.reference = (row.reference || '').trim();
    for (const line of row.lines)
        for (const key of ['description', 'quantity', 'unit', 'notes'])
            line[key] = (line[key] || '').trim();
    if (!row.requester || row.lines.some((line) => !line.description))
        return showMsg(
            'Indica el solicitante y el artículo o servicio de cada partida.',
            true,
        );
    try {
        if ((uiState.requisitionKey38 || 'new') === 'new')
            row.code = requisitionNext031();
        commitRequisition031(row);
        requisitionDrafts38.delete(uiState.requisitionKey38 || 'new');
        uiState.requisitionKey38 = row.code;
        requisitionDrafts38.set(row.code, {
            row: structuredClone(row),
            dirty: false,
        });
        lastRouteKey = '';
        renderApp();
        showMsg('Requisición guardada.');
    } catch (error) {
        showMsg(error.message, true);
    }
}
function exportRequisitions031() {
    exportRows(
        'requisiciones.csv',
        [
            'Consecutivo',
            'Fecha',
            'Solicitante',
            'Referencia',
            'Artículo o servicio',
            'Cantidad',
            'Unidad',
            'Notas',
            'Comprada',
            'Estatus',
        ],
        filteredRequisitions031().flatMap((row) =>
            row.lines.map((line) => [
                row.code,
                row.date,
                row.requester,
                row.reference,
                line.description,
                line.quantity,
                line.unit,
                line.notes,
                line.purchased ? 'Sí' : 'No',
                requisitionStatus031(row),
            ]),
        ),
    );
}
function requisitionsScreen031() {
    const filters =
        '<form class="ops-filters" aria-label="Filtros de requisiciones" onsubmit="filterRequisitions031(event)">' +
        operationsField29(
            field29('query', 'Buscar'),
            requisitionFilter031.query,
            true,
        ) +
        operationsField29(
            choice29('status', 'Estatus', [
                ['Pendiente', 'Pendiente'],
                ['Parcial', 'Parcial'],
                ['Completada', 'Completada'],
            ]),
            requisitionFilter031.status,
            true,
        ) +
        '<button class="btn primary">Buscar</button></form>';
    const actions =
        '<div class="actionbar" aria-label="Acciones">' +
        (requisitionCanEdit38()
            ? '<button class="btn primary" onclick="openRequisition31()">Agregar</button>'
            : '') +
        '<button class="btn soft" onclick="exportRequisitions031()">Exportar</button></div>';
    const rows = filteredRequisitions031().map(
        (row) =>
            '<tr><td><button class="btn link" data-code="' +
            esc(row.code) +
            '" onclick="openRequisition31(this.dataset.code)">' +
            esc(row.code) +
            '</button></td><td>' +
            esc(dateDisplay34(row.date)) +
            '</td><td>' +
            esc(row.requester) +
            '</td><td>' +
            esc(row.reference) +
            '</td><td>' +
            row.lines.length +
            '</td><td>' +
            row.lines.filter((line) => line.purchased).length +
            '/' +
            row.lines.length +
            '</td><td>' +
            esc(requisitionStatus031(row)) +
            '</td></tr>',
    );
    return cardNavigation29(
        'Requisiciones',
        filters +
            actions +
            resultsTable30(
                [
                    'Consecutivo',
                    'Fecha',
                    'Solicitante',
                    'Referencia',
                    'Partidas',
                    'Avance',
                    'Estatus',
                ],
                rows,
                '900px',
            ),
    );
}
function requisitionGridScreen38() {
    const draft = requisitionDraft38();
    if (!draft)
        return cardNavigation29(
            'Requisición',
            '<div class="empty-state">No se encontró la requisición.</div><button class="btn soft" onclick="requisitionBack38()">Volver al listado</button>',
        );
    const row = draft.row,
        editable = requisitionCanEdit38();
    const metadata = (field, label, max, type = 'text') =>
        `<label>${label}<input class="input" data-field="${field}" aria-label="${label}" type="${type}" ${max ? `maxlength="${max}"` : ''} ${['date', 'requester'].includes(field) ? 'required' : ''} value="${esc(row[field] || '')}" ${editable ? '' : 'readonly'} oninput="updateRequisition38(this)"></label>`;
    const body =
        `<form class="requisition-grid-form38" data-consult-control30 onsubmit="saveRequisition031(event)"><div class="requisition-meta38">${metadata('date', 'Fecha', 0, 'date')}${metadata('requester', 'Solicitante', 120)}${metadata('reference', 'Referencia o motivo', 500)}</div>` +
        `<div class="actionbar requisition-grid-actions38"><button type="button" class="btn soft" onclick="requisitionBack38()">Volver al listado</button>${editable || requisitionCanBuy031() ? `<button type="submit" class="btn primary" data-requisition-save38 ${draft.dirty ? '' : 'disabled'}>Guardar</button>` : ''}${editable ? '<button type="button" class="btn soft" onclick="addRequisitionLine031()">Agregar partida</button>' : ''}${editable || requisitionCanBuy031() ? '<button type="button" class="btn link" onclick="requisitionDiscard38()">Descartar cambios</button>' : ''}<span class="requisition-save38" data-requisition-status38 role="status">${draft.dirty ? 'Cambios sin guardar' : 'Guardado'}</span></div>` +
        `<div class="requisition-grid-caption38"><span data-requisition-progress38>${row.lines.filter((line) => line.purchased).length}/${row.lines.length} compradas · ${requisitionStatus031(row)}</span>${editable ? '<small>Enter: siguiente fila · Tab: siguiente celda · Pega filas desde Excel</small>' : ''}</div>` +
        `<div class="requisition-sheet-wrap38"><table class="requisition-sheet38 excel-grid34" aria-label="Partidas de la requisición" onkeydown="requisitionKeydown38(event)" onpaste="requisitionPaste38(event)"><colgroup><col class="sheet-number38"><col class="sheet-check38"><col class="sheet-description38"><col class="sheet-quantity38"><col class="sheet-unit38"><col class="sheet-notes38"><col class="sheet-remove38"></colgroup><thead><tr><th scope="col">#</th><th scope="col">Comprada</th><th scope="col">Artículo o servicio</th><th scope="col">Cantidad</th><th scope="col">Unidad</th><th scope="col">Notas</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody>${row.lines.map(requisitionCells38).join('')}</tbody></table></div></form>`;
    return cardNavigation29(
        (uiState.requisitionKey38 === 'new'
            ? 'Nueva requisición · '
            : 'Requisición · ') + esc(row.code),
        body,
    );
}
const conceptBeforeRequisitions031 = renderConceptScreen;
renderConceptScreen = function () {
    if (
        conceptScreen === 'requisitions' ||
        conceptScreen === 'requisition-grid38'
    ) {
        document.getElementById('view-' + currentView).innerHTML =
            conceptScreen === 'requisitions'
                ? requisitionsScreen031()
                : requisitionGridScreen38();
        return;
    }
    return conceptBeforeRequisitions031();
};
const requisitionKeyRoute38 = keyRoute29;
keyRoute29 = function (route) {
    const key = requisitionKeyRoute38(route);
    return route.concept === 'requisition-grid38'
        ? key + ':' + (route.ui.requisitionKey38 || 'new')
        : key;
};
const requisitionSyncRoute38 = syncRoute29;
syncRoute29 = function () {
    requisitionSyncRoute38();
    if (shellScreen === 'requisitions' && !restoringRoute && !routePause) {
        const hash =
            '#/requisitions' +
            (conceptScreen === 'requisition-grid38'
                ? '/' + encodeURIComponent(uiState.requisitionKey38 || 'new')
                : '');
        if (location.hash !== hash)
            history.replaceState(history.state, '', hash);
    }
};
const requisitionRestore38 = restoreInitialRoute29;
restoreInitialRoute29 = function () {
    requisitionRestore38();
    if (shellScreen !== 'requisitions') return;
    const code = location.hash.split('/')[2];
    if (code) {
        try {
            uiState.requisitionKey38 = decodeURIComponent(code);
            conceptScreen = 'requisition-grid38';
        } catch {
            conceptScreen = 'requisitions';
        }
    }
};
window.addEventListener('insectmes:shell', () => {
    if (
        conceptScreen === 'requisition-grid38' &&
        !window.insectLaravel.nativePage
    ) {
        const title = document.getElementById('pageTitle');
        if (title)
            title.textContent =
                uiState.requisitionKey38 === 'new'
                    ? 'Nueva requisición'
                    : uiState.requisitionKey38 || 'Requisición';
    }
});
window.addEventListener('beforeunload', (event) => {
    if ([...requisitionDrafts38.values()].some((draft) => draft.dirty)) {
        event.preventDefault();
        event.returnValue = '';
    }
});
