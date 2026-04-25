# Lpm_repositorio
Repositorio de pruebas codex.

## Lector de estructura PDF

Se añadió un script en Node.js para inspeccionar la estructura básica de un PDF:

- versión PDF
- objetos indirectos (`obj`)
- bloques `xref`
- `trailer`
- `startxref`

### Uso

```bash
node pdf_structure_reader.js ruta/al/archivo.pdf
```

El script imprimirá un resumen y una vista previa de los primeros objetos detectados.
