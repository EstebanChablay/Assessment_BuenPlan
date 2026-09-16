import { ApiEndpointFn } from '../../types';

export const events: ApiEndpointFn = () => ({
  query: () => ({
    url: '/v1/events',
  }),
  queryKey: ['events'],
});
