"use strict";

function populateAisles() {
  const aisles = uniqueSorted(state.master.map(r => r.aisle));
  const options = aisles.map(a => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  $("filterAisle").innerHTML = `<option value="all">Todos</option>${options}`;
  $("assignmentAisle").innerHTML = `<option value="">Seleccionar</option>${options}`;
}

function applyFilters() {
  const q = norm($("filterSearch").value), aisle = $("filterAisle").value, group = $("filterGroup").value, block = $("filterBlock").value, assignment = $("filterAssignment").value, stock = $("filterStock").value;
  state.filtered = state.master.filter(r => {
    const hay = norm([r.storageBin,r.storageType,r.storageSection,r.storageGroup,r.fixedStorBinType,r.productsText,r.descriptionsText,r.stockProductsText,r.stockDescriptionsText,r.stockTypesText,r.physicalStorageTypesText,r.shelfLifeExpirationDatesText,r.goodsReceiptDatesText,r.goodsReceiptTimesText,r.handlingUnitsText,r.aisle,r.stack,r.level].join(" "));
    if (q && !hay.includes(q)) return false;
    if (aisle !== "all" && r.aisle !== aisle) return false;
    if (group === "__EMPTY__" && r.storageGroup) return false;
    if (group !== "all" && group !== "__EMPTY__" && r.storageGroup !== group) return false;
    if (block === "none" && (r.removalBlock || r.putawayBlock)) return false;
    if (block === "removal" && (!r.removalBlock || r.putawayBlock)) return false;
    if (block === "putaway" && (!r.putawayBlock || r.removalBlock)) return false;
    if (block === "both" && !(r.removalBlock && r.putawayBlock)) return false;
    if (assignment === "assigned" && !r.assignments.length) return false;
    if (assignment === "unassigned" && r.assignments.length) return false;
    if (assignment === "multiple" && !["Múltiple","Mixta"].includes(r.assignmentMode)) return false;
    if (stock === "stock" && !r.stockItems.length) return false;
    if (stock === "empty" && r.stockItems.length) return false;
    if (stock === "match" && r.stockStatus !== "Coincide") return false;
    if (stock === "difference" && !["Diferencia","Stock no asignado"].includes(r.stockStatus)) return false;
    return true;
  });
  state.page = 1; renderMasterTable();
}
function blockBadge(row, type) {
  const active = type === "removal" ? row.removalBlock : row.putawayBlock;
  return active ? `<span class="badge-app ${type === "removal" ? "badge-warning" : "badge-danger"}">X · Sí</span>` : `<span class="badge-app badge-success">No</span>`;
}
function modeBadge(mode) {
  const cls = mode === "Simple" ? "badge-success" : mode === "Múltiple" ? "badge-purple" : mode === "Mixta" ? "badge-warning" : "badge-neutral";
  return `<span class="badge-app ${cls}">${esc(mode)}</span>`;
}
function stockStatusBadge(status) {
  const cls = status === "Coincide" ? "badge-success" : status === "Vacía" ? "badge-neutral" : status === "Asignada sin stock" ? "badge-primary" : status === "Stock no asignado" ? "badge-warning" : "badge-danger";
  return `<span class="badge-app ${cls}">${esc(status)}</span>`;
}
const MASTER_COLUMNS = [
  {key:"row",label:"#",value:(r,ctx)=>ctx.index+1,sort:r=>r.sourceIndex,cell:(r,ctx)=>String(ctx.index+1)},
  {key:"storageBin",label:"Storage Bin",value:r=>r.storageBin,cell:r=>`<b class="text-mono">${esc(r.storageBin)}</b>`},
  {key:"aisle",label:"Pasillo",value:r=>r.aisle},
  {key:"level",label:"Nivel",value:r=>r.level},
  {key:"stack",label:"Columna",value:r=>r.stack},
  {key:"storageType",label:"Storage Type",value:r=>r.storageType},
  {key:"storageSection",label:"Storage Section",value:r=>r.storageSection},
  {key:"emptyStorageBin",label:"Empty Storage Bin",value:r=>r.emptyStorageBin?1:0,cell:r=>r.emptyStorageBin?`<span class="badge-app badge-warning">X · Vacía</span>`:`<span class="badge-app badge-success">No</span>`},
  {key:"storageNoHUs",label:"No. of HUs SAP",value:r=>r.storageNoHUs,cell:r=>fmtNumber(r.storageNoHUs)},
  {key:"fixedStorBinType",label:"Fixed Stor. Bin Type",value:r=>r.fixedStorBinType},
  {key:"storageGroup",label:"Storage Group",value:r=>r.storageGroup,cell:r=>r.storageGroup?`<span class="badge-app badge-primary">${esc(r.storageGroup)}</span>`:`<span class="badge-app badge-neutral">Vacío</span>`},
  {key:"removalBlock",label:"Removal Block",value:r=>r.removalBlock?1:0,cell:r=>blockBadge(r,"removal")},
  {key:"putawayBlock",label:"Putaway Block",value:r=>r.putawayBlock?1:0,cell:r=>blockBadge(r,"putaway")},
  {key:"productsText",label:"Producto asignado",value:r=>r.productsText,cell:r=>r.productsText?`<span class="text-mono text-clamp">${esc(r.productsText)}</span>`:`<span class="text-muted">Sin asignación</span>`},
  {key:"descriptionsText",label:"Descripción asignada",value:r=>r.descriptionsText,cell:r=>`<span class="text-clamp">${esc(r.descriptionsText)||"—"}</span>`},
  {key:"stockProductsText",label:"Producto en stock",value:r=>r.stockProductsText,cell:r=>r.stockProductsText?`<span class="text-mono text-clamp">${esc(r.stockProductsText)}</span>`:`<span class="text-muted">Vacía</span>`},
  {key:"stockDescriptionsText",label:"Descripción stock",value:r=>r.stockDescriptionsText,cell:r=>`<span class="text-clamp">${esc(r.stockDescriptionsText)||"—"}</span>`},
  {key:"stockTypesText",label:"Stock Type",value:r=>r.stockTypesText},
  {key:"physicalStorageTypesText",label:"Storage Type stock",value:r=>r.physicalStorageTypesText},
  {key:"shelfLifeExpirationDatesText",label:"Vencimiento",value:r=>r.shelfLifeExpirationDatesText},
  {key:"goodsReceiptDatesText",label:"Goods Receipt Date",value:r=>r.goodsReceiptDatesText},
  {key:"goodsReceiptTimesText",label:"Goods Receipt Time",value:r=>r.goodsReceiptTimesText},
  {key:"stockStatus",label:"Estado stock",value:r=>r.stockStatus,cell:r=>stockStatusBadge(r.stockStatus)},
  {key:"assignmentMode",label:"Tipo asignación",value:r=>r.assignmentMode,cell:r=>modeBadge(r.assignmentMode)},
  {key:"assignedBinsText",label:"Ubicaciones del producto",value:r=>r.assignedBinsText,cell:r=>`<span class="text-mono text-clamp">${esc(r.assignedBinsText)||"—"}</span>`},
  {key:"handlingUnitsText",label:"Handling Units",value:r=>r.handlingUnitsText,cell:r=>`<span class="text-mono text-clamp">${esc(r.handlingUnitsText)||"—"}</span>`},
  {key:"physicalHuCount",label:"Cant. HUs",value:r=>r.physicalHuCount,cell:r=>fmtNumber(r.physicalHuCount)},
  {key:"physicalQty",label:"Cantidad stock",value:r=>r.physicalQty,cell:r=>`<b>${fmtNumber(r.physicalQty)}</b>`},
  {key:"minQty",label:"Mín.",value:r=>r.minQty,cell:r=>fmtNumber(r.minQty)},
  {key:"maxQty",label:"Máx.",value:r=>r.maxQty,cell:r=>fmtNumber(r.maxQty)}
];

function tablePref(name, columns) {
  const saved = state.tablePrefs[name] || {};
  const keys = columns.map(c=>c.key);
  const order = [...(saved.order||[]).filter(k=>keys.includes(k)), ...keys.filter(k=>!(saved.order||[]).includes(k))];
  const hidden = new Set((saved.hidden||[]).filter(k=>keys.includes(k)));
  return {order,hidden};
}
function saveTablePref(name,pref) {
  state.tablePrefs[name] = {order:[...pref.order],hidden:[...pref.hidden]};
  localStorage.setItem(STORE.tablePrefs,JSON.stringify(state.tablePrefs));
}
function orderedColumns(name, columns) {
  const pref=tablePref(name,columns), map=new Map(columns.map(c=>[c.key,c]));
  return pref.order.filter(k=>!pref.hidden.has(k)).map(k=>map.get(k)).filter(Boolean);
}
function sortRows(rows, sort, columns) {
  if(!sort?.key||!sort?.dir)return [...rows];
  const col=columns.find(c=>c.key===sort.key); if(!col)return [...rows];
  return [...rows].sort((a,b)=>{
    const av=(col.sort||col.value)(a), bv=(col.sort||col.value)(b);
    const na=typeof av==="number", nb=typeof bv==="number";
    const cmp=na&&nb?(av-bv):naturalCompare(av,bv);
    return sort.dir==="asc"?cmp:-cmp;
  });
}
function renderTargetTable(target){
  if(target==="master")renderMasterTable();
  else if(target==="audit")renderDiscrepancyTable();
  else if(target==="assignment")renderAssignmentTable();
}
function cycleSort(target,key) {
  const sort=target==="master"?state.masterSort:target==="audit"?state.auditSort:state.assignmentSort;
  if(sort.key!==key){sort.key=key;sort.dir="asc";}
  else if(sort.dir==="asc")sort.dir="desc";
  else if(sort.dir==="desc"){sort.key=null;sort.dir=null;}
  else sort.dir="asc";
  if(target==="master")state.page=1;else if(target==="audit")state.auditPage=1;else state.assignmentPage=1;
  renderTargetTable(target);
}
function renderTableHead(target, columns, headId, menuId, sort) {
  const pref=tablePref(target,columns), map=new Map(columns.map(c=>[c.key,c]));
  const visible=pref.order.filter(k=>!pref.hidden.has(k)).map(k=>map.get(k)).filter(Boolean);
  $(headId).innerHTML=visible.map(col=>{
    const active=sort.key===col.key, icon=!active||!sort.dir?"chevrons-up-down":sort.dir==="asc"?"arrow-up":"arrow-down";
    return `<th draggable="true" data-col-key="${esc(col.key)}"><div class="table-th"><i class="drag-grip" data-lucide="grip-vertical"></i><button class="sort-btn ${active?"active":""}" data-sort-target="${target}" data-sort-key="${esc(col.key)}">${esc(col.label)}<i class="sort-icon" data-lucide="${icon}"></i></button></div></th>`;
  }).join("");
  $(menuId).innerHTML=`<div class="column-menu-head"><b>Columnas visibles</b><button class="btn-app btn-sm-app" data-reset-columns="${target}">Restablecer</button></div>${pref.order.map(key=>{const col=map.get(key);return `<label class="column-option"><input type="checkbox" data-column-toggle="${target}" value="${esc(key)}" ${pref.hidden.has(key)?"":"checked"}/><span>${esc(col.label)}</span></label>`;}).join("")}`;
  bindTableHeadInteractions(target,columns,headId,menuId);
}
