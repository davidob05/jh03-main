import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DietManager } from "@/components/admin/DietManager";
import { Provider } from "react-redux";
import { createStoreInstance } from "@/state/store";

const apiFetchMock = vi.fn();

vi.mock("@/utils/api", () => ({
  apiFetch: (...args: any[]) => apiFetchMock(...args),
  apiBaseUrl: "http://api.test",
}));

const diets = [
  {
    id: 1,
    code: "DEC_2025",
    name: "December 2025",
    start_date: "2025-12-01",
    end_date: "2025-12-19",
    restriction_cutoff: "2025-11-15",
    is_active: true,
  },
];

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const store = createStoreInstance();
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </Provider>
  );
};

describe("DietManager", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockResolvedValue({
      ok: true,
      json: async () => diets,
      text: async () => "",
    });
  });

  it("renders diets with names and restriction cutoff", async () => {
    renderWithClient(<DietManager />);
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalled());
    expect(await screen.findByText("December 2025")).toBeInTheDocument();
    expect(screen.getByText(/Restriction cutoff: 15\/11\/2025/)).toBeInTheDocument();
  });
});
