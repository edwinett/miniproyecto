# Informe de trayectoria educativa · Cohorte 2016–2026 · Tolima

Aplicación de un solo archivo (`index.html`) para construir, para los **46 municipios no certificados del Tolima (sin Ibagué)**, el informe con la metodología de *«Las implicaciones de la inacción en la educación media en Colombia»* (ORE – Universidad Icesi, enero 2026; ver `docs/informe-base-ORE-2026.md`).

Se sigue a la cohorte que ingresó a **grado 1° en 2016** hasta **grado 11° en 2026**, registrando la matrícula **año por año** (2016 → 1°, 2017 → 2°, …, 2026 → 11°), y se cruza con los resultados de **Saber 11 de 2026**.

Funciona sin internet: Chart.js y SheetJS van incrustados. Los datos se guardan solo en el navegador del equipo.

## Uso

1. Abra `index.html` con doble clic (Chrome, Edge o Firefox).
2. **Matrícula año por año**: elija el año y escriba la matrícula del grado correspondiente por municipio. Puede pegar una columna copiada de Excel.
3. **Saber 11 (2026)**: evaluados y estudiantes con niveles 3 o 4 simultáneamente en matemáticas, lectura crítica, ciencias naturales y sociales y ciudadanas (o el porcentaje directo).
4. **Datos y parámetros**: descargar/cargar plantilla Excel, exportar resultados, respaldo `.json`, datos ficticios de prueba, título, entidad y salario de referencia.
5. **Informe**: se genera automáticamente; «Imprimir / guardar PDF» produce el documento.

## Indicadores

| Indicador | Cálculo |
|---|---|
| Permanencia | matrícula 11° (2026) / matrícula 1° (2016) × 100 |
| Retención anual | matrícula del año / matrícula 1° (2016) × 100 |
| Calidad | estudiantes con niveles 3–4 en las 4 áreas / evaluados × 100 |
| Cruce | permanencia × calidad / 100 |
| Cuartiles | entre los municipios con cruce disponible |

El informe compara con las referencias del ORE para la cohorte 2024: ETC Tolima (44,0 / 11,9 / 5,2), Ibagué (67,3 / 27,7 / 18,6) y Colombia (56,7 / 22,8 / 12,9).

## Desarrollo

`index.html` se genera; edite `src/app.html` y reconstruya:

```bash
npm install
npm run build
```

`build.js` incrusta las librerías convirtiendo caracteres de control y no ASCII a `\uXXXX` para que Git y Hugging Face no traten el archivo como binario.

## Publicar en Hugging Face Spaces

Cree un Space con SDK **Static** (privado por defecto), y en *Files → Add file → Upload files* suba `index.html` a la raíz.
