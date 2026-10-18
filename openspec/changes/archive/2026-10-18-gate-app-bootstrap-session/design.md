## Context

El componente raíz expone actualmente el router de inmediato. Los guards redirigen según el token almacenado, mientras que la renovación de sesión sólo se intenta como recuperación de una solicitud autenticada. Véase `proposal.md` para la motivación y el delta spec para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Resolver el estado de sesión una vez antes de la primera navegación visible.
- Evitar cualquier contenido de ruta antes de que finalice esa resolución.
- Ofrecer una espera con marca neutra, accesible y respetuosa de reducción de movimiento.

**Non-Goals:**

- No modificar el protocolo de refresh, persistencia de tokens ni los contratos del backend.
- No añadir demoras artificiales después de que la navegación ya sea visible.

## Decisions

- El servicio de autenticación expondrá un estado de bootstrap y una operación idempotente que, cuando exista refresh token, intentará restaurar sesión y limpiará tokens ante error. El componente raíz iniciará esa operación y será el único punto que decide renderizar loader o router. Alternativa descartada: poner la espera en cada guard, porque duplica la llamada y permite que el árbol de rutas ya se haya renderizado.
- La pantalla de carga mantendrá un mínimo de dos segundos desde el inicio y terminará cuando ambas condiciones se cumplan: sesión resuelta y mínimo visual alcanzado. Alternativa descartada: un temporizador fijo sin resolver sesión, porque puede reintroducir el destello con redes lentas.
- Los guards conservarán su contrato de autenticación tras el bootstrap. Alternativa descartada: desactivar temporalmente las rutas públicas, porque dañaría enlaces públicos y SSR.

## Risks / Trade-offs

- [Una red lenta al renovar sesión prolonga la carga] → la pantalla permanece hasta un resultado definitivo, evitando contenido incorrecto.
- [La espera mínima añade dos segundos a visitantes sin sesión] → se aplica por petición explícita para dar estabilidad visual y preparar estado inicial.
- [SSR no dispone de almacenamiento local] → la fase se completa sin intentar acceder a tokens en servidor.

## Migration Plan

1. Desplegar el cambio sólo en frontend sin migración.
2. Revertir el commit si se detecta una regresión; el protocolo de sesión y los datos persistidos quedan sin cambios.
