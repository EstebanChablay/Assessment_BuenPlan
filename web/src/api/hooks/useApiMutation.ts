import {
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch } from '../fetch';
import { ApiEndpointFn } from '../types';

type MutationOptions<T, Body> = Omit<
  UseMutationOptions<T, Error, Body>,
  'mutationFn' | 'mutationKey'
>;

/**
 * Run a POST/PATCH/DELETE endpoint. Pass URL args as the second argument;
 * the mutate function receives the request body.
 *
 *   const { mutateAsync } = useApiMutation<Order, Record<string, never>, CreateOrderBody>(createOrder);
 *   await mutateAsync({ eventId, items });
 */
export const useApiMutation = <T, Args = any, Body = Record<string, unknown>>(
  endpointFn: ApiEndpointFn<Args, Body>,
  args: Args | (() => Args) = {} as Args,
  options?: MutationOptions<T, Body>,
) => {
  const queryClient = useQueryClient();
  const resolveArgs =
    typeof args === 'function' ? (args as () => Args) : () => args;
  const endpoint = useMemo(
    () => endpointFn(resolveArgs()),
    [endpointFn, resolveArgs],
  );

  return useMutation<T, Error, Body>({
    mutationKey: endpoint.queryKey,
    mutationFn: (body) => {
      const currentEndpoint = endpointFn(resolveArgs());
      return apiFetch<T>(currentEndpoint.query(body));
    },
    ...options,
    onSettled: async (data, error, variables, onMutateResult, context) => {
      if (endpoint.invalidatesQuery) {
        await Promise.all(
          endpoint
            .invalidatesQuery(data, error)
            .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      }

      await options?.onSettled?.(
        data,
        error,
        variables,
        onMutateResult,
        context,
      );
    },
  });
};
