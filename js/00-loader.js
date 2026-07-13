const APP_VERSION = "1.4.0";
const APP_SCRIPTS = ["js/01-core.js", "js/02-import-01.js", "js/02-import-02.js", "js/02-import-03.js", "js/03-datatables-01.js", "js/03-datatables-02.js", "js/04-assignments-route-01.js", "js/04-assignments-route-02.js", "js/05-dashboard-integrity.js", "js/05-mobile-order-camera.js", "js/06-init.js"];
(async () => {
  const host = document.getElementById('viewHost');
  try {
    const response = await fetch(`views/all.html?v=${APP_VERSION}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`No se pudo cargar views/all.html (${response.status})`);
    host.innerHTML = await response.text();
    for (const source of APP_SCRIPTS) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${source}?v=${APP_VERSION}`;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`No se pudo cargar ${source}`));
        document.body.appendChild(script);
      });
    }
  } catch (error) {
    console.error(error);
    host.innerHTML = `<div class="card-app"><h2 class="card-title">No se pudo iniciar el sistema</h2><p class="card-subtitle">Recargue con Ctrl+F5. Detalle: ${error.message}</p></div>`;
  }
})();
