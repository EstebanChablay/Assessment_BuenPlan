import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { APP_STORE } from '../store/store.constants';
import { AppStore, Order } from '../store/store';

/** Service fee applied on top of the ticket subtotal. */
export const SERVICE_FEE_PERCENT = 10;

@Injectable()
export class OrdersService {
  constructor(@Inject(APP_STORE) private readonly store: AppStore) {}

  /** Map of pending release timers keyed by order id. */
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /**
   * Restores inventory for a pending order and removes it from the store.
   * Called automatically when the 15-minute hold window expires.
   */
  private releaseOrder(orderId: string): void {
    const order = this.store.orders.get(orderId);
    if (!order || order.status !== 'pending') return;

    const event = this.store.events.find((e) => e.id === order.eventId);
    if (event) {
      for (const item of order.items) {
        const ticketType = event.ticketTypes.find(
          (t) => t.id === item.ticketTypeId,
        );
        if (ticketType) {
          ticketType.remaining += item.quantity;
        }
      }
    }

    this.store.orders.delete(orderId);
    this.timers.delete(orderId);
  }

  /**
   * Creates a pending order and holds inventory.
   */
  create(dto: CreateOrderDto): Order {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Debes seleccionar al menos una localidad',
      );
    }

    const event = this.store.events.find((item) => item.id === dto.eventId);

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const seenIds = new Set<string>();
    for (const line of dto.items) {
      if (seenIds.has(line.ticketTypeId)) {
        throw new BadRequestException(
          `ticketTypeId duplicado: ${line.ticketTypeId}`,
        );
      }
      seenIds.add(line.ticketTypeId);
    }

    const items = dto.items.map((line) => {
      const ticketType = event.ticketTypes.find(
        (type) => type.id === line.ticketTypeId,
      );

      if (!ticketType) {
        throw new NotFoundException('Localidad no encontrada');
      }

      if (line.quantity > ticketType.remaining) {
        throw new BadRequestException(
          `Sin inventario suficiente para ${ticketType.name}`,
        );
      }

      if (line.quantity > ticketType.maxPerOrder) {
        throw new BadRequestException(
          `Límite por orden excedido para ${ticketType.name}`,
        );
      }

      return {
        ticketTypeId: ticketType.id,
        name: ticketType.name,
        quantity: line.quantity,
        unitPriceCents: ticketType.priceCents,
        lineTotalCents: ticketType.priceCents * line.quantity,
      };
    });
    for (const line of dto.items) {
      const ticketType = event.ticketTypes.find(
        (type) => type.id === line.ticketTypeId,
      );
      if (ticketType) {
        ticketType.remaining -= line.quantity;
      }
    }

    const subtotalCents = items.reduce(
      (sum, item) => sum + item.lineTotalCents,
      0,
    );
    const feeCents = Math.round(subtotalCents * SERVICE_FEE_PERCENT / 100);

    const order: Order = {
      id: `ord_${randomUUID()}`,
      eventId: event.id,
      status: 'pending',
      items,
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      buyer: null,
      createdAt: new Date().toISOString(),
    };

    this.store.orders.set(order.id, order);
    const timerId = setTimeout(
      () => this.releaseOrder(order.id),
      15 * 60 * 1000,
    );
    this.timers.set(order.id, timerId);

    return order;
  }

  findById(id: string): Order {
    const order = this.store.orders.get(id);

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  confirm(id: string, dto: ConfirmOrderDto): Order {
    const order = this.findById(id);
    if (order.status === 'confirmed') {
      throw new BadRequestException('La orden ya fue confirmada');
    }
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);

    order.status = 'confirmed';
    order.buyer = { name: dto.name, email: dto.email };
    return order;
  }
}
