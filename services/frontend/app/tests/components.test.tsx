import { describe, it, expect} from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "../src/components/Layout";





describe("Components - layout", () => {
  const renderLayout = (initialPath = "/") =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Layout />
      </MemoryRouter>
    );

  it ("renders all menu items", () => {
    renderLayout();
    const items = ["Home", "Exams", "Venues", "Calendar", "Invigilators"];
    items.forEach(item => {
      expect(screen.getByText(item)).toBeInTheDocument();
    })
  })

  it ("highlights the active menu item based on the current route", () => {
    renderLayout("/exams");
    const active = screen.getByText("Exams");
    expect(active).toHaveStyle("text-decoration: underline");
    const inactive = screen.getByText("Home");
    expect(inactive).toHaveStyle("text-decoration: none");
  })

  it ("items link to correct path", () => {
    renderLayout();
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Exams").closest("a")).toHaveAttribute("href", "/exams");
    expect(screen.getByText("Venues").closest("a")).toHaveAttribute("href", "/venues");
    expect(screen.getByText("Calendar").closest("a")).toHaveAttribute("href", "/calendar");
    expect(screen.getByText("Invigilators").closest("a")).toHaveAttribute("href", "/invigilators");
    const profileLink = screen.getByTestId("profile-link");
    expect(profileLink).toHaveAttribute("href", "/profile");
  })

  it("renders children in the outlet", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div data-testid="child">Child Component</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
  })
})