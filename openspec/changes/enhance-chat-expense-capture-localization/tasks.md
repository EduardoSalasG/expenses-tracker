## 1. Contrato e interpretación del gasto

- [x] 1.1 Extender el contrato de mensaje interpretado y el parser determinista para extraer `ayer`, `YYYY-MM-DD` y `D de mes [de AAAA]`, eliminar los fragmentos reconocidos del concepto y aplicar la fecha contextual por defecto; verificar con pruebas unitarias rojas y verdes de fechas válidas, omitidas e inválidas.
- [x] 1.2 Actualizar el proveedor de IA, sus ejemplos y el esquema de salida para producir la fecha ISO del gasto y solicitar confirmación ante fechas inválidas; verificar con pruebas del payload y de validación del intérprete.
- [x] 1.3 Reforzar la interpretación de medios de pago para distinguir efectivo de tarjeta o transferencia con banco, sin incluir banco ni medio en el concepto; verificar con pruebas de mensajes en español y alias de banco.

## 2. Persistencia y aclaraciones de pago

- [x] 2.1 Integrar la fecha interpretada en la creación de gastos del flujo inbound sin alterar el comportamiento previo cuando falta una fecha; verificar con una prueba del caso de uso que persista la fecha correcta.
- [x] 2.2 Exigir una coincidencia única de banco accesible para tarjeta o transferencia y asociar `bankOptionId` y `paymentMethodOptionId`; verificar con pruebas de coincidencia, banco ausente y banco no reconocido sin crear gastos.
- [x] 2.3 Actualizar las respuestas de confirmación o aclaración para informar la fecha y el banco resueltos en el idioma preferido; verificar los textos en español e inglés.

## 3. Categorías según idioma de usuario

- [x] 3.1 Crear un formateador reutilizable de etiquetas de categoría y subcategoría que seleccione `nameEs`, `nameEn` o el canónico de respaldo; verificar casos en español, inglés y sin traducción.
- [x] 3.2 Cambiar el payload y el prompt del proveedor de IA para proporcionar etiquetas localizadas, alias y referencias canónicas, y validar que la salida se resuelva al identificador canónico; verificar con pruebas del payload para ambos idiomas.
- [x] 3.3 Aplicar el formateador a confirmaciones, listas y aclaraciones de categoría del chat; verificar el flujo inbound para usuarios en español e inglés.

## 4. Verificación y documentación

- [x] 4.1 Ejecutar las pruebas focalizadas de parser, intérpretes, selección de pago y caso de uso inbound; verificar que pasen fuera del sandbox si Karma requiere navegador.
- [x] 4.2 Ejecutar el build del backend afectado y `openspec validate enhance-chat-expense-capture-localization --strict`; verificar que ambos finalicen sin errores.
- [x] 4.3 Actualizar la documentación de captura por chat y los ejemplos de mensajes en español e inglés; verificar que reflejen fecha predeterminada, banco obligatorio fuera de efectivo y categorías localizadas.
