# Paginador del glosario

El catálogo incorpora controles visibles antes y después de las fichas. Los números permiten saltar de página; primera, anterior, siguiente y última permiten recorrer los extremos. Se muestra la página actual y el intervalo de resultados. Los puntos suspensivos evitan listar decenas de botones.

El selector permite 12, 24, 48 o 96 fichas por página (24 inicialmente). Cambiar búsqueda, tema, tipo o tamaño reinicia la primera página. Con cero o una página se ocultan los controles de navegación. Los controles funcionan con teclado, identifican la página actual mediante `aria-current` y colocan el foco en los resultados tras navegar. Las regiones superior e inferior tienen nombres accesibles distintos. Los temas y medidas táctiles siguen el diseño del proyecto.

La vista conserva filtrado y presentación; [AppPagination.vue](../src/shared/ui/AppPagination.vue) representa la navegación y emite la página elegida. No modifica los conceptos ni guarda preferencias nuevas. La entrega mantiene la validación de código, cobertura, integración y CI con tres navegadores. Las pruebas verifican los extremos reales del catálogo, tamaños, filtros, estado vacío, enlaces, teclado y accesibilidad.
