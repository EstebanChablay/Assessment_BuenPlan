import { Link } from 'react-router';
import { formatEventWhen } from '~/lib/datetime';
import { EventRecord } from '~/types';

export type EventCardProps = {
  event: EventRecord;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="text-xs uppercase tracking-wide text-accent">{event.city}</p>
      <h2 className="mt-1 text-xl font-semibold">{event.title}</h2>
      <p className="mt-2 text-sm text-ink/70">{event.venue}</p>
      <p className="mt-1 text-sm text-ink/70">{formatEventWhen(event.startsAt)}</p>
    </Link>
  );
}
