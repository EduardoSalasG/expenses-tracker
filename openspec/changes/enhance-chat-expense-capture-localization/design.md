## Context

El flujo inbound combina un intérprete determinista y un proveedor de IA. El parser actual extrae monto, concepto, cuotas y medio de pago, pero no la fecha del gasto. La selección de pago ya puede normalizar y vincular bancos configurados mediante alias. El proveedor de IA recibe `preferredLanguage`, pero entrega la lista de categorías con `name` como nombre principal y le exige devolver ese valor canónico; las etiquetas conversacionales posteriores también usan el nombre canónico.

## Goals / Non-Goals

**Goals:**

- Propagar una fecha de gasto validada hasta la creación del registro, usando el reloj inyectado para resultados deterministas.
- Reutilizar los catálogos accesibles de banco y medio de pago para impedir asociaciones ambiguas.
- Separar en el contrato de IA la etiqueta localizada de la referencia canónica de categoría.
- Mantener la interpretación determinista y la de IA alineadas.

**Non-Goals:**

- Interpretar expresiones relativas distintas de `ayer` ni fechas en otros formatos.
- Crear bancos, medios de pago o categorías desde un mensaje de gasto incompleto.
- Cambiar el esquema de base de datos, la API pública o las traducciones existentes.

## Decisions

### Contrato de fecha como dato ISO

El mensaje interpretado incorporará una fecha de gasto opcional normalizada a `YYYY-MM-DD`. El caso de uso aplicará la fecha actual del contexto solo si esa propiedad está ausente; una fecha explícita inválida genera confirmación. Se elegirá este contrato sobre almacenar texto de fecha porque conserva una única representación para ambos intérpretes y para la entidad de gasto.

### Banco obligatorio fuera de efectivo

Antes de crear un gasto no efectivo, el caso de uso resolverá el banco textual contra las opciones accesibles y requerirá una coincidencia. Reutiliza el servicio de selección existente para asignar `bankOptionId`, normalizar el nombre y resolver alias. Se descarta guardar un banco textual no asociado: permitiría gastos aparentemente válidos pero sin la relación solicitada.

### Presentación localizada con salida canónica

El payload de categorías para IA incluirá, por cada categoría y subcategoría, una etiqueta localizada, sus alias y una referencia canónica. El prompt pedirá interpretar etiquetas y alias según `preferredLanguage`, pero devolver solo referencias canónicas; el caso de uso seguirá siendo la autoridad que valida y persiste la selección. La alternativa de devolver etiquetas traducidas se descarta porque volvería ambigua la resolución al haber traducciones faltantes o nombres repetidos.

### Etiquetas de respuestas desde una función común

Las confirmaciones y aclaraciones de categorías usarán un formateador que selecciona `nameEs`, `nameEn` o el nombre canónico de respaldo según el idioma del usuario. Así el mismo criterio se aplica a la IA, a las confirmaciones y a las listas de opciones.

## Risks / Trade-offs

- [La IA puede devolver una etiqueta localizada en vez de la referencia canónica] → Validar la salida contra categorías, alias y referencias canónicas; solicitar aclaración si no se puede resolver.
- [Un alias de banco puede coincidir con más de una opción] → Exigir una única coincidencia y pedir aclaración ante ambigüedad.
- [La extracción de fecha o banco puede eliminar texto legítimo del concepto] → Cubrir mensajes de borde con pruebas de parser y conservar el concepto original cuando no se reconoce un patrón completo.
- [Cambios de zona horaria cerca de medianoche] → Derivar `hoy` y `ayer` del `now` inyectado por el flujo inbound, sin leer el reloj del proceso dentro del parser.

## Migration Plan

1. Desplegar el cambio sin migración, ya que la entidad de gasto y las asociaciones de catálogo existen.
2. Verificar con pruebas focalizadas que el contrato previo sin fecha conserva la fecha actual y que efectivo sigue funcionando.
3. Si se detectan falsos positivos de interpretación, revertir el cambio de aplicación; los gastos ya creados permanecen con sus asociaciones y fechas válidas.
