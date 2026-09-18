import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CheckoutPage } from './CheckoutPage';

// Mock ~/api — keep all exports but replace useApiMutation with a spy
vi.mock('~/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/api')>();
  return {
    ...actual,
    useApiMutation: vi.fn(),
  };
});

// Mock OrderSummary to avoid rendering complexity
vi.mock('~/components', () => ({
  OrderSummary: () => <div data-testid="order-summary" />,
}));

import { useApiMutation } from '~/api';
import { createOrder } from '~/api/endpoints/orders/createOrder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Configure useApiMutation mock by discriminating on the endpoint function.
 * createMutateAsync is used for createOrder calls; confirmMutateAsync for all others.
 * isPendingCreate / isPendingConfirm control the isPending state for each mutation.
 */
function mockMutations({
  createMutateAsync = vi.fn().mockResolvedValue({ id: 'order-123' }),
  confirmMutateAsync = vi
    .fn()
    .mockResolvedValue({ id: 'order-123', status: 'confirmed' }),
  isPendingCreate = false,
  isPendingConfirm = false,
}: {
  createMutateAsync?: ReturnType<typeof vi.fn>;
  confirmMutateAsync?: ReturnType<typeof vi.fn>;
  isPendingCreate?: boolean;
  isPendingConfirm?: boolean;
} = {}) {
  vi.mocked(useApiMutation).mockImplementation((endpointFn: unknown) => {
    if (endpointFn === createOrder) {
      return { mutateAsync: createMutateAsync, isPending: isPendingCreate } as any;
    }
    return { mutateAsync: confirmMutateAsync, isPending: isPendingConfirm } as any;
  });

  return { createMutateAsync, confirmMutateAsync };
}

// ---------------------------------------------------------------------------
// Shared fixture
// ---------------------------------------------------------------------------
const checkoutState = {
  eventId: 'evt-1',
  eventTitle: 'Test Event',
  items: [
    { ticketTypeId: 'tt-1', name: 'General', quantity: 2, unitPriceCents: 1000 },
  ],
};

/**
 * Renders CheckoutPage inside a MemoryRouter that also provides home and
 * order-confirmation routes so Navigate / navigate() calls are observable.
 */
function renderCheckout(state: unknown = checkoutState) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/events/evt-1/checkout', state }]}>
      <Routes>
        <Route path="/events/:eventId/checkout" element={<CheckoutPage />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/orders/:orderId" element={<div>Order confirmed</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillForm(name = 'Juan Pérez', email = 'juan@example.com') {
  fireEvent.change(screen.getByLabelText(/nombre/i), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText(/correo/i), {
    target: { value: email },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Requirement 5.2
  it('redirects to / when there is no checkout state', () => {
    mockMutations();
    renderCheckout(null);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  // Requirements 5.4, 5.5
  it('calls create then confirm then navigates on valid submit', async () => {
    const { createMutateAsync, confirmMutateAsync } = mockMutations();

    renderCheckout(checkoutState);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() =>
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'evt-1',
          items: [{ ticketTypeId: 'tt-1', quantity: 2 }],
        }),
      ),
    );

    await waitFor(() =>
      expect(confirmMutateAsync).toHaveBeenCalledWith({
        name: 'Juan Pérez',
        email: 'juan@example.com',
      }),
    );

    await waitFor(() =>
      expect(screen.getByText('Order confirmed')).toBeInTheDocument(),
    );
  });

  // Requirements 5.6, 5.7
  it('shows error banner and does not navigate when API call fails', async () => {
    const { createMutateAsync } = mockMutations({
      createMutateAsync: vi.fn().mockRejectedValue(new Error('Error de servidor')),
    });

    renderCheckout(checkoutState);

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() =>
      expect(screen.getByText('Error de servidor')).toBeInTheDocument(),
    );
    expect(createMutateAsync).toHaveBeenCalledOnce();
    expect(screen.queryByText('Order confirmed')).not.toBeInTheDocument();
  });

  // Requirement 5.6
  it('disables submit button while mutations are in flight', () => {
    mockMutations({ isPendingCreate: true });

    renderCheckout(checkoutState);

    const button = screen.getByRole('button', { name: /procesando/i });
    expect(button).toBeDisabled();
  });
});
