import { ApiEndpointFn } from '../../types';

type Args = {
  id: string;
};

export const orderById: ApiEndpointFn<Args> = ({ id }) => ({
  query: () => ({
    url: `/v1/orders/${id}`,
  }),
  queryKey: ['orders', { id }],
});
