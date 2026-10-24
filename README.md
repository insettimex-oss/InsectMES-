# InsectMES Laravel

Reconstrucción del prototipo InsectMES como aplicación persistente

## Stack

- Laravel 13 y PHP 8.3 o posterior.
- React 19, TypeScript e Inertia 3.
- Tailwind CSS 4, componentes shadcn/ui y `lucide-react`.
- SQLite para desarrollo y demostración local.
- Laravel Fortify para autenticación, recuperación de contraseña, verificación,
  segundo factor y passkeys.
- PHPUnit para integración y Vite Plus para tipos, lint y compilación.

## Alcance implementado

- Inicio con indicadores de inventario, producción, guardería y workcenters.
- Catálogos de partes, ubicaciones y operaciones.
- Process Routing y BOM.
- Control Panel transaccional: consume saldo, genera serial de salida y registra
  movimiento, corrida y genealogía en una sola transacción.
- Guardería N0–N5 con ubicación y bitácora por movimiento.
- Recibo e inventario de contenedores serializados.
- Genealogía padre-hijo.
- Órdenes y rutas separadas para larva comercial, postproceso y reproducción.
- Planeación finita por centro y turno con prioridad, precedencia, segmentación
  y detección de tardanza o falta de capacidad.
- Campañas productivas, cambios y limpieza entre familias, disponibilidad futura
  de materiales, ventanas de edad y ocupación biológica paralela para BSF.
- Alimentación trazable, calidad con CAPA, COA y muestras de retención.
- Activos, calibración, órdenes de mantenimiento y almacén de repuestos MRO.
- Turnos, causas de paro y cálculo OEE por centro de trabajo.
- Bioseguridad, ambiente, balance de masa, auditoría y respaldos verificados.
- Parámetros operativos y estructura de costos estándar.
- Costeo real por lote con tarifas efectivas, conciliación y cierre auditado.
- Protocolos de validación versionados, evidencia por paso y doble firma electrónica independiente.
- Hub de integración con endpoints gobernados, idempotencia, hash SHA-256, reintentos,
  cuarentena, bitácora de intentos y conciliación. Los transportes LOCAL y FILE son
  verificables sin terceros; HTTP queda preparado para conectores reales.
- Usuarios y seguridad proporcionados por el starter kit oficial.
- Sidebar integrado, responsive y colapsable con `Ctrl/Cmd + B`.

## Instalación

```powershell
Set-Location -LiteralPath 'C:\Users\inset\Documentos\InsectMES-Laravel'
composer install
pnpm install
Copy-Item .env.example .env
php artisan key:generate
New-Item database\database.sqlite -ItemType File -Force
php artisan migrate:fresh --seed
pnpm build
composer run dev
```

Después abre `http://localhost:8000`.

Usuario inicial de desarrollo:

- Correo: `admin@insetti.com`
- Contraseña: `InsectMES2026!`

La contraseña es únicamente para desarrollo local y debe cambiarse antes de publicar.

## Verificación

```powershell
php vendor\phpunit\phpunit\phpunit
pnpm run types:check
pnpm check
pnpm build
vendor\bin\pint --test
```

## Arquitectura

El sistema es un monolito modular. Laravel conserva la autoridad sobre autenticación,
validación, autorización, transacciones y persistencia. Inertia entrega datos tipados a
las páginas React sin duplicar una API de autenticación. SQLite es apropiado para esta
instalación local; para operación concurrente en planta se recomienda migrar a
PostgreSQL después de validar capacidad, respaldos y disponibilidad.

El procesador de integraciones se ejecuta cada minuto mediante el programador de
Laravel. En producción deben mantenerse activos tanto `php artisan schedule:work`
como el trabajador de colas definido por la infraestructura.

La continuidad local distingue dos controles: `php artisan mes:backup` comprueba
checksum e integridad del respaldo, y `php artisan mes:restore-drill` restaura una
copia aislada, vuelve a verificarla y registra el tiempo frente al RTO objetivo.
Esto no sustituye la prueba posterior con PostgreSQL, copia externa y alta
disponibilidad sobre la infraestructura productiva.

## Diagnóstico de alcance

Esta versión es un MES funcional para piloto y no debe considerarse todavía un MES
industrial completo. El análisis de brechas, los módulos específicos y
el roadmap recomendado están documentados en
[`output/pdf/diagnostico_y_roadmap_insectmes_bsf.pdf`](output/pdf/diagnostico_y_roadmap_insectmes_bsf.pdf).
