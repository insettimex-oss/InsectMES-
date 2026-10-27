from __future__ import annotations

import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    Flowable,
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "diagnostico_y_roadmap_insectmes_bsf.pdf"
BRAND_LOGO = ROOT / "public" / "images" / "insetti-logo.png"

GREEN = colors.HexColor("#88C63E")
DARK_GREEN = colors.HexColor("#173D2E")
MID_GREEN = colors.HexColor("#2F6E52")
PALE_GREEN = colors.HexColor("#EAF3ED")
VERY_PALE = colors.HexColor("#F6F9F7")
INK = colors.HexColor("#26342E")
MUTED = colors.HexColor("#66766D")
LINE = colors.HexColor("#D9E5DD")
AMBER = colors.HexColor("#E6A43A")
RED = colors.HexColor("#C75C52")
WHITE = colors.white


def register_fonts() -> tuple[str, str, str]:
    regular = Path(r"C:\Windows\Fonts\arial.ttf")
    bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    italic = Path(r"C:\Windows\Fonts\ariali.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("InsettiSans", str(regular)))
        pdfmetrics.registerFont(TTFont("InsettiSans-Bold", str(bold)))
        if italic.exists():
            pdfmetrics.registerFont(TTFont("InsettiSans-Italic", str(italic)))
        return "InsettiSans", "InsettiSans-Bold", "InsettiSans-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


FONT, FONT_BOLD, FONT_ITALIC = register_fonts()


class ProcessFlow(Flowable):
    def __init__(self, labels: list[str], width: float, height: float = 32 * mm):
        super().__init__()
        self.labels = labels
        self.width = width
        self.height = height

    def draw(self):
        canvas = self.canv
        gap = 4 * mm
        box_width = (self.width - gap * (len(self.labels) - 1)) / len(self.labels)
        box_height = 18 * mm
        y = 6 * mm
        for index, label in enumerate(self.labels):
            x = index * (box_width + gap)
            canvas.setFillColor(PALE_GREEN if index % 2 == 0 else VERY_PALE)
            canvas.setStrokeColor(MID_GREEN)
            canvas.roundRect(x, y, box_width, box_height, 3 * mm, fill=1, stroke=1)
            canvas.setFillColor(DARK_GREEN)
            canvas.setFont(FONT_BOLD, 7.5)
            lines = label.split("\n")
            start_y = y + box_height / 2 + (len(lines) - 1) * 3
            for line_index, line in enumerate(lines):
                canvas.drawCentredString(
                    x + box_width / 2,
                    start_y - line_index * 8,
                    line,
                )
            if index < len(self.labels) - 1:
                arrow_x = x + box_width
                arrow_y = y + box_height / 2
                canvas.setStrokeColor(GREEN)
                canvas.setFillColor(GREEN)
                canvas.setLineWidth(1.4)
                canvas.line(arrow_x + 1, arrow_y, arrow_x + gap - 1, arrow_y)
                canvas.line(arrow_x + gap - 4, arrow_y + 2, arrow_x + gap - 1, arrow_y)
                canvas.line(arrow_x + gap - 4, arrow_y - 2, arrow_x + gap - 1, arrow_y)


def styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName=FONT_BOLD,
            fontSize=27,
            leading=31,
            textColor=WHITE,
            spaceAfter=8 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="CoverSub",
            fontName=FONT,
            fontSize=12,
            leading=18,
            textColor=colors.HexColor("#D9E9E0"),
        )
    )
    base.add(
        ParagraphStyle(
            name="H1x",
            fontName=FONT_BOLD,
            fontSize=19,
            leading=23,
            textColor=DARK_GREEN,
            spaceBefore=2 * mm,
            spaceAfter=5 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="H2x",
            fontName=FONT_BOLD,
            fontSize=12.5,
            leading=16,
            textColor=MID_GREEN,
            spaceBefore=4 * mm,
            spaceAfter=2 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="Bodyx",
            fontName=FONT,
            fontSize=9.2,
            leading=13.5,
            textColor=INK,
            spaceAfter=2.5 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="Smallx",
            fontName=FONT,
            fontSize=7.6,
            leading=10.5,
            textColor=MUTED,
        )
    )
    base.add(
        ParagraphStyle(
            name="Callout",
            fontName=FONT_BOLD,
            fontSize=11,
            leading=15,
            textColor=DARK_GREEN,
            backColor=PALE_GREEN,
            borderColor=GREEN,
            borderWidth=0.8,
            borderPadding=9,
            borderRadius=5,
            spaceBefore=3 * mm,
            spaceAfter=4 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="Bulletx",
            parent=base["Bodyx"],
            leftIndent=5 * mm,
            firstLineIndent=-3.5 * mm,
            bulletIndent=0,
            spaceAfter=1.5 * mm,
        )
    )
    base.add(
        ParagraphStyle(
            name="TableHeader",
            fontName=FONT_BOLD,
            fontSize=7.5,
            leading=9.2,
            textColor=WHITE,
            alignment=TA_LEFT,
        )
    )
    base.add(
        ParagraphStyle(
            name="TableCell",
            fontName=FONT,
            fontSize=7.2,
            leading=9.3,
            textColor=INK,
        )
    )
    base.add(
        ParagraphStyle(
            name="TableCellBold",
            fontName=FONT_BOLD,
            fontSize=7.2,
            leading=9.3,
            textColor=DARK_GREEN,
        )
    )
    return base


ST = styles()


def P(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, ST[style])


def bullets(items: list[str]) -> list[Paragraph]:
    return [P(f"<bullet>&bull;</bullet>{item}", "Bulletx") for item in items]


def table(
    headers: list[str],
    rows: list[list[str]],
    widths: list[float],
    repeat_rows: int = 1,
) -> Table:
    data = [[P(item, "TableHeader") for item in headers]]
    for row in rows:
        data.append(
            [
                P(value, "TableCellBold" if index == 0 else "TableCell")
                for index, value in enumerate(row)
            ]
        )
    result = Table(data, colWidths=widths, repeatRows=repeat_rows, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), DARK_GREEN),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.45, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, VERY_PALE]),
            ]
        )
    )
    return result


def maturity_card(label: str, score: str, detail: str, color: colors.Color) -> Table:
    result = Table(
        [
            [P(label, "TableCellBold")],
            [Paragraph(score, ParagraphStyle("score", fontName=FONT_BOLD, fontSize=23, textColor=color, leading=25))],
            [P(detail, "Smallx")],
        ],
        colWidths=[78 * mm],
        rowHeights=[9 * mm, 13 * mm, 18 * mm],
    )
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), VERY_PALE),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return result


def first_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(DARK_GREEN)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(GREEN)
    canvas.circle(width - 22 * mm, height - 22 * mm, 29 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#2A5E47"))
    canvas.circle(width - 8 * mm, 18 * mm, 41 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor("#F6F4EF"))
    canvas.roundRect(19 * mm, height - 39 * mm, 63 * mm, 25 * mm, 3 * mm, fill=1, stroke=0)
    if BRAND_LOGO.exists():
        canvas.drawImage(str(BRAND_LOGO), 22 * mm, height - 36 * mm, width=56 * mm, height=20 * mm, preserveAspectRatio=True, mask="auto", anchor="c")
    canvas.setFillColor(colors.HexColor("#D0E8D9"))
    canvas.setFont(FONT, 8)
    canvas.drawString(22 * mm, 17 * mm, "Documento de trabajo - 27 octubre 2026")
    canvas.restoreState()


def later_pages(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawRightString(width - 22 * mm, 10 * mm, str(doc.page))
    canvas.restoreState()


def build_story() -> list:
    story: list = []

    story += [
        Spacer(1, 54 * mm),
        P("Diagnóstico de alcance y roadmap", "CoverTitle"),
        P("InsectMES para producción de mosca soldado negro", "CoverTitle"),
        Spacer(1, 4 * mm),
        P(
            "Evaluación del prototipo actual, brechas para un MES industrial y recomendaciones de evolución para una operación de Hermetia illucens.",
            "CoverSub",
        ),
        Spacer(1, 18 * mm),
        Table(
            [
                [P("ESTADO ACTUAL", "TableHeader"), P("OBJETIVO", "TableHeader")],
                [
                    Paragraph("MVP transaccional", ParagraphStyle("coverScore", fontName=FONT_BOLD, fontSize=17, textColor=WHITE)),
                    Paragraph("MES industrial por fases", ParagraphStyle("coverScore2", fontName=FONT_BOLD, fontSize=17, textColor=WHITE)),
                ],
                [
                    P("Trazabilidad, inventario, producción y guardería en una base funcional.", "CoverSub"),
                    P("Operaciones, calidad, mantenimiento, planificación, integración y cumplimiento.", "CoverSub"),
                ],
            ],
            colWidths=[78 * mm, 78 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#214C39")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#4E7965")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#4E7965")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        ),
        PageBreak(),
    ]

    story += [
        P("1. Respuesta ejecutiva", "H1x"),
        P(
            "<b>InsectMES aún no es un MES completo.</b> Es una base funcional bien orientada para demostrar el flujo operativo y validar el modelo de datos. Ya registra inventario, producción, movimientos, genealogía básica, guardería, parámetros, costos y usuarios. Sin embargo, un MES industrial debe coordinar de extremo a extremo las operaciones de producción, inventario, calidad y mantenimiento, además de integrarse con planificación empresarial y automatización de planta.",
            "Callout",
        ),
        Table(
            [[maturity_card("Madurez actual", "2 / 5", "MVP operacional con transacciones principales y trazabilidad inicial.", AMBER), maturity_card("Meta recomendada", "4 / 5", "MES controlado, integrado y auditable para operación comercial.", GREEN)]],
            colWidths=[82 * mm, 82 * mm],
            hAlign="LEFT",
            style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]),
        ),
        P("Qué ya resuelve", "H2x"),
        *bullets(
            [
                "Catálogos de partes, ubicaciones, centros de trabajo, operaciones, rutas y BOM.",
                "Recepción de materiales, creación y movimiento de contenedores con seriales.",
                "Registro de producción con consumo, salida y relación genealógica padre-hijo.",
                "Guardería por rack y nivel, historial de movimientos y estatus del lote.",
                "Parámetros editables, costo estándar preliminar, usuarios, roles y autenticación.",
                "Interfaz web responsiva con tema claro, oscuro y sidebar retraíble.",
            ]
        ),
        P("Conclusión", "H2x"),
        P(
            "El sistema puede utilizarse como <b>piloto controlado</b> para aprender del proceso, definir estándares y digitalizar lotes. No debe declararse todavía como sistema maestro de producción, calidad o cumplimiento hasta completar las brechas críticas, ejecutar una validación de procesos y establecer respaldos, auditoría y procedimientos de operación.",
        ),
        PageBreak(),
    ]

    story += [
        P("2. Modelo operativo BSF que debe cubrir el MES", "H1x"),
        P(
            "La mosca soldado negro no es una línea discreta convencional. Combina reproducción biológica, incubación, engorda sobre sustratos variables y transformación térmica. El MES debe conservar la genealogía de organismos, alimento, ambiente y productos en cada conversión.",
        ),
        ProcessFlow(
            [
                "Sustrato\ny recepción",
                "Colonia, huevo\ne incubación",
                "Neonatos y\nguardería",
                "Engorda y\nalimentación",
                "Cosecha y\nseparación",
                "Secado, molienda\ny coproductos",
            ],
            164 * mm,
        ),
        P("Trazabilidad mínima por lote", "H2x"),
        *bullets(
            [
                "Origen del sustrato: proveedor, material, lote, fecha, condiciones, análisis y liberación.",
                "Origen biológico: colonia, jaula, cohorte, postura, masa de huevo, fecha y tasa de eclosión.",
                "Receta de alimentación: formulación, agua, proporciones, frecuencia y desviaciones.",
                "Condiciones del proceso: temperatura, humedad, iluminación, densidad, pH, humedad del sustrato y ventilación según la etapa.",
                "Transformaciones: mezcla, división, fusión, transferencia, alimentación, cosecha, lavado, tratamiento térmico, secado, prensado, molienda y empaque.",
                "Resultados: biomasa húmeda y seca, mortalidad, rechazo, frass, aceite, harina, humedad final y liberación de calidad.",
            ]
        ),
        P("Principio de diseño", "H2x"),
        P(
            "Cada evento debe contestar quién, qué, cuánto, cuándo, dónde, con qué equipo, bajo qué condiciones y de qué lotes proviene. Esto permite reconstruir hacia atrás desde un saco de harina y hacia adelante desde un lote de sustrato o una cohorte reproductora.",
            "Callout",
        ),
        PageBreak(),
    ]

    gap_rows = [
        ["Planificación y órdenes", "No existe orden de producción, campaña, turno ni secuenciación finita.", "Crear órdenes, operaciones, materiales reservados, calendario y despacho.", "P0"],
        ["Ejecución en piso", "Registro directo de una operación y un contenedor.", "Terminal de operador, instrucciones, escaneo, cantidades buenas/rechazo y firmas.", "P0"],
        ["Genealogía", "Relación padre-hijo básica.", "Split/merge, consumos múltiples, reproceso, coproductos y trazabilidad hacia adelante/atrás.", "P0"],
        ["Calidad", "Estatus simple de contenedor.", "Planes de muestreo, especificaciones, resultados, cuarentena, liberación, COA y desviaciones.", "P0"],
        ["Bioseguridad", "No modelada.", "Zonas, barreras, limpiezas, plagas, visitantes, mortalidad y eventos sanitarios.", "P0"],
        ["Datos ambientales", "Parámetros configurables sin series temporales.", "Sensores y registros manuales por zona/lote, alarmas, límites y evidencia.", "P0"],
        ["Balance de masa", "Cantidades de entrada y salida por corrida.", "Balance completo con agua, evaporación, merma, biomasa, frass y coproductos.", "P0"],
        ["Auditoría", "Autenticación y roles iniciales.", "Bitácora inmutable, motivo de cambio, firma electrónica y segregación de funciones.", "P0"],
        ["Mantenimiento", "Estado de workcenter y logs.", "Activos, preventivos, correctivos, repuestos, MTBF, MTTR y bloqueo por calibración.", "P1"],
        ["OEE y paros", "Estatus manual limitado.", "Calendario, causas de paro, velocidad ideal, calidad, disponibilidad y OEE de equipos.", "P1"],
        ["Costos", "Modelo estándar preliminar.", "Costo real por lote: sustrato, energía, mano de obra, mermas y coproductos.", "P1"],
        ["Integraciones", "Aplicación aislada.", "ERP, básculas, PLC/SCADA, sensores, laboratorio, impresión y almacenes.", "P1"],
        ["Logística", "Recepción y movimientos básicos.", "FEFO, ubicaciones dirigidas, embarque, lotes de cliente y devoluciones.", "P1"],
        ["Continuidad", "SQLite local y pruebas de aplicación.", "Backups verificados, recuperación, monitoreo, alta disponibilidad y migración de BD.", "P0"],
        ["Analítica", "Dashboard y costo estándar.", "KPIs biológicos, capacidad, pronóstico, SPC, tendencias y alertas por excepción.", "P2"],
    ]
    story += [
        P("3. Brechas para considerarlo un MES completo", "H1x"),
        P(
            "La matriz compara la implementación actual con capacidades mínimas para una operación comercial. P0 bloquea el uso como sistema maestro; P1 habilita escalamiento; P2 optimiza desempeño.",
        ),
        table(
            ["Dominio", "Situación actual", "Capacidad faltante", "Prioridad"],
            gap_rows,
            [31 * mm, 46 * mm, 73 * mm, 14 * mm],
        ),
        PageBreak(),
    ]

    modules_rows = [
        ["1. Sustratos", "Homologación de proveedor, contrato, lote, origen, composición, recepción, fotografía, contaminación, rechazo y cuarentena."],
        ["2. Colonia reproductora", "Jaulas, cohortes, densidad, luz, temperatura, humedad, alimentación de adultos, longevidad y productividad de huevo."],
        ["3. Huevo e incubación", "Posturas, masa, bandeja, incubadora, fecha esperada, tasa de eclosión, desvíos y liberación de neonatos."],
        ["4. Guardería", "Densidad, edad biológica, ración, ambiente, mortalidad, crecimiento y transferencia entre niveles."],
        ["5. Engorda", "Receta, alimentación por evento, cama, condiciones, biomasa estimada, muestreo y decisión de cosecha."],
        ["6. Cosecha", "Separación, lavado, peso húmedo, larva fuera de especificación, retorno de reproductores y rendimiento de frass."],
        ["7. Transformación", "Tratamiento térmico, secado, molienda, prensado, tamizado, metales, humedad final, empaque y etiquetado."],
        ["8. Frass", "Maduración o tratamiento, lote, análisis, liberación, almacenamiento y destino comercial."],
        ["9. Calidad/LIMS", "Especificaciones por producto, muestreo, microbiología, proteína, grasa, humedad, cenizas, metales y COA."],
        ["10. Mantenimiento", "Equipos, básculas, sensores, secadores y molinos; calibración, preventivos, repuestos y fallas."],
        ["11. Trazabilidad y recall", "Consulta bidireccional, simulacro de retiro, clientes afectados, cantidad localizada y tiempo de respuesta."],
        ["12. Integración", "Órdenes y costos con ERP; datos con PLC/SCADA/IoT; resultados con laboratorio; etiquetas con impresoras."],
    ]
    story += [
        P("4. Módulos recomendados para una planta BSF", "H1x"),
        table(["Módulo", "Alcance funcional"], modules_rows, [48 * mm, 116 * mm]),
        Spacer(1, 4 * mm),
        P(
            "Recomendación clave: no mezclar en un solo indicador el desempeño de los organismos con el desempeño de los equipos. La eclosión, supervivencia y crecimiento son KPIs biológicos; el OEE aplica mejor a secadores, molinos, prensas, transportadores y líneas de empaque.",
            "Callout",
        ),
        PageBreak(),
    ]

    quality_rows = [
        ["Recepción de sustrato", "Origen, materia seca, pH, olor/aspecto, cuerpos extraños, temperatura, análisis de riesgo", "Liberar, cuarentena o rechazar"],
        ["Incubación", "Temperatura, humedad, tiempo, eclosión y contaminación visible", "Transferir o investigar desvío"],
        ["Guardería/engorda", "Densidad, mortalidad, crecimiento, humedad del sustrato, temperatura del lecho", "Alimentar, ventilar, transferir o segregar"],
        ["Cosecha", "Edad, estadio, peso, contaminación y rendimiento", "Procesar, reprocesar o descartar"],
        ["Tratamiento y secado", "Tiempo/temperatura, humedad final, actividad de agua si aplica", "Liberar a molienda o retener"],
        ["Producto terminado", "Identidad, humedad, proteína, grasa, cenizas, microbiología, contaminantes según mercado", "Liberación y certificado de análisis"],
        ["Frass", "Estabilización, humedad, microbiología, nutrientes y contaminantes según uso", "Liberar, tratar o rechazar"],
    ]
    story += [
        P("5. Calidad, inocuidad y bioseguridad", "H1x"),
        P(
            "El perfil microbiológico y químico del sustrato puede trasladar riesgo al organismo, al frass y al producto terminado. Por eso el sistema debe impedir el consumo de material no liberado y conservar la evidencia del tratamiento aplicado.",
        ),
        table(["Punto de control", "Datos y pruebas", "Decisión MES"], quality_rows, [39 * mm, 83 * mm, 42 * mm]),
        P("Controles transversales", "H2x"),
        *bullets(
            [
                "Matriz de sustratos permitidos por producto y mercado destino.",
                "Flujo de cuarentena, liberación, rechazo, desviación, CAPA y bloqueo electrónico.",
                "Límites de proceso versionados; cada lote conserva la versión aplicada.",
                "Plan maestro de saneamiento, verificación de limpieza y control de plagas por zona.",
                "Trazabilidad de ropa, utensilios, equipos móviles y tránsito entre zonas biológicas.",
                "Registro de mortalidad anormal, olores, invasores, escape de adultos y contaminación cruzada.",
                "Validación regulatoria por producto y mercado. En México, confirmar requisitos con SENASICA antes de comercializar productos de uso o consumo animal.",
            ]
        ),
        PageBreak(),
    ]

    kpi_rows = [
        ["Tasa de eclosión", "Neonatos viables / huevo incubado", "Colonia, postura, incubadora"],
        ["Productividad de huevo", "Masa de huevo / jaula-día o hembra estimada", "Colonia reproductora"],
        ["Supervivencia larval", "Larvas o biomasa viable al cierre / población o biomasa inicial", "Guardería y engorda"],
        ["Ganancia de biomasa", "Biomasa final - biomasa inicial", "Lote de engorda"],
        ["Conversión de sustrato", "Biomasa producida / materia seca alimentada", "Receta y lote"],
        ["Reducción de residuo", "(Entrada - residuo) / entrada", "Sustrato y frass"],
        ["Rendimiento de producto", "Harina, aceite o frass conforme / entrada correspondiente", "Transformación"],
        ["Humedad final", "Resultado de laboratorio o instrumento", "Secado y liberación"],
        ["Consumo energético", "kWh / kg de producto conforme", "Secador, molino, prensa"],
        ["Cycle time", "Tiempo real de etapa y de lote completo", "Todas las etapas"],
        ["Right first time", "Lotes sin desviación ni reproceso / lotes cerrados", "Calidad y producción"],
        ["OEE", "Disponibilidad x desempeño x calidad", "Equipos de transformación"],
        ["MTBF / MTTR", "Tiempo entre fallas / tiempo de reparación", "Mantenimiento"],
        ["Costo real por kg", "Costo total atribuible / kg conforme", "Costos y coproductos"],
    ]
    story += [
        P("6. KPIs recomendados", "H1x"),
        P(
            "Las definiciones deben acordarse con Operaciones, Calidad y Finanzas antes de programarse. En especial, las mediciones de huevo y neonatos requieren un método repetible de muestreo y conversión de masa a individuos.",
        ),
        table(["Indicador", "Definición inicial", "Nivel"], kpi_rows, [44 * mm, 76 * mm, 44 * mm]),
        PageBreak(),
    ]

    data_rows = [
        ["Modelo de orden", "production_orders, order_operations, material_requirements, shift_assignments"],
        ["Lote biológico", "biological_batches, life_stage, cohort, parent_colony, expected_dates"],
        ["Alimentación", "feed_recipes, feed_events, substrate_lots, water_additions"],
        ["Ambiente", "sensor_points, readings, alarm_limits, excursions, acknowledgements"],
        ["Calidad", "specifications, samples, tests, results, dispositions, coa, deviations, capa"],
        ["Activos", "assets, maintenance_plans, work_orders, failures, calibrations, spare_parts"],
        ["Auditoría", "audit_events, signatures, reason_codes, previous_value, new_value"],
        ["Integración", "integration_messages, source_system, correlation_id, retries, status"],
    ]
    story += [
        P("7. Arquitectura y datos", "H1x"),
        P("Arquitectura recomendada por etapas", "H2x"),
        *bullets(
            [
                "Mantener Laravel + React + Inertia como monolito modular durante el piloto; es adecuado para velocidad de entrega y control transaccional.",
                "Usar SQLite solo para desarrollo, demostración o una estación aislada. Para operación multiusuario y datos críticos, migrar a PostgreSQL con copias, monitoreo y recuperación probada.",
                "Separar servicios de dominio: producción, inventario, calidad, mantenimiento, genealogía, planificación e integración.",
                "Agregar una capa de adquisición para MQTT/OPC UA/API, con almacenamiento de series temporales y reglas de alarma. El MES no debe consultar sensores de forma síncrona en cada pantalla.",
                "Versionar BOM, rutas, recetas, especificaciones y parámetros. Una orden debe congelar la versión ejecutada.",
                "Implementar idempotencia, cola de mensajes y bitácora de integración para evitar dobles movimientos.",
            ]
        ),
        table(["Dominio", "Entidades sugeridas"], data_rows, [46 * mm, 118 * mm]),
        P("Seguridad y continuidad", "H2x"),
        *bullets(
            [
                "Roles por función y sitio, mínimos privilegios, MFA para supervisión y administración.",
                "Auditoría append-only, motivo obligatorio para correcciones y doble aprobación en liberación/rechazo.",
                "Backups cifrados, prueba de restauración, RPO/RTO definidos y monitoreo de jobs.",
                "Ambientes separados, CI/CD, pruebas de migraciones y despliegue reversible.",
            ]
        ),
        PageBreak(),
    ]

    roadmap_rows = [
        ["Fase 0 - Descubrimiento", "3-5 semanas", "Mapeo de proceso real, URS, riesgos, catálogos, métodos de medición, matriz regulatoria y definición de lote.", "URS aprobada y modelo de trazabilidad firmado."],
        ["Fase 1 - Control del lote", "6-10 semanas", "Órdenes, escaneo, split/merge, alimentación, balance de masa, cuarentena, calidad básica y auditoría.", "Un lote completo ejecutado sin registros paralelos críticos."],
        ["Fase 2 - Calidad y bioseguridad", "6-10 semanas", "Especificaciones, muestreo, laboratorio, COA, desviaciones, CAPA, saneamiento y recall.", "Simulacro de retiro y liberación electrónica satisfactorios."],
        ["Fase 3 - Planta conectada", "8-14 semanas", "Básculas, sensores, alarmas, estados automáticos, mantenimiento, calibración y OEE de equipos.", "Datos automáticos confiables y conciliados con producción."],
        ["Fase 4 - Planificación e integración", "8-14 semanas", "ERP, demanda, programación, compras, almacenes, costos reales, embarques y APIs.", "Cierre de orden y costo sin captura duplicada."],
        ["Fase 5 - Optimización", "Continuo", "SPC, predicción de cosecha, optimización de receta, energía, capacidad y analítica avanzada.", "Mejora demostrable en rendimiento, estabilidad o costo."],
    ]
    story += [
        P("8. Roadmap propuesto", "H1x"),
        P(
            "Las duraciones son rangos de planeación, no compromisos. Dependen del número de sitios, equipos, interfaces, productos, requisitos regulatorios y disponibilidad de usuarios clave.",
        ),
        table(["Fase", "Duración orientativa", "Entregables", "Criterio de salida"], roadmap_rows, [31 * mm, 26 * mm, 66 * mm, 41 * mm]),
        P("Primeros 90 días", "H2x"),
        *bullets(
            [
                "Nombrar dueño de producto, líder de Operaciones, Calidad, Mantenimiento y TI.",
                "Definir qué es un lote en cada etapa y el identificador que lo acompaña físicamente.",
                "Validar el mapa real de sustrato a producto y todos los puntos split/merge.",
                "Congelar catálogos maestros y crear gobierno de datos.",
                "Implementar P0: órdenes, calidad de recepción, eventos de alimentación, balance de masa, auditoría y respaldo.",
                "Seleccionar una línea y un producto como piloto; no desplegar toda la planta simultáneamente.",
                "Ejecutar pruebas con usuarios, simulacro de retiro y prueba de restauración antes de go-live.",
            ]
        ),
        PageBreak(),
    ]

    risk_rows = [
        ["Variabilidad del sustrato", "Alto", "Caracterización, especificaciones, receta por materia seca y bloqueo de lotes no liberados."],
        ["Pérdida de genealogía en split/merge", "Alto", "Escaneo obligatorio, transacciones atómicas y reconciliación de masa."],
        ["Datos ambientales incompletos", "Alto", "Buffer en gateway, alarmas por ausencia, calibración y captura manual contingente."],
        ["Confundir OEE con desempeño biológico", "Medio", "Separar KPIs de equipos y organismos; relacionarlos solo para análisis causal."],
        ["SQLite en operación crítica", "Alto", "Migración temprana a PostgreSQL, backups y pruebas de restauración."],
        ["Adopción baja en piso", "Alto", "Diseño con operadores, escaneo rápido, terminales por puesto y eliminación progresiva del papel."],
        ["Requisitos regulatorios tardíos", "Alto", "Matriz por producto/mercado y revisión formal con especialista y autoridad competente."],
        ["Automatización sin contexto de lote", "Alto", "Correlacionar sensor, activo, ubicación, orden, operación y lote en cada evento."],
    ]
    story += [
        P("9. Riesgos y decisiones de gobierno", "H1x"),
        table(["Riesgo", "Nivel", "Mitigación"], risk_rows, [49 * mm, 21 * mm, 94 * mm]),
        P("Criterios para llamar al sistema 'MES completo'", "H2x"),
        *bullets(
            [
                "Todas las órdenes se ejecutan y cierran digitalmente con materiales, tiempos, equipos, personal y resultados.",
                "La trazabilidad bidireccional cubre sustrato, colonia, lote biológico, transformación, empaque y cliente.",
                "Calidad puede bloquear, liberar y retirar material con evidencia y auditoría.",
                "El balance de masa y los inventarios concilian dentro de tolerancias aprobadas.",
                "Mantenimiento y calibración condicionan la disponibilidad de equipos e instrumentos.",
                "Los datos automáticos y manuales tienen calidad, dueño, límites, alarmas y contingencia.",
                "Las interfaces con ERP y automatización son monitoreadas, idempotentes y recuperables.",
                "Seguridad, respaldo, restauración, auditoría, pruebas y soporte cumplen objetivos acordados.",
            ]
        ),
        P(
            "Recomendación final: usar la versión actual como <b>plataforma de descubrimiento y piloto</b>. La siguiente inversión debe concentrarse en control del lote, calidad, bioseguridad, balance de masa y auditoría antes de añadir analítica avanzada.",
            "Callout",
        ),
        PageBreak(),
    ]

    story += [
        P("10. Referencias", "H1x"),
        P(
            "Las referencias respaldan el marco MES/MOM y la necesidad de controlar ambiente, sustrato, inocuidad y trazabilidad. Los límites operativos concretos deben definirse con datos de la planta, validación de proceso y requisitos del mercado destino.",
        ),
        *bullets(
            [
                "ISA. ISA-95 Enterprise-Control System Integration. https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95",
                "ISA. Update to ANSI/ISA-95.00.01-2025. https://www.isa.org/news-press-releases/2025/april/update-to-isa-95-standard-addresses-integration-of",
                "ISO. ISO 22400-1:2014, KPIs for manufacturing operations management. https://www.iso.org/standard/56847.html",
                "ISO. ISO 22400-2:2014, KPI definitions and descriptions. https://www.iso.org/obp/ui/?_escaped_fragment_=iso%253Astd%253A54497%253Aen",
                "SENASICA. Regulación de productos veterinarios y productos alimenticios para uso o consumo animal. https://www.gob.mx/senasica/acciones-y-programas/regulacion-de-productos-veterinarios",
                "Chia et al. Threshold temperatures and thermal requirements of Hermetia illucens. PLOS ONE, 2018. https://pmc.ncbi.nlm.nih.gov/articles/PMC6211680/",
                "Raimondi et al. Effect of rearing temperature on growth and microbiota composition of Hermetia illucens. Animals, 2020. https://pmc.ncbi.nlm.nih.gov/articles/PMC7355568/",
                "Devic and Maquart. Technical handbook of domestication and production of Black Soldier Fly. IRD, 2015. https://horizon.documentation.ird.fr/exl-doc/pleins_textes/divers17-11/010063336.pdf",
                "FAO LEAD. Black soldier fly and organic by-product conversion. https://www.fao.org/fileadmin/templates/lead/pdf/02_article02_en.pdf",
            ]
        ),
        Spacer(1, 7 * mm),
        HRFlowable(width="100%", thickness=1, color=LINE),
        Spacer(1, 4 * mm),
        P(
            "Nota: este documento es una evaluación de producto y arquitectura, no una opinión legal, sanitaria ni una validación de proceso. La conformidad debe confirmarse con especialistas y autoridades aplicables a cada producto, uso y mercado.",
            "Smallx",
        ),
    ]
    return story


def build_updated_story() -> list:
    """Estado posterior al avance de validación e interoperabilidad."""
    story: list = [
        Spacer(1, 50 * mm),
        P("Estado de avance y brechas restantes", "CoverTitle"),
        P("InsectMES para mosca soldado negro", "CoverTitle"),
        Spacer(1, 4 * mm),
        P(
            "Actualización del diagnóstico: núcleo MES, control de piso, accesos por rol, logística trazable, costeo real, validación con firma electrónica y un hub de integración confiable incorporados; requisitos documentales y brechas restantes para una operación industrial de Hermetia illucens.",
            "CoverSub",
        ),
        Spacer(1, 18 * mm),
        Table(
            [
                [P("RESULTADO", "TableHeader"), P("SIGUIENTE META", "TableHeader")],
                [
                    Paragraph("Avance funcional verificado", ParagraphStyle("coverUpdated", fontName=FONT_BOLD, fontSize=17, textColor=WHITE)),
                    Paragraph("Industrialización comprobada", ParagraphStyle("coverNext", fontName=FONT_BOLD, fontSize=17, textColor=WHITE)),
                ],
                [
                    P("Laboratorio, confiabilidad, roles, FEFO, logística, costos, firmas, mensajería y optimización multi-centro.", "CoverSub"),
                    P("Evidencia documental, piloto real, activación controlada de Alegra, otros conectores, PostgreSQL y alta disponibilidad.", "CoverSub"),
                ],
            ],
            colWidths=[78 * mm, 78 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#214C39")),
                    ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#4E7965")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#4E7965")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 9),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        ),
        PageBreak(),
    ]

    story += [
        P("1. Estado ejecutivo actualizado", "H1x"),
        P(
            "InsectMES conserva el núcleo P0, amplía la Fase 1 e incorpora protocolos versionados, doble firma electrónica, un hub de integración auditable, un conector seguro para Alegra y selección automática entre centros primarios y alternos aprobados. Las aprobaciones de Fase 0 fueron confirmadas como completadas; su expediente sigue en verificación documental.",
            "Callout",
        ),
        Table(
            [[
                maturity_card("Madurez técnica", "4 / 5", "MES funcional para piloto e interoperabilidad controlada; falta infraestructura productiva probada.", GREEN),
                maturity_card("Madurez de negocio", "3 / 5", "Aprobaciones realizadas; faltan metadatos y evidencia vinculada para cerrar documentalmente Fase 0.", AMBER),
            ]],
            colWidths=[82 * mm, 82 * mm],
            hAlign="LEFT",
            style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]),
        ),
        P("Dictamen", "H2x"),
        P(
            "Puede utilizarse como MES de piloto para una línea BSF definida. Aún no debe declararse MES industrial completo para toda la empresa porque faltan el cierre documental de Fase 0, validación de ventanas biológicas con lotes reales, activación y prueba real de Alegra, conectores efectivos con Plex, LIMS y equipos, PostgreSQL y alta disponibilidad probados, además de evidencia regulatoria por producto y mercado.",
        ),
        P("Validación técnica ejecutada", "H2x"),
        *bullets([
            "92 pruebas automatizadas ejecutadas: 90 aprobadas, 2 omitidas y 524 aserciones verificadas.",
            "Análisis estático PHP sin errores y compilación de React/TypeScript satisfactoria.",
            "Migración SQLite y datos iniciales reproducibles.",
            "Respaldo real con checksum SHA-256 e integrity_check satisfactorio; restauración aislada en 1 segundo con 94 tablas verificadas.",
            "Revisión visual en tema claro y oscuro, incluido sidebar retraíble.",
        ]),
        PageBreak(),
    ]

    implemented_rows = [
        ["Planeación y órdenes", "Órdenes priorizadas y calendarizadas; ruta, instrucciones e insumos planificados; liberación e inicio controlados.", "Implementado"],
        ["Ejecución en piso", "Despacho por cola, inicio, pausa y reanudación; instrucción y checklist obligatorios; desperdicio por causa; captura enlazada a orden, operación, operador, inventario y genealogía.", "Implementado"],
        ["Genealogía", "Producción, división y fusión con grupo de evento, razón, múltiples fuentes y consulta por serial/lote.", "Implementado"],
        ["Calidad", "Especificaciones, muestreo, evaluación PASS/FAIL, cuarentena y disposición RELEASE/REJECT.", "Implementado"],
        ["Bioseguridad", "Eventos de limpieza, plagas, visitas, mortalidad, barreras y condición sanitaria con cierre correctivo.", "Implementado"],
        ["Ambiente", "Límites por etapa, captura manual o sensor, serie temporal, alarma y reconocimiento con evidencia.", "Implementado"],
        ["Balance de masa", "Sustrato, agua, biomasa, larva, frass, coproducto, evaporación, residuo y tolerancia.", "Implementado"],
        ["Auditoría", "Eventos append-only con usuario, fecha, entidad, antes/después, razón, IP y agente.", "Implementado"],
        ["Continuidad SQLite", "Respaldo programado y manual, checksum, integridad y retención; simulacro aislado de restauración con tiempo, checksum, integridad y conteo de tablas registrados.", "Implementado"],
        ["Alimentación y escaneo", "Larvero y sustrato por serial, consumo de inventario, materia seca, orden, operador y bitácora auditable.", "Implementado F1"],
        ["Desviaciones y CAPA", "Contención, cuarentena, causa raíz, acciones correctiva/preventiva, responsable, vencimiento y efectividad.", "Implementado F1"],
        ["Mantenimiento", "Activos, criticidad, preventivo, correctivo, calibración, bloqueo, liberación y minutos de paro.", "Implementado F1"],
        ["Rutas por destino", "Larva comercial, postproceso y ciclo reproductivo tienen rutas independientes; las órdenes no mezclan bifurcaciones.", "Implementado F1"],
        ["COA y retención", "Certificado basado en inspecciones liberadas, aprobación auditada y muestras con cantidad, ubicación y caducidad.", "Implementado F1"],
        ["Turnos, paros y OEE", "Tres turnos, catálogo de causas, apertura/cierre de paro y cálculo de disponibilidad, rendimiento, calidad y OEE.", "Implementado F1"],
        ["Repuestos", "Catálogo MRO, existencia, punto de reorden y consumo trazable contra orden de mantenimiento.", "Implementado F1"],
        ["Laboratorio interno", "Métodos de microbiología, química y estabilidad; recepción de muestras; resultados PASS/FAIL/REVIEW y cuarentena automática.", "Implementado F1"],
        ["Mantenimiento por condición", "Lecturas por activo, límites de advertencia/crítico, bloqueo, OT automática y KPIs observados MTTR/MTBF.", "Implementado F1"],
        ["Roles y permisos", "Diez roles por área, permisos de lectura/escritura/aprobación, excepciones por usuario, bloqueo de cuentas y cambio obligatorio de contraseña.", "Implementado F1"],
        ["Logística comercial", "Clientes, pedidos, reserva FEFO, prioridad de ubicación, surtido, embarque, devolución, cuarentena y retiro hacia adelante por lote y cliente.", "Implementado F1"],
        ["Costo real por lote", "Tarifas vigentes, alimentación y tiempo real automáticos, energía e indirectos capturables, crédito de coproducto, costo unitario y cierre auditado.", "Implementado F1"],
        ["Validación y firma electrónica", "Protocolos versionados, copia controlada de pasos, evidencia por resultado, reautenticación, segregación ejecutor/aprobador, doble firma y huella SHA-256 inmutable.", "Implementado F2"],
        ["Planeación finita", "Capacidad por centro y turno, prioridad de orden, precedencia de operaciones, división en segmentos, detección de tardanza y de operaciones sin capacidad; cada corrida conserva evidencia y supera a la anterior.", "Implementado F2"],
        ["Planeación BSF avanzada", "Campañas por familia, cambios y limpieza con tiempo reservado, BOM por operación, suministro futuro confirmado, asignación de materiales, ventanas de edad aprobadas y ocupación paralela para etapas biológicas continuas.", "Implementado F2"],
        ["Optimización multi-centro", "Centros alternos con calificación, prioridad, eficiencia y vigencia; selección por mejor término respetando capacidad, campaña y ventana biológica; el centro elegido pasa al control de piso y queda trazado en la corrida.", "Implementado F2"],
        ["Hub de integración", "Catálogo de endpoints sin secretos, bandejas idempotentes, hash SHA-256, reintentos, cuarentena, bitácora, conciliación y procesamiento programado. LOCAL y FILE están verificados; HTTP cuenta con pruebas controladas.", "Implementado F2"],
        ["Conector Alegra preparado", "Dos endpoints inactivos para contactos y facturas; contratos validados, mapeo de campos, Basic Auth desde entorno, restricción a destinos HTTPS oficiales, activación por TI y cobertura de pruebas sin exponer credenciales.", "Implementado F2"],
    ]
    story += [
        P("2. Capacidades P0, Fase 1 y controles Fase 2", "H1x"),
        P("Estas capacidades se retiran de la lista de brechas pendientes porque ya cuentan con modelo de datos, reglas de negocio, interfaz y cobertura de pruebas."),
        table(["Dominio", "Evidencia funcional", "Estado"], implemented_rows, [39 * mm, 99 * mm, 26 * mm]),
        KeepTogether(
            [
                P("Límite de la afirmación", "H2x"),
                P(
                    "Implementado significa disponible y probado en la aplicación. No significa validado para cada producto, mercado, instalación, equipo o requisito sanitario. La validación operativa debe ejecutarse con lotes reales y responsables designados.",
                    "Callout",
                ),
            ]
        ),
    ]

    remaining_rows = [
        ["Expediente Fase 0", "Vincular por cada responsable nombre, cargo, versión aprobada, fecha y referencia de evidencia. Las aprobaciones no se repiten.", "P0 documental"],
        ["Piloto y validación", "Ejecutar lotes reales, pruebas por rol, recall, restauración y aceptación del piloto con evidencia.", "P0 de negocio"],
        ["Calidad avanzada restante", "Validar límites y métodos, administrar equipos/reactivos y conectar un LIMS externo; consolidar el programa longitudinal de estabilidad.", "P1"],
        ["Mantenimiento restante", "Matriz de habilidades, planes predictivos, integración de sensores y contadores automáticos; validar KPIs con historial real.", "P1"],
        ["Alegra en operación", "Cargar credenciales en el servidor, aprobar IDs y mapeo contable, activar los endpoints y demostrar una alta de contacto y una factura controladas con reconocimiento y conciliación reales.", "P1"],
        ["Otros conectores externos", "Configurar contratos y credenciales reales, mapear datos y demostrar reconocimientos y conciliación con Plex ERP, básculas, PLC/SCADA, MQTT/OPC UA, impresoras, LIMS y almacenes.", "P1"],
        ["Continuidad productiva", "Migrar y probar PostgreSQL, copia fuera del equipo, monitoreo, RPO/RTO de negocio y recuperación sobre infraestructura distinta al servidor local.", "P1"],
        ["Analítica", "KPIs biológicos, SPC, predicción de cosecha, energía, capacidad y alertas por excepción.", "P2"],
    ]
    story += [
        P("3. Brechas que aún faltan", "H1x"),
        P("La lista retira control de piso, roles, logística comercial, costeo real, firma electrónica, planeación finita, campañas, cambios, suministro futuro, ventanas biológicas, optimización multi-centro, el motor genérico de integración y la preparación técnica de Alegra. Conserva la activación y comprobación real de Alegra, la verificación documental, la validación operativa, otros conectores externos y la continuidad empresarial."),
        table(["Dominio", "Trabajo pendiente", "Prioridad"], remaining_rows, [39 * mm, 99 * mm, 26 * mm]),
        PageBreak(),
    ]

    phase_zero_rows = [
        ["Mapa de procesos BSF", "Aprobación completada", "Vincular nombre, cargo, versión, fecha y evidencia en 08-approval-register.md."],
        ["URS", "Aprobación completada", "Completar nombre, cargo, versión, fecha y evidencia en 02-urs.md y 08-approval-register.md."],
        ["Registro de riesgos", "Aprobación completada", "Vincular nombre, cargo, versión, fecha y evidencia en 08-approval-register.md."],
        ["Gobierno de datos", "Aprobación completada", "Vincular nombre, cargo, versión, fecha y evidencia en 08-approval-register.md."],
        ["Métodos de medición", "Aprobación completada", "Vincular nombre, cargo, versión, fecha y evidencia en 08-approval-register.md."],
        ["Matriz regulatoria", "Aprobación interna completada", "Vincular evidencia interna; el dictamen externo por producto/mercado sigue abierto."],
        ["Definición de lote", "Aprobación completada", "Completar nombre, cargo, versión, fecha y evidencia en 07-lot-and-traceability-definition.md y 08-approval-register.md."],
    ]
    story += [
        P("4. Fase 0 - entregables y cierre", "H1x"),
        P("Los documentos se encuentran en docs/phase-0 y la aplicación los presenta en el módulo Gobernar - Fase 0."),
        table(["Entregable", "Estado", "Acción para cerrar"], phase_zero_rows, [47 * mm, 29 * mm, 88 * mm]),
        P("Criterio de cierre", "H2x"),
        P(
            "Las aprobaciones de Operaciones, Calidad, Bioseguridad, TI y Dirección están completadas y no deben solicitarse de nuevo. Fase 0 permanece en verificación documental hasta transcribir, para cada responsable, nombre, cargo, versión aprobada, fecha de aprobación y referencia de evidencia. Ninguno de esos datos fue localizado en los archivos revisados y no se inventó.",
            "Callout",
        ),
        P("Prueba recomendada", "H2x"),
        *bullets([
            "Ejecutar un lote piloto completo desde recepción hasta producto o coproducto.",
            "Provocar una cuarentena, una alarma ambiental y un evento de bioseguridad controlados.",
            "Realizar división y fusión y demostrar trazabilidad hacia atrás y hacia adelante.",
            "Cerrar el balance de masa dentro de tolerancia aprobada.",
            "Repetir el simulacro de restauración con responsables y documentar aceptación del RTO; después probarlo sobre infraestructura externa.",
        ]),
        PageBreak(),
    ]

    story += [
        P("5. Recomendaciones específicas para BSF", "H1x"),
        P("Las decisiones del MES deben respetar la naturaleza biológica del proceso y la variabilidad del sustrato."),
        table(
            ["Tema", "Recomendación"],
            [
                ["Identidad biológica", "Mantener colonia parental, cohorte, postura, masa de huevo, fecha, edad y etapa de vida cuando aplique."],
                ["Sustratos", "Controlar proveedor, lote, composición, humedad, materia seca, contaminantes, destino permitido y liberación previa."],
                ["Ambiente", "Relacionar lectura con zona, lote, orden y etapa; medir ausencia de datos, no solo excursiones."],
                ["Mortalidad", "Definir método de estimación repetible, límite por etapa y escalamiento sanitario."],
                ["Balance", "Conciliar materia húmeda y, cuando sea posible, materia seca para interpretar evaporación y reducción de residuo."],
                ["Coproductos", "Trazar frass, aceite, pupas de reposición, rechazo y residuo como salidas de la orden."],
                ["Calidad", "Versionar límites por presentación y uso; impedir consumo o embarque mientras exista HOLD."],
                ["KPIs", "Separar desempeño biológico de OEE; correlacionarlos para análisis, no combinarlos en un único indicador."],
            ],
            [45 * mm, 119 * mm],
        ),
        P("Límites configurados", "H2x"),
        P(
            "Los rangos ambientales y de calidad iniciales son configurables y demostrativos. Deben validarse con datos de la instalación, instrumentos calibrados, literatura técnica, especificación comercial y criterios regulatorios antes de convertirse en límites contractuales.",
            "Callout",
        ),
        PageBreak(),
    ]

    roadmap_rows = [
        ["Verificación Fase 0", "1-2 semanas", "Incorporar metadatos y referencias de evidencia existentes; revisar integridad del expediente sin repetir aprobaciones.", "Expediente verificable"],
        ["Alegra controlado", "1-2 semanas", "Cargar credenciales fuera de la base, validar clientes, ítems, almacén y centro de costo, activar y conciliar contacto y factura de prueba.", "Reconocimiento real sin doble captura"],
        ["Piloto validado", "4-8 semanas", "Lotes reales, pruebas de usuario, recall, desviaciones controladas y restauración.", "Un lote sin registros paralelos críticos"],
        ["Completar Fase 1 avanzada", "6-10 semanas", "Validación de métodos/límites, equipos y reactivos, LIMS externo, sensores, contadores automáticos y mantenimiento predictivo.", "Laboratorio y confiabilidad conciliados"],
        ["Planta conectada", "8-14 semanas", "Usar el hub existente para enlazar sensores, básculas, PLC/SCADA, alarmas y OEE con contratos y evidencia reales.", "Datos automáticos conciliados"],
        ["ERP y escalamiento", "8-14 semanas", "Conectar Plex para demanda, compras y conciliación; migrar a PostgreSQL y repetir sobre infraestructura externa el simulacro ya probado en SQLite.", "Cierre sin doble captura"],
        ["Optimización", "Continuo", "SPC, predicción de cosecha, receta, energía, capacidad y analítica avanzada.", "Mejora medible"],
    ]
    story += [
        P("6. Plan de trabajo restante", "H1x"),
        table(["Etapa", "Duración", "Entregables", "Salida"], roadmap_rows, [31 * mm, 25 * mm, 70 * mm, 38 * mm]),
        P("Prioridades de los próximos 30 días", "H2x"),
        *bullets([
            "Completar los campos documentales de Fase 0 con la evidencia ya aprobada y seleccionar un producto, línea y turno para el piloto.",
            "Completar datos maestros reales, límites, instrumentos y responsables.",
            "Configurar en el módulo de validación los guiones por rol y capacitar operadores y supervisores.",
            "Ejecutar trazabilidad, cuarentena, alarma, bioseguridad, masa y recuperación.",
            "Definir RPO/RTO, copia externa y decisión de migración a PostgreSQL.",
            "Validar el mapeo contable de Alegra, cargar las credenciales en el servidor y ejecutar contacto y factura controlados antes de habilitar uso productivo.",
            "Seleccionar un flujo con Plex y uno con equipo de planta para configurar endpoints HTTP reales y comprobar idempotencia, reintento y conciliación extremo a extremo.",
            "Validar en piso alimentación, CAPA, COA, retención, repuestos, paros, OEE, logística y costeo con responsables reales.",
        ]),
        P("Decisión recomendada", "H2x"),
        P(
            "No añadir analítica avanzada antes de validar datos maestros, disciplina de captura, trazabilidad, calidad y continuidad. El siguiente presupuesto debe financiar la validación del piloto y la industrialización de las capacidades existentes.",
            "Callout",
        ),
        PageBreak(),
    ]

    story += [
        P("7. Criterios para declarar un MES completo", "H1x"),
        *bullets([
            "Órdenes ejecutadas y cerradas digitalmente con materiales, tiempos, equipos, personal y resultados.",
            "Trazabilidad bidireccional probada desde sustrato y colonia hasta producto, coproducto y cliente.",
            "Calidad bloquea, libera, rechaza y retira con evidencia, firma y segregación.",
            "Balance de masa e inventario concilian dentro de tolerancias firmadas.",
            "Mantenimiento y calibración condicionan uso de activos e instrumentos.",
            "Datos manuales y automáticos tienen dueño, calidad, alarma, contingencia y monitoreo.",
            "Alegra, Plex ERP y automatización operan sobre el hub existente con contratos, mensajes idempotentes, reintentos y conciliación demostrados extremo a extremo.",
            "RPO/RTO, respaldo externo, restauración, alta disponibilidad y soporte han sido probados.",
            "La matriz regulatoria y los expedientes de producto están aprobados para cada mercado.",
        ]),
        Spacer(1, 5 * mm),
        P(
            "Conclusión: InsectMES ya cubre el núcleo P0, amplía la Fase 1 e incorpora validación controlada, firma electrónica, planeación finita y BSF por campañas, cambios, materiales, ventanas biológicas y centros alternos, además de un hub probado localmente y un conector Alegra seguro e inactivo hasta su validación. La brecha principal es completar el expediente documental, ejecutar y aprobar el piloto con datos reales, activar y conciliar Alegra, conectar Plex, equipos y laboratorios, y demostrar la continuidad sobre infraestructura productiva.",
            "Callout",
        ),
        P("Documentos entregados", "H2x"),
        *bullets([
            "Aplicación Laravel + React con SQLite, Lucide React y sidebar retraíble.",
            "Paquete Fase 0 versionado en docs/phase-0.",
            "Pruebas de flujos P0/Fase 1 y comandos de continuidad.",
            "Este diagnóstico actualizado con únicamente las brechas restantes.",
        ]),
        Spacer(1, 7 * mm),
        HRFlowable(width="100%", thickness=1, color=LINE),
        Spacer(1, 4 * mm),
        P(
            "Nota: este documento registra que las aprobaciones internas fueron confirmadas como completadas, pero no sustituye ni inventa sus evidencias. Tampoco sustituye validación de proceso, dictamen legal o autorización sanitaria.",
            "Smallx",
        ),
    ]
    return story


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=17 * mm,
        title="Estado de avance y brechas restantes - InsectMES BSF",
        author="Insetti",
        subject="Aprobaciones de Fase 0, avance funcional, brechas restantes y recomendaciones de industrialización",
    )
    document.build(build_updated_story(), onFirstPage=first_page, onLaterPages=later_pages)
    print(OUTPUT)


if __name__ == "__main__":
    main()
