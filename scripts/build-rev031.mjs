import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const root = process.cwd();
const source = path.join(root, 'resources/rev031/source');
const privateModules = new Set([
    'src/modules/history30.js',
    'src/modules/cost-reference30.js',
]);
const config = JSON.parse(
    fs.readFileSync(path.join(source, 'build-config.json'), 'utf8'),
);
const read = (file) => {
    const privateFile = path.join(root, '.local/rev031-private', path.basename(file));
    const input = privateModules.has(file) && fs.existsSync(privateFile)
        ? privateFile
        : path.join(source, file);
    let text = fs.readFileSync(input, 'utf8').replace(/^\uFEFF/, '');
    if (file.endsWith('menu-approved.js')) text = text.replace("app('No Parte','parts')", "app('Productos e Insumos','parts')").replace("app('Operations')", "app('Operaciones','operations')");
    if (file.endsWith('engineering29.js')) text = text.replace("operation:'Operations'", "operation:'Operaciones'").replace("screenAction29('Operations','operations')", "screenAction29('Operaciones','operations')");
    if (file.endsWith('fields32.js')) text = text.replace("['parts','item_serial_prefix','Prefijo de serial',false,false]", "['parts','item_serial_prefix','Prefijo de serial',true,true]");
    // Feeding keeps the larvero as the primary container. Its food must stay
    // in the feeding material inputs rather than replace the larvero input.
    if (file.endsWith('control-workspace30.js')) text = text.replace(
        "if (['EGG','NUR'].includes(station.code)) return null;",
        "if (['EGG','NUR','REA','RRE'].includes(station.code)) return null;",
    );
    // Rev031 owns its internal history. Letting Inertia consume those snapshots
    // remounts the shell and evaluates its global declarations a second time.
    if (file.endsWith('interface29.js')) text = text.replace(
        /^window\.addEventListener\('popstate',e=>\{if\(!e\.state\?\.insectmes\)return;(.+)\}\);$/m,
        "window.addEventListener('popstate',e=>{if(!e.state?.insectmes)return;e.stopImmediatePropagation();$1},true);",
    );
    if (file.endsWith('record-workspace31.js')) text = text.replace(
        'if(descriptor)history.back();else renderApp();',
        "if(descriptor)history.replaceState({insectmes:snapshot29()},'','#/'+shellScreen);renderApp();",
    );
    if (file.endsWith('runtime.js')) text = text
        .replace("if(uiState.unitEditIndex !== null) state.units[uiState.unitEditIndex] = {code, description};", "if(state.units.some((row,index)=>index!==uiState.unitEditIndex&&row.code.toLocaleLowerCase()===code.toLocaleLowerCase())){showMsg('El código de unidad ya existe.',true);return;}if(uiState.unitEditIndex !== null) state.units[uiState.unitEditIndex] = {code, description};")
        .replace('class="card-title">No Parte</div>', 'class="card-title">Productos e Insumos</div>')
        .replace("name:'No Parte',section:'items'", "name:'Productos e Insumos',section:'items'")
        .replaceAll('Editar No Parte', 'Editar producto o insumo')
        .replaceAll('Agregar No Parte', 'Agregar producto o insumo');
    return text.replaceAll('Detalle de No Parte', 'Detalle de Productos e Insumos');
};
const output = path.join(root, 'public/rev031');
fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
// Use the complete supplied implementation, with only its storage and login adapters replaced.
let runtime = read('src/core/runtime.js');
runtime = runtime.replace(
    "const STORAGE_KEY = 'InsectMES_Rev031_state';",
    "const STORAGE_KEY = 'InsectMES_Laravel_Rev031_state';",
);
runtime = runtime.replace(
    "const SESSION_KEY = 'InsectMES_Rev031_session';",
    "const SESSION_KEY = 'InsectMES_Laravel_Rev031_session';",
);
runtime = runtime.replace(
    'let state = defaultState();',
    'let state = structuredClone(window.insectLaravel.state);',
);
runtime = runtime.replace(
    /function loadState\(\)\{[\s\S]*?\n\}/,
    `function loadState(){state=structuredClone(window.insectLaravel.state);savedContainerCatalog31=true;try{const saved=JSON.parse(localStorage.getItem('InsectMES_recents_'+window.insectLaravel.session.accountId)||'null');if(Array.isArray(saved))state.recents=saved.filter(id=>typeof id==='string'&&levelFor(id)>0).slice(0,20);}catch{}}`,
);
runtime = runtime.replace(
    /function saveState\(\)\{[\s\S]*?\n\}/,
    `let lastOperationalState031="";function saveState(){try{localStorage.setItem('InsectMES_recents_'+window.insectLaravel.session.accountId,JSON.stringify(state.recents));}catch{}const content=JSON.stringify({...state,recents:[]});if(!window.insectLaravel.booted){lastOperationalState031=content;return;}if(content===lastOperationalState031)return;const result=window.persistInsectState(state,typeof shellScreen!=="undefined"?shellScreen:"home");lastOperationalState031=content;return result;}`,
);
runtime = runtime.replace(
    /^function loginScreen\(\).*$/m,
    'function loginScreen(){}',
);
runtime = runtime.replace(
    'shellSession=null;',
    'shellSession=window.insectLaravel.session;',
);
let modules = config.modules
    .map((file) => {
        let text = read(file);
        if (file.endsWith('interface29.js')) {
            text = text.replace(
                /^function initSecurity\(\).*$/m,
                'function initSecurity(){securityData=window.insectLaravel.security;}',
            );
            text = text.replace(
                /^function persistSecurity\(\).*$/m,
                'function persistSecurity(){}',
            );
            text = text.replace(
                /^loginScreen=function\(\).*$/m,
                'loginScreen=function(){};',
            );
            text = text.replace(
                /^enterDemo=async function\(\).*$/m,
                'enterDemo=async function(){throw Error("Use el acceso autenticado de Laravel.");};',
            );
        }
        if (file.endsWith('assistant-server-voice30.js')) {
            text = text.replace(
                "'X-InsectMES-Dictation':'1'",
                "'X-InsectMES-Dictation':'1','X-XSRF-TOKEN':decodeURIComponent(document.cookie.split('; ').find(value=>value.startsWith('XSRF-TOKEN='))?.slice(11)||'')",
            );
        }
        // Every browser cache belongs to this Laravel installation; never copy another site's data.
        return text.replaceAll('InsectMES_Rev031', 'InsectMES_Laravel_Rev031');
    })
    .join('\n');
const requisitions = fs.readFileSync(
    path.join(root, 'resources/rev031/requisitions.js'),
    'utf8',
);
const enhancements = [
    'workspace-enhancements.js',
    'inventory-workflows.js',
    'production-labels.js',
    'header-help40.js',
    'grid-contrast44.js',
]
    .map((file) =>
        fs.readFileSync(path.join(root, 'resources/rev031', file), 'utf8'),
    )
    .join('\n');
const bridge = fs.readFileSync(
    path.join(root, 'resources/rev031/bridge.js'),
    'utf8',
);
const boot = read('src/core/bootstrap.js').replace(
    'if(state.parts.length === 0) seedDemo();',
    '// No demo inventory is generated in Laravel.',
);
const script = [
    runtime,
    modules,
    requisitions,
    enhancements,
    bridge,
    boot,
    'window.insectLaravel.booted=true;window.dispatchEvent(new Event("insectmes:ready"));',
]
    .join('\n')
    .replaceAll('assets/insetti-logo.png', '/rev031/assets/insetti-logo.png')
    .replaceAll("getElementById('app')", "getElementById('rev031-application')")
    .replaceAll('getElementById("app")', 'getElementById("rev031-application")')
    .replaceAll('#app', '#rev031-application');
const style = (
    config.styles.map(read).join('\n') +
    '\n' +
    fs.readFileSync(path.join(root, 'resources/rev031/laravel.css'), 'utf8')
).replaceAll('#app', '#rev031-application');
fs.writeFileSync(path.join(output, 'assets/app.js'), script);
fs.writeFileSync(path.join(output, 'assets/app.css'), style);
fs.copyFileSync(
    path.join(source, 'src/assets/insetti-logo.png'),
    path.join(output, 'assets/insetti-logo.png'),
);
fs.cpSync(
    path.join(source, 'src/assets/vendor'),
    path.join(output, 'assets/vendor'),
    { recursive: true },
);
// Static markup is mounted in the main document, never inside an iframe.
let markup = read('src/templates/index.html').match(
    /<body>([\s\S]*?)<script src=/,
)[1];
markup = markup
    .replaceAll('assets/', '/rev031/assets/')
    .replace('id="app"', 'id="rev031-application"');
fs.mkdirSync(path.join(root, 'resources/js/lib'), { recursive: true });
fs.writeFileSync(
    path.join(root, 'resources/js/lib/rev031-markup.json'),
    JSON.stringify(markup),
);
const menu = vm.runInNewContext(
    read('src/modules/menu-approved.js') +
        '\nJSON.stringify(menuApproved29.modules)',
    {},
    { timeout: 1000 },
);
fs.writeFileSync(path.join(root, 'resources/js/lib/rev031-menu.json'), menu);
const hash = crypto
    .createHash('sha256')
    .update(script)
    .update(style)
    .digest('hex')
    .slice(0, 12);
fs.writeFileSync(
    path.join(root, 'resources/js/lib/rev031-build.json'),
    JSON.stringify({
        hash,
        modules: config.modules.length,
        styles: config.styles.length,
    }),
);
console.log(
    `Rev031 integrada: ${config.modules.length} módulos, ${config.styles.length} estilos, versión ${hash}`,
);
