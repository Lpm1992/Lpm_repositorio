# Lpm_repositorio
Repositorio de pruebas codex.

## Lector de estructura PDF (Node.js)

Script para inspeccionar estructura básica de un PDF:

- versión PDF
- objetos indirectos (`obj`)
- bloques `xref`
- `trailer`
- `startxref`

### Uso

```bash
node pdf_structure_reader.js ruta/al/archivo.pdf
```

## Lector de texto PDF (Python, selección de archivo)

Script para escoger un PDF y extraer texto por página.

### Requisitos

```bash
pip install PyPDF2
```

### Uso interactivo (abre selector de archivo)

```bash
python pdf_text_reader.py
```

### Uso con ruta directa

```bash
python pdf_text_reader.py "C:/Users/LIZ/Desktop/DECLARACIONES/archivo.pdf"
```

### Nota

Si un PDF está escaneado como imagen, `PyPDF2` puede no extraer texto (en ese caso necesitarías OCR).
