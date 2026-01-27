import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
let currentUserIsSenior = false;
let invigilatorIsSuperuser = false;

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

const renderPage = (opts: { isSeniorAdmin?: boolean; seedMeCache?: boolean } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  if (opts.seedMeCache && opts.isSeniorAdmin) {
    client.setQueryData(["me"], { is_senior_admin: true });
  }
  currentUserIsSenior = Boolean(opts.isSeniorAdmin);
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
    currentUserIsSenior = false;
    invigilatorIsSuperuser = false;
    apiFetchMock.mockImplementation((url: string) => {
      if (url.includes("/auth/me/")) {
        return Promise.resolve({ ok: true, json: async () => ({ is_senior_admin: currentUserIsSenior }) });
      }
      if (url.includes("/invigilators/1/")) {
        return Promise.resolve({
          ok: true,
          json: async () =>
            invigilatorIsSuperuser
              ? { ...invigilatorResponse, user_is_staff: true, user_is_superuser: true }
              : invigilatorResponse,
        });
      }
      if (url.includes("/diets/")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  it("opens confirmation dialog before promoting", async () => {
    renderPage({ isSeniorAdmin: true });
    const trigger = await screen.findByRole("button", { name: "Administrator" });
    fireEvent.click(trigger);
    expect(await screen.findByText("Grant administrator privileges?")).toBeInTheDocument();
  });

  it("shows admin promotion button when senior admin info loads without cache", async () => {
    renderPage({ isSeniorAdmin: true, seedMeCache: false });
    expect(await screen.findByRole("button", { name: "Administrator" })).toBeInTheDocument();
  });

  it("hides admin promotion button for junior admins", async () => {
    renderPage();
    expect(screen.queryByRole("button", { name: "Administrator" })).not.toBeInTheDocument();
  });

  it("shows senior admin promotion dialog for senior admins", async () => {
    invigilatorIsSuperuser = true;
    renderPage({ isSeniorAdmin: true });
    const trigger = await screen.findByRole("switch", { name: "Senior" });
    fireEvent.click(trigger);
    expect(await screen.findByText("Grant senior administrator privileges?")).toBeInTheDocument();
  });

  it("hides senior admin promotion button for junior admins", async () => {
    invigilatorIsSuperuser = true;
    renderPage();
    expect(screen.queryByLabelText("Senior")).not.toBeInTheDocument();
  });
});
