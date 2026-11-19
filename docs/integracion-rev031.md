# Integración de Rev031 en InsectMES Laravel

## Corrección de navegación y header · 12 de noviembre de 2026

Las páginas de Gobernar, Usuarios y los ajustes de cuenta usan ahora el mismo componente de navegación y header que las pantallas operativas de Rev031. Se retira su dependencia del contenedor de sidebar anterior.

El header conserva un separador antes del título. Apariencia muestra solo el icono y se coloca entre Ayuda e IA. El botón de la cuenta muestra solo el avatar; el menú conserva los datos de la cuenta y su enlace se llama Perfil.

Verificado en las cinco vistas de Gobernar, Usuarios, Apariencia y Perfil, a 420, 768 y 1500 píxeles. También se comprobaron Equipos, el regreso a Inicio y el header del Control Panel. No se modificaron datos ni permisos. Compilación, TypeScript, nueve pruebas PHP de integración y verificación de navegador sin errores.

Implementación local del 11 de noviembre de 2026.

## Resultado

`/dashboard` presenta la interfaz completa de Rev031 en el mismo documento, sin iframe ni aplicación adicional. Se incorporaron sus 55 módulos y 26 archivos de estilo desde la copia suministrada por Alejandro.

Del principal se conservan Gobernar (Fase 0, Validación y firmas, Integraciones, Auditoría y Continuidad), Apariencia (Claro, Oscuro y Sistema), Usuarios y accesos y la autenticación nativa. Las rutas antiguas de las demás pantallas redirigen a su equivalente de Rev031.

La fuente utilizada queda conservada en `resources/rev031/source`. La carpeta original `InsectMES-Rev031` no se modifica. `scripts/build-rev031.mjs` genera los recursos publicados y las plantillas; el script `build` del proyecto incluye ese paso antes de compilar.

## Guardado y datos

La aplicación usa las sesiones, permisos y protección CSRF de Laravel. No utiliza el inicio de sesión de demostración de Rev031.

El estado funcional de la revisión se guarda en SQLite, dentro de `mes_settings`, con número de revisión y detección de cambios simultáneos. Las partes, ubicaciones, contenedores, movimientos y genealogía se reflejan además en las tablas nativas. Los demás catálogos y registros de Rev031 se conservan en su estado completo dentro de SQLite; no se sustituyen por los antiguos formularios del principal.

El servidor verifica referencias, seriales únicos, cantidades no negativas, preservación de contenedores, permisos sobre catálogos y restricciones de cuarentena. Un cambio nativo posterior a la carga impide sobrescribir el inventario desde una sesión anterior. Las operaciones conservan la validación funcional de la revisión y su manejo de errores al rechazar un guardado.

Se deshabilita la creación automática de inventario de ejemplo del site. Antes de aplicar la migración se creó un respaldo SQLite con integridad verificada en `.local/backups/before-rev031-20261111-215345.sqlite`. Después de la integración se conservaron los 10 usuarios y los seis contenedores del principal. Los catálogos adicionales de Rev031 amplían las partes de 20 a 25; no generan existencias. No se importa automáticamente `Datos/Rev031-datos-recuperados.json`.

Las gráficas distinguen los registros históricos de las capturas nuevas. El historial de Forms/Excel y las referencias internas de costos se conservan en `.local/rev031-private/` en la instalación local. La compilación los usa cuando están disponibles. Un checkout de GitHub compila con esos conjuntos vacíos y puede registrar sus propias capturas. Los archivos compilados que usan las referencias privadas se conservan en el equipo local.

## Ejecución

- Aplicación: `http://127.0.0.1:8013/dashboard`.
- PHP local: `.local/php/php.exe`.
- Inicio: `.local/Iniciar InsectMES.cmd`.
- Se utiliza la compilación del frontend; Vite no necesita permanecer ejecutándose.
- El dictado alternativo aprovecha el servicio local ya disponible en `127.0.0.1:8094` mediante rutas autenticadas de Laravel. Su salud respondió disponible; no se grabó audio del usuario. Si se detiene ese servicio, el cliente comunica la indisponibilidad. Chrome conserva su reconocimiento nativo.
- El asistente conserva las funciones de Rev031; esta integración no añade un proveedor de IA generativa.
- Las etiquetas generan PDF. No se enviaron trabajos a una impresora física.

## Verificación realizada

- Compilación del frontend y comprobación de TypeScript correctas.
- Análisis estático PHP completo sin errores y formato de los archivos modificados verificado.
- Suite completa: 101 pruebas ejecutadas, 99 aprobadas, dos omitidas y 617 aserciones. Incluye la integración Rev031, acceso, validación, continuidad, integraciones y los flujos anteriores del backend.
- Navegación de 47 pantallas de Rev031 y acceso a las seis vistas nativas conservadas sin errores de JavaScript.
- Recarga después de guardar: conserva estado operativo, catálogos, cargas, etiquetas y datos del inventario.
- Cosecha por interfaz, creación de serial y recuperación después de recargar, en base de pruebas independiente.
- Descargas reales CSV, Excel y PDF; etiqueta PDF vectorial con QR.
- Apariencia Claro/Oscuro y anchos de 420, 768 y 1500 píxeles, sin desbordamiento horizontal.
- Comprobación final del principal: seis contenedores, integridad SQLite correcta y cero integraciones HTTP activas.

Las pruebas operativas se ejecutaron en bases aisladas bajo `.local`; no se insertó producción QA en el principal. La validación funcional conserva las limitaciones documentadas del site: no sustituye una validación industrial ni una prueba de etiquetas sobre la impresora real. No se hicieron commits ni publicaciones en GitHub.

## Ajustes de navegación y parámetros — 12 de noviembre de 2026

- Las vistas nativas conservadas usan el mismo contenedor, menú lateral y encabezado de Rev031. Se verificaron ocho vistas en anchos de 420, 768 y 1500 píxeles, sin barra lateral antigua ni desbordamiento horizontal.
- Encabezado: separador antes del título, apariencia sólo como icono entre Ayuda e IA, y cuenta sólo como avatar.
- Menú de cuenta definitivo: Perfil, Empresa, Usuarios, Roles y Log out, en una sola lista. No contiene Plataforma, Settings ni Setup Tables. Los cuatro iconos son distintos y miden 16 × 16 píxeles.
- Usuarios administra las cuentas y asigna el rol. Roles tiene listado y formularios propios para crear o modificar roles, seleccionar pantallas y configurar acciones por área. Las restricciones de pantalla se verifican en el servidor, además del menú. Los roles existentes conservan sus accesos hasta que se guarde su configuración; Administrador mantiene acceso de recuperación.
- Los accesos de pantallas se almacenan en `mes_settings`, claves `role.screens.{id}`. No se requirieron cambios al esquema ni modificaciones de los usuarios o roles actuales para habilitar las nuevas pantallas.
- Por autorización expresa del usuario se reemplazaron los 104 parámetros por los 104 registros completos de `InsectMES-Rev031/Datos/Rev031-datos-recuperados.json`, incluidos valores numéricos, procesos, unidades, estados y orígenes. La copia de referencia es `resources/rev031/reference-parameters.json`. La sustitución se verificó por igualdad completa del catálogo.
- Respaldo previo a esa sustitución: `.local/backups/before-parameters-rev031-20261112-090605.sqlite`, con integridad verificada. Informe: `.local/parameters-rev031-replacement.json`.
- Después de la sustitución: 10 usuarios, 25 partes, 6 contenedores, integridad SQLite correcta y cero integraciones HTTP activas.

Verificación final de esta revisión: compilación y TypeScript correctos; análisis PHP sin errores; 21 pruebas de acceso y almacenamiento aprobadas. Navegación de Perfil/Empresa/Usuarios/Roles comprobada en navegador automatizado, catálogo completo de 104 parámetros idéntico a la fuente y sin errores JavaScript. Las pruebas de creación/edición de roles y usuarios se ejecutaron en base aislada; en la base principal sólo se reemplazó el catálogo de Parámetros autorizado.

### Enlace de Inicio y separador del encabezado

Se cambió la marca InsectMES a un enlace real a `/dashboard#/home`, disponible también desde las vistas nativas. En el escritorio operativo fuerza la carga de Inicio para que el cambio no dependa del guardado de preferencias de la pantalla anterior. La separación antes del título es un elemento fijo de 1 × 24 píxeles, con contraste para los modos claro y oscuro. La compilación pasó. Se comprobó el enlace y el separador en 12 pantallas, incluidos Usuarios, Roles, Perfil, Parámetros, Equipos y Control Panel, a 420, 768 y 1500 píxeles, sin errores JavaScript. Evidencia: `.local/brand-separator-qa.json` y `.local/inicio-separador-final.png`.

### Corrección del tamaño del separador y del encabezado

El ajuste anterior de 24 píxeles quedó sustituido: el separador mide 16 píxeles y se dibuja dentro del título, sin añadir otro elemento ni un espacio adicional entre elementos. Se quitó la altura mínima añadida al título. En escritorio desde 1001 píxeles, el encabezado conserva una sola fila de 79 píxeles; móvil mantiene su disposición adaptable. Compilación correcta y revisión de Usuarios, Parámetros y Control Panel en siete anchos (420, 768, 1001, 1100, 1280, 1500 y 1920), sin desbordamiento. Se conservó y verificó el enlace InsectMES → Inicio. Evidencia: `.local/header-compact-qa.json` y `.local/header-compacto-corregido.png`.

## Requisiciones, modo oscuro y carga inicial — 12 de noviembre de 2026

- Nueva pantalla **Compras → Requisiciones**. Su lista y detalle usan la navegación, los filtros por texto/columna, filtros guardados, opciones de pantalla, exportación y barras de acciones de Rev031.
- Consecutivo automático `REQ-000001`, identidad estable y control de concurrencia del espacio de trabajo. Cada solicitud tiene fecha, solicitante, referencia libre y una o más partidas con artículo/servicio, cantidad abierta, unidad, notas y casilla de comprada. Se pueden agregar, editar y quitar partidas conservando al menos una.
- Estatus derivado del checklist: Pendiente (ninguna comprada), Parcial y Completada (todas compradas). No hay creación de OC, recepción ni consumo de inventario en esta etapa.
- Almacenamiento en `mes_settings / rev031.workspace / state.requisitions31`, sin cambios al esquema. Nuevo adaptador: `resources/rev031/requisitions.js`; el prototipo original sigue intacto. Validación y permisos se comprueban en el servidor mediante `RequisitionValidator`.
- Se agregaron tres permisos de Requisiciones: consultar, solicitar/editar y marcar compras. Los roles existentes recibieron únicamente los dos primeros permisos nuevos; Administrador dispone también de marcar compras. El permiso de marcar compras se puede asignar desde Roles. No se ampliaron permisos de inventario, usuarios ni otros módulos. Los roles con selección explícita de pantallas requieren habilitar Requisiciones en esa selección.
- Respaldo antes de añadir estos permisos: `.local/backups/before-requisitions-20261112-101756.sqlite`, integridad verificada. No se alteraron asignaciones de rol, usuarios, contraseñas ni registros operativos.
- Modo oscuro: encabezado, identidad sin fondo independiente, marca sin subrayado, menú lateral, tablas y filtros con contraste legible. Se conserva el encabezado compacto de escritorio.
- Carga: estilos en la cabecera HTML para las vistas del espacio de trabajo; motor precargado; datos iniciales incluidos en la respuesta de Inertia. Se evita una segunda consulta de bootstrap. La estructura se hace visible cuando están listos los estilos y el motor, también al pasar desde el formulario de acceso. Se eliminó el mensaje inicial “Preparando InsectMES”. Los errores de carga o guardado continúan visibles.
- Navegar no recarga el documento dentro de Rev031 ni guarda la instantánea completa sólo por cambiar de pantalla. Las pantallas recientes se conservan por cuenta en el navegador; las capturas operativas continúan con guardado validado, auditoría y rechazo de revisiones desactualizadas.
- Validación: 24 pruebas PHP aprobadas (192 aserciones), TypeScript y compilación correctos y análisis PHP sin errores. En una copia aislada se comprobó crear, editar, añadir/quitar partidas, consecutivos 1 y 2, compras parciales/completas, persistencia al recargar y filtros de texto/estatus. Se revisaron cuatro anchos de pantalla.
- En el principal se verificaron Requisiciones vacío, Usuarios, Roles y Apariencia, sin errores JavaScript ni consulta adicional de bootstrap. Con una demora artificial de 600 ms en CSS, 80 fotogramas muestreados mostraron cero estructuras visibles sin estilos. Evidencia en `.local/requisiciones-main-qa.cjs`, `.local/requisiciones-ui-qa.json` y `.local/requisiciones-principal.png`.
- Los recursos compilados se prepararon en una carpeta independiente y se copiaron antes de actualizar el manifiesto; se conservaron los recursos previos. La base principal quedó con 10 usuarios, 10 roles, 25 partes, 6 contenedores, cero requisiciones de prueba, integridad correcta y cero integraciones HTTP activas.

## Idioma, Glosario general, escaneo y etiquetas de producción — 12 de noviembre de 2026

- El icono Idioma se incorpora al encabezado compartido. Abre un panel lateral con Español y English. Los elementos son informativos: no traducen, no cambian la selección y no guardan preferencias de idioma.
- El engrane conserva sus opciones operativas; se retiraron el acceso a Parámetros y el título CONFIGURACIÓN de ese desplegable. Glosario aparece primero. Parámetros permanece en Bioingeniería.
- Glosario es una funcionalidad general, sin una regla especial para No Parte. Detecta encabezados de tablas, etiquetas de campos (anidadas, asociadas por `for` o adyacentes al control), marcadores de búsqueda y campos de formularios/diálogos de Rev031 y React. La configuración se guarda por pantalla en `state.glossary36`. Conserva las claves de datos y el texto original que usan los filtros; el alias se presenta con atributos y estilos. No renombra columnas de SQLite ni valores de registros. Requiere administración de configuración. En diálogos, el editor queda dentro del diálogo para conservar el manejo de foco; el modo inicial se muestra como una ayuda compacta que permite abrir formularios.
- Inventario: sin selección, Trazabilidad/Move/Split/Merge abren una pantalla única de escaneo con la acción elegida. Incluye lectura de serial con Enter, pegado de varios, verificación de duplicados/existencia y listado revisable, sin edición libre de metadatos. Con selección: Trazabilidad admite uno; Move uno o más; Split uno; Merge dos o más del mismo NP. Los permisos y controles de estatus, cuarentena, finalización y mezcla de lotes continúan vigentes.
- Move solicita un destino activo y conserva las cantidades y seriales. Split solicita el total de divisiones y sus cantidades, conserva el original en la primera y crea seriales para las divisiones adicionales, manteniendo ubicación y cantidad total. Merge solicita cuál serial seleccionado se conserva; acumula allí el saldo y deja inactivos/sin saldo los demás, manteniendo el historial. El movimiento de entrada al serial conservado registra sólo la cantidad incorporada, sin contar nuevamente su saldo previo.
- Las transacciones se registran en `state.inventoryTransactions36`; `InventoryWorkflowValidator` comprueba selección, conservación de cantidades, identidad del serial conservado, ubicación y ausencia de cambios a otros contenedores. Se guardan movimientos y genealogía en la misma transacción del espacio de trabajo. No se requirieron cambios al esquema.
- Producción actual muestra exclusivamente selección, Serial, NP, Descripción y Cantidad, con Imprimir etiquetas · PDF. No contiene filtros ni Exportar. Sólo se incluyen en el PDF los seriales seleccionados.
- Se añadió asignación de etiquetas a Process Routing en el diseñador. Prioridad: routing identificado, operación, NP y etiqueta predeterminada activa. El reporte de producción muestra automáticamente el PDF después de confirmar el guardado; un fallo de PDF conserva la producción confirmada y comunica cómo reimprimirla. No se envían trabajos a impresoras físicas. El historial de impresiones es de sólo adición y admite usuarios con permiso de consulta, sin conceder modificaciones a inventario.
- Adaptadores: `resources/rev031/workspace-enhancements.js`, `inventory-workflows.js` y `production-labels.js`. El prototipo original no fue modificado.
- Referencias consultadas para el patrón de escaneo: página oficial de inventario de Plex (`https://www.plex.com/products/manufacturing-execution-system/inventory-management`) y material de capacitación de NAL con pantallas de Plex (`https://www.nal.com/wp-content/uploads/2020/12/Plex-Inventory-Presentation.pdf`). Se adaptó el flujo a la pantalla unificada solicitada; no se hicieron cambios ni movimientos en Plex.

Validación de esta revisión:

- 30 pruebas PHP aprobadas, 224 aserciones; análisis PHP y compilación correctos. Incluye conservación de saldos, movimientos masivos, identidad del serial retenido, rechazos de uniones incompatibles, permisos de Glosario e impresión de consulta sin edición de existencias.
- Prueba real por interfaz en una copia de SQLite: lectura masiva, Move de dos seriales, Split en tres conservando el original, Merge hacia el serial elegido, trazabilidad del serial escaneado, captura de cosecha, PDF automático por routing y reimpresión de un solo serial. Se comprobó la asignación de routing desde el diseñador y la alternativa por operación.
- Glosario revisado en 18 pantallas operativas y seis vistas adicionales, con cambios persistentes e independientes por pantalla. Se verificaron Perfil con etiquetas `for`, formularios de Usuarios y Roles dentro de diálogos y etiquetas adyacentes del Control Panel. Las pruebas de Glosario no alteraron datos de usuarios ni crearon roles.
- Revisión visual de modo oscuro, panel de idiomas, formulario de producción y lista de producción actual. Anchos 420, 768, 1100 y 1500 sin desbordamiento horizontal. Cero errores de JavaScript en los escenarios registrados.
- Respaldo previo: `.local/backups/before-workspace36-20261112-110419.sqlite`. La base de pruebas y sus datos quedan en `.local/qa-workspace36-20261112-110419.sqlite`. No se restauró ni sustituyó la base principal.
- Comprobación en el principal: inventario físico idéntico al respaldo (seriales, partes, cantidades, unidades, ubicaciones, estatus y cuarentenas); seis contenedores, cero movimientos nuevos de prueba, cero reportes de producción de prueba y cero aliases de ejemplo. Integridad correcta. El servidor principal continúa en 8013.
- Evidencia: `.local/workspace36-ui-qa.json`, `.local/glossary-global36-qa.json`, `.local/production-current36.png`, `.local/workspace36-dark-final.png`, `.local/workspace36-principal.png` y los verificadores de cada escenario bajo `.local`.

### Menús del header e idioma

Idioma se encuentra dentro del menú de la cuenta, después de Roles y antes de Log out. Despliega Español y English en una lista compacta dentro del mismo menú; todavía no cambia el idioma. Se retiró el icono independiente del header. Glosario conserva su comportamiento.

Configuración vuelve a mostrar su título antes de Glosario. Recientes, Favoritos, Configuración, Ayuda, Apariencia y Cuenta comparten superficies, tipografía, espaciado y estados de interacción. Sólo un desplegable permanece abierto y todos se sitúan debajo del header. IA conserva su interfaz. El separador entre usuario y empresa tiene el mismo alto y color que el situado antes del título; el header de escritorio conserva sus 79 píxeles.

Compilación, TypeScript y revisión de diferencias correctos. Prueba por navegador en Envíos, Usuarios y Perfil, con Claro/Oscuro y anchos de 420, 768 y 1500 píxeles: menús sin empalmes ni desbordamiento, cierre con Escape, orden de cuenta e idioma sin efecto funcional. Cero errores de JavaScript. Evidencia: `.local/header37-qa.cjs`, `.local/header37-Claro.png` y `.local/header37-Oscuro.png`. Todos los cambios permanecen locales.

### Requisiciones: resumen y hoja de partidas

El listado muestra únicamente Consecutivo, Fecha, Solicitante, Referencia, número de Partidas, Avance y Estatus. Agregar o abrir un consecutivo lleva a una pantalla de detalle, con URL propia bajo `#/requisitions/REQ-...`, conservando el header y la navegación. Se retiró el formulario modal.

Las partidas se capturan en una tabla tipo hoja de cálculo: Comprada, Artículo o servicio, Cantidad, Unidad y Notas. Admite edición en celdas, Enter para avanzar de fila, Tab para cambiar de celda y pegado de varias filas/columnas desde Excel. Permite agregar y eliminar partidas conservando al menos una, con un máximo de 500. Guardar confirma los cambios en Laravel; Volver al listado conserva temporalmente el borrador en la sesión abierta y Descartar cambios lo abandona. Al recargar con cambios pendientes el navegador avisa. El consecutivo se asigna definitivamente al guardar; se mantienen las validaciones y permisos del servidor y el estatus automático por compras realizadas. No se modifica inventario ni se crean OC.

Validación: tres pruebas de Requisiciones aprobadas con 21 aserciones. Prueba de interfaz sobre una copia aislada de SQLite: creación mediante pegado de tres partidas, edición, filas nuevas con Enter, eliminación, compras parciales/completas, guardado y recarga, descarte de cambios, navegación atrás/adelante y filtros del resumen. Verificado en Claro/Oscuro y 420, 768 y 1500 píxeles, sin desbordamiento ni errores de JavaScript. Inventario de la copia intacto. Revisión final del principal sin guardar: cero peticiones de escritura del workspace y estado persistido idéntico antes/después. El servidor de pruebas se detuvo; el principal permanece en 8013. Evidencia: `.local/requisition-grid38-qa.cjs` y `.local/requisition-grid38-principal-Claro.png` / `Oscuro.png`.

### Sandbox, navegación personal y ayuda

Configuración abre **Sandbox** en una pestaña nueva, conservando ruta, consulta y pantalla actual. Dentro de Sandbox, la misma opción se llama **Producción** y vuelve al principal en otra pestaña. Principal: `http://127.0.0.1:8013`; Sandbox: `http://localhost:8015`. Los dos comparten el código de este proyecto, con bases, archivos de trabajo, cachés y sesiones separados. La diferencia de hostname evita colisiones de cookies entre puertos. Sandbox tiene header naranja, navegación en tonos cálidos y marca SANDBOX, incluso en modo oscuro.

Base de Sandbox: `.local/sandbox/database.sqlite`. `scripts/refresh-sandbox.php` usa VACUUM INTO para obtener una copia consistente de `database/database.sqlite`, verifica integridad y referencias, deshabilita conectores y elimina sesiones, tokens de recuperación y trabajos pendientes únicamente de la copia. Conserva los datos de negocio. Antes de reemplazar un Sandbox existente lo mueve a `.local/sandbox/backups`; no hay borrado automático de esos respaldos. Un bloqueo coordina el refresco con las peticiones del Sandbox y una revisión nueva invalida capturas anteriores. El principal no se reemplaza ni se migra. Los servicios HTTP de Laravel quedan bloqueados en el entorno sandbox; correos se dirigen al log y sus archivos son privados al entorno.

El refresco de Sandbox es **manual**, desde el botón pequeño junto a Sandbox dentro de Configuración, en el principal y para administradores. El menú contiene únicamente Sandbox, Glosario, Setup Tables y Settings; en Sandbox la primera opción dice Producción. La automatización de Codex se eliminó por indicación del usuario; no se instaló otro horario automático. `scripts/start-sandbox.ps1` inicia el servidor local sin elevación; `.local/sandbox/status.json` registra la última copia. Los cambios de prueba se reemplazan al confirmar el refresco; la copia anterior se conserva. La preparación para que Ricardo configure su ejecución futura está en `docs/sandbox-operacion.md` y `ops/sandbox/github-actions.example.yml`, una plantilla inactiva fuera de `.github/workflows`.

Configuración ya no muestra Container Status, Container Type ni Seguridad de esta pantalla. Se mantienen Glosario, Sandbox/Producción, Setup Tables y Settings. Ayuda contiene Documentación e Iconos. Iconos explica los controles del header y las variantes de Apariencia, sin los créditos ni los textos provisionales de la antigua ayuda. Documentación tiene índice por pantalla, búsqueda y artículos contextuales; las pantallas principales tienen pasos y consideraciones específicas y las restantes muestran una guía general y los campos capturados al abrir su ayuda. La administración de permisos continúa en Roles.

Favoritos presenta Agregar pantalla actual y Editar favoritos antes de la lista, separados visualmente. Su editor es un cuadro compacto centrado de hasta 520 píxeles: muestra Inicio una sola vez como encabezado, con casillas que permiten seleccionar una sola pantalla. Si no hay ninguna marcada se utiliza el Inicio habitual, sin una fila adicional para esa opción. Permite ordenar y quitar favoritos. Se guarda por usuario en este navegador y separadamente en cada entorno, sin modificar datos operativos ni conceder permisos. Recientes muestra hasta diez pantallas, o las que quepan en una ventana baja, sin barra de desplazamiento interna.

El cambio de entorno reconoce la identidad de la sesión existente mediante un intercambio local de un solo uso, de 90 segundos y vinculado al navegador. No vuelve a pedir contraseña cuando la identidad sigue siendo válida. Mantiene bases y sesiones separadas y consulta los permisos reales del usuario en el destino. El catálogo se llama Productos e Insumos y Operations se presenta como Operaciones; los identificadores y códigos de datos no cambian.

Validación adicional: 19 pruebas PHP y 89 aserciones aprobadas; PHPStan sin errores. Prueba real en navegador del cambio en ambos sentidos sin login de destino, mismo usuario, editor compacto en claro/oscuro, selección exclusiva de Inicio y opción de dejarlo sin marcar, nuevos nombres de catálogo/operaciones y refresco manual sin cambios en el workspace principal. Evidencia: `.local/environment41-qa.cjs` y `.local/favorites41-Claro.png` / `Oscuro.png`.

Validación: 13 pruebas PHP aprobadas, 78 aserciones; verificación real del refresco con un marcador exclusivo de Sandbox, respaldo anterior legible, invalidación de revisión y bloqueo HTTP, conservando el principal. Prueba de navegador: limpieza de Configuración, ayuda contextual y 12 iconos, favoritos y elección de Inicio, límite de Recientes, copia de pestaña entre entornos aun después de iniciar sesión, y naranja en Claro/Oscuro en 420, 768, 1001 y 1500 píxeles. Sin errores JavaScript ni peticiones de escritura operativa del principal durante la prueba. Evidencia: `.local/navigation40-qa.cjs`, `.local/verify-sandbox40.php`, `.local/sandbox40-Claro.png`, `.local/sandbox40-Oscuro.png` y `.local/iconos40.png`.
