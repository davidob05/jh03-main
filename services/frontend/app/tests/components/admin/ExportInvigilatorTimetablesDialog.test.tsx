import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ExportInvigilatorTimetablesDialog } from "@/components/admin/ExportInvigilatorTimetablesDialog";

describe("ExportInvigilatorTimetablesDialog", () => {
  it("disables export when no invigilators are selected", () => {
    render(
      <ExportInvigilatorTimetablesDialog
        open
        invigilators={[]}
        onClose={() => undefined}
        onExport={() => undefined}
      />
    );

    expect(screen.getByRole("button", { name: /export/i })).toBeDisabled();
  });

  it("sends selected options to onExport", () => {
    const onExport = vi.fn();
    render(
      <ExportInvigilatorTimetablesDialog
        open
        invigilators={[{ id: 1, name: "Alice Example" }]}
        onClose={() => undefined}
        onExport={onExport}
      />
    );

    fireEvent.click(screen.getByLabelText(/only confirmed shifts/i));
    fireEvent.click(screen.getByLabelText(/include student provisions/i));

    fireEvent.click(screen.getByRole("button", { name: /export/i }));

    expect(onExport).toHaveBeenCalledWith({
      onlyConfirmed: true,
      includeCancelled: false,
      includeProvisions: true,
    });
  });
});
