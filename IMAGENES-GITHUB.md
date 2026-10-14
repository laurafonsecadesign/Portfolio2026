# Imágenes del portfolio — incorporación a GitHub

Esta rama prepara las galerías de los cuatro proyectos (inglés y español) y las tarjetas de inicio para el paquete `portfolio-github-imagenes-actualizadas.zip`.

## Archivos por proyecto

| Carpeta | Imágenes de galería |
| --- | ---: |
| `assets/images/applaws/` | 17 |
| `assets/images/palocleves/` | 11 |
| `assets/images/dicho-y-hecho/` | 13 |
| `assets/images/nogue/` | 13 |

**En total: 54 imágenes de galería + 2 imágenes estáticas** para los casos de movimiento reducido. Las 2 animaciones mantienen el movimiento en formato WebP animado, más ligero que los GIF originales.

## Importante: los archivos de imagen aún no están incluidos en esta rama

1. Descarga y **descomprime** el ZIP preparado en ChatGPT.
2. Abre el repositorio en GitHub, elige la rama `actualizar-galerias-54-imagenes`.
3. Dentro de esa rama, ve a `assets/images/` y elige **Add file → Upload files**.
4. Arrastra las cuatro carpetas de proyecto extraídas del ZIP (no subas el archivo ZIP comprimido).
5. Guarda los cambios **en esta misma rama**, conservando el contenido anterior de `assets/images/`, `assets/fonts/` y `assets/documents/`.
6. Comprueba que existan los 56 archivos nuevos en sus 4 carpetas y que no haya rutas rotas. Después, fusiona la pull request con `main` para publicarlo.

Evita fusionar la rama antes de subir los archivos gráficos: las nuevas rutas darían errores 404 en la web.
