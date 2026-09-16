import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APP_STORE } from '../store/store.constants';
import { AppStore, EventRecord } from '../store/store';

@Injectable()
export class EventsService {
  constructor(@Inject(APP_STORE) private readonly store: AppStore) {}

  list(): EventRecord[] {
    return this.store.events;
  }

  getById(id: string): EventRecord {
    const event = this.store.events.find((item) => item.id === id);

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    return event;
  }
}
