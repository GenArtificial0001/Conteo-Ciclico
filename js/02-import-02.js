function parseCoordinates(bin, row) {
  const parts = trim(bin).split("-");
  return {
    aisle: trim(pick(row, "Storage Bin Aisle")) || parts[0] || trim(bin).slice(0,2),
    level: trim(pick(row, "Storage Bin Level")) || parts[1] || trim(bin).substring(3,5),
    stack: trim(pick(row, "Storage Bin Stack")) || parts[2] || trim(bin).slice(-3)
  };
}

function validateColumns(rows, required, label) {
  if (!rows.length) throw new Error(`${label} no contiene registros.`);
  const keys = new Set();
  rows.slice(0, 100).forEach(row => Object.keys(canonicalize(row)).forEach(key => keys.add(key)));
  const missing = required.filter(name => !keys.has(norm(name)));
  if (missing.length) throw new Error(`${label}: falta la columna clave obligatoria ${missing.join(", ")}. El nombre del archivo y el orden de columnas pueden ser distintos.`);
}

function buildMaster(storageRows, fixedRows, physicalRows) {
  validateColumns(storageRows, ["Storage Bin"], "Storage Bin");
  validateColumns(fixedRows, ["Storage Bin"], "Fixed Bin Assignment");
  validateColumns(physicalRows, ["Storage Bin"], "Physical Stock");

  const fixedByBin = new Map(), binsByProduct = new Map(), physicalByBin = new Map();
  fixedRows.forEach((raw, index) => {
    const r = canonicalize(raw);
    const bin = trim(pick(r, "Storage Bin"));
    const product = trim(pick(r, "Product"));
    if (!bin || !product) return;
    const item = {
      bin, product,
      description: trim(pick(r, "Product Description", "Product Short Description")),
      min: numeric(pick(r, "Minimum Quantity"), 0),
      max: numeric(pick(r, "Maximum Quantity"), 0),
      uom: trim(pick(r, "Display UoM Min. Qty", "Display UoM Max. Qty")) || "EA",
      sourceIndex: index
    };
    if (!fixedByBin.has(bin)) fixedByBin.set(bin, []);
    fixedByBin.get(bin).push(item);
    if (!binsByProduct.has(product)) binsByProduct.set(product, new Set());
    binsByProduct.get(product).add(bin);
  });

  physicalRows.forEach((raw, index) => {
    const r = canonicalize(raw);
    const bin = trim(pick(r, "Storage Bin"));
    if (!bin) return;
    const item = {
      bin,
      hu: trim(pick(r, "Handling Unit", "HU")),
      product: trim(pick(r, "Product")),
      description: trim(pick(r, "Product Short Description", "Product Description")),
      quantity: numeric(pick(r, "Quantity"), 0),
      stockType: trim(pick(r, "Stock Type")),
      storageType: trim(pick(r, "Storage Type")),
      shelfLifeExpirationDate: trim(pick(r, "Shelf Life Expiration Date")),
      goodsReceiptDate: trim(pick(r, "Goods Receipt Date")),
      goodsReceiptTime: trim(pick(r, "Goods Receipt Time")),
      sourceIndex: index
    };
    if (!physicalByBin.has(bin)) physicalByBin.set(bin, []);
    physicalByBin.get(bin).push(item);
  });

  const master = storageRows.map((raw, index) => {
    const r = canonicalize(raw);
    const bin = trim(pick(r, "Storage Bin"));
    const coords = parseCoordinates(bin, r);
    const assignments = fixedByBin.get(bin) || [];
    const stockItems = physicalByBin.get(bin) || [];
    const enriched = assignments.map(a => ({ ...a, allBins: [...(binsByProduct.get(a.product) || [])].sort(naturalCompare) }));
    const assignedProducts = uniqueSorted(enriched.map(a => a.product));
    const assignedDescriptions = uniqueSorted(enriched.map(a => a.description));
    const stockProducts = uniqueSorted(stockItems.map(a => a.product));
    const stockDescriptions = uniqueSorted(stockItems.map(a => a.description));
    const stockTypes = uniqueSorted(stockItems.map(a => a.stockType));
    const physicalStorageTypes = uniqueSorted(stockItems.map(a => a.storageType));
    const shelfLifeExpirationDates = uniqueSorted(stockItems.map(a => a.shelfLifeExpirationDate));
    const goodsReceiptDates = uniqueSorted(stockItems.map(a => a.goodsReceiptDate));
    const goodsReceiptTimes = uniqueSorted(stockItems.map(a => a.goodsReceiptTime));
    const handlingUnits = uniqueSorted(stockItems.map(a => a.hu));
    const hasMultipleProduct = enriched.some(a => a.allBins.length > 1);
    const mode = !enriched.length ? "Sin asignación" : assignedProducts.length > 1 ? "Mixta" : hasMultipleProduct ? "Múltiple" : "Simple";
    const assignedKey = assignedProducts.map(norm).sort().join("|");
    const stockKey = stockProducts.map(norm).sort().join("|");
    let stockStatus = "Vacía";
    if (stockItems.length && !enriched.length) stockStatus = "Stock no asignado";
    else if (!stockItems.length && enriched.length) stockStatus = "Asignada sin stock";
    else if (stockItems.length && assignedKey === stockKey) stockStatus = "Coincide";
    else if (stockItems.length) stockStatus = "Diferencia";
    const removal = isX(pick(r, "Stock Removal Block"));
    const putaway = isX(pick(r, "Putaway Block"));
    return {
      sourceIndex: index,
      storageBin: bin,
      storageType: trim(pick(r, "Storage Type")),
      storageSection: trim(pick(r, "Storage Section")),
      storageGroup: trim(pick(r, "Storage Group")),
      aisle: coords.aisle,
      stack: coords.stack,
      level: coords.level,
      removalBlock: removal,
      putawayBlock: putaway,
      emptyStorageBin: isX(pick(r, "Empty Storage Bin")),
      storageNoHUs: numeric(pick(r, "No. of HUs"), 0),
      fixedStorBinType: trim(pick(r, "Fixed Stor. Bin Type")),
      assignments: enriched,
      stockItems,
      productsText: assignedProducts.join(" / "),
      descriptionsText: assignedDescriptions.join(" / "),
      stockProductsText: stockProducts.join(" / "),
      stockDescriptionsText: stockDescriptions.join(" / "),
      stockTypesText: stockTypes.join(" / "),
      physicalStorageTypesText: physicalStorageTypes.join(" / "),
      shelfLifeExpirationDatesText: shelfLifeExpirationDates.join(" / "),
      goodsReceiptDatesText: goodsReceiptDates.join(" / "),
      goodsReceiptTimesText: goodsReceiptTimes.join(" / "),
      handlingUnitsText: handlingUnits.join(" / "),
      physicalHuCount: handlingUnits.length,
      physicalQty: stockItems.reduce((sum, item) => sum + numeric(item.quantity, 0), 0),
      stockStatus,
      assignmentMode: mode,
      assignedBinsText: enriched.map(a => `${a.product}: ${a.allBins.join(", ")}`).join(" | "),
      minQty: enriched.length ? Math.max(...enriched.map(a => a.min)) : 0,
      maxQty: enriched.length ? Math.max(...enriched.map(a => a.max)) : 0
    };
  }).filter(r => r.storageBin);

  master.sort((a,b) => naturalCompare(a.aisle,b.aisle) || naturalCompare(a.level,b.level) || naturalCompare(a.stack,b.stack) || naturalCompare(a.storageBin,b.storageBin));
  return master;
}

async function processFiles() {
  if (!state.storageFile || !state.physicalFile || !state.fixedFile) return toast("Seleccione Storage Bin, Physical Stock y Fixed Bin Assignment antes de procesar.", "warning");
  loading(true, "Procesando archivos", "Leyendo Storage Bin, Physical Stock y Fixed Bin Assignment...");
  try {
    await new Promise(r => setTimeout(r, 40));
    const [storageImport, physicalImport, fixedImport] = await Promise.all([
      readWorkbook(state.storageFile, "storage"), readWorkbook(state.physicalFile, "physical"), readWorkbook(state.fixedFile, "fixed")
    ]);
    const storageRows = storageImport.rows, physicalRows = physicalImport.rows, fixedRows = fixedImport.rows;
    loading(true, "Cruzando información", "Sumando stock por ubicación y calculando asignaciones múltiples...");
    await new Promise(r => setTimeout(r, 40));
    state.rawStorage = storageRows; state.rawPhysical = physicalRows; state.rawFixed = fixedRows;
    state.importMeta = { storage: storageImport.meta, physical: physicalImport.meta, fixed: fixedImport.meta };
    state.master = buildMaster(storageRows, fixedRows, physicalRows); state.filtered = [...state.master]; state.page = 1;
    state.storageFileName = state.storageFile.name; state.physicalFileName = state.physicalFile.name; state.fixedFileName = state.fixedFile.name;
    updateImportSummary(); populateAisles(); renderMaster(); renderDashboard(); renderAssignments(); renderRouteSelectors(); renderIntegrity();
    const masterBins = new Set(state.master.map(r => r.storageBin));
    const physicalBins = uniqueSorted(physicalRows.map(r => trim(pick(canonicalize(r), "Storage Bin"))));
    const outsideMaster = physicalBins.filter(bin => !masterBins.has(bin)).length;
    const differenceCount = state.master.filter(r => ["Diferencia", "Stock no asignado"].includes(r.stockStatus)).length;
    const imports = [storageImport.meta, physicalImport.meta, fixedImport.meta];
    const importDetails = imports.map(meta => {
      const missing = meta.missingRecommended.length ? ` · Opcionales no encontradas: ${meta.missingRecommended.map(esc).join(", ")}` : " · Todas las columnas esperadas fueron reconocidas";
      return `<div class="mt-2"><b>${esc(meta.label)}</b>: archivo <b>${esc(meta.fileName)}</b> · hoja <b>${esc(meta.sheetName)}</b> · títulos en fila <b>${meta.headerRow}</b> · ${meta.mapped.length} columnas reconocidas${missing}</div>`;
    }).join("");
    $("importValidation").innerHTML = `<span class="badge-app badge-success">Validación correcta</span> Cruce completado por <b>Storage Bin</b>, sin depender del nombre del archivo, hoja ni posición de columnas. ${outsideMaster ? `<span class="badge-app badge-warning">${fmtNumber(outsideMaster)} ubicaciones de stock fuera del maestro</span>` : ""} ${differenceCount ? `<span class="badge-app badge-warning">${fmtNumber(differenceCount)} diferencias producto/asignación</span>` : ""}${importDetails}`;
    toast(`Proceso completado: ${fmtNumber(state.master.length)} ubicaciones y ${fmtNumber(state.rawPhysical.length)} registros de stock.`);
    navigate("master");
  } catch (error) {
    console.error(error); toast(error.message || "No fue posible procesar los archivos.", "error");
    $("importValidation").innerHTML = `<span class="badge-app badge-danger">Error</span> ${esc(error.message || "Archivo inválido")}`;
  } finally { loading(false); }
}
