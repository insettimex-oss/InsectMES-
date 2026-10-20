# URS - Especificación de requisitos de usuario

| ID          | Requisito verificable                                             | Prioridad | Evidencia esperada                          |
| ----------- | ----------------------------------------------------------------- | --------: | ------------------------------------------- |
| URS-PLAN-01 | Crear, priorizar, calendarizar, liberar y cerrar órdenes con ruta |      Alta | Orden y operaciones persistidas             |
| URS-EXEC-01 | Ejecutar solo operaciones liberadas con instrucción vigente       |      Alta | Captura enlazada a orden e instrucción      |
| URS-INV-01  | Serializar contenedores y controlar saldo, estado y ubicación     |      Alta | Kardex y contenedor                         |
| URS-TRC-01  | Mantener genealogía de producción, división y fusión              |      Alta | Consulta bidireccional por serial/lote      |
| URS-QUA-01  | Definir especificaciones, muestrear y disponer lote               |      Alta | Inspección, PASS/FAIL y HOLD/RELEASE/REJECT |
| URS-BIO-01  | Registrar y cerrar eventos de bioseguridad                        |      Alta | Evento, severidad, acción y responsable     |
| URS-ENV-01  | Capturar serie ambiental y abrir alarma fuera de límite           |      Alta | Lectura, límite, alarma y reconocimiento    |
| URS-MASS-01 | Cerrar balance de masa con tolerancia                             |      Alta | Entradas, salidas y desviación              |
| URS-AUD-01  | Registrar quién, qué, cuándo, antes/después y razón               |      Alta | Evento de auditoría inmutable               |
| URS-CONT-01 | Respaldar SQLite y verificar integridad                           |      Alta | Checksum, tamaño e integrity_check          |
| URS-SEC-01  | Separar funciones de operador, supervisor y administrador         |      Alta | Matriz de permisos probada                  |
| URS-UX-01   | Navegar por planificar, ejecutar, controlar y gobernar            |     Media | Prueba de usabilidad                        |

## Reglas no funcionales

- Fechas con zona horaria de planta; cantidades decimales; validación de integridad referencial; interfaz clara en modo claro y oscuro; pruebas automatizadas; respaldo diario con retención; errores accionables; exportación futura sin pérdida de identidad.

## Aprobación pendiente

Operaciones, Calidad, Bioseguridad, TI y Dirección deben aceptar o modificar cada requisito antes de congelar la versión 1.0.
