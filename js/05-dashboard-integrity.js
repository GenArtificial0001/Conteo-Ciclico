"use strict";

function allAudits(){return Object.values(state.audits).map(normalizedAudit).sort((a,b)=>String(b.savedAt).localeCompare(String(a.savedAt)));}
function auditStats(){
  const audits=allAudits(),fields=["product","hu","quantity"],labels={product:"Producto",hu:"Handling Unit",quantity:"Cantidad"};
  const conforming=audits.filter(a=>a.result==="ok").length,discrepancyRows=audits.filter(a=>a.result==="discrepancy");
  const fieldStats=Object.fromEntries(fields.map(f=>[f,{total:audits.length,ok:0}]));
  audits.forEach(a=>fields.forEach(f=>{const base=String(a.base?.[f]??"").trim(),counted=String(a.counted?.[f]??"").trim();const same=f==="quantity"?(counted!==""&&numeric(counted,Number.NaN)===numeric(base,Number.NaN)):(counted!==""&&norm(counted)===norm(base));if(a.result==="ok"||same)fieldStats[f].ok++;}));
  const assignedLocationKeys=new Set();state.assignments.forEach(asn=>state.master.filter(r=>r.aisle===asn.aisle).forEach(r=>assignedLocationKeys.add(`${asn.userId}|${asn.aisle}|${r.storageBin}`)));
  const auditedAssigned=[...assignedLocationKeys].filter(k=>state.audits[k]).length;
  const integrity=audits.length?Math.round(conforming/audits.length*100):100,completion=assignedLocationKeys.size?Math.round(auditedAssigned/assignedLocationKeys.size*100):0;
  return {audits,totalChecks:audits.length,conforming,discrepancies:discrepancyRows.length,fieldStats,discrepancyRows,integrity,completion,assignedTotal:assignedLocationKeys.size,auditedAssigned,labels};
}

function renderDashboard(){
  const s=auditStats();
  $("kpiLocations").textContent=fmtNumber(state.master.length);$("kpiAssigned").textContent=fmtNumber(state.master.filter(r=>r.assignments.length).length);$("kpiBlocked").textContent=fmtNumber(state.master.filter(r=>r.removalBlock||r.putawayBlock).length);$("kpiAudited").textContent=fmtNumber(s.audits.length);
  $("kpiIntegrityDash").textContent=`${s.integrity}%`;$("kpiDiscrepanciesDash").textContent=fmtNumber(s.discrepancies);renderDashboardCharts();
}
function chartColors(){const cs=getComputedStyle($("app"));return {text:cs.getPropertyValue("--text-muted").trim(),grid:cs.getPropertyValue("--border").trim(),primary:cs.getPropertyValue("--primary").trim(),secondary:cs.getPropertyValue("--secondary").trim(),success:cs.getPropertyValue("--success").trim(),warning:cs.getPropertyValue("--warning").trim(),danger:cs.getPropertyValue("--danger").trim(),purple:cs.getPropertyValue("--purple").trim()};}
function renderDashboardCharts(){
  const c=chartColors(),none=state.master.filter(r=>!r.removalBlock&&!r.putawayBlock).length,removal=state.master.filter(r=>r.removalBlock&&!r.putawayBlock).length,putaway=state.master.filter(r=>!r.removalBlock&&r.putawayBlock).length,both=state.master.filter(r=>r.removalBlock&&r.putawayBlock).length;
  if(state.charts.status)state.charts.status.destroy();state.charts.status=new Chart($("statusChart"),{type:"doughnut",data:{labels:["Disponible","Removal","Putaway","Ambos"],datasets:[{data:[none,removal,putaway,both],backgroundColor:[c.success,c.warning,c.primary,c.danger],borderWidth:0,hoverOffset:6}]},options:{maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{color:c.text,usePointStyle:true,padding:18}}}}});
  const aisles=uniqueSorted(state.master.map(r=>r.aisle)).slice(0,12),doneBy=Object.fromEntries(aisles.map(a=>[a,new Set()]));allAudits().forEach(a=>{if(doneBy[a.aisle])doneBy[a.aisle].add(a.storageBin)});
  if(state.charts.aisle)state.charts.aisle.destroy();state.charts.aisle=new Chart($("aisleChart"),{type:"bar",data:{labels:aisles,datasets:[{label:"Controladas",data:aisles.map(a=>doneBy[a].size),backgroundColor:c.primary,borderRadius:7}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:c.text},grid:{display:false}},y:{beginAtZero:true,ticks:{color:c.text,precision:0},grid:{color:c.grid}}}}});
}

const AUDIT_COLUMNS=[
  {key:"savedAt",label:"Fecha",value:a=>a.savedAt,cell:a=>esc(nowLabel(a.savedAt))},
  {key:"userName",label:"Usuario",value:a=>a.userName},
  {key:"aisle",label:"Pasillo",value:a=>a.aisle},
  {key:"level",label:"Nivel",value:a=>a.level||""},
  {key:"stack",label:"Columna",value:a=>a.stack||""},
  {key:"storageBin",label:"Ubicación",value:a=>a.storageBin,cell:a=>`<b class="text-mono">${esc(a.storageBin)}</b>`},
  {key:"result",label:"Resultado",value:a=>a.result,cell:a=>`<span class="badge-app ${a.result==="ok"?"badge-success":"badge-danger"}">${a.result==="ok"?"OK":"Discrepancia"}</span>`},
  {key:"baseProduct",label:"Producto sistema",value:a=>a.base?.product||"",cell:a=>`<span class="text-mono text-clamp">${esc(a.base?.product)||"—"}</span>`},
  {key:"countedProduct",label:"Producto contado",value:a=>a.counted?.product||"",cell:a=>`<span class="text-mono text-clamp">${esc(a.counted?.product)||"—"}</span>`},
  {key:"baseHu",label:"HU sistema",value:a=>a.base?.hu||"",cell:a=>`<span class="text-mono text-clamp">${esc(a.base?.hu)||"—"}</span>`},
  {key:"countedHu",label:"HU contada",value:a=>a.counted?.hu||"",cell:a=>`<span class="text-mono text-clamp">${esc(a.counted?.hu)||"—"}</span>`},
  {key:"baseQty",label:"Cantidad sistema",value:a=>numeric(a.base?.quantity,0),cell:a=>fmtNumber(a.base?.quantity)},
  {key:"countedQty",label:"Cantidad contada",value:a=>numeric(a.counted?.quantity,0),cell:a=>esc(a.counted?.quantity)||"—"},
  {key:"locationScan",label:"Ubicación escaneada",value:a=>a.locationScan||"",cell:a=>`<span class="text-mono">${esc(a.locationScan)||"—"}</span>`},
  {key:"notes",label:"Observaciones",value:a=>a.notes||"",cell:a=>`<span class="text-clamp">${esc(a.notes)||"—"}</span>`}
];

function renderIntegrity(){
  const s=auditStats();$("integrityKpi").textContent=`${s.integrity}%`;$("completionKpi").textContent=`${s.completion}%`;$("discrepancyKpi").textContent=fmtNumber(s.discrepancies);$("lastAuditKpi").textContent=s.audits[0]?nowLabel(s.audits[0].savedAt):"—";
  $("scoreValue").textContent=`${s.integrity}%`;$("scoreRing").style.background=`conic-gradient(var(--success) ${s.integrity*3.6}deg, var(--bg-elevated) 0deg)`;
  $("metricBars").innerHTML=Object.entries(s.fieldStats).map(([key,v])=>{const pct=v.total?Math.round(v.ok/v.total*100):100;return `<div><div class="metric-row-head"><span>${s.labels[key]}</span><span>${pct}% · ${v.ok}/${v.total}</span></div><div class="metric-track"><div class="metric-fill" style="width:${pct}%"></div></div></div>`;}).join("");
  renderDiscrepancyTable();renderIntegrityChartsOnly();refreshIcons();
}
function renderDiscrepancyTable(){
  const rows=sortRows(auditStats().discrepancyRows,state.auditSort,AUDIT_COLUMNS),columns=orderedColumns("audit",AUDIT_COLUMNS),maxPage=Math.max(1,Math.ceil(rows.length/state.auditPageSize));state.auditPage=Math.min(state.auditPage,maxPage);const start=(state.auditPage-1)*state.auditPageSize,pageRows=rows.slice(start,start+state.auditPageSize);
  renderTableHead("audit",AUDIT_COLUMNS,"auditHead","auditColumnsMenu",state.auditSort);$("discrepancyCount").textContent=fmtNumber(rows.length);
  $("discrepancyBody").innerHTML=pageRows.length?pageRows.map(a=>`<tr>${columns.map(c=>`<td>${c.cell?c.cell(a):esc(c.value(a))||"—"}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${Math.max(1,columns.length)}"><div class="empty-state"><i data-lucide="badge-check"></i><h3>Sin discrepancias registradas</h3><p>Los hallazgos aparecerán al guardar una ubicación como Discrepancia.</p></div></td></tr>`;
  $("auditPageInfo").textContent=`Página ${state.auditPage} de ${maxPage} · ${fmtNumber(rows.length)} registros`;$("auditPrevPage").disabled=state.auditPage<=1;$("auditNextPage").disabled=state.auditPage>=maxPage;refreshIcons();
}
function renderIntegrityChartsOnly(){
  const canvas=$("integrityChart");if(!canvas)return;const c=chartColors(),audits=allAudits(),aisles=uniqueSorted(audits.map(a=>a.aisle));
  const values=aisles.map(aisle=>{const rows=audits.filter(a=>a.aisle===aisle),ok=rows.filter(a=>a.result==="ok").length;return rows.length?Math.round(ok/rows.length*100):100;});
  if(state.charts.integrity)state.charts.integrity.destroy();state.charts.integrity=new Chart(canvas,{type:"bar",data:{labels:aisles,datasets:[{label:"Integridad %",data:values,backgroundColor:c.secondary,borderRadius:7}]},options:{maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false}},scales:{x:{min:0,max:100,ticks:{color:c.text,callback:v=>`${v}%`},grid:{color:c.grid}},y:{ticks:{color:c.text},grid:{display:false}}}}});
}
function exportAudits(){
  const audits=allAudits();if(!audits.length)return toast("No hay controles para exportar.","warning");
  const rows=audits.map(a=>({Fecha:nowLabel(a.savedAt),Usuario:a.userName,Pasillo:a.aisle,Nivel:a.level||"",Columna:a.stack||"","Storage Bin":a.storageBin,Resultado:a.result==="ok"?"OK":"Discrepancia","Ubicación escaneada":a.locationScan||"","Producto sistema":a.base?.product||"","Producto contado":a.counted?.product||"","HU sistema":a.base?.hu||"","HU contada":a.counted?.hu||"","Cantidad sistema":a.base?.quantity??"","Cantidad contada":a.counted?.quantity??"",Observaciones:a.notes||""}));
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Controles");XLSX.writeFile(wb,`Controles_Inventario_${new Date().toISOString().slice(0,10)}.xlsx`);toast("Controles exportados.");
}
