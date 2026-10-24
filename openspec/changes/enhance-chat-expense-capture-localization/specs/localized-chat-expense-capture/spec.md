## Purpose

Permite registrar gastos por chat con datos verificables y con categorías presentadas en el idioma preferido de cada persona.

## ADDED Requirements

### Requirement: Fecha explícita y predeterminada del gasto
El sistema SHALL interpretar `ayer`, una fecha ISO `YYYY-MM-DD` o una fecha `D de mes [de AAAA]` dentro de un mensaje de gasto. Si el mensaje no contiene una de esas fechas, MUST asignar la fecha actual provista por el contexto de interpretación. La fecha interpretada MUST ser válida y no formar parte del concepto persistido.

#### Scenario: Fecha relativa admitida
- **WHEN** una persona envía `12.500 supermercado con débito BancoEstado ayer`
- **THEN** el gasto se prepara con la fecha del día anterior al `now` del contexto y el concepto no incluye `ayer`

#### Scenario: Fecha omitida
- **WHEN** una persona envía `2.500 pan en efectivo` sin fecha
- **THEN** el gasto se prepara con la fecha actual del contexto

#### Scenario: Fecha inválida
- **WHEN** una persona envía un gasto con una fecha explícita imposible
- **THEN** el sistema solicita aclaración de la fecha y no crea el gasto

### Requirement: Asociación verificable de banco y medio de pago
Para un gasto pagado con tarjeta o transferencia, el sistema SHALL exigir un banco que coincida con una opción de banco accesible para la cuenta financiera activa y SHALL guardar la asociación de ese banco y del medio de pago. Para efectivo, MUST guardar el medio de pago sin banco. El banco y la expresión de medio de pago MUST excluirse del concepto persistido.

#### Scenario: Tarjeta con banco configurado
- **WHEN** una persona envía `3.200 café con crédito BCI el 15 de octubre` y BCI coincide con un banco configurado
- **THEN** el gasto queda asociado al banco y al medio de pago de tarjeta, con `café` como concepto

#### Scenario: Banco ausente en tarjeta
- **WHEN** una persona envía un gasto con tarjeta sin indicar banco
- **THEN** el sistema solicita el banco y no crea el gasto

#### Scenario: Banco no reconocido
- **WHEN** una persona indica un banco que no coincide con una opción accesible
- **THEN** el sistema solicita una aclaración del banco y no crea el gasto

### Requirement: Categorías localizadas en la conversación
El sistema SHALL presentar a la IA y a la persona las categorías y subcategorías con su etiqueta correspondiente al idioma preferido de la persona (`nameEs` para español y `nameEn` para inglés), con el nombre canónico como respaldo cuando falte una traducción. MUST conservar los alias y las referencias canónicas para resolver una categoría de forma inequívoca y MUST persistir la categoría canónica seleccionada.

#### Scenario: Persona con español preferido
- **WHEN** la persona tiene `preferredLanguage` español y registra o aclara una categoría
- **THEN** la IA recibe y la conversación muestra las etiquetas en español disponibles, sin requerir que la persona use el nombre canónico en inglés

#### Scenario: Persona con inglés preferido
- **WHEN** la persona tiene `preferredLanguage` inglés y registra o aclara una categoría
- **THEN** la IA recibe y la conversación muestra las etiquetas en inglés disponibles, sin requerir que la persona use el nombre canónico en español

#### Scenario: Traducción no disponible
- **WHEN** una categoría no tiene traducción para el idioma preferido
- **THEN** la conversación usa el nombre canónico de esa categoría y conserva una resolución inequívoca
