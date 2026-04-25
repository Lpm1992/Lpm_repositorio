#!/usr/bin/env python3
"""
Lector de texto para un PDF seleccionado por el usuario.

Opciones de uso:
1) Interactivo (abre selector de archivo):
   python pdf_text_reader.py

2) Pasando ruta directa del PDF:
   python pdf_text_reader.py "C:/ruta/archivo.pdf"
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PyPDF2 import PdfReader


def seleccionar_pdf_interactivo() -> Path | None:
    """Abre un diálogo para escoger un PDF. Si falla, usa entrada por consola."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        ruta = filedialog.askopenfilename(
            title="Selecciona un archivo PDF",
            filetypes=[("Archivos PDF", "*.pdf")],
        )
        root.destroy()

        if ruta:
            return Path(ruta).expanduser().resolve()
        return None
    except Exception:
        entrada = input("Escribe la ruta completa del PDF: ").strip().strip('"')
        if not entrada:
            return None
        return Path(entrada).expanduser().resolve()


def leer_pdf(ruta_pdf: Path) -> bool:
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
                return False

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
        return False

    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="Lee y extrae texto de un archivo PDF.")
    parser.add_argument(
        "pdf",
        nargs="?",
        type=Path,
        help="Ruta del archivo PDF (opcional). Si no la envías, se abre selector de archivo.",
    )
    args = parser.parse_args()

    ruta_pdf = args.pdf.expanduser().resolve() if args.pdf else seleccionar_pdf_interactivo()

    if ruta_pdf is None:
        print("⚠️ No se seleccionó ningún archivo.")
        raise SystemExit(1)

    if not ruta_pdf.exists() or not ruta_pdf.is_file() or ruta_pdf.suffix.lower() != ".pdf":
        print(f"❌ Archivo inválido: {ruta_pdf}")
        raise SystemExit(1)

    ok = leer_pdf(ruta_pdf)
    if ok:
        print("\n✅ PROCESO FINALIZADO")
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
