import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiFetch } from '../fetch';
import { ApiEndpointFn } from '../types';

type QueryOptions<T> = Omit<
  UseQueryOptions<T, Error>,
  'queryKey' | 'queryFn'
>;

/**
 * Load server data from an endpoint function.
 *
 *   const { data } = useApiQuery<EventRecord[]>(events);
 *   const { data: event } = useApiQuery<EventRecord>(eventById, { id });
 */
export const useApiQuery = <T, Args = any>(
  endpointFn: ApiEndpointFn<Args>,
  args: Args = {} as Args,
  options?: QueryOptions<T>,
) => {
  const endpoint = useMemo(() => endpointFn(args), [args, endpointFn]);

  return useQuery<T, Error>({
    queryKey: endpoint.queryKey,
    queryFn: () => apiFetch<T>(endpoint.query()),
    ...options,
  });
};
