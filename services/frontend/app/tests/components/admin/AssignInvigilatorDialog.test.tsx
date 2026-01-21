import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AssignInvigilatorDialog } from "@/components/admin/AssignInvigilatorDialog";

const renderDialog = (props: Partial<React.ComponentProps<typeof AssignInvigilatorDialog>> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const defaultProps: React.ComponentProps<typeof AssignInvigilatorDialog> = {
    open: true,
    onClose: vi.fn(),
    examVenue: {
      examvenue_id: 1,
      venue_name: "Main Hall",
      start_time: "2025-12-01T09:00:00",
      exam_length: 120,
      core: true,
    },
    invigilators: [],
    assignments: [],
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <AssignInvigilatorDialog {...defaultProps} {...props} />
    </QueryClientProvider>
  );
};

describe("Components - AssignInvigilatorDialog", () => {
  it("filters out unavailable invigilators when only-available is enabled", () => {
    renderDialog({
      invigilators: [
        {
          id: 1,
          preferred_name: "Alex",
          full_name: "Alex Smith",
          resigned: false,
          availabilities: [{ date: "2025-12-01", slot: "MORNING", available: true }],
        },
        {
          id: 2,
          preferred_name: "Brooke",
          full_name: "Brooke Lee",
          resigned: false,
          availabilities: [{ date: "2025-12-01", slot: "MORNING", available: false }],
        },
      ],
    });

    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.queryByText("Brooke")).not.toBeInTheDocument();
  });

  it("disables invigilators already assigned to the exam venue", () => {
    renderDialog({
      invigilators: [
        { id: 1, preferred_name: "Alex", full_name: "Alex Smith", resigned: false },
        { id: 2, preferred_name: "Brooke", full_name: "Brooke Lee", resigned: false },
      ],
      assignments: [
        {
          id: 10,
          invigilator: 2,
          exam_venue: 1,
          assigned_start: "2025-12-01T09:00:00",
          assigned_end: "2025-12-01T11:00:00",
        },
      ],
    });

    const brookeRow = screen.getByRole("button", { name: /brooke/i });
    expect(brookeRow).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/already assigned/i)).toBeInTheDocument();
  });

  it("disables invigilators with overlapping assignments", () => {
    renderDialog({
      invigilators: [
        { id: 1, preferred_name: "Alex", full_name: "Alex Smith", resigned: false },
        { id: 2, preferred_name: "Brooke", full_name: "Brooke Lee", resigned: false },
      ],
      assignments: [
        {
          id: 11,
          invigilator: 1,
          exam_venue: 99,
          assigned_start: "2025-12-01T10:00:00",
          assigned_end: "2025-12-01T12:00:00",
        },
      ],
    });

    fireEvent.click(screen.getByLabelText(/only show available/i));

    const alexRow = screen.getByRole("button", { name: /alex/i });
    expect(alexRow).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/conflicts with existing shift/i)).toBeInTheDocument();
  });
});
