# Prueba técnica — BuenPlan

Hola,

En BuenPlan la gente busca eventos y compra entradas. Trabajamos en nuestro día a día con TypeScript, React y NestJS. Esta prueba es muy similar pero recortada: deberías poder hacerla en **4 horas**.

Si se te acaba el tiempo, detente. Nos interesa más ver cómo razonaste que un repo lleno de features hechas al apuro. No es necesario que agregues login, pagos reales, base de datos ni Docker. Tampoco intentes que se vea como buenplan.com.ec.

Ya se encuentran implementados el listado y detalle del evento (ahí se eligen las cantidades). Lo que falta es el checkout: pedir nombre y correo, crear la orden, confirmarla y mostrar una pantalla de agradecimiento por la compra.

La API de eventos está lista. La de órdenes está mal a propósito: no revisa inventario y el cargo de servicio sale en 0. Eso es lo que hay que corregir.

```
Listado → Detalle → Checkout → Confirmación
 listo     listo      tú            tú
```

## Para levantarlo

Node 22 y pnpm 10.

```bash
pnpm install
pnpm dev
```

La API corre en [http://localhost:8000](http://localhost:8000) y la web en [http://localhost:5173](http://localhost:5173). Si quieres comprobar la API a mano: `GET http://localhost:8000/v1/events`.

Hay pruebas unitarias. Varias van a fallar hasta que las reglas de la orden estén bien:

```bash
pnpm test
```

## Las reglas (backend)

Trabaja en `api/src/orders`. El módulo ya está armado (controller → service → un store en memoria). Edita el service, agrega helpers si hace falta, pero no reescribas el proyecto.

Cuando alguien llama a `POST /v1/orders`:

- Evento o tipo de entrada que no existe → `404`.
- Sin items, cantidad menor a 1, o el mismo `ticketTypeId` dos veces → `400`.
- Pedir más de las que quedan (`remaining`) o más del tope por orden (`maxPerOrder`) → `400`.
- Si la orden se crea, hay que bajar `remaining`. Esas entradas quedan apartadas.
- Todo el dinero es en centavos enteros. $25.00 es `2500`. Nada de `25.00` en float.
- Subtotal = precio × cantidad. Cargo = 10% del subtotal con `Math.round`. Total = subtotal + cargo.
- La orden queda `pending`.

Cuando alguien hace `POST /v1/orders/:id/confirm`:

- Hay que mandar nombre y un email válido.
- Solo se puede confirmar si sigue `pending`.
- Confirmar dos veces → `400`. No existe → `404`.

Los ejemplos de request/response están en [docs/api.md](docs/api.md).

El backend estará listo cuando `pnpm test` pase y no se pueden vender entradas que ya no hay. Si algo sale mal, asegúrate que el error se entienda; un `500` genérico no ayuda.

## El checkout (frontend)

Las pantallas que faltan están en `web/src/pages/CheckoutPage` y `web/src/pages/ConfirmationPage`.

Mira cómo están hechas las otras páginas y sigue esa patrón. Un componente nuevo = una carpeta con su archivo y un `index.ts`. Igual que `TicketStepper`.

Para leer de la API usa `useApiQuery` y los endpoints que ya hay en `web/src/api`. Para crear y confirmar, `useApiMutation`. No uses `fetch` ni `useQuery` sueltos.

```ts
const { data: events } = useApiQuery<EventRecord[]>(events);
const { data: event } = useApiQuery<EventRecord>(
  eventById,
  { id },
  { enabled: Boolean(id) }
);
```

En el checkout queremos ver:

- Nombre y correo con react-hook-form (Para validación usa Yup o Zod).
- Un resumen de la compra con las entradas, el 10% y el total, **antes** de enviar.
- Que al pagar se cree la orden, se confirme, y se vaya a `/orders/:id`.
- Si se agotó o la API mandó un 400, que se refleje en la pantalla.

No instales un design system. Si agregas dependencias, explica el motivo.

## Extra

Solo si te queda tiempo, y **una** nada más:

1. La reserva dura 15 minutos. Si no confirman, se libera el inventario.
2. Código `SAVE10`: 10% off del subtotal. El cargo se calcula sobre ese subtotal ya descontado.
3. Si se acaban las entradas mientras alguien está en checkout.

## Cómo evaluamos

Nos importa que la orden se comporte bien, que TypeScript tenga sentido y que te hayas basado en el código que ya existe (Nest, `useApiQuery`, las carpetas). Los tests que dejamos son parte de eso.

No queremos pasarelas de pago, Postgres, animaciones ni cobertura al 100%. Tampoco que inventes otra arquitectura.

Crea commits frecuentemente. En el repo agrega un archivo `NOTES.md` con la siguiente información: qué hiciste, qué no te alcanzó y qué harías distinto con más tiempo.

## Entrega

Un repo en GitHub. Si algo quedó a medias, dilo en las notas. Es mejor cuando sabemos que omitir en la revisión.
