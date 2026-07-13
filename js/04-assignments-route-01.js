"use strict";

function renderUsers() {
  $("userList").innerHTML = state.users.length ? state.users.map(u => {
    const count = state.assignments.filter(a => a.userId === u.id).length;
    return `<div class="user-row"><div class="user-main"><div class="user-avatar">${esc(initials(u.name))}</div><div><strong>${esc(u.name)}</strong><span>${count} pasillo${count===1?"":"s"} asignado${count===1?"":"s"}</span></div></div><button class="icon-btn btn-danger-app" style="width:34px;height:34px" data-remove-user="${u.id}"><i data-lucide="x"></i></button></div>`;
  }).join("") : `<div class="empty-state"><i data-lucide="users"></i><h3>Sin usuarios</h3><p>Agregue la primera persona de control.</p></div>`;
  $("assignmentUser").innerHTML = `<option value="">Seleccionar</option>${state.users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}`;
  $("routeUser").innerHTML = `<option value="">Seleccionar</option>${state.users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join("")}`;
  $$('[data-remove-user]').forEach(b => b.addEventListener("click", () => removeUser(b.dataset.removeUser)));
  refreshIcons();
}
function addUser() {
  const name = trim($("newUserName").value);
  if (!name) return toast("Ingrese el nombre del usuario.","warning");
  if (state.users.some(u => norm(u.name) === norm(name))) return toast("Ese usuario ya existe.","warning");
  state.users.push({id:uid("usr"),name}); $("newUserName").value=""; persist(); renderAssignments(); renderRouteSelectors(); toast("Usuario agregado.");
}
function removeUser(id) {
  const user = state.users.find(u => u.id === id); if (!user) return;
  if (!confirm(`¿Eliminar a ${user.name} y sus asignaciones? Los controles históricos se conservarán.`)) return;
  state.users = state.users.filter(u=>u.id!==id); state.assignments = state.assignments.filter(a=>a.userId!==id); persist(); renderAssignments(); renderRouteSelectors();
}
function assignAisle() {
  const userId=$("assignmentUser").value, aisle=$("assignmentAisle").value;
  if (!userId || !aisle) return toast("Seleccione usuario y pasillo.","warning");
  if (state.assignments.some(a=>a.userId===userId && a.aisle===aisle)) return toast("El pasillo ya está asignado a ese usuario.","warning");
  state.assignments.push({id:uid("asn"),userId,aisle,createdAt:new Date().toISOString()}); persist(); renderAssignments(); renderRouteSelectors(); toast("Pasillo asignado.");
}
function assignmentProgress(asn) {
  const locations = state.master.filter(r=>r.aisle===asn.aisle);
  if (!locations.length) return {done:0,total:0,pct:0};
  const done = locations.filter(r=>state.audits[`${asn.userId}|${asn.aisle}|${r.storageBin}`]).length;
  return {done,total:locations.length,pct:Math.round(done/locations.length*100)};
}
const ASSIGNMENT_COLUMNS=[
  {key:"userName",label:"Usuario",value:a=>a.userName,cell:a=>`<b>${esc(a.userName)}</b>`},
  {key:"aisle",label:"Pasillo",value:a=>a.aisle,cell:a=>`<span class="badge-app badge-primary">${esc(a.aisle)}</span>`},
  {key:"total",label:"Ubicaciones",value:a=>a.total,cell:a=>fmtNumber(a.total)},
  {key:"progress",label:"Avance",value:a=>a.pct,cell:a=>`<b>${a.pct}%</b> <span class="text-muted">(${a.done}/${a.total})</span>`},
  {key:"createdAt",label:"Asignada el",value:a=>a.createdAt||"",cell:a=>a.createdAt?esc(nowLabel(a.createdAt)):"—"},
  {key:"actions",label:"Acción",value:a=>a.id,cell:a=>`<button class="btn-app btn-sm-app btn-danger-app" data-remove-assignment="${a.id}"><i data-lucide="trash-2"></i></button>`}
];
function assignmentRows(){return state.assignments.map(a=>{const user=state.users.find(u=>u.id===a.userId),p=assignmentProgress(a);return {...a,userName:user?.name||"Usuario eliminado",...p};});}
function renderAssignmentTable(){
  const all=sortRows(assignmentRows(),state.assignmentSort,ASSIGNMENT_COLUMNS),columns=orderedColumns("assignment",ASSIGNMENT_COLUMNS),maxPage=Math.max(1,Math.ceil(all.length/state.assignmentPageSize));state.assignmentPage=Math.min(state.assignmentPage,maxPage);const start=(state.assignmentPage-1)*state.assignmentPageSize,rows=all.slice(start,start+state.assignmentPageSize);
  renderTableHead("assignment",ASSIGNMENT_COLUMNS,"assignmentHead","assignmentColumnsMenu",state.assignmentSort);$("assignmentCount").textContent=fmtNumber(all.length);
  $("assignmentBody").innerHTML=rows.length?rows.map(a=>`<tr>${columns.map(c=>`<td>${c.cell?c.cell(a):esc(c.value(a))||"—"}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${Math.max(1,columns.length)}"><div class="empty-state"><i data-lucide="route-off"></i><h3>Sin pasillos asignados</h3><p>Cargue el maestro y cree una asignación.</p></div></td></tr>`;
  $("assignmentPageInfo").textContent=`Página ${state.assignmentPage} de ${maxPage} · ${fmtNumber(all.length)} registros`;$("assignmentPrevPage").disabled=state.assignmentPage<=1;$("assignmentNextPage").disabled=state.assignmentPage>=maxPage;
  $$('[data-remove-assignment]').forEach(b=>b.addEventListener("click",()=>{state.assignments=state.assignments.filter(a=>a.id!==b.dataset.removeAssignment);persist();renderAssignments();renderRouteSelectors();}));refreshIcons();
}
function renderAssignments(){renderUsers();renderAssignmentTable();}

function renderRouteSelectors() {
  const userId=$("routeUser").value;
  const aisles=state.assignments.filter(a=>a.userId===userId).map(a=>a.aisle).sort(naturalCompare);
  $("routeAisle").innerHTML=userId?`<option value="">Seleccionar</option>${aisles.map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join("")}`:`<option value="">Seleccionar usuario</option>`;
  refreshIcons();
}
function startRoute() {
  const userId=$("routeUser").value,aisle=$("routeAisle").value;
  if(!userId||!aisle)return toast("Seleccione usuario y pasillo asignado.","warning");
  const rows=state.master.filter(r=>r.aisle===aisle).sort((a,b)=>naturalCompare(a.level,b.level)||naturalCompare(a.stack,b.stack)||naturalCompare(a.storageBin,b.storageBin));
  if(!rows.length)return toast("El pasillo no contiene ubicaciones en el maestro actual.","warning");
  let index=rows.findIndex(r=>!state.audits[`${userId}|${aisle}|${r.storageBin}`]);if(index<0)index=0;
  state.activeRoute={userId,aisle,rows,index};renderRouteCard();
}
function currentAuditKey(){const ar=state.activeRoute,row=ar.rows[ar.index];return `${ar.userId}|${ar.aisle}|${row.storageBin}`;}
function normalizedAudit(a={}){
  if(a.result)return a;
  const fields=["product","hu","quantity"], legacyOk=fields.every(f=>Boolean(a.checks?.[f])&&String(a.values?.[f]??"").trim()===String(a.base?.[f]??"").trim());
  return {...a,result:legacyOk?"ok":"discrepancy",counted:{product:a.values?.product??"",hu:a.values?.hu??"",quantity:a.values?.quantity??""}};
}
function routeBase(row){return {product:row.stockProductsText||"VACÍA / SIN STOCK",hu:row.handlingUnitsText||"SIN HU",quantity:row.physicalQty};}
