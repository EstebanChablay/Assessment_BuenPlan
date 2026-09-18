# NOTES.md

Completé la implementación del flujo de compra trabajando tanto en el backend como en el frontend, siguiendo los patrones y la estructura que ya venía usando el proyecto.

Por el lado del backend, llené los TODOs que faltaban en el servicio de órdenes (`orders.service.ts`). Me aseguré de validar que no pasen `ticketTypeId` duplicados y que las cantidades solicitadas no superen el inventario disponible ni el límite por orden antes de alterar el store. También dejé listo el descuento atómico de las entradas y el cálculo de los montos usando centavos enteros con `Math.round` para el 10% del servicio. Además, como extra implementé la lógica de expiración de 15 minutos con un temporizador que libera los asientos si no se confirman a tiempo, junto con las validaciones para evitar duplicidades o procesar IDs que no existen. En cuanto a las pruebas, amplié los tests unitarios en el spec para cubrir estas validaciones, los cálculos y el comportamiento del temporizador con mocks de tiempo.

En el frontend, creé el componente `OrderSummary` siguiendo el diseño del detalle del evento para mostrar el desglose de ítems, subtotal, cargo y total, exportándolo correctamente desde el barrel. En la `CheckoutPage`, monté el formulario con `react-hook-form` y Yup para validar los datos del comprador, conectando la secuencia de crear la orden y confirmarla con sus respectivos estados de carga. Finalmente, en la `ConfirmationPage`, usé la query correspondiente para renderizar el comprobante completo con la información de la compra.

## Qué no alcanzó

- No pude implementar los tests de propiedad en la parte del frontend porque el entorno de la aplicación web no incluía de entrada un runner configurado, y como la regla indicaba no instalar dependencias nuevas, preferí dejarlos fuera.
- La entidad de la orden solo guarda el ID del evento y no su título, por lo que en el comprobante final de confirmación se muestra el identificador técnico en lugar del nombre legible del evento.

## Qué haría diferente con más tiempo


1. Modificaría la entidad para persistir o resolver el nombre del evento junto a la orden y así mostrar un comprobante mucho más claro.
2. Mapearía los errores de la API a mensajes más amigables y descriptivos para mejorar la experiencia del usuario.