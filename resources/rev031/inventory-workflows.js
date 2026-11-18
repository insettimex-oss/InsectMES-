screenRegistry.push({
    id: 'inventory-workflow',
    name: 'Escaneo de inventario',
    module: 'Inventario',
    concept: 'inventory-workflow36',
});
inheritedAccess29['inventory-workflow'] = 'inventory';
let inventoryWorkflow36 = {
    action: 'Move',
    serials: [],
    target: '',
    destination: '',
    count: 2,
    quantities: [],
    modal: false,
};
function inventoryWorkflowRow36(code) {
    return state.serials.find((row) => row.serial === code);
}
function workflowSources36() {
    return inventoryWorkflow36.serials
        .map(inventoryWorkflowRow36)
        .filter(Boolean);
}
function openInventoryWorkflow36(action, codes = [], modal = false) {
    if (!requireLevel(1, 'inventory')) return;
    inventoryWorkflow36 = {
        action,
        serials: [...codes],
        target: '',
        destination: '',
        count: 2,
        quantities: [],
        modal,
    };
    if (action === 'Split' && codes.length) splitQuantities36(2);
    if (modal) renderInventoryWorkflow36();
    else navigateScreen('inventory-workflow');
}
function workflowAction36(action) {
    const rows = workflowSources36();
    if (['Trace', 'Split'].includes(action) && rows.length > 1)
        return showMsg(
            'Esta acción requiere un solo serial. Retira los demás del listado.',
            true,
        );
    if (action === 'Merge' && new Set(rows.map((row) => row.part)).size > 1)
        return showMsg('Merge requiere el mismo No Parte.', true);
    inventoryWorkflow36.action = action;
    inventoryWorkflow36.target = '';
    if (action === 'Split' && rows.length) splitQuantities36(2);
    renderInventoryWorkflow36();
}
function scanInventory36(value) {
    const codes = String(value)
        .split(/[\s,;]+/)
        .map((code) => code.trim())
        .filter(Boolean);
    if (!codes.length) return;
    const selected = [...inventoryWorkflow36.serials];
    try {
        for (const code of codes) {
            const row = state.serials.find(
                (item) => item.serial.toLowerCase() === code.toLowerCase(),
            );
            if (!row) throw Error('Serial no encontrado: ' + code);
            if (selected.includes(row.serial))
                throw Error('El serial ya está en el listado: ' + row.serial);
            if (
                inventoryWorkflow36.action !== 'Trace' &&
                (!inventoryRecordActive30(row) ||
                    row.quarantined ||
                    requiresFinalization30(state, row))
            )
                throw Error('El serial no está disponible: ' + row.serial);
            selected.push(row.serial);
        }
        if (
            ['Trace', 'Split'].includes(inventoryWorkflow36.action) &&
            selected.length > 1
        )
            throw Error('Esta acción admite un solo serial.');
        if (
            inventoryWorkflow36.action === 'Merge' &&
            new Set(selected.map((code) => inventoryWorkflowRow36(code).part))
                .size > 1
        )
            throw Error('Merge requiere el mismo No Parte.');
        inventoryWorkflow36.serials = selected;
        if (inventoryWorkflow36.action === 'Split')
            splitQuantities36(inventoryWorkflow36.count);
        renderInventoryWorkflow36();
        document.querySelector('#inventory-scan36')?.focus();
    } catch (error) {
        showMsg(error.message, true);
    }
}
function removeWorkflowSerial36(code) {
    inventoryWorkflow36.serials = inventoryWorkflow36.serials.filter(
        (serial) => serial !== code,
    );
    if (inventoryWorkflow36.target === code) inventoryWorkflow36.target = '';
    renderInventoryWorkflow36();
}
function splitQuantities36(count) {
    count = Number(count);
    if (!Number.isInteger(count) || count < 2 || count > 1000) return;
    inventoryWorkflow36.count = count;
    const source = workflowSources36()[0];
    if (!source) return;
    const each = Math.floor((Number(source.qtyCurrent) * 1e6) / count) / 1e6;
    inventoryWorkflow36.quantities = Array(count).fill(each);
    inventoryWorkflow36.quantities[count - 1] = Number(
        (source.qtyCurrent - each * (count - 1)).toFixed(6),
    );
}
function changeSplitCount36(count) {
    splitQuantities36(count);
    renderInventoryWorkflow36();
}
function workflowBody36() {
    const draft = inventoryWorkflow36,
        rows = workflowSources36(),
        names = {
            Trace: 'Trazabilidad',
            Move: 'Move',
            Split: 'Split',
            Merge: 'Merge',
        };
    const actions =
        '<div class="actionbar">' +
        Object.entries(names)
            .map(
                ([action, name]) =>
                    '<button type="button" class="btn ' +
                    (draft.action === action ? 'primary' : 'soft') +
                    '" data-workflow-action36="' +
                    action +
                    '" onclick="workflowAction36(this.dataset.workflowAction36)">' +
                    name +
                    '</button>',
            )
            .join('') +
        '</div>';
    const scan =
        '<div class="workflow-scan36"><label>Escanear serial<input class="input" id="inventory-scan36" aria-label="Escanear serial" autocomplete="off" onkeydown="if(event.key===\'Enter\'){event.preventDefault();scanInventory36(this.value)}"></label><button type="button" class="btn soft" onclick="scanInventory36(document.getElementById(\'inventory-scan36\').value)">Agregar serial</button></div><details class="workflow-paste36"><summary>Pegar varios seriales</summary><textarea class="input" id="inventory-paste36" aria-label="Seriales para escaneo masivo" rows="3"></textarea><button type="button" class="btn soft" onclick="scanInventory36(document.getElementById(\'inventory-paste36\').value)">Agregar seriales</button></details>';
    const table = resultsTable30(
        ['Serial', 'No Parte', 'Descripción', 'Cantidad', 'Unidad', ''],
        rows.map(
            (row) =>
                '<tr><td>' +
                esc(row.serial) +
                '</td><td>' +
                esc(row.part) +
                '</td><td>' +
                esc(getPart(row.part)?.desc || row.desc || '') +
                '</td><td>' +
                number34(row.qtyCurrent) +
                '</td><td>' +
                esc(row.unit) +
                '</td><td><button type="button" class="btn soft" data-serial="' +
                esc(row.serial) +
                '" onclick="removeWorkflowSerial36(this.dataset.serial)">Retirar</button></td></tr>',
        ),
        '600px',
    );
    let fields = '';
    if (draft.action === 'Move')
        fields =
            '<label>Destino<select class="select" aria-label="Destino del Move" required onchange="inventoryWorkflow36.destination=this.value"><option value="">Seleccionar destino</option>' +
            state.setupTables.Locations.filter((row) => row.active)
                .map(
                    (row) =>
                        '<option value="' +
                        esc(row.code) +
                        '" ' +
                        (draft.destination === row.code ? 'selected' : '') +
                        '>' +
                        esc(row.code + ' · ' + (row.description || '')) +
                        '</option>',
                )
                .join('') +
            '</select></label>';
    if (draft.action === 'Merge')
        fields =
            '<label>Serial que se conserva<select class="select" aria-label="Serial que se conserva" required onchange="inventoryWorkflow36.target=this.value"><option value="">Seleccionar serial</option>' +
            rows
                .map(
                    (row) =>
                        '<option value="' +
                        esc(row.serial) +
                        '" ' +
                        (draft.target === row.serial ? 'selected' : '') +
                        '>' +
                        esc(row.serial) +
                        '</option>',
                )
                .join('') +
            '</select></label><p>La cantidad se concentra en este serial y conserva su ubicación. Los demás quedan inactivos con su historial.</p>';
    if (draft.action === 'Split')
        fields =
            '<label>Total de seriales al finalizar<input class="input" type="number" aria-label="Total de seriales al finalizar" min="2" max="1000" step="1" value="' +
            draft.count +
            '" onchange="changeSplitCount36(this.value)"></label>' +
            (rows.length
                ? '<div class="split-quantities36">' +
                  draft.quantities
                      .map(
                          (qty, index) =>
                              '<label>' +
                              esc(
                                  index === 0
                                      ? rows[0].serial + ' · se conserva'
                                      : 'Nuevo serial ' + (index + 1),
                              ) +
                              '<input class="input" type="number" aria-label="Cantidad división ' +
                              (index + 1) +
                              '" min="0.000001" step="any" required value="' +
                              qty +
                              '" oninput="inventoryWorkflow36.quantities[' +
                              index +
                              ']=Number(this.value)"></label>',
                      )
                      .join('') +
                  '</div><p>El original se conserva en la primera división. Las demás reciben un serial propio. Se mantiene la ubicación y la cantidad total.</p>'
                : '');
    const valid =
        draft.action === 'Merge'
            ? rows.length >= 2
            : ['Trace', 'Split'].includes(draft.action)
              ? rows.length === 1
              : rows.length >= 1;
    const canRun =
        draft.action === 'Trace'
            ? levelFor('trace') >= 1
            : levelFor('inventory') >= 2;
    return (
        actions +
        scan +
        table +
        '<form class="workflow-confirm36" onsubmit="confirmInventoryWorkflow36(event)">' +
        fields +
        '<div class="actionbar"><button class="btn primary" ' +
        (!valid || !canRun ? 'disabled' : '') +
        '>' +
        (draft.action === 'Trace'
            ? 'Ver trazabilidad'
            : 'Confirmar ' + draft.action) +
        '</button><button type="button" class="btn soft" onclick="' +
        (draft.modal ? 'closeConfigDialog()' : "navigateScreen('inventory')") +
        '">Cancelar</button></div><p class="workflow-error36" role="alert" id="workflow-error36"></p></form>'
    );
}
function renderInventoryWorkflow36() {
    const body = workflowBody36();
    if (inventoryWorkflow36.modal)
        configDialog(
            inventoryWorkflow36.action === 'Trace'
                ? 'Trazabilidad'
                : 'Inventario · ' + inventoryWorkflow36.action,
            body,
        );
    else
        document.getElementById('view-' + currentView).innerHTML =
            cardNavigation29('Escaneo de inventario', body);
}
function transactSelected36(action, args) {
    if (!requireLevel(2, 'inventory'))
        throw Error('Su rol no permite movimientos.');
    const codes = [...args.serials];
    if (!codes.length || new Set(codes).size !== codes.length)
        throw Error('Selecciona seriales distintos.');
    let sources = codes.map(inventoryWorkflowRow36);
    if (
        sources.some(
            (row) =>
                !row ||
                !inventoryRecordActive30(row) ||
                row.quarantined ||
                requiresFinalization30(state, row),
        )
    )
        throw Error(
            'Hay seriales inactivos, en cuarentena o pendientes de finalización.',
        );
    for (const row of sources) {
        const rule = getSetupRow('Container_Status', row.status);
        if (
            !rule ||
            (action === 'Move' && !rule.allowMove) ||
            (action === 'Split' && rule.preventSplit) ||
            (action === 'Merge' && rule.preventMerge)
        )
            throw Error('El estatus del contenedor no permite ' + action + '.');
    }
    if (
        action === 'Move' &&
        !state.setupTables.Locations.some(
            (row) => row.active && row.code === args.destination,
        )
    )
        throw Error('Selecciona un destino activo.');
    if (
        action === 'Merge' &&
        (codes.length < 2 ||
            !codes.includes(args.target) ||
            sources.some((row) => row.part !== sources[0].part))
    )
        throw Error(
            'Selecciona dos o más seriales del mismo No Parte y el serial que se conserva.',
        );
    const lots = [
        ...new Set(
            sources
                .flatMap(
                    (row) =>
                        row.productionLots || [row.productionLot || row.lot],
                )
                .filter(Boolean),
        ),
    ];
    if (
        action === 'Merge' &&
        lots.length > 1 &&
        !state.settings.allowMixedLotsMerge
    )
        throw Error('La configuración no permite mezclar lotes.');
    if (
        action === 'Split' &&
        (codes.length !== 1 ||
            args.quantities.length < 2 ||
            args.quantities.length > 1000 ||
            args.quantities.some((q) => !Number.isFinite(q) || q <= 0) ||
            Math.abs(
                args.quantities.reduce((a, b) => a + b, 0) -
                    sources[0].qtyCurrent,
            ) > 1e-6)
    )
        throw Error(
            'Las divisiones deben ser positivas y sumar la cantidad original.',
        );
    const consumed = containerStatusCode30('CONSUMED');
    if (action === 'Merge' && !getSetupRow('Container_Status', consumed))
        throw Error('Configura el estatus de contenedor consumido.');
    const outputs = [],
        tx = {
            id: crypto.randomUUID(),
            action,
            sources: codes,
            target: action === 'Split' ? codes[0] : args.target || null,
            destination: args.destination || null,
            at: new Date().toISOString(),
            outputs,
        };
    saveReceivingState30(() => {
        sources = codes.map(inventoryWorkflowRow36);
        if (action === 'Move') {
            for (const row of sources) {
                const from = row.location;
                row.location = args.destination;
                addMovement(
                    'MOVE',
                    row.serial,
                    row.part,
                    row.qtyCurrent,
                    row.unit,
                    from + ' → ' + row.location,
                );
                outputs.push({ serial: row.serial, quantity: row.qtyCurrent });
            }
        }
        if (action === 'Split') {
            const parent = sources[0],
                original = structuredClone(parent);
            parent.qtyCurrent = args.quantities[0];
            outputs.push({
                serial: parent.serial,
                quantity: parent.qtyCurrent,
            });
            for (const quantity of args.quantities.slice(1)) {
                const serial = getNextSerial(
                        getPart(parent.part)?.serialPrefix || 'BSF',
                    ),
                    child = {
                        ...structuredClone(original),
                        serial,
                        qtyCurrent: quantity,
                        qtyInitial: quantity,
                        origin: 'SPLIT',
                        parentSerials: [parent.serial],
                    };
                state.serials.push(child);
                outputs.push({ serial, quantity });
                state.genealogy.unshift({
                    ts: tx.at,
                    parent: parent.serial,
                    child: serial,
                    action: 'SPLIT',
                    qty: quantity,
                    unit: parent.unit,
                    ref: tx.id,
                });
                addMovement(
                    'SPLIT',
                    serial,
                    parent.part,
                    quantity,
                    parent.unit,
                    tx.id,
                );
            }
            addMovement(
                'SPLIT-OUT',
                parent.serial,
                parent.part,
                original.qtyCurrent - parent.qtyCurrent,
                parent.unit,
                tx.id,
            );
        }
        if (action === 'Merge') {
            const target = inventoryWorkflowRow36(args.target),
                total = sources.reduce(
                    (sum, row) =>
                        sum + amountIn30(row.qtyCurrent, row.unit, target.unit),
                    0,
                );
            const incoming = Number((total - target.qtyCurrent).toFixed(6));
            for (const row of sources.filter((row) => row !== target)) {
                const qty = row.qtyCurrent;
                state.genealogy.unshift({
                    ts: tx.at,
                    parent: row.serial,
                    child: target.serial,
                    action: 'MERGE',
                    qty,
                    unit: row.unit,
                    ref: tx.id,
                });
                row.qtyCurrent = 0;
                row.active = false;
                row.status = consumed;
                addMovement(
                    'MERGE-OUT',
                    row.serial,
                    row.part,
                    qty,
                    row.unit,
                    tx.id,
                );
            }
            target.qtyCurrent = Number(total.toFixed(6));
            if (lots.length > 1) target.productionLots = lots;
            outputs.push({
                serial: target.serial,
                quantity: target.qtyCurrent,
            });
            addMovement(
                'MERGE',
                target.serial,
                target.part,
                incoming,
                target.unit,
                tx.id,
            );
        }
        state.inventoryTransactions36 ??= [];
        state.inventoryTransactions36.unshift(tx);
    });
    return outputs.map((row) => row.serial);
}
function confirmInventoryWorkflow36(event) {
    event.preventDefault();
    const draft = inventoryWorkflow36;
    if (draft.action === 'Trace') {
        if (draft.modal) closeConfigDialog();
        navigateScreen('trace', draft.serials[0]);
        return;
    }
    try {
        transactSelected36(draft.action, draft);
        if (draft.modal) closeConfigDialog();
        gridSelections30.delete('inventory');
        gridSelections30.delete('containers');
        navigateScreen('inventory');
        showMsg('Movimiento registrado.');
    } catch (error) {
        const target = document.getElementById('workflow-error36');
        if (target) target.textContent = error.message;
        else showMsg(error.message, true);
    }
}
function inventoryButtons36() {
    if (!['inventory', 'containers'].includes(shellScreen)) return;
    const codes = selectedRows30(shellScreen),
        rows = codes.map(inventoryWorkflowRow36),
        n = codes.length,
        trace = document.querySelector('[data-inventory-trace]');
    if (trace) {
        trace.disabled = levelFor('trace') < 1 || n > 1;
        trace.innerHTML =
            'Trazabilidad' + (!n ? ' <span aria-hidden="true">↗</span>' : '');
        trace.onclick = () =>
            n ? traceContainer30() : openInventoryWorkflow36('Trace');
    }
    for (const button of document.querySelectorAll(
        '[data-container-action31]',
    )) {
        const action = button.dataset.containerAction31;
        button.disabled = !n
            ? levelFor('inventory') < 1
            : levelFor('inventory') < 2 ||
              (action === 'Split'
                  ? n !== 1
                  : action === 'Merge'
                    ? n < 2 || new Set(rows.map((row) => row.part)).size !== 1
                    : false);
        button.innerHTML =
            action + (!n ? ' <span aria-hidden="true">↗</span>' : '');
        button.onclick = () => openInventoryWorkflow36(action, codes, n > 0);
    }
}
const inventoryChecksBefore36 = refreshGridChecks30;
refreshGridChecks30 = function (grid) {
    inventoryChecksBefore36(grid);
    inventoryButtons36();
};
const inventoryRenderBefore36 = renderInventory;
renderInventory = function () {
    inventoryRenderBefore36();
    inventoryButtons36();
};
const inventoryConceptBefore36 = renderConceptScreen;
renderConceptScreen = function () {
    if (conceptScreen === 'inventory-workflow36')
        return renderInventoryWorkflow36();
    return inventoryConceptBefore36();
};
