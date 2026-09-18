## 1. Fundación de sistema financiero

- [x] 1.1 Definir tokens CSS semánticos para superficies, énfasis, estados, foco y escala sin alterar los tokens de marca existentes; verificar contraste y `prefers-reduced-motion` en `styles.css`.
- [x] 1.2 Crear componentes standalone reutilizables para tarjeta de métrica, prioridad accionable, encabezado de sección y divulgación progresiva; verificar sus pruebas ChromeHeadless aisladas.
- [x] 1.3 Migrar estados vacíos y feedback de las cuatro superficies objetivo a los componentes compartidos; verificar textos localizados, foco y build frontend.

## 2. Dashboard orientado a decisiones

- [x] 2.1 Extraer helpers puros que deriven salud financiera y prioridades desde el reporte, presupuestos, cuotas y balances ya cargados; verificar prueba roja/verde para cada prioridad.
- [x] 2.2 Reorganizar el dashboard mobile-first para mostrar salud financiera y prioridades antes de actividad y análisis; verificar orden semántico, teclado y ancho de 320 px.
- [x] 2.3 Conectar prioridades a rutas existentes con contexto mínimo y conservar alternativas textuales de Chart.js; verificar rutas, tablas accesibles y prueba del dashboard.

## 3. Navegación financiera progresiva

- [x] 3.1 Reestructurar filtros de gastos como filtro esencial más divulgación secundaria que conserva filtros aplicados y resultados; verificar pruebas de filtros, estado vacío y navegación por teclado.
- [x] 3.2 Añadir parámetros de URL validados para secciones de configuración, manteniendo cuenta activa, permisos y foco lógico; verificar pruebas de deep link y fallback seguro.
- [x] 3.3 Aplicar encabezados, estados y divulgación compartidos a categorías y configuración sin cambiar sus contratos; verificar pruebas afectadas y flujos vacíos/error.

## 4. Calidad, documentación y entrega

- [x] 4.1 Ejecutar pruebas frontend afectadas y build; verificar que no haya fallas, errores de compilación ni regresiones de localización.
- [x] 4.2 Revisar dashboard, gastos, categorías y configuración a 320 px, móvil representativo y escritorio; verificar objetivos táctiles, zoom, foco, teclado, lector de pantalla y reduced motion.
- [x] 4.3 Ejecutar detector Impeccable y `openspec validate atomic-design-system-dashboard --strict`; documentar evidencia y cualquier limitación reproducible.
