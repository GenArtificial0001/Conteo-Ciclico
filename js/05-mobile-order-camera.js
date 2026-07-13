"use strict";

(() => {
  const QR_LIBRARY_URL = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
  const originalBuildMaster = window.buildMaster;

  function traversalKey(rowOrBin) {
    const row = typeof rowOrBin === "object" && rowOrBin !== null ? rowOrBin : {};
    const storageBin = trim(typeof rowOrBin === "string" ? rowOrBin : row.storageBin);
    const parts = storageBin.toUpperCase().split("-").filter(Boolean);
    const aisle = trim(row.aisle) || parts[0] || "";
    const levelRaw = trim(row.level) || parts[1] || "";
    const stackFromBin = parts.length >= 3 ? parts[parts.length - 1] : "";
    const stackRaw = (stackFromBin || trim(row.stack)).toUpperCase();
    const levelMatch = levelRaw.match(/\d+/);
    const columnMatch = stackRaw.match(/\d+/g);
    const levelNumber = levelMatch ? Number(levelMatch[0]) : Number.POSITIVE_INFINITY;
    const columnNumber = columnMatch?.length ? Number(columnMatch[columnMatch.length - 1]) : Number.POSITIVE_INFINITY;
    const alphaPrefix = (stackRaw.match(/^[A-Z]+/) || [""])[0];
    const isAlphaLevelOne = levelNumber === 1 && Boolean(alphaPrefix);
    let verticalRank;

    if (levelNumber === 0) verticalRank = 0;
    else if (isAlphaLevelOne) verticalRank = 1;
    else if (levelNumber === 1) verticalRank = 2;
    else if (Number.isFinite(levelNumber)) verticalRank = levelNumber + 1;
    else verticalRank = Number.POSITIVE_INFINITY;

    return { aisle, columnNumber, verticalRank, levelNumber, alphaPrefix, stackRaw, storageBin };
  }

  function traversalCompare(a, b) {
    const ak = traversalKey(a), bk = traversalKey(b);
    return naturalCompare(ak.aisle, bk.aisle)
      || (ak.columnNumber - bk.columnNumber)
      || (ak.verticalRank - bk.verticalRank)
      || naturalCompare(ak.alphaPrefix, bk.alphaPrefix)
      || (ak.levelNumber - bk.levelNumber)
      || naturalCompare(ak.stackRaw, bk.stackRaw)
      || naturalCompare(ak.storageBin, bk.storageBin);
  }

  window.warehouseTraversalKey = traversalKey;
  window.warehouseTraversalCompare = traversalCompare;

  if (typeof originalBuildMaster === "function") {
    window.buildMaster = function buildMasterV140(...args) {
      const rows = originalBuildMaster(...args);
      rows.sort(traversalCompare);
      return rows;
    };
  }

  window.startRoute = function startRouteV140() {
    const userId = $("routeUser").value;
    const aisle = $("routeAisle").value;
    if (!userId || !aisle) return toast("Seleccione usuario y pasillo asignado.", "warning");

    const rows = state.master
      .filter(row => norm(row.aisle) === norm(aisle))
      .sort(traversalCompare);

    if (!rows.length) return toast("El pasillo no contiene ubicaciones en el maestro actual.", "warning");
    let index = rows.findIndex(row => !state.audits[`${userId}|${aisle}|${row.storageBin}`]);
    if (index < 0) index = 0;
    state.activeRoute = { userId, aisle, rows, index };
    renderRouteCard();
  };

  window.renderAssignmentTable = function renderAssignmentTableV140() {
    const all = sortRows(assignmentRows(), state.assignmentSort, ASSIGNMENT_COLUMNS);
    const columns = orderedColumns("assignment", ASSIGNMENT_COLUMNS);
    const maxPage = Math.max(1, Math.ceil(all.length / state.assignmentPageSize));
    state.assignmentPage = Math.min(state.assignmentPage, maxPage);
    const start = (state.assignmentPage - 1) * state.assignmentPageSize;
    const rows = all.slice(start, start + state.assignmentPageSize);

    renderTableHead("assignment", ASSIGNMENT_COLUMNS, "assignmentHead", "assignmentColumnsMenu", state.assignmentSort);
    $("assignmentCount").textContent = fmtNumber(all.length);
    $("assignmentBody").innerHTML = rows.length
      ? rows.map(assignment => `<tr>${columns.map(column => `<td data-col-key="${esc(column.key)}" data-label="${esc(column.label)}">${column.cell ? column.cell(assignment) : esc(column.value(assignment)) || "—"}</td>`).join("")}</tr>`).join("")
      : `<tr class="assignment-empty-row"><td class="assignment-empty-cell" colspan="${Math.max(1, columns.length)}"><div class="empty-state"><i data-lucide="route-off"></i><h3>Sin pasillos asignados</h3><p>Cargue el maestro y cree una asignación.</p></div></td></tr>`;

    $("assignmentPageInfo").textContent = `Página ${state.assignmentPage} de ${maxPage} · ${fmtNumber(all.length)} registros`;
    $("assignmentPrevPage").disabled = state.assignmentPage <= 1;
    $("assignmentNextPage").disabled = state.assignmentPage >= maxPage;
    $$('[data-remove-assignment]').forEach(button => button.addEventListener("click", () => {
      state.assignments = state.assignments.filter(assignment => assignment.id !== button.dataset.removeAssignment);
      persist();
      renderAssignments();
      renderRouteSelectors();
    }));
    refreshIcons();
  };

  function prepareResponsiveAssignmentUi() {
    const view = $("view-assignments");
    if (!view) return;
    view.querySelector(".assignment-layout")?.classList.add("assignment-layout-v140");
    view.querySelector(".row.g-2.mb-3")?.classList.add("assignment-form-grid");
    view.querySelector(".toolbar")?.classList.add("assignment-toolbar");
    $("assignmentTable")?.closest(".table-shell")?.classList.add("assignment-table-shell");
    const routeHelp = $("routeWorkspace")?.querySelector("p");
    if (routeHelp) routeHelp.textContent = "Secuencia: por cada columna física, niveles 00 → 01-A → 01 → 02 → 03 → 04 y luego la columna siguiente.";
  }

  function ensureScannerUi() {
    const video = $("qrVideo");
    if (!video) return null;
    video.hidden = true;
    let reader = $("qrReader");
    if (!reader) {
      reader = document.createElement("div");
      reader.id = "qrReader";
      reader.className = "scan-reader";
      video.insertAdjacentElement("beforebegin", reader);
    }
    return reader;
  }

  function loadQrLibrary() {
    if (window.Html5Qrcode) return Promise.resolve(window.Html5Qrcode);
    if (state.scanner.libraryPromise) return state.scanner.libraryPromise;

    state.scanner.libraryPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-qr-library="html5-qrcode"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.Html5Qrcode), { once: true });
        existing.addEventListener("error", () => reject(new Error("No se pudo cargar el lector QR.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = QR_LIBRARY_URL;
      script.async = true;
      script.dataset.qrLibrary = "html5-qrcode";
      script.onload = () => resolve(window.Html5Qrcode);
      script.onerror = () => reject(new Error("No se pudo cargar el lector QR."));
      document.head.appendChild(script);
    }).catch(error => {
      state.scanner.libraryPromise = null;
      throw error;
    });

    return state.scanner.libraryPromise;
  }

  async function stopScannerEngine() {
    state.scanner.scanToken = (state.scanner.scanToken || 0) + 1;
    const scanner = state.scanner.instance;
    state.scanner.instance = null;
    state.scanner.processing = false;

    if (scanner) {
      try { if (scanner.isScanning) await scanner.stop(); } catch (error) { console.debug("No fue necesario detener el lector", error); }
      try { await scanner.clear(); } catch (error) { console.debug("No fue necesario limpiar el lector", error); }
    }
    if (state.scanner.raf) cancelAnimationFrame(state.scanner.raf);
    state.scanner.raf = null;
    if (state.scanner.stream) {
      state.scanner.stream.getTracks().forEach(track => track.stop());
      state.scanner.stream = null;
    }
    const video = $("qrVideo");
    if (video) video.srcObject = null;
    const reader = $("qrReader");
    if (reader) reader.innerHTML = "";
  }

  window.openScanner = async function openScannerV140(targetId) {
    await stopScannerEngine();
    state.scanner.targetId = targetId;
    state.scanner.processing = false;
    const token = state.scanner.scanToken;
    const modal = $("qrModal");
    const manual = $("qrManualValue");
    const help = $("qrHelp");
    const reader = ensureScannerUi();

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    manual.value = "";
    help.textContent = "Solicitando permiso para usar la cámara trasera…";
    if (!window.matchMedia("(pointer: coarse)").matches) manual.focus();

    try {
      if (!window.isSecureContext) throw new Error("La cámara requiere abrir el sistema mediante HTTPS.");
      await loadQrLibrary();
      if (token !== state.scanner.scanToken || !modal.classList.contains("show")) return;

      const scanner = new window.Html5Qrcode(reader.id, { verbose: false });
      state.scanner.instance = scanner;
      const readerWidth = Math.max(240, Math.min(reader.clientWidth || 360, 480));
      const qrSize = Math.max(190, Math.min(300, Math.floor(readerWidth * 0.72)));
      const config = { fps: 12, qrbox: { width: qrSize, height: qrSize }, disableFlip: false };
      const onDecoded = decodedText => {
        if (state.scanner.processing || token !== state.scanner.scanToken) return;
        state.scanner.processing = true;
        void window.applyScanValue(decodedText);
      };
      const onScanFailure = () => {};
      const cameras = await window.Html5Qrcode.getCameras();
      if (token !== state.scanner.scanToken || !modal.classList.contains("show")) return;
      const preferred = cameras.find(camera => /back|rear|environment|trasera|posterior/i.test(camera.label)) || cameras[cameras.length - 1];
      const cameraConfig = preferred?.id ? preferred.id : { facingMode: "environment" };

      await scanner.start(cameraConfig, config, onDecoded, onScanFailure);
      help.textContent = "Cámara activa. Centre el QR o código dentro del recuadro.";
    } catch (error) {
      console.error("No se pudo iniciar la cámara", error);
      await stopScannerEngine();
      if (!modal.classList.contains("show")) return;
      help.textContent = `${error.message || "No fue posible abrir la cámara."} Puede usar un lector USB o escribir el valor manualmente.`;
      manual.focus();
    }
  };

  window.applyScanValue = async function applyScanValueV140(value) {
    const target = $(state.scanner.targetId);
    if (target) {
      target.value = String(value ?? "").trim();
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await window.closeScanner();
    toast("Código capturado con la cámara.");
  };

  window.closeScanner = async function closeScannerV140() {
    await stopScannerEngine();
    $("qrModal").classList.remove("show");
    $("qrModal").setAttribute("aria-hidden", "true");
    $("qrHelp").textContent = "Apunte la cámara al código.";
  };

  Object.assign(state.scanner, { instance: null, libraryPromise: null, scanToken: 0, processing: false });
  prepareResponsiveAssignmentUi();
  ensureScannerUi();
  void loadQrLibrary().catch(error => console.warn(error.message));
  document.addEventListener("visibilitychange", () => { if (document.hidden && $("qrModal")?.classList.contains("show")) void window.closeScanner(); });
  window.addEventListener("pagehide", () => { if (state.scanner.instance || state.scanner.stream) void stopScannerEngine(); });
})();
