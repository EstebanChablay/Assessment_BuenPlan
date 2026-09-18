import { feeFromSubtotal, formatUsd } from '~/lib/money';
import { TicketSelection } from '~/types';

export type OrderSummaryProps = {
  items: TicketSelection[];
};

export function OrderSummary({ items }: OrderSummaryProps) {
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const feeCents = feeFromSubtotal(subtotalCents);
  const totalCents = subtotalCents + feeCents;

  return (
    <dl className="space-y-1 text-sm">
      {items.map((item) => (
        <div key={item.ticketTypeId} className="flex justify-between">
          <dt>
            {item.name} × {item.quantity}
          </dt>
          <dd>{formatUsd(item.unitPriceCents * item.quantity)}</dd>
        </div>
      ))}
      <div className="flex justify-between">
        <dt>Cargo por servicio</dt>
        <dd>{formatUsd(feeCents)}</dd>
      </div>
      <div className="flex justify-between font-semibold">
        <dt>Total</dt>
        <dd>{formatUsd(totalCents)}</dd>
      </div>
    </dl>
  );
}
