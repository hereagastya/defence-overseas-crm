import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from '@/components/ui/use-toast';
import type { AxiosError } from 'axios';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = (error as AxiosError)?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        const message =
          (error as AxiosError<{ error?: { message?: string } }>)?.response?.data?.error?.message ??
          'Something went wrong.';
        toast({ variant: 'destructive', title: 'Error', description: message });
      },
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
