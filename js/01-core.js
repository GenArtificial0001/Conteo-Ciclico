"use strict";

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const STORE = {
  users: "inventoryPrototype.users.v1",
  assignments: "inventoryPrototype.assignments.v1",
  audits: "inventoryPrototype.audits.v2",
  theme: "inventoryPrototype.theme.v1",
  tablePrefs: "inventoryPrototype.tablePrefs.v1"
};

const DEFAULT_PAGE_SIZE = 25;
const titles = {
  dashboard: ["Dashboard", "Estado general del maestro y la auditoría de inventario."],
  import: ["Importación", "Carga y validación de los archivos SAP."],
  master: ["Maestro de ubicaciones", "Listado cruzado, filtrable, imprimible y exportable."],
  assignments: ["Asignación de pasillos", "Distribución de recorridas entre usuarios."],
  route: ["Recorrida", "Conteo cíclico secuencial: OK o Discrepancia por ubicación."],
  integrity: ["Integridad", "Indicadores de conformidad, avance y discrepancias."],
  settings: ["Configuración", "Persistencia y mantenimiento del prototipo."]
};

const state = {
  rawStorage: [], rawPhysical: [], rawFixed: [], master: [], filtered: [],
  storageFileName: "", physicalFileName: "", fixedFileName: "", page: 1, pageSize: DEFAULT_PAGE_SIZE,
  auditPage: 1, auditPageSize: DEFAULT_PAGE_SIZE, assignmentPage: 1, assignmentPageSize: DEFAULT_PAGE_SIZE,
  masterSort: { key: null, dir: null }, auditSort: { key: "savedAt", dir: "desc" }, assignmentSort: { key: "aisle", dir: "asc" },
  tablePrefs: loadJSON(STORE.tablePrefs, {}),
  users: loadJSON(STORE.users, []),
  assignments: loadJSON(STORE.assignments, []),
  audits: loadJSON(STORE.audits, loadJSON("inventoryPrototype.audits.v1", {})),
  activeRoute: null,
  charts: { status: null, aisle: null, integrity: null },
  scanner: { targetId: null, stream: null, raf: null }
};

function loadJSON(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function persist() {
  localStorage.setItem(STORE.users, JSON.stringify(state.users));
  localStorage.setItem(STORE.assignments, JSON.stringify(state.assignments));
  localStorage.setItem(STORE.audits, JSON.stringify(state.audits));
  localStorage.setItem(STORE.tablePrefs, JSON.stringify(state.tablePrefs));
}
function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[c]));
}
function trim(value) { return String(value ?? "").trim(); }
function norm(value) { return trim(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""); }
function isX(value) { return ["x","si","sí","1","true","yes"].includes(trim(value).toLowerCase()); }
function numeric(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let text = trim(value).replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!text) return fallback;
  const comma = text.lastIndexOf(","), dot = text.lastIndexOf(".");
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    text = text.replace(thousands, "").replace(decimal, ".");
  } else if (comma >= 0) {
    const parts = text.split(",");
    text = parts.length > 2 ? parts.join("") : `${parts[0]}.${parts[1] ?? ""}`;
  } else if ((text.match(/\./g) || []).length > 1) {
    const parts = text.split(".");
    const decimal = parts.pop();
    text = `${parts.join("")}.${decimal}`;
  }
  const n = Number(text);
  return Number.isFinite(n) ? n : fallback;
}
function fmtNumber(value) { return new Intl.NumberFormat("es-AR").format(value || 0); }
function naturalCompare(a, b) { return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" }); }
function uniqueSorted(values) { return [...new Set(values.filter(v => trim(v) !== ""))].sort(naturalCompare); }
function nowLabel(iso) { try { return new Date(iso).toLocaleString("es-AR"); } catch { return "—"; } }
function uid(prefix = "id") { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`; }
function initials(name) { return trim(name).split(/\s+/).slice(0,2).map(v => v[0] || "").join("").toUpperCase() || "U"; }

function toast(message, type = "success") {
  const item = document.createElement("div");
  item.className = `toast-app ${type}`;
  const icon = type === "error" ? "circle-x" : type === "warning" ? "triangle-alert" : "circle-check";
  item.innerHTML = `<i data-lucide="${icon}"></i><div>${esc(message)}</div>`;
  $("toastStack").appendChild(item); lucide.createIcons();
  setTimeout(() => item.remove(), 3800);
}
function loading(show, title = "Procesando", text = "Leyendo los archivos...") {
  $("loadingTitle").textContent = title; $("loadingText").textContent = text;
  $("loadingLayer").classList.toggle("show", show);
}
function refreshIcons() { if (window.lucide) lucide.createIcons(); }

function repairLayoutStructure() {
  const app = $("app"), main = app?.querySelector(".main-shell");
  if (!app || !main) return;
  let content = main.querySelector(".content");
  if (!content) {
    content = document.createElement("section");
    content.className = "content";
    main.appendChild(content);
  }
  ["dashboard","import","master","assignments","route","integrity","settings"].forEach(name => {
    const view = $(`view-${name}`);
    if (view && view.parentElement !== content) content.appendChild(view);
  });
}

function navigate(view) {
  $$(".view").forEach(v => v.classList.remove("active"));
  $$(".nav-link-app").forEach(v => v.classList.toggle("active", v.dataset.view === view));
  $(`view-${view}`).classList.add("active");
  $("pageTitle").textContent = titles[view][0]; $("pageSubtitle").textContent = titles[view][1];
  $("sidebar").classList.remove("mobile-open"); $("sidebarBackdrop").classList.remove("show");
  if (view === "dashboard") renderDashboard();
  if (view === "master") renderMaster();
  if (view === "assignments") renderAssignments();
  if (view === "route") renderRouteSelectors();
  if (view === "integrity") renderIntegrity();
  refreshIcons();
}

function setupNavigation() {
  $$(".nav-link-app").forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.view)));
  $$('[data-go]').forEach(btn => btn.addEventListener("click", () => navigate(btn.dataset.go)));
  $("sidebarToggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("collapsed");
    $("sidebarToggle").innerHTML = `<i data-lucide="${$("sidebar").classList.contains("collapsed") ? "panel-left-open" : "panel-left-close"}"></i>`;
    refreshIcons();
  });
  $("mobileMenu").addEventListener("click", () => { $("sidebar").classList.add("mobile-open"); $("sidebarBackdrop").classList.add("show"); });
  $("sidebarBackdrop").addEventListener("click", () => { $("sidebar").classList.remove("mobile-open"); $("sidebarBackdrop").classList.remove("show"); });
  $("fullscreenBtn").addEventListener("click", async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
    catch { toast("El navegador no permitió activar pantalla completa.", "warning"); }
  });
  const savedTheme = localStorage.getItem(STORE.theme) || "dark";
  $("themeSelect").value = savedTheme; applyTheme(savedTheme);
  $("themeSelect").addEventListener("change", e => { applyTheme(e.target.value); localStorage.setItem(STORE.theme, e.target.value); });
}
function applyTheme(theme) {
  $("app").classList.remove("theme-dark","theme-light","theme-iron");
  $("app").classList.add(`theme-${theme}`);
  setTimeout(() => { renderDashboard(); renderIntegrityChartsOnly(); }, 30);
}

function setupDropZone(zoneId, inputId, stateId, target) {
  const zone = $(zoneId), input = $(inputId), status = $(stateId);
  ["dragenter","dragover"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add("drag"); }));
  ["dragleave","drop"].forEach(ev => zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.remove("drag"); }));
  zone.addEventListener("drop", e => { if (e.dataTransfer.files[0]) receiveFile(e.dataTransfer.files[0], target, status); });
  input.addEventListener("change", e => { if (e.target.files[0]) receiveFile(e.target.files[0], target, status); });
}
function receiveFile(file, target, status) {
  if (!/\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name)) return toast("Formato no soportado. Use XLSX, XLS, XLSM, XLSB o CSV.", "error");
  if (target === "storage") state.storageFile = file;
  else if (target === "physical") state.physicalFile = file;
  else state.fixedFile = file;
  status.textContent = `${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
  status.classList.add("ready");
  toast(`${file.name} seleccionado. El nombre del archivo no condiciona la importación.`);
}
