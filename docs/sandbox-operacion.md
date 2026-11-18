# Sandbox local y preparación de despliegue

## Uso actual

- Principal: `http://127.0.0.1:8013`.
- Sandbox: `http://localhost:8015`.
- Configuración → Sandbox/Producción abre la pantalla actual en una pestaña nueva y transfiere la identidad de la sesión existente. No copia la contraseña ni concede permisos del otro entorno. La cuenta debe existir, estar activa, verificada y sin cambio de contraseña pendiente en el destino.
- El intercambio local tiene validez de 90 segundos, un solo uso y comprobación del navegador de destino. Regenera la sesión al entrar. Las sesiones, cookies y bases permanecen independientes. Si la identidad cambió en Sandbox y no hay una sesión válida del principal, se exige autenticación del principal.
- En el principal, un administrador puede usar el botón pequeño de actualización junto a Sandbox, dentro de Configuración. La confirmación explica que los datos de prueba se reemplazan y que se conserva la copia anterior.
- No hay automatización activa en Codex ni otro horario automático instalado para Sandbox.

## Refresco independiente de Codex

Desde la carpeta instalada del proyecto:

```powershell
& '.local/php/php.exe' 'scripts/refresh-sandbox.php'
& 'scripts/start-sandbox.ps1'
```

El refresco copia únicamente la base SQLite local. Conserva el Sandbox anterior en `.local/sandbox/backups`, comprueba integridad e invalida las capturas abiertas antes del cambio. El principal no se restaura, reemplaza ni migra. Conectores, sesiones copiadas y trabajos pendientes no se trasladan como ejecuciones activas. Los archivos operativos y las peticiones HTTP del Sandbox siguen aislados según su configuración.

## Pendiente para Ricardo

La plantilla `ops/sandbox/github-actions.example.yml` es un ejemplo inactivo, fuera de `.github/workflows`. Está preparada para ejecución manual sobre una instalación Windows con acceso a las bases. No descarga ni publica código, no cambia ramas y no sube respaldos. La programación diaria está comentada.

Ricardo debe decidir el servidor de la aplicación, el programador que ejecutará el refresco, el motor de base de datos y su mecanismo de copia, el acceso de red y las credenciales operativas. Si se utiliza GitHub Actions, debe configurar un runner con acceso a la instalación y revisar sus permisos; un runner hospedado por GitHub no obtiene acceso automático a la base de la laptop. Los trabajos programados de GitHub usan la rama predeterminada, lo que debe resolverse sin cambiar `main` por iniciativa del agente. Referencias: [runners propios](https://docs.github.com/en/actions/reference/runners/self-hosted-runners), [eventos y programación](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows).

El cambio de identidad actual sólo está habilitado por defecto en local/sandbox y para peticiones de loopback. Para un despliegue real deben revisarse HTTPS, dominios y un mecanismo de identidad adecuado; no habilitar este puente local en una instalación pública. Las direcciones se configuran mediante `MES_PRIMARY_URL` y `MES_SANDBOX_URL`. No activar tareas de despacho de integraciones en Sandbox.

Nada de esta preparación autoriza publicar en GitHub. Antes de la primera publicación se debe confirmar con Ale el nombre de rama acordado con Ricardo; la prevista es `V1`. Hasta entonces, todo permanece local.
