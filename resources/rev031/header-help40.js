// Personal header navigation and contextual help; no operational records are changed.
let helpMode40 = 'documentation',
    helpScreen40 = 'home';
const helpSnapshots40 = new Map();
const accountScreens40 = [
    ['account-profile', 'Perfil', '/settings/profile'],
    ['account-security', 'Seguridad de mi cuenta', '/settings/security'],
    ['account-appearance', 'Apariencia', '/settings/appearance'],
];
for (const [id, name] of accountScreens40) {
    screenRegistry.push({ id, name, module: 'Cuenta', concept: id });
    inheritedAccess29[id] = 'home';
}
window.addEventListener('insectmes:shell', () => {
    for (const [id, , path] of accountScreens40) nativeScreens031[id] = path;
});
function headerScreen40() {
    if (!window.insectLaravel.nativePage) return shellScreen;
    return (
        Object.entries(nativeScreens031).find(
            ([, path]) => path === location.pathname,
        )?.[0] || 'home'
    );
}
function navigationKey40() {
    return 'InsectMES_navigation40_' + window.insectLaravel.session.accountId;
}
function navigationPrefs40() {
    try {
        const value = JSON.parse(
            localStorage.getItem(navigationKey40()) || 'null',
        );
        if (value && Array.isArray(value.favorites)) return value;
    } catch {}
    return { favorites: [...new Set(state.favorites || [])], home: 'home' };
}
function navigationSave40(value) {
    try {
        localStorage.setItem(navigationKey40(), JSON.stringify(value));
        return true;
    } catch {
        showMsg('No se pudo guardar tu selección en este navegador.', true);
        return false;
    }
}
function screenLabel40(id) {
    return (
        { users: 'Usuarios', profiles: 'Roles' }[id] ||
        screenRegistry.find((row) => row.id === id)?.name ||
        id
    );
}
function favorites40() {
    return [...new Set(navigationPrefs40().favorites)].filter(
        (id) =>
            typeof id === 'string' &&
            screenRegistry.some((row) => row.id === id) &&
            levelFor(id) > 0,
    );
}
function addFavorite40() {
    const prefs = navigationPrefs40(),
        id = headerScreen40();
    if (!prefs.favorites.includes(id)) prefs.favorites.push(id);
    if (navigationSave40(prefs)) {
        closeTopMenus();
        showMsg('Pantalla agregada a tus favoritos.');
    }
}
function toggleFavorite29() {
    addFavorite40();
}
let favoriteDraft40 = null;
function editFavorites40() {
    closeTopMenus();
    favoriteDraft40 = {
        favorites: favorites40(),
        home: navigationPrefs40().home || 'home',
    };
    renderFavoriteEditor40();
}
function renderFavoriteEditor40() {
    configDialog(
        'Editar favoritos',
        '<div class="favorites-editor40" data-consult-control30><div class="favorites-head41"><span>Pantalla</span><span>Inicio</span><span class="sr-only">Orden y acciones</span></div><div class="favorite-rows40">' +
            favoriteDraft40.favorites
                .map(
                    (id, index) =>
                        '<div class="favorite-row40"><span>' +
                        esc(screenLabel40(id)) +
                        '</span><input type="checkbox" data-home41="' +
                        index +
                        '" aria-label="Inicio: ' +
                        esc(screenLabel40(id)) +
                        '" ' +
                        (favoriteDraft40.home === id ? 'checked' : '') +
                        ' onchange="selectFavoriteHome41(' +
                        index +
                        ',this.checked)"><div class="favorite-tools41"><button type="button" aria-label="Subir ' +
                        esc(screenLabel40(id)) +
                        '" ' +
                        (!index ? 'disabled' : '') +
                        ' onclick="moveFavorite40(' +
                        index +
                        ',-1)">↑</button><button type="button" aria-label="Bajar ' +
                        esc(screenLabel40(id)) +
                        '" ' +
                        (index === favoriteDraft40.favorites.length - 1
                            ? 'disabled'
                            : '') +
                        ' onclick="moveFavorite40(' +
                        index +
                        ',1)">↓</button><button type="button" aria-label="Quitar ' +
                        esc(screenLabel40(id)) +
                        '" onclick="removeFavorite40(' +
                        index +
                        ')">×</button></div></div>',
                )
                .join('') +
            '</div><div class="capture-actions"><button class="btn soft" onclick="closeConfigDialog()">Cancelar</button><button class="btn primary" onclick="saveFavorites40()">Guardar</button></div></div>',
    );
}
function selectFavoriteHome41(index, checked) {
    favoriteDraft40.home = checked ? favoriteDraft40.favorites[index] : 'home';
    for (const box of document.querySelectorAll('[data-home41]'))
        box.checked =
            favoriteDraft40.favorites[Number(box.dataset.home41)] ===
            favoriteDraft40.home;
}
function moveFavorite40(index, offset) {
    const next = index + offset;
    if (next < 0 || next >= favoriteDraft40.favorites.length) return;
    [favoriteDraft40.favorites[index], favoriteDraft40.favorites[next]] = [
        favoriteDraft40.favorites[next],
        favoriteDraft40.favorites[index],
    ];
    renderFavoriteEditor40();
}
function removeFavorite40(index) {
    const removed = favoriteDraft40.favorites.splice(index, 1)[0];
    if (favoriteDraft40.home === removed) favoriteDraft40.home = 'home';
    renderFavoriteEditor40();
}
function saveFavorites40() {
    if (navigationSave40(favoriteDraft40)) {
        closeConfigDialog();
        showMsg('Favoritos guardados.');
    }
}
const homeNavigate40 = navigateScreen;
navigateScreen = function (id, ...args) {
    if (id === 'home') {
        const home = navigationPrefs40().home;
        if (home && home !== 'home' && favorites40().includes(home)) id = home;
    }
    return homeNavigate40(id, ...args);
};
const homeRestore40 = restoreInitialRoute29;
restoreInitialRoute29 = function () {
    homeRestore40();
    if (!window.insectLaravel.nativePage && shellScreen === 'home') {
        const target = navigationPrefs40().home;
        if (target && target !== 'home' && favorites40().includes(target)) {
            routePause = true;
            navigateScreen(target);
            routePause = false;
            lastRouteKey = '';
        }
    }
};
function otherEnvironment40() {
    closeTopMenus();
    const sandbox =
        document.documentElement.dataset.mesEnvironment === 'sandbox';
    const target = new URL(
        sandbox
            ? document.documentElement.dataset.primaryUrl
            : document.documentElement.dataset.sandboxUrl,
    );
    target.pathname = '/mes/environment/begin';
    target.searchParams.set(
        'return',
        location.pathname + location.search + location.hash,
    );
    window.open(target.href, '_blank', 'noopener,noreferrer');
}
function prepareSandboxRefresh41() {
    closeTopMenus();
    configDialog(
        'Actualizar Sandbox',
        '<div data-consult-control30><p>Se copiarán los datos actuales del principal al Sandbox. Los cambios de prueba se reemplazarán y se conservará una copia del Sandbox anterior.</p><p id="sandbox-refresh-status41" role="status"></p><div class="capture-actions"><button class="btn soft" onclick="closeConfigDialog()">Cancelar</button><button class="btn primary" onclick="refreshSandbox41(this)">Actualizar Sandbox</button></div></div>',
    );
}
async function refreshSandbox41(button) {
    button.disabled = true;
    const status = document.getElementById('sandbox-refresh-status41');
    status.textContent = 'Actualizando Sandbox…';
    try {
        const token = decodeURIComponent(
            document.cookie
                .split('; ')
                .find((row) => row.startsWith('XSRF-TOKEN='))
                ?.slice(11) || '',
        );
        const response = await fetch('/mes/environment/refresh', {
            method: 'POST',
            headers: { Accept: 'application/json', 'X-XSRF-TOKEN': token },
        });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.message || 'No se pudo actualizar Sandbox.');
        status.textContent = result.message;
    } catch (error) {
        status.textContent = error.message;
    } finally {
        button.disabled = false;
    }
}
const headerMenuBefore40 = toggleTopMenu;
toggleTopMenu = function (type, button) {
    if (!['favorites', 'recent', 'help'].includes(type)) {
        headerMenuBefore40(type, button);
        if (type === 'config') {
            const menu = document.querySelector('.top-dropdown');
            if (!menu) return;
            const allowed = new Set(['Glosario', 'Setup Tables', 'Settings']);
            for (const item of menu.querySelectorAll(':scope > button')) {
                if (!allowed.has(item.textContent.trim())) item.remove();
            }
            const row = document.createElement('div');
            row.className = 'sandbox-menu-row42';
            row.setAttribute('role', 'presentation');
            const entry = document.createElement('button');
            entry.type = 'button';
            entry.role = 'menuitem';
            entry.textContent =
                document.documentElement.dataset.mesEnvironment === 'sandbox'
                    ? 'Producción'
                    : 'Sandbox';
            entry.onclick = otherEnvironment40;
            row.append(entry);
            if (
                document.documentElement.dataset.mesEnvironment !== 'sandbox' &&
                window.insectLaravel.isAdministrator
            ) {
                const refresh = document.createElement('button');
                refresh.type = 'button';
                refresh.className = 'sandbox-refresh-icon42';
                refresh.setAttribute('aria-label', 'Actualizar Sandbox');
                refresh.title = 'Actualizar Sandbox';
                refresh.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>';
                refresh.onclick = prepareSandboxRefresh41;
                row.append(refresh);
            }
            menu.querySelector('.menu-title')?.after(row);
        }
        return;
    }
    window.dispatchEvent(
        new CustomEvent('insectmes:header-menu', { detail: 'toolbar' }),
    );
    const same = openTopMenu === type;
    closeTopMenus();
    if (same) return;
    openTopMenu = type;
    button.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.className = 'top-dropdown';
    menu.dataset.menu = type;
    menu.role = 'menu';
    const item = (label, action, extra = '') =>
        '<button type="button" role="menuitem" ' +
        extra +
        ' onclick="' +
        action +
        '">' +
        label +
        '</button>';
    let body =
        '<div class="menu-title">' +
        { favorites: 'Favoritos', recent: 'Últimas pantallas', help: 'Ayuda' }[
            type
        ] +
        '</div>';
    if (type === 'favorites') {
        const added = favorites40().includes(headerScreen40());
        body +=
            item(
                'Agregar pantalla actual',
                'addFavorite40()',
                'class="menu-action40" ' +
                    (added
                        ? 'disabled title="Esta pantalla ya está en favoritos"'
                        : ''),
            ) +
            item(
                'Editar favoritos',
                'editFavorites40()',
                'class="menu-action40"',
            ) +
            '<div class="menu-section40">Mis favoritos</div>';
        body +=
            favorites40()
                .map((id) =>
                    item(
                        esc(screenLabel40(id)) +
                            (navigationPrefs40().home === id
                                ? '<span class="favorite-home40" aria-label="Inicio">⌂</span>'
                                : ''),
                        "closeTopMenus();navigateScreen('" + id + "')",
                    ),
                )
                .join('') || '<p class="menu-empty40">Sin favoritos.</p>';
    } else if (type === 'recent') {
        const bottom = document
            .querySelector('.menu29-bar')
            .getBoundingClientRect().bottom;
        const limit = Math.max(
            1,
            Math.min(10, Math.floor((innerHeight - bottom - 62) / 32)),
        );
        const ids = [...new Set(state.recents)]
            .filter(
                (id) =>
                    screenRegistry.some((row) => row.id === id) &&
                    levelFor(id) > 0,
            )
            .slice(0, limit);
        body +=
            ids
                .map((id) =>
                    item(
                        esc(screenLabel40(id)),
                        "closeTopMenus();navigateScreen('" + id + "')",
                    ),
                )
                .join('') ||
            '<p class="menu-empty40">Sin pantallas recientes.</p>';
    } else
        body +=
            item('Documentación', "openHelp40('documentation')") +
            item('Iconos', "openHelp40('icons')");
    menu.innerHTML = body;
    button.parentElement.append(menu);
    positionHeaderMenu37(menu, button);
};
function openHelp40(mode) {
    helpMode40 = mode;
    const current = headerScreen40();
    if (current !== 'help') helpScreen40 = current;
    const root =
        document.querySelector('#laravel-native-page') ||
        document.querySelector('.view.active');
    if (root && current !== 'help')
        helpSnapshots40.set(current, {
            fields: [
                ...new Set(
                    [...root.querySelectorAll('th,label')]
                        .map(
                            (el) =>
                                el.querySelector('.grid-head34 span')
                                    ?.textContent ||
                                el.firstChild?.textContent ||
                                el.textContent,
                        )
                        .map((text) => text?.trim())
                        .filter((text) => text && text.length < 70),
                ),
            ],
            actions: [
                ...new Set(
                    [
                        ...root.querySelectorAll(
                            '.actionbar button,.card-head button',
                        ),
                    ]
                        .map((el) => el.textContent.trim())
                        .filter((text) => text && text.length < 60),
                ),
            ],
        });
    sessionStorage.setItem(
        'InsectMES_help40',
        JSON.stringify({ mode, screen: helpScreen40 }),
    );
    closeTopMenus();
    navigateScreen('help');
}
const screenDocs40 = {
    'account-profile': {
        intro: 'Consulta y actualiza los datos de tu propia cuenta.',
        steps: [
            'Revisa tu nombre y correo electrónico.',
            'Edita los campos que necesites y pulsa Guardar.',
        ],
        actions: [
            'El rol y los permisos se administran desde Usuarios y Roles.',
        ],
        notes: 'Cambiar tus datos de perfil no concede permisos adicionales.',
    },
    'account-security': {
        intro: 'Administra las opciones de seguridad de tu propia cuenta.',
        steps: [
            'Revisa las opciones de seguridad disponibles.',
            'Completa los campos solicitados y confirma el cambio correspondiente.',
        ],
        actions: [],
        notes: 'No compartas contraseñas ni códigos de autenticación.',
    },
    'account-appearance': {
        intro: 'Elige cómo se muestra InsectMES en este navegador.',
        steps: ['Selecciona Claro, Oscuro o Sistema.'],
        actions: ['Sistema utiliza el modo configurado en tu computadora.'],
        notes: 'La apariencia no cambia datos ni permisos. Sandbox conserva su identidad naranja en ambos modos.',
    },
    inventory: {
        intro: 'Consulta los contenedores, sus saldos, número de parte, ubicación, lote y estado. Desde esta pantalla también puedes consultar trazabilidad y ejecutar movimientos.',
        steps: [
            'Busca por serial, número de parte u otra columna; aplica los filtros con Buscar.',
            'Selecciona las filas que necesites o abre una acción sin selección para capturar seriales mediante escaneo.',
            'Revisa los seriales y los datos de la operación antes de confirmar.',
        ],
        actions: [
            'Trazabilidad: con un serial seleccionado muestra su historial; sin selección abre la captura por escaneo.',
            'Move: admite uno o varios seriales y solicita la ubicación de destino.',
            'Split: parte un único serial en varias cantidades; conserva el original y genera los seriales adicionales.',
            'Merge: requiere dos o más seriales del mismo número de parte. Elige cuál conservará la cantidad; los demás quedan inactivos.',
            'Imprimir etiqueta: muestra un PDF para los contenedores seleccionados.',
        ],
        notes: 'Los movimientos cambian existencias y trazabilidad. Los permisos del rol y las validaciones del servidor se aplican al confirmar.',
    },
    requisitions: {
        intro: 'Administra las solicitudes de compra. El listado muestra una fila por requisición; sus partidas se editan en una pantalla independiente, como una hoja de cálculo.',
        steps: [
            'Pulsa Agregar o abre un consecutivo del listado.',
            'Completa fecha, solicitante y referencia. Captura las partidas en las celdas Artículo o servicio, Cantidad, Unidad y Notas.',
            'Agrega o elimina filas. Puedes pegar varias filas desde Excel; Enter avanza a la siguiente fila y Tab a la siguiente celda.',
            'Marca Comprada en las partidas adquiridas y pulsa Guardar.',
            'Usa Volver al listado para regresar al resumen.',
        ],
        actions: [
            'Agregar partida añade una fila vacía.',
            'Descartar cambios abandona lo que todavía no hayas guardado.',
            'El estatus es Pendiente, Parcial o Completada según las partidas compradas.',
        ],
        notes: 'El consecutivo se confirma al guardar. Sólo los roles autorizados pueden marcar compras. Una requisición todavía no crea una orden de compra ni modifica inventario.',
    },
    control: {
        intro: 'El Control Panel reúne la captura de producción de una operación y centro de trabajo.',
        steps: [
            'Selecciona el centro de trabajo y la operación.',
            'Revisa las entradas disponibles y captura los datos requeridos para ese proceso.',
            'Reporta la cantidad real producida y confirma.',
            'Consulta Producción actual para seleccionar seriales e imprimir sus etiquetas en PDF.',
        ],
        actions: [
            'Producción actual presenta Serial, NP, Descripción y Cantidad, con selección para imprimir.',
            'La etiqueta se obtiene de la asignación del Process Routing, de la operación, del número de parte o de la etiqueta predeterminada, en ese orden.',
        ],
        notes: 'Reportar producción modifica contenedores, saldos y trazabilidad. Una falla al generar el PDF no deshace una producción que ya fue guardada.',
    },
    parameters: {
        intro: 'Consulta y administra los parámetros de proceso y costo de la revisión 31.',
        steps: [
            'Busca el parámetro por código, nombre o proceso.',
            'Abre el código para consultar sus datos.',
            'Si tu rol permite editar, revisa el valor, la unidad, el proceso y el estado antes de guardar.',
        ],
        actions: [
            'Los filtros permiten acotar el listado; Exportar descarga los registros del alcance seleccionado.',
        ],
        notes: 'La unidad y el proceso dan contexto al valor. Cambiar un parámetro puede afectar los cálculos que lo utilizan.',
    },
    parts: {
        intro: 'El catálogo Productos e Insumos reúne los códigos de materiales y productos que usa el sistema.',
        steps: [
            'Busca un código o una descripción.',
            'Abre el registro para consultar sus datos y unidades.',
            'Si tienes permiso, crea o edita el registro y guarda los cambios.',
        ],
        actions: [
            'El número de parte se utiliza en inventario, rutas de proceso y producción.',
        ],
        notes: 'Antes de crear un código, revisa que no exista. Conservar los códigos evita duplicar materiales.',
    },
    users: {
        intro: 'Administra las cuentas de las personas que utilizan InsectMES y asigna el rol de cada una.',
        steps: [
            'Busca al usuario en el listado.',
            'Abre su registro o crea una cuenta si tu rol lo permite.',
            'Asigna el rol correspondiente y revisa su estado.',
            'Guarda los cambios.',
        ],
        actions: [
            'La asignación del rol se realiza aquí. Los permisos de pantallas y acciones se configuran en Roles.',
        ],
        notes: 'Esta pantalla requiere permiso de administración de usuarios. Una cuenta común no puede concederse permisos por sí misma.',
    },
    profiles: {
        intro: 'Define qué pantallas y acciones puede utilizar cada rol.',
        steps: [
            'Abre el rol que deseas administrar.',
            'Revisa las pantallas habilitadas y las acciones permitidas.',
            'Guarda el rol y asígnalo a los usuarios desde Usuarios.',
        ],
        actions: [
            'Los permisos se aplican tanto a la interfaz como a las operaciones validadas en el servidor.',
        ],
        notes: 'Los cambios afectan a los usuarios asociados al rol. Evita retirar el acceso administrativo necesario para mantener el sistema.',
    },
    labels: {
        intro: 'Administra los formatos de etiquetas y sus asignaciones.',
        steps: [
            'Selecciona una etiqueta o abre el diseñador.',
            'Revisa sus campos, textos y distribución.',
            'Asigna el formato al alcance que corresponda y verifica el PDF.',
        ],
        actions: [
            'Las etiquetas pueden asignarse por Process Routing, operación o número de parte.',
        ],
        notes: 'La impresión disponible actualmente es un PDF; no se envían trabajos a impresoras físicas.',
    },
    home: {
        intro: 'Inicio reúne accesos rápidos e indicadores del sistema.',
        steps: [
            'Abre un módulo desde sus accesos o desde el menú lateral.',
            'Utiliza el período para consultar los indicadores disponibles.',
            'Puedes elegir otra pantalla como Inicio desde Favoritos → Editar favoritos.',
        ],
        actions: [
            'Go to… busca pantallas por nombre.',
            'Favoritos permite conservar accesos personales y elegir tu pantalla inicial.',
        ],
        notes: 'Sandbox, dentro de Configuración, abre esta misma pantalla en el entorno de pruebas.',
    },
};
function documentationArticle40(id) {
    const known = screenDocs40[id] || {
        intro:
            'Esta página reúne la consulta y las acciones disponibles en ' +
            screenLabel40(id) +
            '.',
        steps: [
            'Consulta el listado y utiliza Buscar para aplicar los criterios disponibles.',
            'Abre un registro para ver su detalle. Las acciones visibles dependen del rol asignado.',
            'Cuando edites un registro, revisa los campos y pulsa Guardar antes de salir.',
        ],
        actions: [],
        notes: 'Si no aparece una acción, revisa los permisos del rol con el administrador.',
    };
    const snapshot = helpSnapshots40.get(id);
    return (
        '<article class="help-article40"><div class="help-kicker40">Documentación de pantalla</div><h1>' +
        esc(screenLabel40(id)) +
        '</h1><p>' +
        esc(known.intro) +
        '</p><nav class="help-toc40"><button type="button" onclick="document.getElementById(&quot;help-steps40&quot;).scrollIntoView()">Cómo usarla</button><button type="button" onclick="document.getElementById(&quot;help-actions40&quot;).scrollIntoView()">Acciones</button><button type="button" onclick="document.getElementById(&quot;help-notes40&quot;).scrollIntoView()">Consideraciones</button></nav><h2 id="help-steps40">Cómo usarla</h2><ol>' +
        known.steps.map((text) => '<li>' + esc(text) + '</li>').join('') +
        '</ol>' +
        (snapshot?.fields.length
            ? '<h2>Campos de esta pantalla</h2><p>' +
              snapshot.fields.map(esc).join(' · ') +
              '</p>'
            : '') +
        '<h2 id="help-actions40">Acciones</h2><ul>' +
        [
            ...known.actions,
            ...(snapshot?.actions || []).filter(
                (text) => !known.actions.some((item) => item.startsWith(text)),
            ),
        ]
            .map((text) => '<li>' + esc(text) + '</li>')
            .join('') +
        '</ul><h2 id="help-notes40">Consideraciones</h2><p>' +
        esc(known.notes) +
        '</p><button class="btn soft" data-help-open40="' +
        esc(id) +
        '" onclick="navigateScreen(this.dataset.helpOpen40)">Abrir ' +
        esc(screenLabel40(id)) +
        '</button></article>'
    );
}
function selectDocumentation40(id) {
    helpScreen40 = id;
    sessionStorage.setItem(
        'InsectMES_help40',
        JSON.stringify({ mode: 'documentation', screen: id }),
    );
    renderApp();
}
function searchDocumentation40(value) {
    const query = value.toLocaleLowerCase();
    for (const item of document.querySelectorAll(
        '[data-documentation-screen40]',
    ))
        item.hidden = !item.textContent.toLocaleLowerCase().includes(query);
}
function helpIcons40() {
    const approved = menuApproved29.icon;
    const actual = (selector) =>
        document.querySelector(selector + ' svg')?.outerHTML ||
        approved('help');
    const icons = [
        ['Menú', approved('menu'), 'Muestra u oculta el menú de módulos.'],
        ['Volver', approved('back'), 'Regresa a la pantalla anterior.'],
        [
            'Últimas pantallas',
            approved('recent'),
            'Abre hasta diez pantallas visitadas recientemente.',
        ],
        [
            'Favoritos',
            approved('favorites'),
            'Agrega la pantalla actual, edita tus favoritos y elige Inicio.',
        ],
        [
            'Configuración',
            approved('settings'),
            'Abre Glosario, Sandbox, Setup Tables y Settings.',
        ],
        [
            'Ayuda',
            approved('help'),
            'Abre la documentación de la pantalla y esta lista de iconos.',
        ],
        [
            'Apariencia',
            actual('#laravel-appearance-control'),
            'Elige Claro, Oscuro o Sistema.',
        ],
        [
            'Claro',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>',
            'Dentro de Apariencia, utiliza los colores claros.',
        ],
        [
            'Oscuro',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M20.5 13A9 9 0 0 1 11 3.5 9 9 0 1 0 20.5 13Z"/></svg>',
            'Dentro de Apariencia, utiliza los colores oscuros.',
        ],
        [
            'Sistema',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
            'Dentro de Apariencia, sigue el modo de tu computadora.',
        ],
        [
            'Asistente de IA',
            actual('.assistant-launch30'),
            'Abre el asistente de InsectMES.',
        ],
        [
            'Cuenta',
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>',
            'Tu avatar abre Perfil, Empresa, Usuarios, Roles, Idioma y Log out según tus permisos.',
        ],
    ];
    return cardNavigation29(
        'Iconos',
        '<div class="help-icons40">' +
            icons
                .map(
                    ([name, svg, text]) =>
                        '<section><div class="help-icon40">' +
                        svg +
                        '</div><div><h2>' +
                        esc(name) +
                        '</h2><p>' +
                        esc(text) +
                        '</p></div></section>',
                )
                .join('') +
            '</div>',
    );
}
const helpConceptBefore40 = renderConceptScreen;
renderConceptScreen = function () {
    if (conceptScreen !== 'help') return helpConceptBefore40();
    try {
        const intent = JSON.parse(
            sessionStorage.getItem('InsectMES_help40') || 'null',
        );
        if (intent) {
            helpMode40 = intent.mode;
            helpScreen40 = intent.screen;
        }
    } catch {}
    if (levelFor(helpScreen40) === 0) helpScreen40 = 'home';
    const root = document.getElementById('view-' + currentView);
    if (helpMode40 === 'icons') {
        root.innerHTML = helpIcons40();
        return;
    }
    const screens = screenRegistry.filter(
        (row) =>
            row.id !== 'help' &&
            levelFor(row.id) > 0 &&
            !['unavailable', 'inventory-workflow36'].includes(row.concept),
    );
    root.innerHTML = cardNavigation29(
        'Documentación',
        '<div class="help-wiki40"><aside><label>Buscar pantalla<input class="input" type="search" aria-label="Buscar documentación" oninput="searchDocumentation40(this.value)"></label><nav>' +
            screens
                .map(
                    (row) =>
                        '<button type="button" data-documentation-screen40="' +
                        esc(row.id) +
                        '" aria-current="' +
                        (row.id === helpScreen40 ? 'page' : 'false') +
                        '" onclick="selectDocumentation40(this.dataset.documentationScreen40)">' +
                        esc(screenLabel40(row.id)) +
                        '</button>',
                )
                .join('') +
            '</nav></aside>' +
            documentationArticle40(helpScreen40) +
            '</div>',
    );
};
window.addEventListener('insectmes:shell', () => {
    if (conceptScreen === 'help') {
        const title = document.getElementById('pageTitle');
        if (title)
            title.textContent =
                helpMode40 === 'icons' ? 'Iconos' : 'Documentación';
    }
});
