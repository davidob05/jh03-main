import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { InvigilatorLayout } from "@/components/invigilator/Layout";
import { setAuthSession, clearAuthSession } from "@/utils/api";

describe("Components - InvigilatorLayout", () => {
  const renderLayout = (initialPath = "/invigilator") =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/invigilator/*" element={<InvigilatorLayout />}>
            <Route index element={<div>Home Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  afterEach(() => {
    clearAuthSession();
  });

  it("shows back to admin when user is admin", async () => {
    setAuthSession("token", { username: "admin", is_staff: true, is_superuser: true });
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByLabelText(/account menu/i));
    expect(await screen.findByText("Back to admin")).toBeInTheDocument();
  });
});
