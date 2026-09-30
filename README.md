# Informe de trayectoria educativa · Cohorte 2016–2026 · Tolima

Aplicación de un solo archivo (`index.html`) para construir, para los **46 municipios no certificados del Tolima (sin Ibagué)**, el informe con la metodología de *«Las implicaciones de la inacción en la educación media en Colombia»* (ORE – Universidad Icesi, enero 2026; ver `docs/informe-base-ORE-2026.md`).

Se sigue a la cohorte que ingresó a **grado 1° en 2016** hasta **grado 11° en 2026**, registrando la matrícula **año por año** (2016 → 1°, 2017 → 2°, …, 2026 → 11°), y se cruza con los resultados de **Saber 11 de 2026**.

Funciona sin internet: Chart.js y SheetJS van incrustados. Los datos se guardan solo en el navegador del equipo.

## Uso

1. Abra `index.html` con doble clic (Chrome, Edge o Firefox).
2. **Datos y parámetros → Cargar archivos del SIMAT**: seleccione o arrastre juntos los archivos de cada año (2016 a 2026), en `.txt` o `.zip`, tal como salen del SIMAT (columnas `ANO`, `ESTADO`, `SECTOR`, `CODIGO_DANE_SEDE`, `DANE`, `GRADO_COD`, `PER_ID`, separadas por `;`).
   - Cada estudiante se cuenta una vez (`PER_ID`) en el municipio del código DANE de su **sede** y, para cada año, solo en el grado de la cohorte.
   - Estados que cuentan por defecto: MATRICULADO, GRADUADO y REPROBADO (se pueden cambiar); sector: todos.
   - **Revisar el municipio de las sedes**: permite corregir sedes codificadas con el municipio equivocado (por ejemplo, sedes de la I.E.T. Agroindustrial Leopoldo García, de Palocabildo, que en el SIMAT tienen código de Falan). La corrección se aplica a todos los años.
   - La aplicación no guarda datos personales: solo conteos por sede, grado, estado y sector.
3. **Matrícula año por año**: elija el año y escriba la matrícula del grado correspondiente por municipio. Puede pegar una columna copiada de Excel.
4. **Saber 11**: cargue el informe Saber 11 de la Secretaría (`.xlsx`, formato «INF_SABER_AAAA_VC_11») o escriba los conteos reales por municipio.
   - El informe no trae el % de estudiantes con niveles 3–4 **simultáneos** en las cuatro áreas (indicador ORE); la aplicación lo **estima** con un modelo normal multivariado: los cortes reproducen el % en niveles 3–4 de cada área en el Tolima y la correlación entre áreas se calibra con la calidad integral medida por el ORE para la ETC Tolima 2022–2024 (10,1 / 11,6 / 11,9 %; el modelo obtiene 10,1 / 11,5 / 12,0 %).
   - Por municipio se usan los promedios por área de cada institución, ponderados con la matrícula de 11° del SIMAT, y se ajustan al total departamental.
   - El informe Saber también sirve para detectar instituciones cuyo código DANE en el SIMAT es de otro municipio (por ejemplo, I.E.T. Lepanto e I.E. El Bosque, de Murillo, con código de Líbano; I.E.T. Leopoldo García, de Palocabildo, con código de Falan), con botones para corregirlas.
   - Los conteos reales por municipio, si se escriben, tienen prioridad sobre la estimación.
5. **Saber 11 (2026), conteos**: evaluados y estudiantes con niveles 3 o 4 simultáneamente en matemáticas, lectura crítica, ciencias naturales y sociales y ciudadanas (o el porcentaje directo).
5. **Datos y parámetros**: además, descargar/cargar plantilla Excel, exportar resultados, respaldo `.json`, datos ficticios de prueba, título, entidad y salario de referencia.
6. **Informe**: se genera automáticamente; «Imprimir / guardar PDF» produce el documento.

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
