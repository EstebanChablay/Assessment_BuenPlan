/**
 * Property 5: OrderSummary fee/total correctness
 * Validates: Requirements 5.3
 *
 * For any set of TicketSelection items, the rendered "Cargo por servicio" amount
 * must equal feeFromSubtotal(subtotal) and the rendered "Total" must equal
 * subtotal + fee, both formatted with formatUsd.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { OrderSummary } from './OrderSummary';
import { feeFromSubtotal, formatUsd } from '~/lib/money';
import type { TicketSelection } from '~/types';

describe('OrderSummary — Property 5: fee/total correctness', () => {
  it('renders fee and total matching feeFromSubtotal formula for any item set', () => {
    const itemArb = fc.record<TicketSelection>({
      ticketTypeId: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 20 }),
      quantity: fc.integer({ min: 1, max: 10 }),
      unitPriceCents: fc.integer({ min: 100, max: 100_000 }),
    });

    // Use arrays with unique ticketTypeIds to avoid React key collisions
    const uniqueItemsArb = fc
      .array(itemArb, { minLength: 1, maxLength: 5 })
      .map((items) =>
        items.filter(
          (item, idx, arr) =>
            arr.findIndex((x) => x.ticketTypeId === item.ticketTypeId) === idx,
        ),
      )
      .filter((items) => items.length > 0);

    fc.assert(
      fc.property(uniqueItemsArb, (items) => {
        const subtotal = items.reduce(
          (sum, item) => sum + item.unitPriceCents * item.quantity,
          0,
        );
        const fee = feeFromSubtotal(subtotal);
        const total = subtotal + fee;

        const { getByText } = render(<OrderSummary items={items} />);

        // "Cargo por servicio" row — the <dd> sibling inside the same <div>
        const feeLabel = getByText('Cargo por servicio');
        const feeRow = feeLabel.closest('div');
        const feeValue = feeRow?.querySelector('dd');
        expect(feeValue).toHaveTextContent(formatUsd(fee));

        // "Total" row
        const totalLabel = getByText('Total');
        const totalRow = totalLabel.closest('div');
        const totalValue = totalRow?.querySelector('dd');
        expect(totalValue).toHaveTextContent(formatUsd(total));

        cleanup();
      }),
      { numRuns: 50 },
    );
  });
});
