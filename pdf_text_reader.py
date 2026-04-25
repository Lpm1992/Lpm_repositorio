#!/usr/bin/env python3
"""
Lector de texto en PDFs (recursivo por carpeta).

Uso:
  python pdf_text_reader.py "C:/ruta/a/tu/carpeta"
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PyPDF2 import PdfReader


def leer_pdf(ruta_pdf: Path) -> None:
    print("\n====================================")
    print(f"📄 Archivo: {ruta_pdf.name}")
    print(f"📂 Ruta: {ruta_pdf}")
    print("====================================\n")

    try:
        reader = PdfReader(str(ruta_pdf))

        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                print("🔒 PDF encriptado: no se pudo desbloquear con contraseña vacía.")
                return

        total_paginas = len(reader.pages)
        print(f"📑 Total de páginas: {total_paginas}\n")

        for i, pagina in enumerate(reader.pages, start=1):
            print("\n----------------------------")
            print(f"PÁGINA {i}")
            print("----------------------------\n")

            texto = pagina.extract_text()
            if texto and texto.strip():
                print(texto)
            else:
                print("⚠️ No se pudo leer texto en esta página (puede ser imagen escaneada).")

    except Exception as exc:
        print(f"❌ Error leyendo archivo: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recorre una carpeta y extrae texto de todos los PDFs.",
    )
    parser.add_argument(
        "carpeta",
        type=Path,
        help="Ruta de la carpeta que contiene PDFs.",
    )
    args = parser.parse_args()

    carpeta = args.carpeta.expanduser().resolve()
    if not carpeta.exists() or not carpeta.is_dir():
        print(f"❌ La ruta no existe o no es carpeta: {carpeta}")
        raise SystemExit(1)

    print("\n🔎 BUSCANDO PDFs...\n")

    pdfs = sorted(carpeta.rglob("*.pdf"))
    if not pdfs:
        print("⚠️ No se encontraron archivos PDF.")
        return

    for ruta_pdf in pdfs:
        leer_pdf(ruta_pdf)

    print("\n✅ PROCESO FINALIZADO")


if __name__ == "__main__":
    main()
