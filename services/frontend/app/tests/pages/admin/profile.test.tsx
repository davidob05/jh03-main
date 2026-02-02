import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminProfile } from "@/pages/admin/Profile";
import { Provider } from "react-redux";
import { createStoreInstance } from "@/state/store";

const apiFetchMock = vi.fn();

vi.mock("@/utils/api", () => ({
  apiFetch: (...args: any[]) => apiFetchMock(...args),
  apiBaseUrl: "http://api.test",
  clearAuthSession: vi.fn(),
  getAuthToken: vi.fn(() => "token"),
  setAuthSession: vi.fn(),
}));

const userResponse = {
  id: 1,
  username: "admin",
  email: "admin@example.com",
  phone: "",
  avatar: null,
  is_senior_admin: true,
  last_login: null,
};

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStoreInstance();
  return render(
    <MemoryRouter>
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <AdminProfile />
        </QueryClientProvider>
      </Provider>
    </MemoryRouter>
  );
};

describe("AdminProfile", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((url: string) => {
      if (url.includes("/auth/me/")) {
        return Promise.resolve({ ok: true, json: async () => userResponse });
      }
      if (url.includes("/auth/sessions/")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("shows senior admin tag", async () => {
    renderPage();
    expect(await screen.findByText("Senior Administrator")).toBeInTheDocument();
  });
});
