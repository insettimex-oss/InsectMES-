// Header utilities and display-only field aliases. Original labels remain in the DOM
// so Rev031's filters, exports and business field names retain their existing keys.
let glossaryMode36 = false,
    glossarySelection36 = null;
function utilityPanel36(kind, title, body) {
    closeUtilityPanel36();
    const panel = document.createElement('aside');
    panel.id = 'workspace-utility36';
    panel.className = 'workspace-utility36';
    panel.dataset.kind = kind;
    panel.setAttribute('aria-label', title);
    panel.innerHTML =
        '<header><h2>' +
        esc(title) +
        '</h2><button type="button" class="btn soft" aria-label="Cerrar panel" onclick="closeUtilityPanel36()">×</button></header><div class="utility-body36">' +
        body +
        '</div>';
    document.body.append(panel);
    panel.style.top =
        Math.max(
            0,
            document.querySelector('.menu29-bar')?.getBoundingClientRect()
                .bottom || 0,
        ) + 'px';
}
function closeUtilityPanel36() {
    document.getElementById('workspace-utility36')?.remove();
    if (glossaryMode36) {
        glossaryMode36 = false;
        document.body.classList.remove('glossary-mode36');
    }
}
document.addEventListener('keydown', (event) => {
    if (
        event.key === 'Escape' &&
        document.getElementById('workspace-utility36')
    )
        closeUtilityPanel36();
});
const topMenuBeforeGlossary36 = toggleTopMenu;
toggleTopMenu = function (type, button) {
    window.dispatchEvent(
        new CustomEvent('insectmes:header-menu', { detail: 'toolbar' }),
    );
    topMenuBeforeGlossary36(type, button);
    const menu = document.querySelector('.top-dropdown');
    if (!menu) return;
    positionHeaderMenu37(menu, button);
    if (type !== 'config') return;
    for (const node of menu.querySelectorAll('.menu-title,button'))
        if (
            /^par[aá]metros$|^Seguridad de esta pantalla$/i.test(
                node.textContent.trim(),
            ) ||
            /openContextSetup\('(Container_Status|Container_Type)'\)/.test(
                node.getAttribute('onclick') || '',
            )
        )
            node.remove();
    const glossary = document.createElement('button');
    glossary.type = 'button';
    glossary.setAttribute('role', 'menuitem');
    glossary.textContent = 'Glosario';
    glossary.onclick = () => {
        closeTopMenus();
        startGlossary36();
    };
    const title = menu.querySelector('.menu-title');
    if (title) title.after(glossary);
    else menu.prepend(glossary);
};
function positionHeaderMenu37(menu, button) {
    const rect = button.getBoundingClientRect();
    const bottom = document
        .querySelector('.menu29-bar')
        .getBoundingClientRect().bottom;
    menu.style.top = Math.max(bottom, rect.bottom) + 6 + 'px';
    menu.style.left =
        Math.max(
            8,
            Math.min(
                innerWidth - menu.offsetWidth - 8,
                rect.right - menu.offsetWidth,
            ),
        ) + 'px';
    menu.style.right = 'auto';
}
window.addEventListener('insectmes:header-menu', (event) => {
    if (event.detail !== 'toolbar') closeTopMenus();
});
window.addEventListener('resize', () => {
    const menu = document.querySelector('.top-dropdown');
    const button = document.querySelector(
        '.menu-anchor .toolbar-icon[aria-expanded=true]',
    );
    if (menu && button) positionHeaderMenu37(menu, button);
});
document.addEventListener('keydown', (event) => {
    const menu = document.querySelector('.top-dropdown');
    if (!menu || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key))
        return;
    const items = [...menu.querySelectorAll('button:not(:disabled)')];
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement);
    const next =
        event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (current + (event.key === 'ArrowUp' ? -1 : 1) + items.length) %
                items.length;
    items[next].focus();
});
function glossaryScreen36() {
    return window.insectLaravel.nativePage ? location.pathname : shellScreen;
}
function startGlossary36() {
    if (!window.insectLaravel.canEditGlossary)
        return showMsg('Su rol no permite editar el glosario.', true);
    utilityPanel36(
        'glossary',
        'Glosario',
        '<p>Selecciona el nombre de una columna o un campo. Puedes abrir un formulario o un detalle sin salir de este modo.</p><button type="button" class="btn soft" data-glossary-choose36 onclick="chooseGlossaryField36()">Seleccionar otro campo</button><div id="glossary-editor36"></div>',
    );
    glossaryMode36 = true;
    document.body.classList.add('glossary-mode36');
    applyGlossary36();
}
function glossaryRoots36() {
    return [
        document.querySelector('.view.active'),
        document.getElementById('laravel-native-page'),
        ...document.querySelectorAll(
            'dialog[open],[role="dialog"][data-state="open"]',
        ),
    ].filter(Boolean);
}
function chooseGlossaryField36() {
    const panel = document.getElementById('workspace-utility36');
    panel?.classList.remove('has-field36');
    const editor = document.getElementById('glossary-editor36');
    if (editor) editor.innerHTML = '';
    glossarySelection36 = null;
}
function glossaryTargets36() {
    const roots = glossaryRoots36(),
        targets = [];
    for (const root of roots) {
        for (const th of root.querySelectorAll('th')) {
            const leaf = [...th.querySelectorAll('span')].find(
                (node) =>
                    node.childElementCount === 0 &&
                    /[\p{L}\p{N}]/u.test(node.textContent) &&
                    !node.closest('svg'),
            );
            const node = leaf || th;
            if (!/[\p{L}\p{N}]/u.test(node.textContent)) continue;
            targets.push({
                node,
                type: 'column',
                text:
                    node.dataset.glossaryOriginal36 ||
                    node.textContent.replace(/[▾▼]/g, '').trim(),
            });
        }
        for (const label of root.querySelectorAll('label')) {
            if (
                label.closest(
                    '#workspace-utility36,.requisition-checklist031,[role="listbox"],[role="menu"]',
                )
            )
                continue;
            const sibling = label.nextElementSibling;
            const adjacentControl = sibling?.matches('input,select,textarea')
                ? sibling
                : sibling?.matches('div,span')
                  ? sibling.querySelector('input,select,textarea')
                  : null;
            const control =
                label.querySelector('input,select,textarea') ||
                (label.htmlFor && document.getElementById(label.htmlFor)) ||
                adjacentControl;
            if (
                !control ||
                control.matches(
                    '[data-select-row30],[data-select-all30],[data-production-serial36],[data-production-all36]',
                )
            )
                continue;
            const text = [...label.childNodes]
                .filter((node) => node.nodeType === 3)
                .map((node) => node.textContent)
                .join(' ')
                .replace(/\s+/g, ' ')
                .replace(/\s*\*\s*$/, '')
                .trim();
            const leaf =
                !text &&
                [...label.querySelectorAll('span')].find(
                    (node) =>
                        node.childElementCount === 0 &&
                        /[\p{L}\p{N}]/u.test(node.textContent) &&
                        !node.closest('svg'),
                );
            const node = text ? label : leaf;
            if (!node) continue;
            targets.push({
                node,
                type: 'field',
                text:
                    node.dataset.glossaryOriginal36 ||
                    text ||
                    node.textContent.trim(),
            });
        }
        for (const node of root.querySelectorAll(
            'input[placeholder],textarea[placeholder]',
        )) {
            if (
                node.closest('#workspace-utility36') ||
                !node.placeholder.trim()
            )
                continue;
            targets.push({
                node,
                type: 'placeholder',
                text: node.dataset.glossaryOriginal36 || node.placeholder,
            });
        }
    }
    const seen = new Set();
    return targets.filter((item) => {
        if (seen.has(item.node)) return false;
        seen.add(item.node);
        return true;
    });
}
function applyGlossary36() {
    const aliases = state.glossary36?.[glossaryScreen36()] || {};
    for (const { node, type, text } of glossaryTargets36()) {
        if (!text) continue;
        const key = type + ':' + text;
        if (!node.dataset.glossaryOriginal36) {
            node.dataset.glossaryOriginal36 = text;
            node.dataset.glossaryKey36 = key;
            node.dataset.glossaryType36 = type;
            node.dataset.glossaryAria36 = node.getAttribute('aria-label') || '';
            node.style.setProperty(
                '--glossary-font36',
                getComputedStyle(node).fontSize,
            );
        }
        const alias = aliases[key];
        if (type === 'placeholder') {
            node.placeholder = alias || text;
            if (alias) node.setAttribute('aria-label', alias);
            else if (node.dataset.glossaryAria36)
                node.setAttribute('aria-label', node.dataset.glossaryAria36);
            else node.removeAttribute('aria-label');
            continue;
        }
        if (alias) {
            if (node.dataset.glossaryAlias36 !== alias)
                node.dataset.glossaryAlias36 = alias;
            node.setAttribute('aria-label', alias);
        } else if (node.hasAttribute('data-glossary-alias36')) {
            delete node.dataset.glossaryAlias36;
            if (node.dataset.glossaryAria36)
                node.setAttribute('aria-label', node.dataset.glossaryAria36);
            else node.removeAttribute('aria-label');
        }
    }
    for (const root of glossaryRoots36())
        for (const option of root.querySelectorAll(
            '.inventory-search-column30 option',
        )) {
            const alias = aliases['column:' + option.textContent.trim()];
            if (alias) option.label = alias;
            else option.removeAttribute('label');
        }
}
document.addEventListener(
    'click',
    (event) => {
        if (!glossaryMode36 || event.target.closest('#workspace-utility36'))
            return;
        const target = event.target.closest('[data-glossary-key36]');
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!document.getElementById('glossary-editor36')) startGlossary36();
        const panel = document.getElementById('workspace-utility36'),
            dialog = target.closest('dialog[open],[role="dialog"]');
        panel.classList.add('has-field36');
        panel.removeAttribute('aria-hidden');
        panel.removeAttribute('inert');
        if (dialog) {
            panel.classList.add('utility-inline36');
            dialog.append(panel);
        } else if (panel.classList.contains('utility-inline36')) {
            panel.classList.remove('utility-inline36');
            document.body.append(panel);
        }
        glossarySelection36 = {
            screen: glossaryScreen36(),
            key: target.dataset.glossaryKey36,
            original: target.dataset.glossaryOriginal36,
        };
        const current =
            state.glossary36?.[glossarySelection36.screen]?.[
                glossarySelection36.key
            ] || glossarySelection36.original;
        document.getElementById('glossary-editor36').innerHTML =
            '<form onsubmit="saveGlossary36(event)"><label>Nombre original<input class="input" readonly value="' +
            esc(glossarySelection36.original) +
            '"></label><label>Nombre visible<input class="input" name="caption" aria-label="Nombre visible" maxlength="80" required value="' +
            esc(current) +
            '"></label><div class="actionbar"><button class="btn primary">Guardar nombre</button><button class="btn soft" type="button" onclick="resetGlossary36()">Restaurar original</button></div></form>';
        document.querySelector('#glossary-editor36 [name=caption]').focus();
    },
    true,
);
function storeGlossary36(value) {
    const { screen, key } = glossarySelection36,
        previous = structuredClone(state.glossary36 || {});
    state.glossary36 ??= {};
    state.glossary36[screen] ??= {};
    if (value) state.glossary36[screen][key] = value;
    else delete state.glossary36[screen][key];
    try {
        saveState();
        applyGlossary36();
        showMsg('Nombre actualizado.');
    } catch (error) {
        state.glossary36 = previous;
        applyGlossary36();
        showMsg(error.message, true);
    }
}
function saveGlossary36(event) {
    event.preventDefault();
    const value = event.currentTarget.elements.caption.value.trim();
    if (value) storeGlossary36(value);
}
function resetGlossary36() {
    if (glossarySelection36) storeGlossary36(null);
}
let glossaryScheduled36 = false;
new MutationObserver(() => {
    if (glossaryMode36) {
        const panel = document.getElementById('workspace-utility36'),
            dialog = panel?.closest('dialog,[role="dialog"]');
        if (
            !panel ||
            (dialog &&
                ((dialog.tagName === 'DIALOG' && !dialog.open) ||
                    dialog.getAttribute('data-state') === 'closed'))
        )
            closeUtilityPanel36();
    }
    if (glossaryScheduled36) return;
    glossaryScheduled36 = true;
    queueMicrotask(() => {
        glossaryScheduled36 = false;
        applyGlossary36();
    });
}).observe(document.body, { childList: true, subtree: true });
