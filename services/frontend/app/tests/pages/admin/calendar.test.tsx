import React from "react";
import { BrowserRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AdminCalendar } from "@/pages/admin/Calendar";

// -------------------------
// MUI Tooltip mock (prevents portals)
// -------------------------
vi.mock("@mui/material/Tooltip", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// -------------------------
// Popup mock
// -------------------------
vi.mock("@/components/admin/ExamDetailsPopup", () => ({
  __esModule: true,
  ExamDetailsPopup: () => <div data-testid="mock-popup" />,
}));

const mockExamData = [
  {
    id: 1,
    code: "CS101",
    subject: "Introduction to Programming",
    department: "CS",
    mainVenue: "James Watt South - J15",
    mainStartTime: "2025-12-10T09:00",
    mainEndTime: "2025-12-10T11:00",
    venues: [
      {
        venue: "James Watt South - J15",
        startTime: "2025-12-10T09:00",
        endTime: "2025-12-10T11:00",
        students: 245,
        invigilators: 8,
      },
      {
        venue: "Boyd Orr - Lecture Theatre 1",
        startTime: "2025-12-10T09:00",
        endTime: "2025-12-10T11:00",
        students: 180,
        invigilators: 6,
      },
      {
        venue: "Sir Charles Wilson - Main Hall",
        startTime: "2025-12-10T09:00",
        endTime: "2025-12-10T11:00",
        students: 90,
        invigilators: 4,
      },
      {
        venue: "Separate Room SR7 (Provisions)",
        startTime: "2025-12-10T09:00",
        endTime: "2025-12-10T11:30",
        students: 12,
        invigilators: 3,
      },
    ],
  },
  {
    id: 2,
    code: "MATH201",
    subject: "Linear Algebra",
    department: "Math",
    mainVenue: "Boyd Orr - LT2",
    mainStartTime: "2025-12-10T14:00",
    mainEndTime: "2025-12-10T16:30",
    venues: [
      {
        venue: "Boyd Orr - LT2",
        startTime: "2025-12-10T14:00",
        endTime: "2025-12-10T16:30",
        students: 320,
        invigilators: 10,
      },
      {
        venue: "Rankine Building - 401",
        startTime: "2025-12-10T14:00",
        endTime: "2025-12-10T16:30",
        students: 120,
        invigilators: 5,
      },
      {
        venue: "Purple Cluster - PC2",
        startTime: "2025-12-10T14:00",
        endTime: "2025-12-10T16:30",
        students: 48,
        invigilators: 3,
      },
    ],
  },
  {
    id: 3,
    code: "PHY301",
    subject: "Quantum Physics",
    department: "Physics",
    mainVenue: "Kelvin Building - LT",
    mainStartTime: "2025-12-11T09:00",
    mainEndTime: "2025-12-11T12:00",
    venues: [
      {
        venue: "Kelvin Building - LT",
        startTime: "2025-12-11T09:00",
        endTime: "2025-12-11T12:00",
        students: 160,
        invigilators: 6,
      },
      {
        venue: "Separate Room SR12 (Provisions)",
        startTime: "2025-12-11T09:00",
        endTime: "2025-12-11T12:30",
        students: 8,
        invigilators: 2,
      },
    ],
  },
];

const renderWithProviders = (ui: React.ReactNode) => {
  const queryClient = new QueryClient();
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>
  );
};

const renderCalendar = () => renderWithProviders(<AdminCalendar initialExams={mockExamData} fetchEnabled={false} />);

// Set up fake time/date
beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// Set up for testing exams are all shown on the correct day
const examsByDate = mockExamData.reduce<Record<string, string[]>>((acc, exam) => {
  const date = exam.mainStartTime.split("T")[0];
  const title = `${exam.code} - ${exam.subject}`;
  if (!acc[date]) acc[date] = [];
  acc[date].push(title);
  return acc;
}, {});

const allExamDates = Object.keys(examsByDate).sort();
const firstDate = new Date(allExamDates[0]);
const lastDate = new Date(allExamDates[allExamDates.length - 1]);

const allDays: string[] = [];
for (let d = firstDate; d <= lastDate; d.setDate(d.getDate() + 1)) {
  allDays.push(d.toISOString().split("T")[0]);
}

describe("Pages - calendar", () => {
  const parseHeaderDate = (text: string) => {
    const trimmed = text.trim();
    // Expected format now: "Saturday, 15 November 2025"
    const withoutWeekday = trimmed.includes(",")
      ? trimmed.split(",").slice(1).join(",").trim()
      : trimmed;
    const [dayStr, monthStr, yearStr] = withoutWeekday.split(" ");
    const day = Number(dayStr);
    const year = Number(yearStr);
    const month = new Date(`${monthStr} 1, 2000`).getMonth(); // map month name to index
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    // Fallback to legacy DD/MM/YYYY at end of string
    const maybeDate = trimmed.split(" ").pop() || "";
    const [d, m, y] = maybeDate.split("/").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  // Rendering tests
  it("renders the title", () => {
    renderCalendar();
    expect(screen.getByText("Exams Calendar")).toBeInTheDocument();
  });

  it("renders initial date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-11-15T09:00:00"));
    renderCalendar();
    const header = screen.getByTestId("date-header");
    expect(header).toHaveTextContent(/Sat/i);
    expect(header).toHaveTextContent(/15 November 2025/i);
  });

  // Runs once for each day, test that only exams on that day are displayed
  it.each(allDays)("correctly shows exams for %s (or none if empty", (targetDateStr) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-12-11T09:00"));

    renderCalendar();
    const targetDate = new Date(targetDateStr);
    const headerText = screen.getByTestId("date-header").textContent || "";
    const currentDate = parseHeaderDate(headerText);
    const dayDiff = Math.round((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    const nextButton = screen.getByRole("button", { name: /Next/i });
    const prevButton = screen.getByRole("button", { name: /Previous/i });

    for (let i = 0; i < Math.abs(dayDiff); i++) {
      fireEvent.click(dayDiff > 0 ? nextButton : prevButton);
    }
    const expectedExams = examsByDate[targetDateStr] ?? [];
    const allExams = mockExamData.map((exam) => `${exam.code} - ${exam.subject}`);
    const unexpectedExams = allExams.filter((title) => !expectedExams.includes(title));

    expectedExams.forEach((title) => {
      const exam = mockExamData.find((e) => `${e.code} - ${e.subject}` === title);
      expect(exam).toBeDefined();
      expect(screen.getByTestId(`exam-${exam!.id}`)).toBeInTheDocument();
    });
    unexpectedExams.forEach((title) => {
      const exam = mockExamData.find((e) => `${e.code} - ${e.subject}` === title);
      expect(screen.queryByTestId(`exam-${exam!.id}`)).not.toBeInTheDocument();
    });
    if (expectedExams.length === 0) {
      expect(screen.queryByTestId("timeline-event")).not.toBeInTheDocument();
    }
  });

  it("shows empty state when no exams", () => {
    renderCalendar();
    const prevButton = screen.getByRole("button", { name: /Previous/i });
    fireEvent.click(prevButton);
    expect(screen.getByText(/No exams scheduled today/i)).toBeInTheDocument();
  });

  // Navigation
  it("moves to the next day when clicked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-11-15T09:00:00"));
    renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    const dateHeader = screen.getByTestId("date-header");
    expect(dateHeader).toHaveTextContent(/Sun/i);
    expect(dateHeader).toHaveTextContent(/16 November 2025/i);
  });

  it("moves to the previous day when clicked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-11-15T09:00:00"));
    renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
    const dateHeader = screen.getByTestId("date-header");
    expect(dateHeader).toHaveTextContent(/Fri/i);
    expect(dateHeader).toHaveTextContent(/14 November 2025/i);
  });

  it("set calendar to today when today clicked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-11-15T09:00:00"));
    renderCalendar();
    fireEvent.click(screen.getByRole("button", { name: /Today/i }));
    const dateHeader = screen.getByTestId("date-header");
    expect(dateHeader).toHaveTextContent(/Sat/i);
    expect(dateHeader).toHaveTextContent(/15 November 2025/i);
  });

  // Style
  it("correct style properties applied", async () => {
    vi.setSystemTime(new Date("2025-12-10T09:00:00"));
    renderCalendar();

    const timelineBtn = screen.getByTestId("timeline-btn");
    fireEvent.mouseDown(timelineBtn);
    fireEvent.mouseUp(timelineBtn);
    fireEvent.click(timelineBtn);
    const exam = mockExamData[0];
    const item = await screen.findByText(new RegExp(exam.code, "i"));
    const style = window.getComputedStyle(item);

    expect(style.backgroundColor).toBe("rgb(76, 175, 80)");
    expect(style.color).toBe("rgb(255, 255, 255)");
    expect(style.border).toBe("");
    expect(style.borderRadius).not.toBe("");
  });
});
