import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { eventById, useApiQuery } from '~/api';
import { TicketStepper } from '~/components';
import { formatEventWhen } from '~/lib/datetime';
import { feeFromSubtotal, formatUsd } from '~/lib/money';
import { CheckoutState, EventRecord } from '~/types';

export function EventDetailPage() {
  const { eventId = '' } = useParams();
  const navigate = useNavigate();
  const {
    data: event,
    isPending,
    isError,
  } = useApiQuery<EventRecord>(
    eventById,
    { id: eventId },
    { enabled: Boolean(eventId) },
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const selected = useMemo(() => {
    if (!event) return [];

    return event.ticketTypes
      .map((type) => ({
        ticketTypeId: type.id,
        name: type.name,
        quantity: quantities[type.id] ?? 0,
        unitPriceCents: type.priceCents,
      }))
      .filter((item) => item.quantity > 0);
  }, [event, quantities]);

  const subtotalCents = selected.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const feeCents = feeFromSubtotal(subtotalCents);
  const totalCents = subtotalCents + feeCents;

  if (isPending) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-ink/60">
        Cargando evento…
      </main>
    );
  }

  if (isError || !event) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p>No encontramos este evento.</p>
        <Link to="/" className="mt-3 inline-block text-accent">
          Volver
        </Link>
      </main>
    );
  }

  const onContinue = () => {
    const state: CheckoutState = {
      eventId: event.id,
      eventTitle: event.title,
      items: selected,
    };

    navigate(`/events/${event.id}/checkout`, { state });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/" className="text-sm text-ink/60">
        ← Eventos
      </Link>
      <p className="mt-6 text-xs uppercase tracking-wide text-accent">
        {event.city}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{event.title}</h1>
      <p className="mt-2 text-ink/70">
        {event.venue} · {formatEventWhen(event.startsAt)}
      </p>
      <p className="mt-4 max-w-2xl text-ink/80">{event.description}</p>

      <section className="mt-10 grid gap-8 md:grid-cols-[1fr_280px]">
        <ul className="divide-y divide-black/10 rounded-2xl bg-white ring-1 ring-black/5">
          {event.ticketTypes.map((type) => {
            const soldOut = type.remaining === 0;
            const max = Math.min(type.remaining, type.maxPerOrder);

            return (
              <li
                key={type.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div>
                  <p className="font-medium">{type.name}</p>
                  <p className="text-sm text-ink/60">
                    {soldOut
                      ? 'Agotado'
                      : `${formatUsd(type.priceCents)} · ${type.remaining} disponibles`}
                  </p>
                </div>
                <TicketStepper
                  value={quantities[type.id] ?? 0}
                  max={max}
                  disabled={soldOut}
                  onChange={(value) =>
                    setQuantities((current) => ({
                      ...current,
                      [type.id]: value,
                    }))
                  }
                />
              </li>
            );
          })}
        </ul>

        <aside className="h-max rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <h2 className="font-semibold">Resumen</h2>
          {selected.length === 0 ? (
            <p className="mt-3 text-sm text-ink/60">
              Elige al menos una entrada.
            </p>
          ) : (
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd>{formatUsd(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Cargo por servicio</dt>
                <dd>{formatUsd(feeCents)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Total</dt>
                <dd>{formatUsd(totalCents)}</dd>
              </div>
            </dl>
          )}
          <button
            type="button"
            disabled={selected.length === 0}
            onClick={onContinue}
            className="mt-5 w-full rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            Continuar
          </button>
        </aside>
      </section>
    </main>
  );
}
