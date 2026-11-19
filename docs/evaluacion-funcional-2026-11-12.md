# Revisión funcional de InsectMES

Estado: ajustes visuales y recorrido funcional principal completados. Cierre: 12 de noviembre de 2026, hora de México.

## Alcance y método

Recorridos con navegador y formularios reales: altas, cambios, guardado, reapertura, filtros, validaciones y operaciones relacionadas. La revisión usa una copia aislada en `.local/review44`, con servidor local en 8014 y almacenamiento separado. No se modifica el principal ni el Sandbox utilizado por el usuario. Los datos creados para pruebas se identifican con QA44.

La comprobación final compara los datos del principal con su huella previa. No se harán commits ni publicaciones en GitHub. Las correcciones se limitan a defectos comprobados; no se agregan funciones, estructuras ni menús nuevos sin una instrucción del usuario.

## Resultado del recorrido

Se abrieron 45 pantallas de Rev031 y ocho secciones nativas con su contenido y encabezado. Abrir una pantalla se registró por separado de completar una operación. Los siguientes procesos sí se ejecutaron por formularios y controles del navegador, con datos de prueba en la copia aislada:

| Proceso | Comprobación realizada | Resultado |
| --- | --- | --- |
| Catálogos | Alta de unidad y producto; referencias a tipo, unidad y prefijo; guardar y reabrir | Aprobado |
| Ingeniería | Operación, centro y ubicación asociada, paso de ruta, centro permitido y BOM con componente | Aprobado |
| Compras | Proveedor, OC con precio/cantidad/importe, rechazo de exceso sobre saldo, recibo y finalización | Aprobado |
| Requisiciones | Listado, hoja independiente, pegado de varias partidas, Enter, agregar/eliminar, editar cantidades, marcar compradas, completar, descartar, recargar y filtrar | Aprobado |
| Inventario | Matriz de selección, escaneo masivo, Move de dos seriales, Split en tres y Merge al serial elegido | Aprobado |
| Trazabilidad | Reapertura de transacciones Move/Split/Merge; conservación de saldos y serial original | Aprobado |
| Planeación | Job asociado a ruta/centro, reapertura y consulta de capacidad; apertura de MRP y PRP | Aprobado; MRP/PRP no se presentan como conciliación independiente de todas sus fórmulas |
| Producción de huevos | Captura por jaulas, guardado, PDF automático y PDF de selección en Producción actual sin filtros | Aprobado |
| Guardería | Cuatro materiales, ingreso N0, bloqueo antes de cumplir espera y avance N1–N5 | Aprobado con reloj de prueba en el navegador aislado |
| Transferencia | Escaneo de incubadora, muestras, 12,000 larvas de salida y remanente de 4,000 en Hold | Aprobado |
| Alimentación | Escanear larvero y alimento; cargar sin descontar; confirmar descuento de 1 kg, sin crear otro serial | Aprobado después de corrección |
| Tamizado | Escaneo, consumo del larvero, salida y genealogía | Aprobado |
| Postproceso y empaque | Jobs y capturas encadenadas WAS, SAN, DRY, FRA, GRI, PAC y BOX; consumo y genealogía de cada paso | Aprobado |
| Ventas y envío | Pedido, movimiento a ubicación habilitada, envío local, descuento y reapertura | Aprobado; sin transmisión externa |
| Calidad | No conformidad sin nota rechazada; registro con observación y muestra persistido | Aprobado |
| Mantenimiento | Equipo, checklist con dos pasos, ejecución y persistencia | Aprobado |
| Roles y usuarios | Alta de rol por formulario, alta de usuario ligado al rol y reapertura | Aprobado |
| Acceso limitado | Editor autorizado guarda operación; Inventario queda en consulta; Usuarios/Roles devuelven 403 | Aprobado después de corrección |
| Filtros | Búsqueda sin resultados y recuperación en catálogos comunes; búsqueda de requisición completada | Aprobado |

Las existencias especiales necesarias para el recorrido y el usuario editor se prepararon exclusivamente en la copia. El avance de cinco días de guardería se simuló con el reloj del navegador de prueba; no se cambió la hora de Windows ni se redujeron las esperas configuradas del proyecto.

## Hallazgos y evidencias

### Ajustes visuales previos completados

- Filtros y listas: fondos, texto, opciones marcadas, buscadores y calendarios siguen el tema oscuro resuelto. Verificado en principal y Sandbox con Claro, Oscuro y Sistema.
- Selección: se retiró el borde lateral y se pintó el fondo de toda la fila. Las celdas de inventario combinadas entre varios renglones reciben bandas independientes para no colorear los renglones vecinos. Una captura de tres filas con una celda combinada confirmó el mismo RGB en ambos extremos de la fila seleccionada: `(49, 83, 64)`.
- Gráficas: cifras principales, ejes, guías, barras, líneas y mensajes sin datos tienen colores legibles en oscuro/Sistema. Las etiquetas compactas se ampliaron de 12 a 22 unidades SVG y las cifras principales a 28 píxeles, conservando cálculos y distribución.
- Evidencias: `.local/ui44-check.cjs`, `.local/rowspan44.png`, `.local/filter44-primary-Oscuro.png`, `.local/filter44-sandbox-Sistema.png` y `.local/charts44-primary-Oscuro.png`.

### Defectos funcionales encontrados y corregidos

1. **Prefijo obligatorio sin indicación en el formulario.** Crear un producto terminaba con «Prefijo inexistente: sin valor». El prefijo ahora se marca y valida como obligatorio. El producto con unidad nueva se guardó y volvió a abrir.
2. **Ficha cancelada podía dejar el sistema en blanco.** Los estados internos del historial llegaban a Inertia, que volvía a evaluar el motor y producía `Identifier 'costReference30' has already been declared`. La navegación interna se atiende en su propio manejador; cerrar una ficha vuelve a su listado de forma inmediata. Se repitió seis veces abrir/cancelar sin recargar el documento ni producir errores.
3. **Permisos de la pantalla actual omitidos.** Un editor tenía nivel 2 en Operaciones, pero `levelFor()` devolvía 0 y ocultaba Agregar. Se restauró la pantalla actual como valor predeterminado; un nivel explícito 0 se respeta. Verificados guardado autorizado y rechazo de accesos administrativos.
4. **Código de unidad duplicado.** Permitía guardar `QA44` y `qa44`. Se bloquea en el formulario y en el servidor cuando cambia el catálogo, sin limpiar datos existentes. La prueba de regresión comprueba rechazo y ausencia de guardado.
5. **Perfil y Seguridad dependían de permisos de negocio.** La carga del encabezado pedía datos de operación incluso para una cuenta sin acceso al inicio. Sus formularios personales ahora se abren sin cargar el espacio de negocio; el punto de acceso a datos sigue devolviendo 403. Los usuarios habituales conservan el encabezado compartido.
6. **Alimento tratado como larvero.** El adaptador genérico de BOM promovía un componente de alimentación a entrada principal y dejaba la alimentación sin materiales. REA y RRE conservan su entrada de larvero y sus controles específicos de alimentación. La repetición comprobó descuento solo al confirmar, ausencia de serial nuevo, tamizado posterior y genealogía.

Las correcciones de Rev031 se incorporan a su adaptación Laravel y al generador de recursos. Se conserva el prototipo suministrado en `InsectMES-Rev031`.

## Comprobaciones finales

- Pruebas automáticas completas: **122 en total; 120 aprobadas y 2 omitidas; 725 aserciones**. La primera ejecución detectó tres fallos en acceso a formularios personales; la ejecución posterior a la corrección aprobó todo lo ejecutado.
- Compilación del frontend: aprobada. Aviso no bloqueante sobre la dependencia opcional `fontaine` para optimizar fuentes; no se instalaron dependencias adicionales.
- TypeScript: aprobado, sin errores.
- Estilo PHP de los archivos revisados: aprobado.
- Última comprobación visual: seis combinaciones de entorno y apariencia, sin errores del motor.
- Datos principales: comparación de huellas aprobada; **10 usuarios, 25 productos y 6 contenedores**. Inventario, productos y estado de operación idénticos al inicio. La evidencia está en `.local/review44/final-verification.json`.
- Todos los datos de prueba quedan en `.local/review44`; no se añadieron al principal ni al Sandbox del usuario.
- No hubo commits, cambios de rama, publicaciones ni transferencias a GitHub. La rama local permanece `main`, con cambios sin publicar. La primera publicación futura debe confirmar `V1` con Ricardo conforme a la instrucción del usuario.

## Evidencia y límites

Los pasos y respuestas del servidor están en `.local/review44/results.json`; se conservan también los intentos fallidos para distinguir un defecto del producto de un selector equivocado del recorrido automático. Los recorridos reproducibles están en los archivos `.cjs` de esa carpeta; las capturas están en `.local/review44/screenshots`.

La revisión cubre el recorrido principal y las validaciones descritas. No certifica todas las combinaciones de configuración, fórmulas de costos, planificación o retorno biológico a reproducción. Las secciones Gobernar se abrieron y se cubrieron sus pruebas automáticas; no se firmaron ni enviaron documentos reales. No se probaron impresoras físicas, lectores físicos, servicios externos ni despliegue remoto. La impresión se verificó mediante PDF.

No queda un fallo bloqueante en los recorridos completados. Los servidores del principal y Sandbox se conservan activos; el servidor temporal de revisión se detiene al cerrar la evaluación y su base se conserva para consulta.
