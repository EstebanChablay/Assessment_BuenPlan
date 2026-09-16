import { events as eventsQuery, useApiQuery } from '~/api';
import { EventRecord } from '~/types';
import { EventCard } from './EventCard';

export function EventListPage() {
  const {
    data: events,
    isPending,
    isError,
    error,
  } = useApiQuery<EventRecord[]>(eventsQuery);

  if (isPending) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-ink/60">
        Cargando eventos…
      </main>
    );
  }

  if (isError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p>
          No pudimos cargar los eventos. ¿Está corriendo la API en el puerto
          8000?
        </p>
        <p className="mt-2 text-sm text-ink/60">{error.message}</p>
      </main>
    );
  }

  if (!events?.length) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        No hay eventos publicados.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Qué hacer</h1>
      <p className="mt-2 max-w-xl text-ink/70">
        Elige un evento, reserva tus entradas y completa el pago simulado.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </main>
  );
}
