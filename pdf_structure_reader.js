#!/usr/bin/env node

/**
 * Lector básico de estructura PDF.
 *
 * Extrae:
 * - versión PDF
 * - objetos indirectos (número, generación y offset aproximado)
 * - offsets de xref
 * - trailers encontrados
 * - startxref
 *
 * Uso:
 *   node pdf_structure_reader.js archivo.pdf
 */

const fs = require('fs');
const path = require('path');

function usage() {
  console.log('Uso: node pdf_structure_reader.js <ruta-del-pdf>');
}

function formatPreview(text, maxLen = 120) {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > maxLen ? `${compact.slice(0, maxLen)}...` : compact;
}

function parsePdfStructure(buffer) {
  const text = buffer.toString('latin1');

  const versionMatch = text.match(/%PDF-(\d\.\d)/);
  const version = versionMatch ? versionMatch[1] : 'desconocida';

  const objects = [];
  const objectRegex = /(^|\n)(\d+)\s+(\d+)\s+obj\b/g;
  let match;

  while ((match = objectRegex.exec(text)) !== null) {
    const objNumber = Number(match[2]);
    const generation = Number(match[3]);
    const objOffset = match.index + (match[1] ? match[1].length : 0);

    const start = objectRegex.lastIndex;
    const endobjIndex = text.indexOf('endobj', start);
    const content = endobjIndex !== -1 ? text.slice(start, endobjIndex) : '';

    objects.push({
      objNumber,
      generation,
      offset: objOffset,
      preview: formatPreview(content)
    });
  }

  const xrefOffsets = [];
  const xrefRegex = /(^|\n)xref\b/g;
  while ((match = xrefRegex.exec(text)) !== null) {
    const xrefOffset = match.index + (match[1] ? match[1].length : 0);
    xrefOffsets.push(xrefOffset);
  }

  const trailers = [];
  const trailerRegex = /trailer\s*<<([\s\S]*?)>>/g;
  while ((match = trailerRegex.exec(text)) !== null) {
    trailers.push(formatPreview(match[1], 200));
  }

  const startXrefMatch = text.match(/startxref\s*(\d+)/);
  const startXref = startXrefMatch ? Number(startXrefMatch[1]) : null;

  return {
    version,
    fileSizeBytes: buffer.length,
    objectCount: objects.length,
    objects,
    xrefOffsets,
    trailerCount: trailers.length,
    trailers,
    startXref
  };
}

function printReport(report, filePath) {
  console.log('=== ESTRUCTURA PDF ===');
  console.log(`Archivo: ${filePath}`);
  console.log(`Versión: ${report.version}`);
  console.log(`Tamaño: ${report.fileSizeBytes} bytes`);
  console.log(`Objetos indirectos: ${report.objectCount}`);
  console.log(`Bloques xref detectados: ${report.xrefOffsets.length}`);
  console.log(`Trailers detectados: ${report.trailerCount}`);
  console.log(`startxref: ${report.startXref ?? 'no encontrado'}`);

  console.log('\n--- Objetos (primeros 25) ---');
  report.objects.slice(0, 25).forEach((obj) => {
    console.log(
      `#${obj.objNumber} ${obj.generation} obj | offset=${obj.offset} | contenido="${obj.preview}"`
    );
  });

  if (report.objects.length > 25) {
    console.log(`... (${report.objects.length - 25} objetos adicionales omitidos)`);
  }

  if (report.xrefOffsets.length > 0) {
    console.log('\n--- Offsets xref ---');
    console.log(report.xrefOffsets.join(', '));
  }

  if (report.trailers.length > 0) {
    console.log('\n--- Trailers ---');
    report.trailers.forEach((trailer, index) => {
      console.log(`Trailer ${index + 1}: << ${trailer} >>`);
    });
  }
}

function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    usage();
    process.exitCode = 1;
    return;
  }

  const resolved = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(resolved)) {
    console.error(`Error: no existe el archivo "${resolved}".`);
    process.exitCode = 1;
    return;
  }

  const buffer = fs.readFileSync(resolved);
  const report = parsePdfStructure(buffer);
  printReport(report, resolved);
}

if (require.main === module) {
  main();
}
