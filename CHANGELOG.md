# Historial de versiones

## 1.4.0 — Recorrido vertical, cámara móvil y asignaciones responsive

- La pantalla **Asignación de pasillos** se adapta a escritorio, tablet y celular.
- En pantallas pequeñas, la tabla de asignaciones se transforma en tarjetas legibles sin scroll horizontal obligatorio.
- El formulario de asignación, selector de filas, selector de columnas y paginación se apilan según el ancho disponible.
- El lector utiliza la cámara del dispositivo mediante `html5-qrcode`, priorizando la cámara trasera.
- Se mantiene el ingreso manual o mediante lector USB cuando la cámara no está disponible.
- La lectura QR completa el textbox que originó el escaneo y dispara los eventos `input` y `change`.
- La cámara se detiene y libera al cerrar el modal, cambiar de pestaña o abandonar la página.
- El orden base del maestro y de la recorrida se cambió al recorrido físico vertical por columna:
  - `H8-00-001`
  - `H8-01-A01`
  - `H8-01-001`
  - `H8-02-001`
  - `H8-03-001`
  - `H8-04-001`
  - luego continúa con `H8-00-002`, `H8-01-A02`, `H8-01-002`, etc.
- Los recursos estáticos se versionaron como `1.4.0` para invalidar la caché de GitHub Pages.

### Validaciones realizadas

- Comprobación de sintaxis JavaScript con `node --check`.
- Prueba automática del orden H8 con dos columnas completas.
- Prueba de integración con cámara simulada: selección de cámara trasera, lectura del QR, carga del textbox y cierre/liberación del escáner.
- Comprobación del marcado responsive de la tabla mediante atributos `data-label` y clases móviles.
