import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from '~/components';
import {
  CheckoutPage,
  ConfirmationPage,
  EventDetailPage,
  EventListPage,
} from '~/pages';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<EventListPage />} />
            <Route path="events/:eventId" element={<EventDetailPage />} />
            <Route
              path="events/:eventId/checkout"
              element={<CheckoutPage />}
            />
            <Route path="orders/:orderId" element={<ConfirmationPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
