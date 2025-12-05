import { BrowserRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

// Create a mock funtion for react-router-dom.navigate

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// -------------------------
// MUI Tooltip mock (prevents portals)
// -------------------------
vi.mock("@mui/material/Tooltip", () => ({
  __esModule: true,
  default: ({ children }: any) => children,
}));

// -------------------------
// Popup mock
// -------------------------
vi.mock("@/components/popups/ExamDetailsPopup", () => ({
  __esModule: true,
  default: () => <div data-testid="mock-popup" />,
}));

// -------------------------
// react-calendar-timeline mock
// -------------------------
vi.mock("react-calendar-timeline", () => {
  const React = require("react");

  return {
    __esModule: true,

    default: ({ items }: any) => (
      <div data-testid="mock-timeline">
        {items.map((item: any) => (
          <div
            key={item.id}
            data-testid={`exam-${item.id}`}
            style={item.itemProps?.style ?? {}}
          >
            {item.title}
          </div>
        ))}
      </div>
    ),

    TimelineHeaders: ({ children }: any) => <div>{children}</div>,

    SidebarHeader: ({ children }: any) => (
      <div>
        {children({
          getRootProps: () => ({}),
        })}
      </div>
    ),

    DateHeader: () => <div />,
  };
});

// -------------------------
// Mock examData INSIDE Calendar module
// -------------------------
vi.mock("@/pages/admin/Calendar", async () => {
  const actual = await vi.importActual<typeof import("@/pages/admin/Calendar")>(
    "@/pages/admin/Calendar"
  );

  return {
    ...actual,
    examData: [
      {
    id: 1,
    code: "CS101",
    subject: "Introduction to Programming",
    department: "CS",
    mainVenue: "James Watt South - J15",
    mainStartTime: "2025-12-10T09:00",
    mainEndTime: "2025-12-10T11:00",
    venues: [
      { venue: "James Watt South - J15", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 245, invigilators: 8 },
      { venue: "Boyd Orr - Lecture Theatre 1", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 180, invigilators: 6 },
      { venue: "Sir Charles Wilson - Main Hall", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:00", students: 90, invigilators: 4 },
      { venue: "Separate Room SR7 (Provisions)", startTime: "2025-12-10T09:00", endTime: "2025-12-10T11:30", students: 12, invigilators: 3 },
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
      { venue: "Boyd Orr - LT2", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 320, invigilators: 10 },
      { venue: "Rankine Building - 401", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 120, invigilators: 5 },
      { venue: "Purple Cluster - PC2", startTime: "2025-12-10T14:00", endTime: "2025-12-10T16:30", students: 48, invigilators: 3 },
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
      { venue: "Kelvin Building - LT", startTime: "2025-12-11T09:00", endTime: "2025-12-11T12:00", students: 160, invigilators: 6 },
      { venue: "Separate Room SR12 (Provisions)", startTime: "2025-12-11T09:00", endTime: "2025-12-11T12:30", students: 8, invigilators: 2 },
    ],
  },
    ],
  };
});

import { AdminCalendar, examData } from "@/pages/admin/Calendar";

// Render router
const renderWithRouter = (ui: React.ReactNode) =>
    render(<BrowserRouter>{ui}</BrowserRouter>);

// Set up fake time/date
beforeEach(() => {
    vi.useRealTimers();
    vi.setSystemTime(new Date("2025-11-15T09:00:00"));
    mockNavigate.mockReset();
});

// Set up for testing exams are all shown on the correct day
const examsByDate = examData.reduce<Record<string, string[]>>((acc, exam) => {
    const date = exam.mainStartTime.split("T")[0];
    const title = `${exam.code} - ${exam.subject}`;
    if (!acc[date]) acc[date] = [];
    acc[date].push(title);
    return acc;
},{});

const allExamDates = Object.keys(examsByDate).sort();
const firstDate = new Date(allExamDates[0]);
const lastDate = new Date(allExamDates[allExamDates.length-1]);

const allDays: string[] = [];
for(
    let d=firstDate;
    d<= lastDate;
    d.setDate(d.getDate() + 1)
) {
    allDays.push(d.toISOString().split("T")[0]);
}

describe("Pages - calendar", () => {
    it("DEBUG — print DOM", () => {
        renderWithRouter(<AdminCalendar />);
        screen.debug();
}   );
    // Rendering tests
    it ("renders the title", () => {
        renderWithRouter(<AdminCalendar />);
        expect(screen.getByText("Exam Calendar")).toBeInTheDocument();
    });
    it ("renders initial date", () => {
        renderWithRouter(<AdminCalendar />);
        expect(screen.getByText("Saturday, November 15 2025")).toBeInTheDocument();
    });
    // Runs once for each day, test that only exams on that day are displayed
    it.each(allDays)("correctly shows exams for %s (or none if empty", (targetDateStr) =>{
        renderWithRouter(<AdminCalendar/>);
        const targetDate = new Date(targetDateStr);
        const dayDiff = Math.round((targetDate.getTime()-firstDate.getTime())/(1000*60*60*24));
        const nextButton = screen.getByRole("button", {name: /Next/i });
        const prevButton = screen.getByRole("button", {name: /Previous/i });

        for (let i=0; i<Math.abs(dayDiff); i++){
            fireEvent.click(dayDiff > 0 ? nextButton : prevButton);
        }
        const expectedExams = examsByDate[targetDateStr]??[];
        const allExams = examData.map((exam) => `${exam.code} - ${exam.subject}`);
        const unexpectedExams = allExams.filter((title) => !expectedExams.includes(title));

        expectedExams.forEach((title) => {
            const exam = examData.find(e => `${e.code} - ${e.subject}` === title);
            expect(exam).toBeDefined();
            expect(screen.getByTestId(`exam-${exam!.id}`)).toBeInTheDocument();      
        });
        unexpectedExams.forEach((title)=> {
            const exam = examData.find(e => `${e.code} - ${e.subject}` === title);
            expect(screen.queryByTestId(`exam-${exam!.id}`)).not.toBeInTheDocument();        });
        if (expectedExams.length===0){
            expect(screen.queryByTestId("timeline-event")).not.toBeInTheDocument();
        };
    });
    it ("shows empty state when no exams", () => {
        renderWithRouter(<AdminCalendar />);
        const prevButton = screen.getByRole("button", {name: /Previous/i });
        fireEvent.click(prevButton);
        expect(screen.getByText(/No exams scheduled today/i)).toBeInTheDocument();
    })

    // Navigation
    it ("moves to the next day when clicked", () => {
        renderWithRouter(<AdminCalendar />);
        fireEvent.click(screen.getByRole("button", {name: /Next/i}));
        expect(screen.getByText("Sunday, November 16, 2025")).toBeInTheDocument();
    });
    it ("moves to the previous day when clicked", () => {
        renderWithRouter(<AdminCalendar />);
        fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
        expect(screen.getByText("Friday, November 14, 2025")).toBeInTheDocument();
    });
    it ("set calendar to today when today clicked", () => {
        renderWithRouter(<AdminCalendar />);
        fireEvent.click(screen.getByRole("button", { name: /Today/i }));
        expect(screen.getByText("Saturday, November 15 2025")).toBeInTheDocument();
    });  

    // Style
    it ("correct style properties applied", async () => {
        renderWithRouter(<AdminCalendar />);

        fireEvent.click(screen.getByTestId("timeline-btn"));

        const item = await screen.findByTestId(`exam-${examData[0].id}`);
        const style = item.getAttribute("style");

        expect(style).toContain("background: rgb(25, 118, 210)");
        expect(style).toContain("color: rgb(255, 255, 255)");
        expect(style).toContain("border: 1px solid rgb(21, 101, 192)");
        expect(style).toContain("border-radius: 4px");

    })
})
//const allExams = examData.map((exam) => `${exam.code} - ${exam.subject}`);
//screen.getByTestId(`exam-${exam!.id}`)).toBeInTheDocument()