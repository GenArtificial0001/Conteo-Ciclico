"use strict";

const IMPORT_SCHEMAS = {
  storage: {
    label: "Storage Bin",
    required: ["Storage Bin"],
    recommended: ["Storage Type", "Storage Section", "Empty Storage Bin", "Stock Removal Block", "Putaway Block", "No. of HUs", "Fixed Stor. Bin Type", "Storage Group", "Storage Bin Aisle", "Storage Bin Level", "Storage Bin Stack"],
    aliases: {
      "Storage Bin": ["Storage Bin", "StorageBin", "Storage Bin Number", "Bin Location", "Ubicación", "Ubicacion", "Puesto Fijo"],
      "Storage Type": ["Storage Type", "Tipo de ubicación", "Tipo de ubicacion"],
      "Storage Section": ["Storage Section", "Sección de almacenamiento", "Seccion de almacenamiento"],
      "Storage Bin Type": ["Storage Bin Type", "Bin Type"],
      "Empty Storage Bin": ["Empty Storage Bin", "Empty Bin", "Ubicación vacía", "Ubicacion vacia"],
      "Stock Removal Block": ["Stock Removal Block", "Removal Block", "Stock Removal Blocked", "Bloqueo de retiro"],
      "Putaway Block": ["Putaway Block", "Put Away Block", "Bloqueo de entrada", "Bloqueo putaway"],
      "No. of HUs": ["No. of HUs", "No of HUs", "Number of HUs", "Cantidad de HUs", "HU Count"],
      "Fixed Stor. Bin Type": ["Fixed Stor. Bin Type", "Fixed Storage Bin Type", "Fixed Bin Type"],
      "Changed On": ["Changed On", "Fecha de modificación", "Fecha de modificacion"],
      "Changed At": ["Changed At", "Hora de modificación", "Hora de modificacion"],
      "Last Changed By": ["Last Changed By", "Changed By", "Modificado por"],
      "Storage Group": ["Storage Group", "Grupo de almacenamiento", "Grupo"],
      "Storage Bin Aisle": ["Storage Bin Aisle", "Aisle", "Pasillo"],
      "Storage Bin Level": ["Storage Bin Level", "Level", "Nivel"],
      "Storage Bin Stack": ["Storage Bin Stack", "Stack", "Column", "Columna"],
      "Weight Used": ["Weight Used", "Peso usado"],
      "Weight Unit": ["Weight Unit", "Unidad de peso"],
      "Date of First Putaway": ["Date of First Putaway", "First Putaway Date"],
      "Date of Last Movement": ["Date of Last Movement", "Last Movement Date"],
      "Time of Last Movement": ["Time of Last Movement", "Last Movement Time"],
      "WT of Last Movement": ["WT of Last Movement", "Last Movement WT"]
    }
  },
  physical: {
    label: "Physical Stock",
    required: ["Storage Bin"],
    recommended: ["Handling Unit", "Product", "Product Description", "Quantity", "Stock Type", "Storage Type", "Shelf Life Expiration Date", "Goods Receipt Date", "Goods Receipt Time"],
    aliases: {
      "Storage Bin": ["Storage Bin", "StorageBin", "Storage Bin Number", "Bin Location", "Ubicación", "Ubicacion"],
      "Handling Unit": ["Handling Unit", "Handling Unit Number", "HU", "HU Number", "Unidad de manipulación", "Unidad de manipulacion"],
      "Product": ["Product", "Material", "Product Code", "Part Number", "Part No", "Producto", "Pieza", "Código de producto", "Codigo de producto"],
      "Product Description": ["Product Description", "Product Short Description", "Short Description", "Material Description", "Descripción de producto", "Descripcion de producto", "Descripción", "Descripcion"],
      "Quantity": ["Quantity", "Stock Quantity", "Qty", "Cantidad"],
      "Stock Type": ["Stock Type", "Tipo de stock"],
      "Storage Type": ["Storage Type", "Tipo de ubicación", "Tipo de ubicacion"],
      "Shelf Life Expiration Date": ["Shelf Life Expiration Date", "Expiration Date", "Fecha de vencimiento"],
      "Goods Receipt Date": ["Goods Receipt Date", "GR Date", "Fecha de recepción", "Fecha de recepcion"],
      "Goods Receipt Time": ["Goods Receipt Time", "GR Time", "Hora de recepción", "Hora de recepcion"],
      "Document Category": ["Document Category", "Categoría de documento", "Categoria de documento"],
      "Document": ["Document", "Document Number", "Documento"]
    }
  },
  fixed: {
    label: "Fixed Bin Assignment",
    required: ["Storage Bin"],
    recommended: ["Product", "Product Description", "Storage Type", "Minimum Quantity", "Display UoM Min. Qty", "Maximum Quantity", "Display UoM Max. Qty"],
    aliases: {
      "Storage Bin": ["Storage Bin", "StorageBin", "Storage Bin Number", "Bin Location", "Ubicación", "Ubicacion", "Puesto Fijo"],
      "Storage Section": ["Storage Section", "Sección de almacenamiento", "Seccion de almacenamiento"],
      "Party Entitled to Dispose": ["Party Entitled to Dispose", "Party Entitled", "Disposal Party"],
      "Storage Type": ["Storage Type", "Tipo de ubicación", "Tipo de ubicacion"],
      "Product": ["Product", "Material", "Product Code", "Part Number", "Part No", "Producto", "Pieza", "Código de producto", "Codigo de producto"],
      "Product Description": ["Product Description", "Product Short Description", "Short Description", "Material Description", "Descripción de producto", "Descripcion de producto", "Descripción", "Descripcion"],
      "Changed On": ["Changed On", "Fecha de modificación", "Fecha de modificacion"],
      "Minimum Quantity": ["Minimum Quantity", "Minimum Qty", "Min Quantity", "Min. Qty", "Cantidad mínima", "Cantidad minima"],
      "Display UoM Min. Qty": ["Display UoM Min. Qty", "UoM Min Qty", "Minimum UoM", "UM mínima", "UM minima"],
      "Maximum Quantity": ["Maximum Quantity", "Maximum Qty", "Max Quantity", "Max. Qty", "Cantidad máxima", "Cantidad maxima"],
      "Display UoM Max. Qty": ["Display UoM Max. Qty", "UoM Max Qty", "Maximum UoM", "UM máxima", "UM maxima"],
      "Quantities Fixed": ["Quantities Fixed", "Fixed Quantities"],
      "Created By": ["Created By", "Creado por"],
      "Created On": ["Created On", "Fecha de creación", "Fecha de creacion"],
      "Creation Time": ["Creation Time", "Hora de creación", "Hora de creacion"],
      "Prod. Assgmt Type": ["Prod. Assgmt Type", "Product Assignment Type", "Assignment Type"]
    }
  }
};

const IMPORT_ALIAS_CACHE = {};
function aliasIndex(role) {
  if (IMPORT_ALIAS_CACHE[role]) return IMPORT_ALIAS_CACHE[role];
  const schema = IMPORT_SCHEMAS[role], index = new Map();
  Object.entries(schema.aliases).forEach(([canonical, aliases]) => {
    [canonical, ...aliases].forEach(alias => index.set(norm(alias), canonical));
  });
  IMPORT_ALIAS_CACHE[role] = index;
  return index;
}
function resolveHeader(role, header) { return aliasIndex(role).get(norm(header)) || ""; }
function detectHeader(matrix, role) {
  const schema = IMPORT_SCHEMAS[role];
  let best = null;
  matrix.slice(0, 100).forEach((row, rowIndex) => {
    const found = new Map();
    row.forEach((cell, columnIndex) => {
      const canonical = resolveHeader(role, cell);
      if (canonical && !found.has(canonical)) found.set(canonical, columnIndex);
    });
    const requiredFound = schema.required.filter(field => found.has(field)).length;
    const recommendedFound = schema.recommended.filter(field => found.has(field)).length;
    const score = requiredFound * 10000 + recommendedFound * 100 + found.size - rowIndex / 1000;
    if (requiredFound === schema.required.length && (!best || score > best.score)) best = { rowIndex, found, score };
  });
  return best;
}
function rowsFromMatrix(matrix, detection, role) {
  const header = matrix[detection.rowIndex] || [];
  const keys = header.map((cell, index) => resolveHeader(role, cell) || trim(cell) || `Columna ${index + 1}`);
  const seen = new Map();
  const uniqueKeys = keys.map(key => {
    const count = (seen.get(key) || 0) + 1; seen.set(key, count);
    return count === 1 ? key : `${key} (${count})`;
  });
  return matrix.slice(detection.rowIndex + 1).filter(row => row.some(value => trim(value) !== "")).map(row => {
    const out = {};
    uniqueKeys.forEach((key, index) => { if (row[index] !== undefined) out[key] = row[index]; });
    return out;
  });
}
async function readWorkbook(file, role) {
  if (typeof XLSX === "undefined") throw new Error("No se pudo cargar el lector de Excel. Verifique la conexión a Internet o publique el sistema en GitHub Pages.");
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  let best = null;
  wb.SheetNames.forEach(sheetName => {
    const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "", raw: false, blankrows: true });
    const detection = detectHeader(matrix, role);
    if (detection && (!best || detection.score > best.detection.score)) best = { sheetName, matrix, detection };
  });
  const schema = IMPORT_SCHEMAS[role];
  if (!best) throw new Error(`${schema.label}: no se encontró la columna clave Storage Bin en ninguna hoja ni en las primeras 100 filas.`);
  const rows = rowsFromMatrix(best.matrix, best.detection, role);
  if (!rows.length) throw new Error(`${schema.label}: se encontró la cabecera, pero no hay registros debajo.`);
  const mapped = [...best.detection.found.keys()];
  const missingRecommended = schema.recommended.filter(field => !best.detection.found.has(field));
  return {
    rows,
    meta: { label: schema.label, fileName: file.name, sheetName: best.sheetName, headerRow: best.detection.rowIndex + 1, mapped, missingRecommended }
  };
}

function canonicalize(row) {
  const out = {};
  const allIndexes = [aliasIndex("storage"), aliasIndex("physical"), aliasIndex("fixed")];
  Object.entries(row).forEach(([key, value]) => {
    out[norm(key)] = value;
    for (const index of allIndexes) {
      const canonical = index.get(norm(key));
      if (canonical) out[norm(canonical)] = value;
    }
  });
  return out;
}
function pick(row, ...aliases) {
  for (const alias of aliases) { const value = row[norm(alias)]; if (value !== undefined && trim(value) !== "") return value; }
  return "";
}
