import { render, screen } from "@testing-library/react";
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
});
