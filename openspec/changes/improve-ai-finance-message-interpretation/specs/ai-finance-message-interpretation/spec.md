## Purpose

Permite registrar movimientos conversacionales con una cuenta explícita y categorías aprendidas por cuenta, manteniendo autorización estricta y aclaración obligatoria cuando la decisión no es confiable.

## ADDED Requirements

### Requirement: Cuenta financiera explícita por mensaje
El sistema SHALL aceptar un nombre de cuenta financiera dentro de un mensaje de creación de gasto o ingreso para WhatsApp y Telegram. MUST usar esa cuenta únicamente para la operación actual y MUST conservar sin cambios el contexto persistente del chat.

#### Scenario: Gasto dirigido a una cuenta compartida accesible
- **WHEN** una persona envía un gasto válido que incluye `cuenta Hogar` y tiene acceso a Hogar
- **THEN** el sistema guarda el gasto en Hogar y confirma esa cuenta sin cambiar el contexto persistente del chat

#### Scenario: Cuenta inexistente o no accesible
- **WHEN** una persona nombra una cuenta que no existe o a la que no tiene acceso
- **THEN** el sistema no guarda ningún movimiento, mantiene el contexto actual y solicita una cuenta accesible

### Requirement: Preferencias de categoría aisladas por cuenta
El sistema SHALL mantener las preferencias de categoría por cuenta financiera. MUST compartir una preferencia entre miembros de una misma cuenta compartida y MUST aislarla de todas las demás cuentas.

#### Scenario: Preferencia compartida dentro de una cuenta compartida
- **WHEN** un miembro corrige explícitamente la categoría de un concepto en una cuenta compartida
- **THEN** un mensaje equivalente de otro miembro en esa misma cuenta puede usar la preferencia aprendida

#### Scenario: Aislamiento entre cuentas
- **WHEN** existe una preferencia para un concepto en Hogar
- **THEN** el sistema no usa esa preferencia para el mismo concepto en Personal u otra cuenta compartida

### Requirement: Aprendizaje seguro de categorías
El sistema SHALL crear o actualizar una preferencia inmediatamente después de una corrección explícita. MUST crear una preferencia de consenso solo tras tres movimientos confirmados consistentes dentro de la misma cuenta y MUST conservar la corrección explícita como prioritaria.

#### Scenario: Corrección explícita inmediata
- **WHEN** una persona confirma o corrige explícitamente un concepto a una categoría o subcategoría
- **THEN** el siguiente mensaje equivalente en la misma cuenta usa esa selección automáticamente

#### Scenario: Consenso de tres movimientos
- **WHEN** tres movimientos confirmados con el mismo concepto normalizado tienen la misma categoría y subcategoría en una cuenta
- **THEN** el sistema crea una preferencia de consenso para mensajes futuros de esa cuenta

#### Scenario: Evidencia conflictiva
- **WHEN** el historial de un concepto contiene selecciones de categoría conflictivas sin una corrección explícita vigente
- **THEN** el sistema no asigna una categoría automáticamente y solicita aclaración

### Requirement: Precedencia y aclaración de categoría
El sistema SHALL resolver una categoría en este orden: categoría o subcategoría explícita, preferencia aprendida, inferencia validada. MUST conservar un borrador y pedir aclaración cuando el resultado sea ambiguo o incierto, y MUST NOT asignar automáticamente la categoría Other.

#### Scenario: Categoría explícita anula la preferencia
- **WHEN** un mensaje declara una categoría distinta de una preferencia aprendida para el mismo concepto
- **THEN** el sistema guarda la categoría declarada explícitamente

#### Scenario: Categoría no confiable
- **WHEN** el sistema no puede resolver una categoría con confianza
- **THEN** no guarda el gasto y solicita una selección de categoría o subcategoría

### Requirement: Privacidad y continuidad de interpretación
El sistema MUST NOT enviar mensajes históricos ni transacciones históricas al proveedor de IA. SHALL mantener el respaldo determinista y la validación estructurada cuando el proveedor de IA no esté configurado, falle o entregue una respuesta inválida.

#### Scenario: Proveedor de IA no disponible
- **WHEN** el proveedor de IA falla, no está configurado o devuelve datos inválidos
- **THEN** el sistema usa el intérprete determinista y aplica las mismas reglas de autorización, categoría y aclaración

### Requirement: Preservación de cuotas
El sistema SHALL conservar la detección de `N cuotas` y `Nx`. MUST usar la fecha del gasto como primera cuota cuando el mensaje no indique una fecha de primera cuota.

#### Scenario: Cuotas sin fecha explícita
- **WHEN** una persona envía un gasto válido con `3 cuotas` sin fecha de primera cuota
- **THEN** el sistema genera el plan de tres cuotas comenzando en la fecha del gasto

