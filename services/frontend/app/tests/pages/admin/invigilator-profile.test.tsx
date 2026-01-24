import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminInvigilatorProfile } from "@/pages/admin/Invigilator";

vi.mock("@mui/material/Tooltip", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@mui/x-date-pickers/LocalizationProvider", () => ({
  __esModule: true,
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@mui/x-date-pickers/StaticDatePicker", () => ({
  __esModule: true,
  StaticDatePicker: () => <div data-testid="static-date-picker" />,
}));

const apiFetchMock = vi.fn();

vi.mock("@/utils/api", () => ({
  apiFetch: (...args: any[]) => apiFetchMock(...args),
  apiBaseUrl: "http://api.test",
}));

const invigilatorResponse = {
  id: 1,
  user_id: 5,
  user_is_staff: false,
  user_is_superuser: false,
  user_is_senior_admin: false,
  preferred_name: "Morgan",
  full_name: "Morgan Example",
  mobile: null,
  mobile_text_only: null,
  janet_txt: null,
  alt_phone: null,
  university_email: null,
  personal_email: null,
  notes: null,
  resigned: false,
  contracted_hours: 0,
  qualifications: [],
  restrictions: [],
  availabilities: [],
  assignments: [],
};

const renderPage = (opts: { isSeniorAdmin?: boolean } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (opts.isSeniorAdmin) {
    client.setQueryData(["me"], { is_senior_admin: true });
  }
  return render(
    <MemoryRouter initialEntries={["/admin/invigilators/1"]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/admin/invigilators/:id" element={<AdminInvigilatorProfile />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe("AdminInvigilatorProfile", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiFetchMock.mockImplementation((url: string) => {
      if (url.includes("/invigilators/1/")) {
        return Promise.resolve({ ok: true, json: async () => invigilatorResponse });
      }
      if (url.includes("/diets/")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("opens confirmation dialog before promoting", async () => {
    renderPage({ isSeniorAdmin: true });
    const user = userEvent.setup();
    const trigger = await screen.findByText("Make them an admin");
    await user.click(trigger);
    expect(await screen.findByText("Make this invigilator an admin?")).toBeInTheDocument();
  });

  it("disables remove admin when current user is not senior admin", async () => {
    renderPage();
    expect(screen.queryByText("Remove admin")).not.toBeInTheDocument();
  });

  it("shows senior admin promotion dialog for senior admins", async () => {
    apiFetchMock.mockImplementationOnce((url: string) => {
      if (url.includes("/invigilators/1/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...invigilatorResponse, user_is_staff: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    renderPage({ isSeniorAdmin: true });
    const user = userEvent.setup();
    const trigger = await screen.findByText("Make senior admin");
    await user.click(trigger);
    expect(await screen.findByText("Make this admin a senior admin?")).toBeInTheDocument();
  });

  it("hides senior admin promotion button for junior admins", async () => {
    apiFetchMock.mockImplementationOnce((url: string) => {
      if (url.includes("/invigilators/1/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ ...invigilatorResponse, user_is_staff: true }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    renderPage();
    expect(screen.queryByText("Make senior admin")).not.toBeInTheDocument();
  });
});
