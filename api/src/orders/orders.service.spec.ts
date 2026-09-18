import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createStore } from '../store/store';
import { APP_STORE } from '../store/store.constants';
import { OrdersService, SERVICE_FEE_PERCENT } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let store: ReturnType<typeof createStore>;

  beforeEach(async () => {
    store = createStore();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: APP_STORE, useValue: store },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('create', () => {
    it('creates a pending order with subtotal, 10% fee, and total in cents', () => {
      const order = service.create({
        eventId: 'noche-salsa',
        items: [{ ticketTypeId: 'salsa-general', quantity: 2 }],
      });

      expect(order.status).toBe('pending');
      expect(order.buyer).toBeNull();
      expect(order.items).toEqual([
        {
          ticketTypeId: 'salsa-general',
          name: 'General',
          quantity: 2,
          unitPriceCents: 2500,
          lineTotalCents: 5000,
        },
      ]);
      expect(order.subtotalCents).toBe(5000);
      expect(order.feeCents).toBe(Math.round((5000 * SERVICE_FEE_PERCENT) / 100));
      expect(order.totalCents).toBe(order.subtotalCents + order.feeCents);
      expect(order.feeCents).toBe(500);
    });

    it('computes the 10% fee with integer math (not floating-point prices)', () => {
      const order = service.create({
        eventId: 'standup-uio',
        items: [{ ticketTypeId: 'standup-mesa', quantity: 1 }],
      });

      expect(order.subtotalCents).toBe(1800);
      expect(order.feeCents).toBe(Math.round((1800 * SERVICE_FEE_PERCENT) / 100));
      expect(order.totalCents).toBe(1980);
    });

    it('decrements remaining inventory', () => {
      service.create({
        eventId: 'noche-salsa',
        items: [{ ticketTypeId: 'salsa-vip', quantity: 2 }],
      });

      const vip = store.events
        .find((event) => event.id === 'noche-salsa')
        ?.ticketTypes.find((type) => type.id === 'salsa-vip');

      expect(vip?.remaining).toBe(6);
    });

    it('rejects when a ticket type is sold out', () => {
      expect(() =>
        service.create({
          eventId: 'indie-fest',
          items: [{ ticketTypeId: 'indie-early', quantity: 1 }],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects when quantity exceeds remaining', () => {
      expect(() =>
        service.create({
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-vip', quantity: 9 }],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects when quantity exceeds maxPerOrder', () => {
      expect(() =>
        service.create({
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-vip', quantity: 3 }],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects unknown events', () => {
      expect(() =>
        service.create({
          eventId: 'missing',
          items: [{ ticketTypeId: 'salsa-general', quantity: 1 }],
        }),
      ).toThrow(NotFoundException);
    });

    it('rejects unknown ticket types', () => {
      expect(() =>
        service.create({
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'nope', quantity: 1 }],
        }),
      ).toThrow(NotFoundException);
    });

    it('rejects empty items', () => {
      expect(() =>
        service.create({
          eventId: 'noche-salsa',
          items: [],
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects duplicate ticketTypeId values', () => {
      expect(() =>
        service.create({
          eventId: 'noche-salsa',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 2 },
          ],
        }),
      ).toThrow(BadRequestException);
    });

    describe('quantity exceeds limits', () => {
      it.each([
        {
          label: 'quantity = remaining + 1 for salsa-general (remaining=40, maxPerOrder=6)',
          eventId: 'noche-salsa',
          ticketTypeId: 'salsa-general',
          quantity: 41,
          initialRemaining: 40,
        },
        {
          label: 'quantity = remaining + 1 for salsa-vip (remaining=8, maxPerOrder=2)',
          eventId: 'noche-salsa',
          ticketTypeId: 'salsa-vip',
          quantity: 9,
          initialRemaining: 8,
        },
        {
          label: 'quantity = remaining + 1 for indie-general (remaining=120, maxPerOrder=8)',
          eventId: 'indie-fest',
          ticketTypeId: 'indie-general',
          quantity: 121,
          initialRemaining: 120,
        },
        {
          label: 'quantity = remaining + 1 for standup-mesa (remaining=25, maxPerOrder=4)',
          eventId: 'standup-uio',
          ticketTypeId: 'standup-mesa',
          quantity: 26,
          initialRemaining: 25,
        },
        {
          label: 'quantity = 1 for indie-early which is sold out (remaining=0)',
          eventId: 'indie-fest',
          ticketTypeId: 'indie-early',
          quantity: 1,
          initialRemaining: 0,
        },
        {
          label: 'quantity = maxPerOrder + 1 for salsa-general (maxPerOrder=6, remaining=40)',
          eventId: 'noche-salsa',
          ticketTypeId: 'salsa-general',
          quantity: 7,
          initialRemaining: 40,
        },
        {
          label: 'quantity = maxPerOrder + 1 for standup-mesa (maxPerOrder=4, remaining=25)',
          eventId: 'standup-uio',
          ticketTypeId: 'standup-mesa',
          quantity: 5,
          initialRemaining: 25,
        },
        {
          label: 'quantity = maxPerOrder + 1 for indie-general (maxPerOrder=8, remaining=120)',
          eventId: 'indie-fest',
          ticketTypeId: 'indie-general',
          quantity: 9,
          initialRemaining: 120,
        },
      ])(
        'throws BadRequestException and leaves remaining unchanged when $label',
        ({ eventId, ticketTypeId, quantity, initialRemaining }) => {
          expect(() =>
            service.create({ eventId, items: [{ ticketTypeId, quantity }] }),
          ).toThrow(BadRequestException);

          const event = store.events.find((e) => e.id === eventId);
          const ticketType = event?.ticketTypes.find(
            (t) => t.id === ticketTypeId,
          );
          expect(ticketType?.remaining).toBe(initialRemaining);
        },
      );
    });

    describe('atomic inventory decrement', () => {
      type SingleItemScenario = {
        label: string;
        eventId: string;
        ticketTypeId: string;
        quantity: number;
        initialRemaining: number;
      };

      const singleItemScenarios: SingleItemScenario[] = [];

      for (let q = 1; q <= 6; q++) {
        singleItemScenarios.push({
          label: `salsa-general qty=${q}`,
          eventId: 'noche-salsa',
          ticketTypeId: 'salsa-general',
          quantity: q,
          initialRemaining: 40,
        });
      }

      for (let q = 1; q <= 2; q++) {
        singleItemScenarios.push({
          label: `salsa-vip qty=${q}`,
          eventId: 'noche-salsa',
          ticketTypeId: 'salsa-vip',
          quantity: q,
          initialRemaining: 8,
        });
      }

      for (let q = 1; q <= 8; q++) {
        singleItemScenarios.push({
          label: `indie-general qty=${q}`,
          eventId: 'indie-fest',
          ticketTypeId: 'indie-general',
          quantity: q,
          initialRemaining: 120,
        });
      }

      for (let q = 1; q <= 4; q++) {
        singleItemScenarios.push({
          label: `standup-mesa qty=${q}`,
          eventId: 'standup-uio',
          ticketTypeId: 'standup-mesa',
          quantity: q,
          initialRemaining: 25,
        });
      }

      it.each(singleItemScenarios)(
        'single-item: remaining decremented by exact quantity — $label',
        ({ eventId, ticketTypeId, quantity, initialRemaining }) => {
          service.create({ eventId, items: [{ ticketTypeId, quantity }] });

          const event = store.events.find((e) => e.id === eventId);
          const ticketType = event?.ticketTypes.find(
            (t) => t.id === ticketTypeId,
          );

          expect(ticketType?.remaining).toBe(initialRemaining - quantity);
        },
      );

      type MultiItemScenario = {
        label: string;
        qGeneral: number;
        qVip: number;
      };

      const multiItemScenarios: MultiItemScenario[] = [];

      for (let qGeneral = 1; qGeneral <= 6; qGeneral++) {
        for (let qVip = 1; qVip <= 2; qVip++) {
          multiItemScenarios.push({
            label: `salsa-general qty=${qGeneral} + salsa-vip qty=${qVip}`,
            qGeneral,
            qVip,
          });
        }
      }

      it.each(multiItemScenarios)(
        'multi-item: both remainings decremented atomically — $label',
        ({ qGeneral, qVip }) => {
          const initialGeneralRemaining = 40;
          const initialVipRemaining = 8;

          service.create({
            eventId: 'noche-salsa',
            items: [
              { ticketTypeId: 'salsa-general', quantity: qGeneral },
              { ticketTypeId: 'salsa-vip', quantity: qVip },
            ],
          });

          const event = store.events.find((e) => e.id === 'noche-salsa');
          const general = event?.ticketTypes.find(
            (t) => t.id === 'salsa-general',
          );
          const vip = event?.ticketTypes.find((t) => t.id === 'salsa-vip');

          expect(general?.remaining).toBe(initialGeneralRemaining - qGeneral);
          expect(vip?.remaining).toBe(initialVipRemaining - qVip);
        },
      );

      it('successive orders: remaining decrements cumulatively across multiple create() calls', () => {
        const quantities = [4, 3, 2];
        let expectedRemaining = 25;

        for (const qty of quantities) {
          service.create({
            eventId: 'standup-uio',
            items: [{ ticketTypeId: 'standup-mesa', quantity: qty }],
          });
          expectedRemaining -= qty;

          const event = store.events.find((e) => e.id === 'standup-uio');
          const mesa = event?.ticketTypes.find(
            (t) => t.id === 'standup-mesa',
          );
          expect(mesa?.remaining).toBe(expectedRemaining);
        }
      });

      it.each([
        { label: 'salsa-general qty=1 (minimum)', eventId: 'noche-salsa',  ticketTypeId: 'salsa-general', initialRemaining: 40  },
        { label: 'salsa-vip qty=1 (minimum)',     eventId: 'noche-salsa',  ticketTypeId: 'salsa-vip',     initialRemaining: 8   },
        { label: 'indie-general qty=1 (minimum)', eventId: 'indie-fest',   ticketTypeId: 'indie-general', initialRemaining: 120 },
        { label: 'standup-mesa qty=1 (minimum)',  eventId: 'standup-uio',  ticketTypeId: 'standup-mesa',  initialRemaining: 25  },
      ])(
        'edge case (qty=1): remaining decremented by exactly 1 — $label',
        ({ eventId, ticketTypeId, initialRemaining }) => {
          service.create({ eventId, items: [{ ticketTypeId, quantity: 1 }] });

          const event = store.events.find((e) => e.id === eventId);
          const ticketType = event?.ticketTypes.find(
            (t) => t.id === ticketTypeId,
          );
          expect(ticketType?.remaining).toBe(initialRemaining - 1);
        },
      );

      it.each([
        { label: 'salsa-general qty=6 (maxPerOrder)', eventId: 'noche-salsa', ticketTypeId: 'salsa-general', quantity: 6, initialRemaining: 40  },
        { label: 'salsa-vip qty=2 (maxPerOrder)',     eventId: 'noche-salsa', ticketTypeId: 'salsa-vip',     quantity: 2, initialRemaining: 8   },
        { label: 'indie-general qty=8 (maxPerOrder)', eventId: 'indie-fest',  ticketTypeId: 'indie-general', quantity: 8, initialRemaining: 120 },
        { label: 'standup-mesa qty=4 (maxPerOrder)',  eventId: 'standup-uio', ticketTypeId: 'standup-mesa',  quantity: 4, initialRemaining: 25  },
      ])(
        'edge case (qty=maxPerOrder): remaining decremented by maxPerOrder — $label',
        ({ eventId, ticketTypeId, quantity, initialRemaining }) => {
          service.create({ eventId, items: [{ ticketTypeId, quantity }] });

          const event = store.events.find((e) => e.id === eventId);
          const ticketType = event?.ticketTypes.find(
            (t) => t.id === ticketTypeId,
          );
          expect(ticketType?.remaining).toBe(initialRemaining - quantity);
        },
      );
    });

    describe('pricing formula', () => {
      type PricingScenario = {
        label: string;
        eventId: string;
        items: Array<{ ticketTypeId: string; quantity: number }>;
        expectedSubtotal: number;
      };

      const pricingScenarios: PricingScenario[] = [
        {
          label: 'salsa-general ×1 → subtotal=2500, fee=250',
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-general', quantity: 1 }],
          expectedSubtotal: 2500,
        },
        {
          label: 'salsa-general ×3 → subtotal=7500, fee=750',
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-general', quantity: 3 }],
          expectedSubtotal: 7500,
        },
        {
          label: 'salsa-general ×6 (maxPerOrder) → subtotal=15000, fee=1500',
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-general', quantity: 6 }],
          expectedSubtotal: 15000,
        },
        {
          label: 'salsa-vip ×1 → subtotal=6000, fee=600',
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-vip', quantity: 1 }],
          expectedSubtotal: 6000,
        },
        {
          label: 'salsa-vip ×2 (maxPerOrder) → subtotal=12000, fee=1200',
          eventId: 'noche-salsa',
          items: [{ ticketTypeId: 'salsa-vip', quantity: 2 }],
          expectedSubtotal: 12000,
        },
        {
          label: 'indie-general ×1 → subtotal=2000, fee=200',
          eventId: 'indie-fest',
          items: [{ ticketTypeId: 'indie-general', quantity: 1 }],
          expectedSubtotal: 2000,
        },
        {
          label: 'indie-general ×5 → subtotal=10000, fee=1000',
          eventId: 'indie-fest',
          items: [{ ticketTypeId: 'indie-general', quantity: 5 }],
          expectedSubtotal: 10000,
        },
        {
          label: 'indie-general ×8 (maxPerOrder) → subtotal=16000, fee=1600',
          eventId: 'indie-fest',
          items: [{ ticketTypeId: 'indie-general', quantity: 8 }],
          expectedSubtotal: 16000,
        },
        {
          label: 'standup-mesa ×1 → subtotal=1800, fee=180',
          eventId: 'standup-uio',
          items: [{ ticketTypeId: 'standup-mesa', quantity: 1 }],
          expectedSubtotal: 1800,
        },
        {
          label: 'standup-mesa ×3 → subtotal=5400, fee=540',
          eventId: 'standup-uio',
          items: [{ ticketTypeId: 'standup-mesa', quantity: 3 }],
          expectedSubtotal: 5400,
        },
        {
          label: 'standup-mesa ×4 (maxPerOrder) → subtotal=7200, fee=720',
          eventId: 'standup-uio',
          items: [{ ticketTypeId: 'standup-mesa', quantity: 4 }],
          expectedSubtotal: 7200,
        },
        {
          label: 'salsa-general×1 + salsa-vip×1 → subtotal=8500, fee=850',
          eventId: 'noche-salsa',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-vip', quantity: 1 },
          ],
          expectedSubtotal: 8500,
        },
        {
          label: 'salsa-general×4 + salsa-vip×2 → subtotal=22000, fee=2200',
          eventId: 'noche-salsa',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 4 },
            { ticketTypeId: 'salsa-vip', quantity: 2 },
          ],
          expectedSubtotal: 22000,
        },
        {
          label: 'salsa-general×6 + salsa-vip×2 (both at maxPerOrder) → subtotal=27000, fee=2700',
          eventId: 'noche-salsa',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 6 },
            { ticketTypeId: 'salsa-vip', quantity: 2 },
          ],
          expectedSubtotal: 27000,
        },
      ];

      it.each(pricingScenarios)(
        'subtotal / fee / total all hold — $label',
        ({ eventId, items, expectedSubtotal }) => {
          const order = service.create({ eventId, items });

          const computedSubtotal = order.items.reduce(
            (sum, item) => sum + item.unitPriceCents * item.quantity,
            0,
          );
          expect(order.subtotalCents).toBe(computedSubtotal);
          expect(order.subtotalCents).toBe(expectedSubtotal);

          const expectedFee = Math.round(
            (order.subtotalCents * SERVICE_FEE_PERCENT) / 100,
          );
          expect(order.feeCents).toBe(expectedFee);
          expect(order.totalCents).toBe(order.subtotalCents + order.feeCents);

          expect(Number.isInteger(order.subtotalCents)).toBe(true);
          expect(Number.isInteger(order.feeCents)).toBe(true);
          expect(Number.isInteger(order.totalCents)).toBe(true);

          for (const item of order.items) {
            expect(Number.isInteger(item.lineTotalCents)).toBe(true);
            expect(item.lineTotalCents).toBe(item.unitPriceCents * item.quantity);
          }
        },
      );

      it.each([
        { priceCents: 333, quantity: 1, expectedFee: 33  },
        { priceCents: 335, quantity: 1, expectedFee: 34  },
        { priceCents: 345, quantity: 2, expectedFee: 69  },
        { priceCents: 351, quantity: 1, expectedFee: 35  },
        { priceCents: 999, quantity: 1, expectedFee: 100 },
        { priceCents: 1,   quantity: 1, expectedFee: 0   },
      ])(
        'Math.round semantics: priceCents=$priceCents ×$quantity → fee=$expectedFee',
        ({ priceCents, quantity, expectedFee }) => {
          const customStore = createStore([
            {
              id: 'test-event',
              title: 'Test Event',
              city: 'Test City',
              venue: 'Test Venue',
              startsAt: new Date().toISOString(),
              description: 'Test',
              ticketTypes: [
                {
                  id: 'test-ticket',
                  name: 'Test Ticket',
                  priceCents,
                  remaining: 100,
                  maxPerOrder: 100,
                },
              ],
            },
          ]);
          const customService = new OrdersService(customStore as any);

          const order = customService.create({
            eventId: 'test-event',
            items: [{ ticketTypeId: 'test-ticket', quantity }],
          });

          const subtotal = priceCents * quantity;
          expect(order.subtotalCents).toBe(subtotal);
          expect(order.feeCents).toBe(expectedFee);
          expect(order.feeCents).toBe(Math.round((subtotal * SERVICE_FEE_PERCENT) / 100));
          expect(order.totalCents).toBe(subtotal + expectedFee);
          expect(Number.isInteger(order.feeCents)).toBe(true);
          expect(Number.isInteger(order.subtotalCents)).toBe(true);
          expect(Number.isInteger(order.totalCents)).toBe(true);
        },
      );
    });

    describe('duplicate ticketTypeId rejection', () => {
      it.each([
        {
          label: '2 items with the same id',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
          ],
        },
        {
          label: '3 items all sharing the same id',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
          ],
        },
        {
          label: '4 items all sharing the same id',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
          ],
        },
        {
          label: 'mixed: only 2 of several items share an id (duplicate at positions 0 and 2)',
          items: [
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-vip', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
          ],
        },
        {
          label: 'mixed: duplicate appears at the end of the array',
          items: [
            { ticketTypeId: 'salsa-vip', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
            { ticketTypeId: 'salsa-general', quantity: 1 },
          ],
        },
      ])('throws BadRequestException when $label', ({ items }) => {
        expect(() =>
          service.create({ eventId: 'noche-salsa', items }),
        ).toThrow(BadRequestException);
      });
    });
  });

  describe('confirm', () => {
    it('marks a pending order as confirmed and stores the buyer', () => {
      const pending = service.create({
        eventId: 'standup-uio',
        items: [{ ticketTypeId: 'standup-mesa', quantity: 1 }],
      });

      const confirmed = service.confirm(pending.id, {
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });

      expect(confirmed.status).toBe('confirmed');
      expect(confirmed.buyer).toEqual({
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });
    });

    it('rejects unknown orders', () => {
      expect(() =>
        service.confirm('ord_missing', {
          name: 'Ana Pérez',
          email: 'ana@example.com',
        }),
      ).toThrow(NotFoundException);
    });

    it('rejects already confirmed orders', () => {
      const pending = service.create({
        eventId: 'standup-uio',
        items: [{ ticketTypeId: 'standup-mesa', quantity: 1 }],
      });

      service.confirm(pending.id, {
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });

      expect(() =>
        service.confirm(pending.id, {
          name: 'Otra Persona',
          email: 'otra@example.com',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('timer: inventory release', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('fires after 15 min, removes the order and restores remaining', () => {
      const order = service.create({
        eventId: 'noche-salsa',
        items: [{ ticketTypeId: 'salsa-general', quantity: 3 }],
      });

      const orderId = order.id;

      const eventBefore = store.events.find((e) => e.id === 'noche-salsa')!;
      const ticketBefore = eventBefore.ticketTypes.find(
        (t) => t.id === 'salsa-general',
      )!;
      expect(ticketBefore.remaining).toBe(37);

      jest.advanceTimersByTime(15 * 60 * 1000);

      expect(store.orders.get(orderId)).toBeUndefined();

      const eventAfter = store.events.find((e) => e.id === 'noche-salsa')!;
      const ticketAfter = eventAfter.ticketTypes.find(
        (t) => t.id === 'salsa-general',
      )!;
      expect(ticketAfter.remaining).toBe(40);
    });

    it('confirming before 15 min cancels the timer, remaining stays decremented', () => {
      const order = service.create({
        eventId: 'standup-uio',
        items: [{ ticketTypeId: 'standup-mesa', quantity: 2 }],
      });

      service.confirm(order.id, {
        name: 'Ana Pérez',
        email: 'ana@example.com',
      });

      const eventMid = store.events.find((e) => e.id === 'standup-uio')!;
      const ticketMid = eventMid.ticketTypes.find(
        (t) => t.id === 'standup-mesa',
      )!;
      expect(ticketMid.remaining).toBe(23);

      jest.advanceTimersByTime(15 * 60 * 1000);

      expect(store.orders.get(order.id)).toBeDefined();
      expect(store.orders.get(order.id)?.status).toBe('confirmed');

      const eventAfter = store.events.find((e) => e.id === 'standup-uio')!;
      const ticketAfter = eventAfter.ticketTypes.find(
        (t) => t.id === 'standup-mesa',
      )!;
      expect(ticketAfter.remaining).toBe(23);
    });

    it.each([
      { label: 'salsa-general qty=1',            eventId: 'noche-salsa', ticketTypeId: 'salsa-general', quantity: 1, initialRemaining: 40  },
      { label: 'salsa-general qty=6 (maxPerOrder)', eventId: 'noche-salsa', ticketTypeId: 'salsa-general', quantity: 6, initialRemaining: 40  },
      { label: 'salsa-vip qty=1',                eventId: 'noche-salsa', ticketTypeId: 'salsa-vip',     quantity: 1, initialRemaining: 8   },
      { label: 'salsa-vip qty=2 (maxPerOrder)',  eventId: 'noche-salsa', ticketTypeId: 'salsa-vip',     quantity: 2, initialRemaining: 8   },
      { label: 'indie-general qty=5',            eventId: 'indie-fest',  ticketTypeId: 'indie-general', quantity: 5, initialRemaining: 120 },
      { label: 'indie-general qty=8 (maxPerOrder)', eventId: 'indie-fest', ticketTypeId: 'indie-general', quantity: 8, initialRemaining: 120 },
      { label: 'standup-mesa qty=1',             eventId: 'standup-uio', ticketTypeId: 'standup-mesa',  quantity: 1, initialRemaining: 25  },
      { label: 'standup-mesa qty=4 (maxPerOrder)', eventId: 'standup-uio', ticketTypeId: 'standup-mesa', quantity: 4, initialRemaining: 25  },
    ])(
      'timer fires and restores remaining to $initialRemaining for $label',
      ({ eventId, ticketTypeId, quantity, initialRemaining }) => {
        const order = service.create({
          eventId,
          items: [{ ticketTypeId, quantity }],
        });

        const eventBefore = store.events.find((e) => e.id === eventId)!;
        const ticketBefore = eventBefore.ticketTypes.find(
          (t) => t.id === ticketTypeId,
        )!;
        expect(ticketBefore.remaining).toBe(initialRemaining - quantity);

        jest.advanceTimersByTime(15 * 60 * 1000);

        expect(store.orders.get(order.id)).toBeUndefined();

        const eventAfter = store.events.find((e) => e.id === eventId)!;
        const ticketAfter = eventAfter.ticketTypes.find(
          (t) => t.id === ticketTypeId,
        )!;
        expect(ticketAfter.remaining).toBe(initialRemaining);
      },
    );
  });
});