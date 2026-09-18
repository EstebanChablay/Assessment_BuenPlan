import { Link, useParams } from 'react-router';
import { useApiQuery } from '~/api';
import { orderById } from '~/api/endpoints/orders/orderById';
import { formatUsd } from '~/lib/money';
import { Order } from '~/types';

export function ConfirmationPage() {
  const { orderId = '' } = useParams();

  const {
    data: order,
    isPending,
    isError,
  } = useApiQuery<Order>(orderById, { id: orderId }, { enabled: Boolean(orderId) });

  if (isPending) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <span
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          aria-hidden="true"
        />
        <p className="mt-4 text-ink/70">Cargando tu orden…</p>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">
          No se pudo recuperar la orden. Por favor intenta de nuevo.
        </p>
        <Link to="/" className="mt-6 inline-block text-accent underline">
          Volver a eventos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 text-xl">
            ✓
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              ¡Compra confirmada!
            </h1>
            <p className="text-sm text-ink/60">Orden #{order.id}</p>
          </div>
        </div>
        {order.buyer && (
          <div className="mt-6 rounded-xl bg-paper px-4 py-3">
            <p className="text-sm font-medium text-ink">{order.buyer.name}</p>
            <p className="text-sm text-ink/70">{order.buyer.email}</p>
          </div>
        )}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs font-medium uppercase tracking-wide text-ink/50">
              <th className="pb-2">Entrada</th>
              <th className="pb-2 text-right">Cant.</th>
              <th className="pb-2 text-right">P. Unitario</th>
              <th className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.ticketTypeId} className="border-b border-black/5">
                <td className="py-2">{item.name}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatUsd(item.unitPriceCents)}</td>
                <td className="py-2 text-right">{formatUsd(item.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink/70">Subtotal</dt>
            <dd>{formatUsd(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink/70">Cargo por servicio</dt>
            <dd>{formatUsd(order.feeCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-black/10 pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatUsd(order.totalCents)}</dd>
          </div>
        </dl>
        <div className="mt-8">
          <Link to="/" className="text-sm text-accent underline">
            ← Volver a eventos
          </Link>
        </div>
      </div>
    </main>
  );
}
