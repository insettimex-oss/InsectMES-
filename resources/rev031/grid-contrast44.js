// Keep per-row highlights continuous through inventory cells that span several rows.
let mergedHighlightFrame44 = 0;
function refreshMergedHighlights44() {
    mergedHighlightFrame44 = 0;
    const selected =
        '.selected,.grid-marked30,.focused-row,[aria-selected=true],[data-state=selected]';
    const rowsByBody = new Map();
    for (const cell of document.querySelectorAll(
        '#rev031-application td.stock-merged-cell30,#rev031-application td[data-merged-bands44]',
    )) {
        if (
            !cell.classList.contains('stock-merged-cell30') ||
            cell.rowSpan < 2
        ) {
            cell.style.removeProperty('--merged-row-bands44');
            delete cell.dataset.mergedBands44;
            continue;
        }
        const body = cell.parentElement.parentElement;
        if (!rowsByBody.has(body)) rowsByBody.set(body, [...body.rows]);
        const rows = rowsByBody.get(body),
            first = rows.indexOf(cell.parentElement);
        const rect = cell.getBoundingClientRect(),
            theme = getComputedStyle(cell);
        const stops = [];
        for (const row of rows.slice(first, first + cell.rowSpan)) {
            const bounds = row.getBoundingClientRect();
            const color = row.matches(selected)
                ? theme.getPropertyValue('--row-selected44').trim()
                : row.matches(':hover')
                  ? theme.getPropertyValue('--row-hover44').trim()
                  : 'transparent';
            stops.push(
                `${color} ${Math.max(0, bounds.top - rect.top)}px`,
                `${color} ${Math.max(0, bounds.bottom - rect.top)}px`,
            );
        }
        const gradient = `linear-gradient(to bottom,${stops.join(',')})`;
        if (cell.style.getPropertyValue('--merged-row-bands44') !== gradient)
            cell.style.setProperty('--merged-row-bands44', gradient);
        cell.dataset.mergedBands44 = '';
    }
}
function scheduleMergedHighlights44() {
    if (!mergedHighlightFrame44)
        mergedHighlightFrame44 = requestAnimationFrame(
            refreshMergedHighlights44,
        );
}
const mergedHighlightObserver44 = new MutationObserver(scheduleMergedHighlights44);
mergedHighlightObserver44.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
        'class',
        'rowspan',
        'aria-selected',
        'data-state',
        'hidden',
    ],
});
mergedHighlightObserver44.observe(document.documentElement, {attributes:true,attributeFilter:['class','data-mes-environment']});
for (const event of ['pointerover', 'pointerout', 'change'])
    document.addEventListener(
        event,
        (event) => {
            if (event.target.closest?.('table')) scheduleMergedHighlights44();
        },
        true,
    );
window.addEventListener('resize', scheduleMergedHighlights44);
document.fonts.ready.then(scheduleMergedHighlights44);
