## MODIFIED Requirements

### Requirement: Filtros con divulgación progresiva
Las superficies de gastos SHALL mostrar el filtro esencial para el período activo y permitir abrir filtros secundarios de concepto, categoría, subcategoría dependiente, moneda, tipo de medio de pago, opción de medio de pago y banco, sin ocultar filtros aplicados ni resultados. Los filtros soportados MUST conservarse en enlaces estables y acotar los resultados a la cuenta financiera activa. Cuando haya filtros activos, la superficie MUST comunicar un resumen localizado de sus valores efectivos, incluido el período acotado, la ruta categoría / subcategoría cuando corresponda y el contexto de pago seleccionado.

#### Scenario: Aplicar filtros precisos de gasto
- **WHEN** una persona combina período, subcategoría, medio de pago, banco o texto de concepto
- **THEN** recibe sólo gastos de la cuenta activa que satisfacen todos los criterios y puede reconocer cada filtro aplicado y su valor

#### Scenario: Aplicar filtro secundario
- **WHEN** una persona abre filtros secundarios y aplica una categoría, moneda o método de pago
- **THEN** los filtros aplicados permanecen visibles con sus valores y el resultado comunica el estado vacío o la cantidad correspondiente

#### Scenario: Categoría cambia las subcategorías disponibles
- **WHEN** una persona cambia o borra la categoría seleccionada
- **THEN** la subcategoría se limita a sus hijas o se limpia si ya no pertenece a la categoría

### Requirement: Filtros precisos de ingresos
La superficie de ingresos SHALL permitir filtrar el período activo por concepto y moneda mediante divulgación progresiva semántica, conservar los filtros soportados en enlaces estables y limitar los resultados a la cuenta financiera activa. El control de divulgación MUST exponer su estado de forma nativa o mediante semántica equivalente sin requerir una interacción distinta para teclado, lector de pantalla o toque.

#### Scenario: Buscar ingreso por concepto
- **WHEN** una persona aplica texto de concepto junto con moneda y período
- **THEN** recibe sólo ingresos de la cuenta activa cuyo concepto coincide sin distinguir mayúsculas de minúsculas

#### Scenario: Abrir filtros de ingresos con tecnología asistiva
- **WHEN** una persona activa la divulgación de filtros de ingresos mediante teclado, lector de pantalla o toque
- **THEN** puede conocer si el contenido está abierto y acceder a los controles sin perder el período ni los parámetros válidos del enlace
