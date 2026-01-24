import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireRole } from "@/components/RequireRole";
import { clearAuthSession, setAuthSession } from "@/utils/api";

describe("Components - RequireRole", () => {
  afterEach(() => {
    clearAuthSession();
  });

  it("allows admins into invigilator routes", () => {
    setAuthSession("token", { role: "admin", is_staff: true, is_superuser: true });

    render(
      <MemoryRouter initialEntries={["/invigilator"]}>
        <Routes>
          <Route element={<RequireRole role="invigilator" />}>
            <Route path="/invigilator" element={<div>Invigilator Area</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Invigilator Area")).toBeInTheDocument();
  });
});
