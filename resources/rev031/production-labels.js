function productionRoute36(row, operation, db = state) {
    const run = (db.operationRuns || []).find(
            (item) => item.serial === row.serial,
        ),
        job = (db.operationsDesk29?.jobs || []).find(
            (item) => item.code === (row.jobCode || run?.jobCode),
        );
    const routes = (db.engineering29?.routes || []).filter(
        (route) =>
            route.active &&
            route.part === row.part &&
            route.operation === operation,
    );
    const explicit = row.routingId || run?.routeId || job?.routeId;
    if (explicit && routes.some((route) => route.id === explicit))
        return explicit;
    return routes.length === 1 ? routes[0].id : '';
}
labelForContainer30 = function (row) {
    const run = (state.operationRuns || []).find(
            (item) => item.serial === row.serial,
        ),
        operation = row.operationCode || row.operation || run?.operation;
    const routing = productionRoute36(row, operation),
        assignments = state.labels30.assignments;
    const candidates = [
        assignments.find(
            (item) => item.scope === 'routing' && item.code === routing,
        )?.label,
        assignments.find(
            (item) => item.scope === 'operation' && item.code === operation,
        )?.label,
        assignments.find(
            (item) => item.scope === 'part' && item.code === row.part,
        )?.label,
        state.labels30.defaultCode,
    ];
    const template = candidates
        .map(labelTemplate30)
        .find((item) => item?.active);
    if (!template)
        throw Error(
            'No hay una etiqueta activa para este serial, su operación o Process Routing.',
        );
    return template;
};
const assignmentChoicesBefore36 = labelAssignmentChoices30;
labelAssignmentChoices30 = function (form) {
    const scope = form.elements.scope;
    if (!scope.querySelector('option[value=routing]'))
        scope.insertAdjacentHTML(
            'beforeend',
            '<option value="routing">Process Routing</option>',
        );
    if (scope.value !== 'routing') return assignmentChoicesBefore36(form);
    document.getElementById('label-assignment-search30').innerHTML =
        '<label>Process Routing<select class="select" name="routing" aria-label="Process Routing de la etiqueta" required><option value="">Seleccionar Process Routing</option>' +
        engineeringData29()
            .routes.filter((route) => route.active)
            .map(
                (route) =>
                    '<option value="' +
                    esc(route.id) +
                    '">' +
                    esc(
                        [
                            route.part,
                            route.revision,
                            route.sequence,
                            route.operation,
                        ].join(' · '),
                    ) +
                    '</option>',
            )
            .join('') +
        '</select></label>';
};
const assignLabelBefore36 = assignLabel30;
assignLabel30 = function (form) {
    if (form.elements.scope.value !== 'routing')
        return assignLabelBefore36(form);
    if (!requireLevel(2, 'labels')) return;
    const code = form.elements.routing.value,
        label = labelDraft30.previousCode;
    if (
        !code ||
        !labelTemplate30(label) ||
        !engineeringData29().routes.some(
            (route) => route.active && route.id === code,
        )
    )
        return showMsg(
            'Selecciona un Process Routing activo y guarda el diseño.',
            true,
        );
    try {
        saveReceivingState30(() => {
            const old = state.labels30.assignments.find(
                (item) => item.scope === 'routing' && item.code === code,
            );
            if (old) old.label = label;
            else
                state.labels30.assignments.push({
                    scope: 'routing',
                    code,
                    label,
                });
        });
        renderLabelAssignments30();
        showMsg('Asignación guardada.');
    } catch (error) {
        showMsg(error.message, true);
    }
};
renderLabelAssignments30 = function () {
    const target = document.getElementById('label-assignments-grid30');
    if (!target) return;
    const rows = state.labels30.assignments.filter(
        (item) => item.label === labelDraft30.previousCode,
    );
    target.innerHTML = resultsTable30(
        ['Nivel', 'Código', 'Nombre', ''],
        rows.map((item) => {
            const route = engineeringData29().routes.find(
                (route) => route.id === item.code,
            );
            const name =
                item.scope === 'routing'
                    ? route &&
                      [route.part, route.sequence, route.operation].join(' · ')
                    : item.scope === 'part'
                      ? getPart(item.code)?.desc
                      : engineeringData29().operations.find(
                            (op) => op.code === item.code,
                        )?.name;
            return (
                '<tr><td>' +
                esc(
                    {
                        routing: 'Process Routing',
                        part: 'No Parte',
                        operation: 'Operación',
                    }[item.scope] || item.scope,
                ) +
                '</td><td>' +
                esc(item.code) +
                '</td><td>' +
                esc(name || '') +
                '</td><td><button type="button" class="btn danger" data-assignment36="' +
                esc(item.scope + '|' + item.code) +
                '">Eliminar</button></td></tr>'
            );
        }),
        '450px',
    );
    for (const button of target.querySelectorAll('[data-assignment36]'))
        button.onclick = () => {
            if (!requireLevel(2, 'labels')) return;
            const [scope, code] = button.dataset.assignment36.split('|');
            try {
                saveReceivingState30(
                    () =>
                        (state.labels30.assignments =
                            state.labels30.assignments.filter(
                                (item) =>
                                    !(
                                        item.scope === scope &&
                                        item.code === code
                                    ),
                            )),
                );
                renderLabelAssignments30();
            } catch (error) {
                showMsg(error.message, true);
            }
        };
};
const recordProductionLabelsBefore36 = recordCP29;
recordCP29 = function (db, station, args) {
    const before = new Set(db.serials.map((row) => row.serial)),
        result = recordProductionLabelsBefore36(db, station, args);
    for (const row of db.serials.filter((row) => !before.has(row.serial))) {
        row.operationCode = station.code;
        const routing = productionRoute36(row, station.code, db);
        if (routing) row.routingId = routing;
    }
    return result;
};
async function printSerialLabels36(codes, operation) {
    const serials = [...new Set(codes)];
    if (!serials.length) throw Error('Selecciona al menos un serial.');
    const jobs = serials.map((code) => {
        const stored = state.serials.find((row) => row.serial === code);
        if (!stored) throw Error('El serial ya no está disponible: ' + code);
        const row = operation
            ? { ...stored, operationCode: operation }
            : stored;
        return { row, template: labelForContainer30(row) };
    });
    const blob = await makeLabelPDF30(jobs);
    saveReceivingState30(() => {
        state.labelPrints30 ??= [];
        state.labelPrints30.unshift({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            serials,
            labels: jobs.map((job) => job.template.code),
        });
    });
    showLabelPDF30(blob);
}
function productionSerials36() {
    const station = op29(),
        job = document.querySelector('[name=productionJob30]')?.value || '',
        codes = new Set(
            state.operationRuns
                .filter(
                    (run) =>
                        run.wc === station.wc &&
                        run.operation === station.code &&
                        panelRunPart30(run) === station.part &&
                        (!job || run.jobCode === job),
                )
                .map((run) => run.serial),
        );
    if (station.code === 'NUR')
        for (const entry of state.nursery.entries) codes.add(entry.serial);
    if (!job)
        for (const row of state.serials)
            if (row.part === station.part && row.location === station.wc)
                codes.add(row.serial);
    return [...codes]
        .map((code) => state.serials.find((row) => row.serial === code))
        .filter(Boolean);
}
function updateProductionPrint36() {
    const dialog = document.getElementById('configDialog'),
        boxes = [...dialog.querySelectorAll('[data-production-serial36]')],
        selected = boxes.filter((box) => box.checked).length;
    const button = dialog.querySelector('[data-production-print36]');
    if (button) button.disabled = !selected;
    const all = dialog.querySelector('[data-production-all36]');
    if (all) {
        all.checked = boxes.length > 0 && selected === boxes.length;
        all.indeterminate = selected > 0 && selected < boxes.length;
    }
}
async function printCurrentProduction36() {
    try {
        const codes = [
            ...document.querySelectorAll(
                '#configDialog [data-production-serial36]:checked',
            ),
        ].map((box) => box.value);
        await printSerialLabels36(codes, op29().code);
    } catch (error) {
        showMsg(error.message, true);
    }
}
openCurrentProduction30 = function () {
    if (!requireLevel(1, 'control')) return;
    const rows = productionSerials36();
    configDialog(
        'Producción actual',
        '<div class="production-current36"><div class="actionbar"><button type="button" class="btn primary" data-production-print36 onclick="printCurrentProduction36()" disabled>Imprimir etiquetas · PDF</button></div><div class="production-scroll36"><table><thead><tr><th><input type="checkbox" data-production-all36 aria-label="Seleccionar todos los seriales de producción" onchange="for(const box of this.closest(\'table\').querySelectorAll(\'[data-production-serial36]\'))box.checked=this.checked;updateProductionPrint36()"></th><th>Serial</th><th>NP</th><th>Descripción</th><th>Cantidad</th></tr></thead><tbody>' +
            rows
                .map(
                    (row) =>
                        '<tr><td><input type="checkbox" data-production-serial36 value="' +
                        esc(row.serial) +
                        '" aria-label="Seleccionar ' +
                        esc(row.serial) +
                        '" onchange="updateProductionPrint36()"></td><td>' +
                        esc(row.serial) +
                        '</td><td>' +
                        esc(row.part) +
                        '</td><td>' +
                        esc(getPart(row.part)?.desc || row.desc || '') +
                        '</td><td>' +
                        number34(row.qtyCurrent) +
                        ' ' +
                        esc(row.unit) +
                        '</td></tr>',
                )
                .join('') +
            (!rows.length
                ? '<tr><td colspan="5">Sin seriales registrados.</td></tr>'
                : '') +
            '</tbody></table></div></div>',
    );
};
let reportingLabels36 = false;
const reportWithLabelsBefore36 = reportProduction29;
reportProduction29 = async function () {
    if (reportingLabels36) return;
    reportingLabels36 = true;
    const before = structuredClone(state),
        serials = new Set(state.serials.map((row) => row.serial)),
        revision = window.insectLaravel.revision,
        operation = op29().code;
    try {
        await reportWithLabelsBefore36();
        const created = state.serials.filter((row) => !serials.has(row.serial));
        if (!created.length) return;
        if (window.insectLaravel.revision === revision) {
            state = before;
            renderApp();
            return;
        }
        try {
            await printSerialLabels36(
                created.map((row) => row.serial),
                operation,
            );
        } catch (error) {
            showMsg(
                'Producción registrada. No se pudo mostrar la etiqueta: ' +
                    error.message +
                    '. Puedes reimprimirla desde Producción actual.',
                true,
            );
        }
    } finally {
        reportingLabels36 = false;
    }
};
