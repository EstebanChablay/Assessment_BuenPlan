import { Link, useParams } from 'react-router';

/**
 * TODO (frontend)
 *
 * Load the confirmed order with useApiQuery and `orderById`:
 *
 *   const { data: order, isPending, isError } = useApiQuery<Order>(
 *     orderById,
 *     { id: orderId },
 *     { enabled: Boolean(orderId) },
 *   );
 *
 * Show event / ticket lines, buyer name and email, and total paid.
 * Handle loading and not-found states. Reuse formatUsd.
 */
export function ConfirmationPage() {
  const { orderId = '' } = useParams();

  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Confirmación</h1>
      <p className="mt-3 text-ink/70">
        Orden <code>{orderId}</code>. Carga los datos reales de la API y
        muestra un comprobante simple.
      </p>
      <Link to="/" className="mt-8 inline-block text-accent">
        Volver a eventos
      </Link>
    </main>
  );
}
