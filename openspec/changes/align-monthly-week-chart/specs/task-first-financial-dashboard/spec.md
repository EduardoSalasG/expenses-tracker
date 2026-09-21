## MODIFIED Requirements

### Requirement: Exploración analítica secundaria y equivalente
Los gráficos SHALL permanecer disponibles después del resumen y prioridades, y MUST mantener sus alternativas textuales equivalentes, localizadas y navegables. En la vista mensual, el gráfico semanal SHALL consultar la semana calendario de lunes a domingo que contiene el primer día del mes seleccionado, en vez de la semana de la fecha actual.

#### Scenario: Consulta de datos sin interpretación visual
- **WHEN** una persona llega a un gráfico mediante teclado o lector de pantalla
- **THEN** puede acceder a su tabla de datos y entender valores, categorías y períodos sin interpretar el canvas

#### Scenario: Mes cuya primera semana cruza el límite mensual
- **WHEN** la persona selecciona un mes cuyo primer día no es lunes
- **THEN** el gráfico y su tabla muestran los siete días de la semana calendario que contiene ese primer día, incluidos los días adyacentes del otro mes y con etiquetas que indican día y mes

#### Scenario: Mes cuya primera semana está contenida en el mes
- **WHEN** la persona selecciona un mes que comienza lunes
- **THEN** el gráfico y su tabla muestran del lunes al domingo de esa primera semana sin consultar otro período
