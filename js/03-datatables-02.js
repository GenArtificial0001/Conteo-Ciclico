function bindTableHeadInteractions(target,columns,headId,menuId){
  $$(`[data-sort-target="${target}"]`).forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();cycleSort(target,btn.dataset.sortKey);}));
  let dragged=null;
  $$(`#${headId} th`).forEach(th=>{
    th.addEventListener("dragstart",()=>{dragged=th.dataset.colKey;th.style.opacity=".45";});
    th.addEventListener("dragend",()=>{th.style.opacity="";$$(`#${headId} th`).forEach(x=>x.classList.remove("drag-over"));});
    th.addEventListener("dragover",e=>{e.preventDefault();th.classList.add("drag-over");});
    th.addEventListener("dragleave",()=>th.classList.remove("drag-over"));
    th.addEventListener("drop",e=>{
      e.preventDefault();const over=th.dataset.colKey;if(!dragged||dragged===over)return;
      const pref=tablePref(target,columns), from=pref.order.indexOf(dragged), to=pref.order.indexOf(over);
      pref.order.splice(from,1);pref.order.splice(to,0,dragged);saveTablePref(target,pref);
      renderTargetTable(target);
    });
  });
  $$(`[data-column-toggle="${target}"]`).forEach(input=>input.addEventListener("change",()=>{
    const pref=tablePref(target,columns);input.checked?pref.hidden.delete(input.value):pref.hidden.add(input.value);
    if(pref.hidden.size>=columns.length){input.checked=true;pref.hidden.delete(input.value);return toast("Debe quedar al menos una columna visible.","warning");}
    saveTablePref(target,pref);renderTargetTable(target);
  }));
  const reset=document.querySelector(`[data-reset-columns="${target}"]`);if(reset)reset.addEventListener("click",()=>{state.tablePrefs[target]={};saveTablePref(target,tablePref(target,columns));renderTargetTable(target);});
}

function renderMaster() { state.filtered = state.filtered.length || !state.master.length ? state.filtered : [...state.master]; renderMasterTable(); }
function renderMasterTable() {
  const columns=orderedColumns("master",MASTER_COLUMNS), sorted=sortRows(state.filtered,state.masterSort,MASTER_COLUMNS);
  const maxPage=Math.max(1,Math.ceil(sorted.length/state.pageSize));state.page=Math.min(state.page,maxPage);
  const start=(state.page-1)*state.pageSize, rows=sorted.slice(start,start+state.pageSize);
  $("masterCount").textContent=fmtNumber(sorted.length);
  renderTableHead("master",MASTER_COLUMNS,"masterHead","masterColumnsMenu",state.masterSort);
  $("masterBody").innerHTML=rows.length?rows.map((r,i)=>`<tr>${columns.map(col=>`<td>${col.cell?col.cell(r,{index:start+i}):esc(col.value(r))||"—"}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${Math.max(1,columns.length)}"><div class="empty-state"><i data-lucide="database-zap"></i><h3>Sin registros para mostrar</h3><p>Importe los archivos o modifique los filtros.</p></div></td></tr>`;
  $("pageInfo").textContent=`Página ${state.page} de ${maxPage} · ${fmtNumber(sorted.length)} registros`;
  $("prevPage").disabled=state.page<=1;$("nextPage").disabled=state.page>=maxPage;
  refreshIcons();
}

function exportRows() {
  return state.filtered.map((r,index) => ({
    "N°": index+1, "Storage Bin":r.storageBin, "Pasillo":r.aisle, "Nivel":r.level, "Columna":r.stack,
    "Storage Type":r.storageType, "Storage Section":r.storageSection, "Empty Storage Bin":r.emptyStorageBin?"X":"",
    "No. of HUs SAP":r.storageNoHUs, "Fixed Stor. Bin Type":r.fixedStorBinType, "Storage Group":r.storageGroup,
    "Stock Removal Block":r.removalBlock?"X":"", "Putaway Block":r.putawayBlock?"X":"",
    "Producto asignado":r.productsText, "Descripción asignada":r.descriptionsText,
    "Producto en stock":r.stockProductsText, "Descripción stock":r.stockDescriptionsText,
    "Stock Type":r.stockTypesText, "Storage Type stock":r.physicalStorageTypesText,
    "Shelf Life Expiration Date":r.shelfLifeExpirationDatesText, "Goods Receipt Date":r.goodsReceiptDatesText, "Goods Receipt Time":r.goodsReceiptTimesText,
    "Estado stock":r.stockStatus, "Tipo de asignación":r.assignmentMode, "Ubicaciones del producto":r.assignedBinsText,
    "Handling Units":r.handlingUnitsText, "Cantidad de HUs":r.physicalHuCount, "Cantidad stock":r.physicalQty,
    "Cantidad mínima":r.minQty, "Cantidad máxima":r.maxQty
  }));
}

function exportXlsx() {
  if (!state.filtered.length) return toast("No hay datos para exportar.", "warning");
  const ws = XLSX.utils.json_to_sheet(exportRows());
  ws["!freeze"] = { xSplit:0, ySplit:1 };
  ws["!cols"] = [5,17,9,9,7,14,15,17,14,19,14,18,16,24,36,24,36,12,18,20,18,18,20,17,55,42,12,14,12,12].map(wch => ({wch}));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Ubicaciones");
  XLSX.writeFile(wb,`Maestro_Ubicaciones_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast("Archivo Excel generado.");
}
function exportPdf() {
  if (!state.filtered.length) return toast("No hay datos para exportar.", "warning");
  loading(true,"Generando PDF",`Preparando ${fmtNumber(state.filtered.length)} ubicaciones...`);
  setTimeout(() => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a2" });
      doc.setFontSize(15); doc.text("Sistema de Control de Inventario - Maestro de Ubicaciones", 14, 13);
      doc.setFontSize(8); doc.text(`Generado: ${new Date().toLocaleString("es-AR")} · Registros: ${state.filtered.length}`,14,19);
      const body = state.filtered.map((r,i) => [
        i+1,r.storageBin,r.aisle,r.level,r.stack,r.storageType,r.storageSection,r.emptyStorageBin?"X":"",r.storageNoHUs,r.fixedStorBinType,r.storageGroup||"",
        r.removalBlock?"X":"",r.putawayBlock?"X":"",r.productsText,r.descriptionsText,r.stockProductsText,r.stockDescriptionsText,r.stockTypesText,r.physicalStorageTypesText,
        r.shelfLifeExpirationDatesText,r.goodsReceiptDatesText,r.goodsReceiptTimesText,r.stockStatus,r.assignmentMode,r.assignedBinsText,r.handlingUnitsText,r.physicalHuCount,r.physicalQty,r.minQty,r.maxQty
      ]);
      doc.autoTable({ startY:23, head:[["#","Storage Bin","Pasillo","Nivel","Col.","Storage Type","Section","Empty","HUs SAP","Fixed Bin Type","Group","Removal","Putaway","Producto asignado","Descripción asignada","Producto stock","Descripción stock","Stock Type","Storage Type stock","Vencimiento","GR Date","GR Time","Estado","Asignación","Ubicaciones producto","Handling Units","Cant. HU","Cantidad","Mín.","Máx."]], body,
        styles:{fontSize:4.15,cellPadding:.65,overflow:"linebreak"}, headStyles:{fillColor:[29,75,135],fontSize:4.25}, alternateRowStyles:{fillColor:[241,245,249]},
        columnStyles:{
          0:{cellWidth:6},1:{cellWidth:21},2:{cellWidth:9},3:{cellWidth:8},4:{cellWidth:8},5:{cellWidth:13},6:{cellWidth:13},7:{cellWidth:9},8:{cellWidth:9},9:{cellWidth:14},10:{cellWidth:10},11:{cellWidth:10},12:{cellWidth:10},
          13:{cellWidth:28},14:{cellWidth:38},15:{cellWidth:28},16:{cellWidth:38},17:{cellWidth:10},18:{cellWidth:14},19:{cellWidth:17},20:{cellWidth:15},21:{cellWidth:15},22:{cellWidth:18},23:{cellWidth:15},24:{cellWidth:48},25:{cellWidth:55},26:{cellWidth:9},27:{cellWidth:12},28:{cellWidth:11},29:{cellWidth:11}
        }, margin:{left:8,right:8,bottom:10},
        didDrawPage: data => { doc.setFontSize(7); doc.text(`Página ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.width-22, doc.internal.pageSize.height-5); }
      });
      doc.save(`Maestro_Ubicaciones_${new Date().toISOString().slice(0,10)}.pdf`); toast("PDF generado.");
    } catch (e) { console.error(e); toast("No fue posible generar el PDF.","error"); }
    finally { loading(false); }
  },60);
}
