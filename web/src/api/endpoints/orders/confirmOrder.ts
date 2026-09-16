import { ApiEndpointFn } from '../../types';

type Args = {
  id: string;
};

export type ConfirmOrderBody = {
  name: string;
  email: string;
};

export const confirmOrder: ApiEndpointFn<Args, ConfirmOrderBody> = ({ id }) => ({
  query: (body) => ({
    url: `/v1/orders/${id}/confirm`,
    method: 'POST',
    body,
  }),
  queryKey: ['orders', 'confirm', { id }],
  invalidatesQuery: () => [['orders', { id }], ['events']],
});
