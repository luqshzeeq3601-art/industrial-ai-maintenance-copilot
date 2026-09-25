import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useRoutes } from "react-router";
import { SessionProvider } from "./app/session";
import { ApiError } from "./api/client";
import { routes } from "./routes";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Client errors (4xx) won't fix themselves; retry only network/server failures once
        retry: (count, err) => count < 1 && !(err instanceof ApiError && err.status >= 400 && err.status < 500)
      }
    }
  });
}

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}
