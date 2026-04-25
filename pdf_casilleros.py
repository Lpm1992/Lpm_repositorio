import os
import re
from typing import Optional

import pandas as pd
from PyPDF2 import PdfReader
import tkinter as tk
from tkinter import filedialog, messagebox, ttk


def limpiar_numero(valor: str) -> float:
    """Convierte texto numérico a float soportando formatos locales mixtos.

    Ejemplos soportados:
    - 1.234,56 -> 1234.56
    - 1,234.56 -> 1234.56
    - 1234,56  -> 1234.56
    - 1234.56  -> 1234.56
    """
    if valor is None:
        return 0.0

    texto = str(valor).strip().replace(" ", "")
    if not texto:
        return 0.0

    # Dejar solo dígitos, separadores y signo.
    texto = re.sub(r"[^0-9,.-]", "", texto)
    if not texto:
        return 0.0

    ultima_coma = texto.rfind(",")
    ultimo_punto = texto.rfind(".")

    # Si hay coma y punto, el último separador que aparece se toma como decimal.
    if ultima_coma != -1 and ultimo_punto != -1:
        if ultima_coma > ultimo_punto:
            # 1.234,56
            texto = texto.replace(".", "")
            texto = texto.replace(",", ".")
        else:
            # 1,234.56
            texto = texto.replace(",", "")
    elif ultima_coma != -1:
        # Solo coma: decidir si es decimal o miles por cantidad de dígitos finales.
        decimales = len(texto) - ultima_coma - 1
        if decimales in (1, 2):
            texto = texto.replace(".", "")
            texto = texto.replace(",", ".")
        else:
            texto = texto.replace(",", "")
    elif ultimo_punto != -1:
        # Solo punto: decidir si es decimal o miles por cantidad de dígitos finales.
        decimales = len(texto) - ultimo_punto - 1
        if decimales not in (1, 2):
            texto = texto.replace(".", "")

    try:
        return float(texto)
    except ValueError:
        return 0.0


def extraer_texto_pdf(ruta_pdf: str) -> tuple[str, str]:
    reader = PdfReader(ruta_pdf)
    primera_pagina = ""
    bloques = []
    for indice, pagina in enumerate(reader.pages):
        contenido = pagina.extract_text()
        if contenido:
            if indice == 0:
                primera_pagina = contenido
            bloques.append(contenido)
    return primera_pagina, "\n".join(bloques)


def detectar_mes_periodo_fiscal_primera_pagina(
    texto_primera_pagina: str,
    meses: list[str],
    anio_ruta: Optional[str] = None,
) -> Optional[str]:
    texto = texto_primera_pagina.upper()

    # Buscar únicamente el campo "PERIODO FISCAL: ...".
    bloque_periodo = re.search(
        r"PER[ÍI]ODO\s+FISCAL\s*:\s*([A-ZÁÉÍÓÚÑ]+|\d{1,2})[\s/\-.]+(20\d{2})",
        texto,
        re.IGNORECASE,
    )
    if not bloque_periodo:
        return None

    mes_token = bloque_periodo.group(1).upper()
    anio_periodo = bloque_periodo.group(2)

    if anio_ruta and anio_periodo != anio_ruta:
        return None

    # Mes en abreviatura.
    for mes in meses:
        if mes_token == mes:
            return mes

    # Mes en nombre completo.
    meses_nombre = {
        "ENERO": "ENE",
        "FEBRERO": "FEB",
        "MARZO": "MAR",
        "ABRIL": "ABR",
        "MAYO": "MAY",
        "JUNIO": "JUN",
        "JULIO": "JUL",
        "AGOSTO": "AGO",
        "SEPTIEMBRE": "SEP",
        "SETIEMBRE": "SEP",
        "OCTUBRE": "OCT",
        "NOVIEMBRE": "NOV",
        "DICIEMBRE": "DIC",
    }
    if mes_token in meses_nombre:
        return meses_nombre[mes_token]

    # Mes numérico (ej: 02 2026 dentro de "PERIODO FISCAL: 02/2026").
    if mes_token.isdigit():
        idx = int(mes_token) - 1
        if 0 <= idx < len(meses):
            return meses[idx]
    return None


def procesar_declaraciones(carpeta: str) -> tuple[dict, list[str]]:
    casilleros = [
        "411", "421", "510", "520", "511", "521", "512", "522", "513", "523", "514", "524", "515", "525",
        "550", "560", "564", "601", "602", "605", "606", "609", "613", "615", "617"
    ]
    meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

    datos_por_anio: dict[str, dict] = {}
    advertencias: list[str] = []

    total_archivos = sum(
        1
        for root_dir, _, files in os.walk(carpeta)
        for archivo in files
        if archivo.lower().endswith(".pdf")
    )

    procesados = 0

    ventana = tk.Tk()
    ventana.title("Procesando...")
    ventana.geometry("380x130")

    label = tk.Label(ventana, text="Procesando archivos, por favor espere...")
    label.pack(pady=10)

    barra = ttk.Progressbar(ventana, orient="horizontal", length=280, mode="determinate")
    barra.pack(pady=10)

    estado = tk.Label(ventana, text="")
    estado.pack()

    ventana.update()

    for root_dir, _, files in os.walk(carpeta):
        match_anio = re.search(r"(20\d{2})", root_dir)
        anio = match_anio.group(1) if match_anio else None

        if anio and anio not in datos_por_anio:
            datos_por_anio[anio] = {
                cod: {"CASILLERO": cod, **{mes: 0.0 for mes in meses}}
                for cod in casilleros
            }

        for archivo in files:
            if not (archivo.lower().endswith(".pdf") and anio):
                continue

            ruta_pdf = os.path.join(root_dir, archivo)
            try:
                texto_primera_pagina, texto = extraer_texto_pdf(ruta_pdf)
                mes_detectado = detectar_mes_periodo_fiscal_primera_pagina(
                    texto_primera_pagina,
                    meses,
                    anio,
                )

                if len(texto.strip()) < 50:
                    advertencias.append(
                        f"⚠ {anio} - {archivo}: PDF sin texto extraíble (posible escaneo/OCR requerido)."
                    )
                    continue

                if not mes_detectado:
                    advertencias.append(
                        f"⚠ {anio} - {archivo}: no se detectó 'PERIODO FISCAL' válido en la primera página."
                    )
                    continue

                # Admite montos con separadores de miles y decimales mixtos.
                patron = re.compile(
                    r"\b(\d{3})\b\s*[\n\r:\-]*\s*([+-]?(?:\d{1,3}(?:[\.,]\d{3})+|\d+)(?:[\.,]\d{1,2})?)"
                )

                for cod, valor in patron.findall(texto):
                    if cod in datos_por_anio[anio]:
                        datos_por_anio[anio][cod][mes_detectado] = limpiar_numero(valor)

                # Refuerzo para casillero 564.
                match_564 = re.search(
                    r"\b564\b\s*[\n\r:\-]*\s*([+-]?(?:\d{1,3}(?:[\.,]\d{3})+|\d+)(?:[\.,]\d{1,2})?)",
                    texto,
                )
                if match_564:
                    datos_por_anio[anio]["564"][mes_detectado] = limpiar_numero(match_564.group(1))

            except Exception as exc:
                advertencias.append(f"❌ {anio} - {archivo}: error al procesar ({exc}).")

            procesados += 1
            if total_archivos:
                progreso = int((procesados / total_archivos) * 100)
                barra["value"] = progreso
                estado.config(text=f"{progreso}% ({procesados}/{total_archivos})")
                ventana.update()

    ventana.destroy()
    return datos_por_anio, advertencias


def exportar_excel(carpeta: str, datos_por_anio: dict) -> str:
    casilleros = [
        "411", "421", "510", "520", "511", "521", "512", "522", "513", "523", "514", "524", "515", "525",
        "550", "560", "564", "601", "602", "605", "606", "609", "613", "615", "617"
    ]
    meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"]

    ruta_excel = os.path.join(carpeta, "reporte_casilleros_por_anio.xlsx")
    resumen = []

    with pd.ExcelWriter(ruta_excel, engine="openpyxl") as writer:
        for anio, datos in sorted(datos_por_anio.items()):
            df = pd.DataFrame([datos[cod] for cod in casilleros])
            df.to_excel(writer, sheet_name=anio, index=False)

            for cod in casilleros:
                total = sum(datos[cod][mes] for mes in meses)
                resumen.append({"AÑO": anio, "CASILLERO": cod, "TOTAL": round(total, 2)})

        df_resumen = pd.DataFrame(resumen)
        df_resumen["CASILLERO"] = df_resumen["CASILLERO"].astype(str)

        df_pivot = df_resumen.pivot(index="CASILLERO", columns="AÑO", values="TOTAL")
        df_pivot = df_pivot.reindex(casilleros).fillna(0)

        total_compras = df_pivot.loc[["510", "511", "512", "513", "514", "515"]].sum()
        total_iva = df_pivot.loc[["521", "522", "523", "524", "525"]].sum()

        pos_525 = df_pivot.index.get_loc("525")
        parte1 = df_pivot.iloc[:pos_525 + 1]
        parte2 = df_pivot.iloc[pos_525 + 1:]

        fila1 = pd.DataFrame([total_compras], index=["TOTAL COMPRAS"])
        fila2 = pd.DataFrame([total_iva], index=["TOTAL IVA COMPRAS"])

        df_final = pd.concat([parte1, fila1, fila2, parte2]).reset_index().rename(columns={"index": "CASILLERO"})
        df_final.to_excel(writer, sheet_name="TOTALES", index=False)

    return ruta_excel


def main() -> None:
    root = tk.Tk()
    root.withdraw()

    carpeta = filedialog.askdirectory(title="Selecciona carpeta principal")
    if not carpeta:
        return

    datos_por_anio, advertencias = procesar_declaraciones(carpeta)

    if not datos_por_anio:
        messagebox.showwarning(
            "Sin datos",
            "No se encontraron PDFs válidos con año en la ruta (ej: 2024, 2025).",
        )
        return

    ruta_excel = exportar_excel(carpeta, datos_por_anio)

    detalle = "\n".join(advertencias[:15])
    if len(advertencias) > 15:
        detalle += f"\n... y {len(advertencias) - 15} advertencias más."

    msg = f"Se generó el reporte con éxito:\n{ruta_excel}"
    if advertencias:
        msg += "\n\nRevisar advertencias (frecuente en PDFs escaneados, por ejemplo 2025):\n" + detalle

    messagebox.showinfo("Proceso finalizado", msg)


if __name__ == "__main__":
    main()
