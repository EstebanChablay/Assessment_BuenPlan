import { ApiEndpointFn } from '../../types';

type Args = {
  id: string;
};

export const eventById: ApiEndpointFn<Args> = ({ id }) => ({
  query: () => ({
    url: `/v1/events/${id}`,
  }),
  queryKey: ['events', { id }],
});
