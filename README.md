# Sistema de Control de Inventario — Versión 1.3

Aplicación web estática para procesar **Storage Bin**, **Physical Stock** y **Fixed Bin Assignment**, ejecutar recorridas de conteo cíclico y analizar integridad de inventario directamente en el navegador.

## Correcciones de esta versión

- Se corrigió la estructura del `main-shell`: **Integridad** y **Configuración** vuelven a renderizar dentro del contenedor principal.
- Se incorporó una rutina de reparación de estructura para impedir que una vista quede fuera de `.content` aunque el navegador reinterprete el HTML.
- El orden base del maestro y de la recorrida es **Pasillo → Nivel → Columna → Storage Bin**.
- La recorrida dejó de utilizar un checkbox por campo. Cada ubicación se registra con un único resultado: **OK** o **Discrepancia**.
- Los campos de corrección aparecen vacíos y son opcionales.
- Se agregó validación de ubicación por escaneo, sin convertir la ubicación en un campo editable.
- Se agregó lectura mediante cámara con `BarcodeDetector` cuando el navegador lo admite, con alternativa para lector USB o ingreso manual.
- El porcentaje de avance se recalcula después de guardar cada ubicación.
- Los resultados alimentan el Dashboard, Integridad, avance por asignación y registro exportable.

## Importación flexible

El sistema **no depende del nombre del archivo**, del nombre de la hoja, de la cantidad de columnas ni del orden en que estén ubicadas.

Para cada archivo se revisan automáticamente todas las hojas y las primeras 100 filas hasta encontrar la fila de títulos. La columna clave obligatoria en cada fuente es:

- `Storage Bin` en Storage Bin.
- `Storage Bin` en Physical Stock.
- `Storage Bin` en Fixed Bin Assignment.

Las columnas informativas se reconocen por encabezado y alias comunes en inglés o español. Las columnas opcionales ausentes generan una advertencia, pero no detienen el proceso.

### Storage Bin

Reconoce, entre otras: `Storage Bin`, `Storage Type`, `Storage Section`, `Empty Storage Bin`, `Stock Removal Block`, `Putaway Block`, `No. of HUs`, `Fixed Stor. Bin Type`, `Storage Group`, `Storage Bin Aisle`, `Storage Bin Level` y `Storage Bin Stack`.

### Physical Stock

Reconoce: `Storage Bin`, `Handling Unit`, `Product`, `Product Description` o `Product Short Description`, `Quantity`, `Stock Type`, `Storage Type`, `Shelf Life Expiration Date`, `Goods Receipt Date` y `Goods Receipt Time`.

### Fixed Bin Assignment

Reconoce: `Storage Bin`, `Product`, `Product Description`, `Storage Type`, `Minimum Quantity`, `Maximum Quantity`, unidades de medida, fechas y datos de creación.

## Fuentes y cruces

- **Storage Bin:** maestro e índice de todas las ubicaciones.
- **Physical Stock:** producto realmente almacenado, descripción, Handling Unit y cantidad por ubicación.
- **Fixed Bin Assignment:** producto asignado al puesto fijo, mínimos, máximos y ubicaciones múltiples.

El cruce se realiza por `Storage Bin`. Cuando Physical Stock contiene varios registros o HU para la misma ubicación, el sistema agrupa los productos, lista los HU y suma `Quantity`.

## Recorrida de conteo cíclico

Cada tarjeta presenta un grid de cuatro referencias:

1. Ubicación.
2. Producto por sistema.
3. Handling Unit por sistema.
4. Cantidad por sistema.

La ubicación puede escanearse para validación, pero no posee conformidad ni corrección propia.

### Resultados posibles

- **OK:** la ubicación está vacía tanto en sistema como físicamente, o coincide producto, HU y cantidad.
- **Discrepancia:** habilita Producto, Handling Unit, Cantidad y Observaciones. Los campos son opcionales y se guardan tal como se relevaron.

También se admite el gesto sobre la tarjeta:

- Deslizar a la derecha: registrar **OK**.
- Deslizar a la izquierda: abrir **Discrepancia**.

Los cuatro escenarios operativos cubiertos son:

- Sistema vacío y ubicación físicamente vacía.
- Sistema vacío y producto encontrado físicamente.
- Producto coincidente con diferencia de cantidad o HU.
- Coincidencia total.

## Tablas avanzadas

El Maestro de ubicaciones, Asignación de pasillos y Registro de discrepancias utilizan el estándar DataTable del proyecto:

- Paginación.
- Selector de 10, 25, 50 o 100 filas.
- Orden ascendente, descendente y sin orden desde el título.
- Reordenamiento de columnas mediante drag and drop.
- Selector de columnas visibles.
- Persistencia del orden y visibilidad en `localStorage`.
- Scroll horizontal y primera columna fija.
- Columna de acciones fija en la tabla de asignaciones.

## Indicadores

El Dashboard y el módulo Integridad muestran:

- Ubicaciones procesadas.
- Puestos con producto asignado.
- Ubicaciones bloqueadas.
- Ubicaciones controladas.
- Integridad global: registros OK / registros controlados.
- Discrepancias por ubicación.
- Avance: ubicaciones controladas / ubicaciones asignadas.
- Integridad por Producto, Handling Unit y Cantidad.
- Resultado por pasillo.

## Uso

1. Abrir `index.html` con conexión a Internet, porque las librerías se cargan desde CDN.
2. Ingresar a **Importación**.
3. Cargar los tres archivos según su contenido; el nombre puede variar.
4. Presionar **Procesar y cruzar archivos**.
5. Crear usuarios y asignar pasillos.
6. Iniciar la recorrida y registrar cada ubicación como OK o Discrepancia.
7. Revisar Dashboard e Integridad.
8. Exportar el maestro o los controles a Excel/PDF.

## Persistencia

Usuarios, asignaciones, controles, tema y configuración de columnas se guardan en `localStorage`. Los archivos SAP se procesan localmente y no salen del navegador.

## Publicación en GitHub Pages

El repositorio debe contener `index.html` en la raíz. En GitHub, activar **Settings → Pages → Deploy from a branch** y seleccionar la rama `main` y la carpeta raíz `/`.
