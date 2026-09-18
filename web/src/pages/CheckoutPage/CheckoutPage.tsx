import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useApiMutation } from '~/api';
import { createOrder, CreateOrderBody } from '~/api/endpoints/orders/createOrder';
import { confirmOrder, ConfirmOrderBody } from '~/api/endpoints/orders/confirmOrder';
import { OrderSummary } from '~/components';
import { CheckoutState, Order } from '~/types';

const schema = yup.object({
  name: yup.string().required('El nombre es obligatorio'),
  email: yup
    .string()
    .email('El correo no es válido')
    .required('El correo es obligatorio'),
});

type FormValues = yup.InferType<typeof schema>;

export function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selection = location.state as CheckoutState | null;

  const [pendingOrderId, setPendingOrderId] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const createMutation = useApiMutation<Order, Record<string, never>, CreateOrderBody>(
    createOrder,
  );

  const confirmMutation = useApiMutation<Order, { id: string }, ConfirmOrderBody>(
    confirmOrder,
    { id: pendingOrderId },
  );

  if (!selection?.items.length) {
    return <Navigate to="/" replace />;
  }

  const isSubmitting = createMutation.isPending || confirmMutation.isPending;

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const created = await createMutation.mutateAsync({
        eventId: selection.eventId,
        items: selection.items.map(({ ticketTypeId, quantity }) => ({
          ticketTypeId,
          quantity,
        })),
      });
      setPendingOrderId(created.id);
      await confirmMutation.mutateAsync({ name: values.name, email: values.email });
      navigate(`/orders/${created.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al procesar la orden');
    }
  };

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_280px]">
      <section className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
        <h1 className="text-2xl font-semibold tracking-tight">Tus datos</h1>
        <p className="mt-2 text-sm text-ink/70">
          Completa el checkout para <strong>{selection.eventTitle}</strong>.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-ink"
            >
              Nombre
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="mt-1 block w-full rounded-lg border border-black/10 bg-paper px-3 py-2 text-sm placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Tu nombre completo"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-ink"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 block w-full rounded-lg border border-black/10 bg-paper px-3 py-2 text-sm placeholder:text-ink/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="tu@correo.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          {apiError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              {apiError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  aria-hidden="true"
                />
                Procesando…
              </>
            ) : (
              'Confirmar compra'
            )}
          </button>
        </form>
      </section>

      <aside className="h-max rounded-2xl bg-white p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">Resumen</h2>
        <div className="mt-3">
          <OrderSummary items={selection.items} />
        </div>
      </aside>
    </main>
  );
}
