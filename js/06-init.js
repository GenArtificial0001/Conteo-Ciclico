"use strict";

function bindEvents() {
  setupDropZone("storageDrop","storageFile","storageFileState","storage");setupDropZone("physicalDrop","physicalFile","physicalFileState","physical");setupDropZone("fixedDrop","fixedFile","fixedFileState","fixed");
  $("processBtn").addEventListener("click",processFiles);$("loadDemoBtn").addEventListener("click",loadDemo);
  ["filterSearch","filterAisle","filterGroup","filterBlock","filterAssignment","filterStock"].forEach(id=>$(id).addEventListener(id==="filterSearch"?"input":"change",applyFilters));
  $("prevPage").addEventListener("click",()=>{if(state.page>1){state.page--;renderMasterTable();}});$("nextPage").addEventListener("click",()=>{const pages=Math.ceil(state.filtered.length/state.pageSize);if(state.page<pages){state.page++;renderMasterTable();}});
  $("masterPageSize").value=String(state.pageSize);$("masterPageSize").addEventListener("change",e=>{state.pageSize=Number(e.target.value)||DEFAULT_PAGE_SIZE;state.page=1;renderMasterTable();});
  $("auditPageSize").value=String(state.auditPageSize);$("auditPageSize").addEventListener("change",e=>{state.auditPageSize=Number(e.target.value)||DEFAULT_PAGE_SIZE;state.auditPage=1;renderDiscrepancyTable();});
  $("auditPrevPage").addEventListener("click",()=>{if(state.auditPage>1){state.auditPage--;renderDiscrepancyTable();}});$("auditNextPage").addEventListener("click",()=>{const pages=Math.ceil(auditStats().discrepancyRows.length/state.auditPageSize);if(state.auditPage<pages){state.auditPage++;renderDiscrepancyTable();}});
  $("assignmentPageSize").value=String(state.assignmentPageSize);$("assignmentPageSize").addEventListener("change",e=>{state.assignmentPageSize=Number(e.target.value)||DEFAULT_PAGE_SIZE;state.assignmentPage=1;renderAssignmentTable();});
  $("assignmentPrevPage").addEventListener("click",()=>{if(state.assignmentPage>1){state.assignmentPage--;renderAssignmentTable();}});$("assignmentNextPage").addEventListener("click",()=>{const pages=Math.ceil(state.assignments.length/state.assignmentPageSize);if(state.assignmentPage<pages){state.assignmentPage++;renderAssignmentTable();}});
  [["masterColumnsBtn","masterColumnsMenu"],["auditColumnsBtn","auditColumnsMenu"],["assignmentColumnsBtn","assignmentColumnsMenu"]].forEach(([btn,menu])=>$(btn).addEventListener("click",e=>{e.stopPropagation();$(menu).classList.toggle("show");}));document.addEventListener("click",e=>{$$(".column-menu.show").forEach(menu=>{if(!menu.contains(e.target)&&!e.target.closest(".column-picker"))menu.classList.remove("show");});});
  $("exportXlsxBtn").addEventListener("click",exportXlsx);$("exportPdfBtn").addEventListener("click",exportPdf);$("printBtn").addEventListener("click",()=>window.print());
  $("addUserBtn").addEventListener("click",addUser);$("newUserName").addEventListener("keydown",e=>{if(e.key==="Enter")addUser();});$("assignBtn").addEventListener("click",assignAisle);
  $("routeUser").addEventListener("change",renderRouteSelectors);$("startRouteBtn").addEventListener("click",startRoute);$("exportAuditBtn").addEventListener("click",exportAudits);
  $("closeQrBtn").addEventListener("click",closeScanner);$("qrModal").addEventListener("click",e=>{if(e.target===$("qrModal"))closeScanner();});$("qrManualValue").addEventListener("keydown",e=>{if(e.key==="Enter"&&trim(e.target.value))applyScanValue(trim(e.target.value));});
  $("clearAuditsBtn").addEventListener("click",()=>{if(confirm("¿Borrar todos los controles guardados?")){state.audits={};localStorage.removeItem("inventoryPrototype.audits.v1");persist();renderDashboard();renderIntegrity();renderAssignments();toast("Controles eliminados.");}});
  $("clearAllBtn").addEventListener("click",()=>{if(confirm("¿Restablecer usuarios, asignaciones y controles locales?")){state.users=[];state.assignments=[];state.audits={};persist();renderAssignments();renderRouteSelectors();renderDashboard();renderIntegrity();toast("Datos locales restablecidos.");}});
}

repairLayoutStructure();setupNavigation();bindEvents();renderUsers();renderAssignments();renderRouteSelectors();renderMasterTable();renderDashboard();renderIntegrity();refreshIcons();
