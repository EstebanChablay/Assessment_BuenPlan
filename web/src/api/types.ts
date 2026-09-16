import { QueryKey } from '@tanstack/react-query';

export type ApiEndpointQuery = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

export type ApiEndpoint<Body = unknown> = {
  query: (body?: Body) => ApiEndpointQuery;
  queryKey: QueryKey;
  invalidatesQuery?: (
    result?: unknown,
    error?: Error | null,
  ) => QueryKey[];
};

export type ApiEndpointFn<Args = any, Body = unknown> = (
  args: Args,
) => ApiEndpoint<Body>;
