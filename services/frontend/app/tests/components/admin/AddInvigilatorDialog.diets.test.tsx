import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddInvigilatorDialog } from "@/components/admin/AddInvigilatorDialog";

const apiFetchMock = vi.fn();

vi.mock("@/utils/api", () => ({
  apiFetch: (...args: any[]) => apiFetchMock(...args),
  apiBaseUrl: "http://api.test",
}));

const diets = [
  { id: 1, code: "DEC_2025", name: "December 2025", start_date: "2025-12-01", end_date: "2025-12-19", is_active: true },
  { id: 2, code: "APR_2026", name: "April 2026", start_date: "2026-04-01", end_date: "2026-04-30", is_active: true },
];

const renderDialog = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AddInvigilatorDialog open onClose={() => {}} />
    </QueryClientProvider>
  );
};

describe("AddInvigilatorDialog - diets", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((url: string, options?: RequestInit) => {
      const method = (options?.method || "GET").toUpperCase();
      if (method === "GET" && url.includes("/diets/")) {
        return Promise.resolve({ ok: true, json: async () => diets, text: async () => "" });
      }
      if (method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: 123 }), text: async () => "" });
      }
      return Promise.resolve({ ok: true, json: async () => ({}), text: async () => "" });
    });
  });

  it("shows active diets by name in availability step and submits selection", async () => {
    renderDialog();

    // Step 0: personal details
    fireEvent.change(screen.getByLabelText(/Preferred Name/i), { target: { value: "Pat" } });
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Pat Invig" } });
    const [mobileInput] = screen.getAllByLabelText(/Mobile\b/i);
    fireEvent.change(mobileInput, { target: { value: "07123" } });
    fireEvent.change(screen.getByLabelText(/University Email/i), { target: { value: "pat@example.com" } });
    fireEvent.change(screen.getByLabelText(/Personal Email/i), { target: { value: "pat@example.org" } });
    const nextBtnStep0 = screen.getByRole("button", { name: /next/i });
    expect(nextBtnStep0).toBeEnabled();
    fireEvent.click(nextBtnStep0);

    // Step 1: login details
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "pat" } });
    fireEvent.change(screen.getByLabelText(/Temporary Password/i), { target: { value: "TempPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 2 qualifications -> skip
    expect(screen.getByText(/Detached Duty/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    // Step 3 restrictions -> skip
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Step 4 availability: diets should be shown by name
    const decChip = await screen.findByText("December 2025");
    fireEvent.click(decChip);

    fireEvent.click(screen.getByRole("button", { name: /^Add$/i }));

    await waitFor(() => {
      const postCall = apiFetchMock.mock.calls.find(([, options]) => (options as any)?.method === "POST");
      expect(postCall).toBeTruthy();
      const body = JSON.parse((postCall?.[1] as RequestInit).body as string);
      expect(body.restrictions[0].diet).toBe("DEC_2025");
    });
  }, 15000);

  it("keeps username in sync with updated university email until edited", async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText(/Preferred Name/i), { target: { value: "Pat" } });
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: "Pat Invig" } });
    const [mobileInput] = screen.getAllByLabelText(/Mobile\b/i);
    fireEvent.change(mobileInput, { target: { value: "07123" } });
    const uniEmail = screen.getByLabelText(/University Email/i);
    fireEvent.change(uniEmail, { target: { value: "p" } });
    fireEvent.change(uniEmail, { target: { value: "pat@example.com" } });
    fireEvent.change(screen.getByLabelText(/Personal Email/i), { target: { value: "pat@example.org" } });

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText(/Username/i)).toHaveValue("pat");
  });
});
