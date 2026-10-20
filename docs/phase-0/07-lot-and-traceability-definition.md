# Definición de lote y trazabilidad

## Unidad de trazabilidad

El contenedor serializado es la unidad mínima. El lote agrupa contenedores que comparten evento de origen, ventana temporal, etapa, colonia parental cuando aplica y condiciones controladas.

## Identificadores

- Serial: identidad única e inmutable del contenedor.
- Lote: código de recepción o producción; nunca se reutiliza.
- Colonia parental: vínculo para huevo y descendencia cuando esté disponible.
- Orden: autorización y contexto de ejecución.
- Grupo de evento: une todas las aristas de una división o fusión.

## Reglas

1. Toda transformación crea una salida nueva.
2. División conserva el lote y crea hijos serializados.
3. Fusión consume todas las fuentes y crea un lote mezcla.
4. Cuarentena impide consumo productivo.
5. Reproceso debe declararse como operación y enlazar orden, entrada y salida.
6. Coproductos y residuos deben formar parte del balance de masa.
7. La consulta debe responder de dónde vino y a dónde fue cada serial.

## Retiro simulado

Seleccionar un serial o lote, recorrer genealogía hacia atrás hasta insumos/colonia y hacia adelante hasta productos/coproductos; identificar ubicación, estado, cantidades, órdenes y disposición. Registrar duración y brechas del simulacro.
