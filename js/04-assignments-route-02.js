function renderRouteCard(){
  const ar=state.activeRoute;if(!ar)return;
  const row=ar.rows[ar.index],user=state.users.find(u=>u.id===ar.userId),existing=state.audits[currentAuditKey()]?normalizedAudit(state.audits[currentAuditKey()]):null;
  const completed=ar.rows.filter(r=>state.audits[`${ar.userId}|${ar.aisle}|${r.storageBin}`]).length,pct=Math.round(completed/ar.rows.length*100),base=routeBase(row);
  const counted=existing?.counted||{product:"",hu:"",quantity:""},showDisc=existing?.result==="discrepancy";
  $("routeWorkspace").className="";
  $("routeWorkspace").innerHTML=`
    <div id="routeAuditCard" class="route-audit-card">
      <div id="swipeOverlay" class="swipe-overlay"><span class="ok-side">→ OK</span><span class="disc-side">DISCREPANCIA ←</span></div>
      <div class="route-card-content">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div><div class="section-kicker">${esc(user?.name||"")} · PASILLO ${esc(ar.aisle)}</div><div class="audit-location">${esc(row.storageBin)}</div><div class="audit-meta">Posición ${ar.index+1} de ${ar.rows.length} · Nivel ${esc(row.level)} · Columna ${esc(row.stack)} · ${esc(row.storageGroup||"Sin Storage Group")}</div><div class="audit-meta">Asignación fija: <b>${esc(row.productsText||"Sin asignación")}</b> · Estado sistema: <b>${esc(row.stockStatus)}</b></div></div>
          <div class="text-end route-progress-copy"><b id="routeProgressText">${pct}% completado</b><div class="text-muted">${completed}/${ar.rows.length} ubicaciones</div></div>
        </div>
        <div class="progress-track mt-3"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="reference-grid">
          <div class="reference-tile"><span class="field-label">UBICACIÓN</span><div class="reference-value text-mono">${esc(row.storageBin)}</div><div class="scan-field mt-2"><input id="routeLocationScan" class="input-app" value="${esc(existing?.locationScan||"")}" placeholder="Escanear para validar"/><button class="scan-inside" data-scan-target="routeLocationScan" title="Escanear ubicación"><i data-lucide="qr-code"></i></button></div><div id="locationScanStatus" class="mt-2 text-muted"></div></div>
          <div class="reference-tile"><span class="field-label">PRODUCTO POR SISTEMA</span><div class="reference-value text-mono">${esc(base.product)}</div></div>
          <div class="reference-tile"><span class="field-label">HANDLING UNIT POR SISTEMA</span><div class="reference-value text-mono">${esc(base.hu)}</div></div>
          <div class="reference-tile"><span class="field-label">CANTIDAD POR SISTEMA</span><div class="reference-value">${fmtNumber(base.quantity)}</div></div>
        </div>
        <div class="route-decision-actions">
          <button id="markOkBtn" class="btn-app decision-btn decision-ok ${existing?.result==="ok"?"selected":""}"><i data-lucide="circle-check-big"></i>OK</button>
          <button id="markDiscrepancyBtn" class="btn-app decision-btn decision-disc ${showDisc?"selected":""}"><i data-lucide="triangle-alert"></i>Discrepancia</button>
        </div>
        <div id="discrepancyPanel" class="discrepancy-panel ${showDisc?"show":""}">
          <div class="discrepancy-grid">
            ${countField("countedProduct","PRODUCTO ENCONTRADO",counted.product,"text")}
            ${countField("countedHu","HANDLING UNIT ENCONTRADA",counted.hu,"text")}
            ${countField("countedQuantity","CANTIDAD ENCONTRADA",counted.quantity,"number")}
          </div>
          <div><label class="field-label mt-3">OBSERVACIONES</label><textarea id="auditNotes" class="input-app" placeholder="Detalle opcional de la discrepancia...">${esc(existing?.notes||"")}</textarea></div>
          <div class="d-flex justify-content-end mt-3"><button id="saveDiscrepancyBtn" class="btn-app btn-danger-app"><i data-lucide="save"></i>Guardar discrepancia</button></div>
        </div>
        <div class="route-swipe-help">Deslice a la derecha para registrar OK · Deslice a la izquierda para abrir Discrepancia</div>
        <div class="audit-actions"><button id="routePrev" class="btn-app" ${ar.index===0?"disabled":""}><i data-lucide="arrow-left"></i>Anterior</button><button id="routeNext" class="btn-app" ${ar.index===ar.rows.length-1?"disabled":""}>Siguiente<i data-lucide="arrow-right"></i></button></div>
      </div>
    </div>`;
  $("routePrev").addEventListener("click",()=>{ar.index--;renderRouteCard();});
  $("routeNext").addEventListener("click",()=>{ar.index++;renderRouteCard();});
  $("markOkBtn").addEventListener("click",()=>commitAudit("ok"));
  $("markDiscrepancyBtn").addEventListener("click",()=>toggleDiscrepancy(true));
  $("saveDiscrepancyBtn")?.addEventListener("click",()=>commitAudit("discrepancy"));
  $("routeLocationScan").addEventListener("input",validateLocationScan);
  $$('[data-scan-target]').forEach(b=>b.addEventListener("click",()=>openScanner(b.dataset.scanTarget)));
  attachSwipeGesture();validateLocationScan();refreshIcons();
}
function countField(id,label,value,type){return `<div><label class="field-label">${esc(label)}</label><div class="scan-field"><input id="${id}" class="input-app" type="${type}" value="${esc(value??"")}" placeholder="Campo opcional"/><button class="scan-inside" data-scan-target="${id}" title="Escanear"><i data-lucide="qr-code"></i></button></div></div>`;}
function toggleDiscrepancy(show=true){$("discrepancyPanel")?.classList.toggle("show",show);$("markDiscrepancyBtn")?.classList.toggle("selected",show);if(show)setTimeout(()=>$("countedProduct")?.focus(),40);}
function validateLocationScan(){
  const input=$("routeLocationScan"),status=$("locationScanStatus");if(!input||!status||!state.activeRoute)return;
  const expected=state.activeRoute.rows[state.activeRoute.index].storageBin,value=trim(input.value);
  if(!value){status.innerHTML="<span class='text-muted'>Validación opcional por escaneo</span>";return;}
  const ok=norm(value)===norm(expected);status.innerHTML=ok?`<span class="badge-app badge-success">Ubicación validada</span>`:`<span class="badge-app badge-danger">No coincide con ${esc(expected)}</span>`;
}
function commitAudit(result){
  const ar=state.activeRoute,row=ar.rows[ar.index],user=state.users.find(u=>u.id===ar.userId),base=routeBase(row);
  const counted=result==="discrepancy"?{product:trim($("countedProduct")?.value),hu:trim($("countedHu")?.value),quantity:trim($("countedQuantity")?.value)}:{product:base.product,hu:base.hu,quantity:String(base.quantity)};
  state.audits[currentAuditKey()]={id:state.audits[currentAuditKey()]?.id||uid("aud"),userId:ar.userId,userName:user?.name||"",aisle:ar.aisle,level:row.level,stack:row.stack,storageBin:row.storageBin,result,base,counted,locationScan:trim($("routeLocationScan")?.value),reference:{assignedProduct:row.productsText||"Sin asignación",stockStatus:row.stockStatus},notes:result==="discrepancy"?trim($("auditNotes")?.value):"",savedAt:new Date().toISOString()};
  persist();toast(result==="ok"?"Ubicación registrada como OK.":"Discrepancia guardada.",result==="ok"?"success":"warning");renderDashboard();renderIntegrity();renderAssignments();
  if(ar.index<ar.rows.length-1)ar.index++;renderRouteCard();
}
function attachSwipeGesture(){
  const card=$("routeAuditCard"),overlay=$("swipeOverlay");if(!card)return;
  let startX=0,dx=0,dragging=false;
  card.addEventListener("pointerdown",e=>{if(e.target.closest("button,input,textarea,select"))return;dragging=true;startX=e.clientX;dx=0;card.setPointerCapture?.(e.pointerId);});
  card.addEventListener("pointermove",e=>{if(!dragging)return;dx=e.clientX-startX;const limited=Math.max(-130,Math.min(130,dx));card.querySelector(".route-card-content").style.transform=`translateX(${limited}px)`;overlay.classList.toggle("show",Math.abs(dx)>25);card.classList.toggle("swipe-ok",dx>55);card.classList.toggle("swipe-discrepancy",dx<-55);});
  const end=()=>{if(!dragging)return;dragging=false;card.querySelector(".route-card-content").style.transform="";overlay.classList.remove("show");card.classList.remove("swipe-ok","swipe-discrepancy");if(dx>90)commitAudit("ok");else if(dx<-90)toggleDiscrepancy(true);dx=0;};
  card.addEventListener("pointerup",end);card.addEventListener("pointercancel",end);
}

async function openScanner(targetId){
  state.scanner.targetId=targetId;$("qrModal").classList.add("show");$("qrModal").setAttribute("aria-hidden","false");$("qrManualValue").value="";$("qrManualValue").focus();
  const video=$("qrVideo");
  try{
    if(!navigator.mediaDevices?.getUserMedia||!("BarcodeDetector" in window))throw new Error("fallback");
    const formats=await BarcodeDetector.getSupportedFormats();const detector=new BarcodeDetector({formats});
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}}});state.scanner.stream=stream;video.srcObject=stream;await video.play();
    const scan=async()=>{if(!state.scanner.stream)return;try{const codes=await detector.detect(video);if(codes[0]?.rawValue){applyScanValue(codes[0].rawValue);return;}}catch{}state.scanner.raf=requestAnimationFrame(scan);};scan();
  }catch{$("qrHelp").textContent="La cámara/BarcodeDetector no está disponible. Use un lector USB o ingrese el valor manualmente.";}
}
function applyScanValue(value){const target=$(state.scanner.targetId);if(target){target.value=String(value);target.dispatchEvent(new Event("input",{bubbles:true}));}closeScanner();toast("Código capturado.");}
function closeScanner(){if(state.scanner.raf)cancelAnimationFrame(state.scanner.raf);state.scanner.raf=null;if(state.scanner.stream){state.scanner.stream.getTracks().forEach(t=>t.stop());state.scanner.stream=null;}$("qrVideo").srcObject=null;$("qrModal").classList.remove("show");$("qrModal").setAttribute("aria-hidden","true");}
