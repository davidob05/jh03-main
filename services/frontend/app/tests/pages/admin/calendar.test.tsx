import { BrowserRouter } from "react-router-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";


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
// ExamData mock
// -------------------------


// -------------------------
// Safe mock: override only examData
// -------------------------
vi.mock("@/pages/admin/Calendar", async () => {
  const actual = await vi.importActual<typeof import("@/pages/admin/Calendar")>(
    "@/pages/admin/Calendar"
  );

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
];
  return {
    ...actual,
    examData: mockExamData,
  };
});


import { AdminCalendar, examData } from "@/pages/admin/Calendar";

// Render router
const renderWithRouter = (ui: React.ReactNode) =>
    render(<BrowserRouter>{ui}</BrowserRouter>);

// Set up fake time/date
beforeEach(() => {
    vi.useRealTimers();
});
afterEach(() => {
  vi.useRealTimers();
})

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
    // Rendering tests
    it ("renders the title", () => {
        renderWithRouter(<AdminCalendar />);
        expect(screen.getByText("Exams Calendar")).toBeInTheDocument();
    });
    it ("renders initial date", () => {
      vi.useFakeTimers(); 
      vi.setSystemTime(new Date("2025-11-15T09:00:00"));
      renderWithRouter(<AdminCalendar />);
      const header = screen.getByTestId("date-header");
      expect(header).toHaveTextContent(/Saturday/i);
      expect(header).toHaveTextContent(/15/);
      expect(header).toHaveTextContent(/November/);
      expect(header).toHaveTextContent(/2025/);  
    });
    // Runs once for each day, test that only exams on that day are displayed
    it.each(allDays)("correctly shows exams for %s (or none if empty", (targetDateStr) =>{
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2025-12-11T09:00"));  
      
      renderWithRouter(<AdminCalendar/>);
      const targetDate = new Date(targetDateStr);
      const headerText = screen.getByTestId("date-header").textContent!;
      const currentDate = new Date(headerText);
      const dayDiff = Math.round((targetDate.getTime()-currentDate.getTime())/(1000*60*60*24));
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
      vi.useFakeTimers(); 
      vi.setSystemTime(new Date("2025-11-15T09:00:00"));
      renderWithRouter(<AdminCalendar />);
      fireEvent.click(screen.getByRole("button", {name: /Next/i}));
      const dateHeader = screen.getByTestId("date-header");
      expect(dateHeader).toHaveTextContent(/Sunday/i);
      expect(dateHeader).toHaveTextContent(/16/);
      expect(dateHeader).toHaveTextContent(/November/);
      expect(dateHeader).toHaveTextContent(/2025/);    
    });
    it ("moves to the previous day when clicked", () => {
      vi.useFakeTimers(); 
      vi.setSystemTime(new Date("2025-11-15T09:00:00"));
      renderWithRouter(<AdminCalendar />);
      fireEvent.click(screen.getByRole("button", { name: /Previous/i }));
      const dateHeader = screen.getByTestId("date-header");
      expect(dateHeader).toHaveTextContent(/Friday/i);
      expect(dateHeader).toHaveTextContent(/14/);
      expect(dateHeader).toHaveTextContent(/November/);
      expect(dateHeader).toHaveTextContent(/2025/);    
    });
    it ("set calendar to today when today clicked", () => {
      vi.useFakeTimers(); 
      vi.setSystemTime(new Date("2025-11-15T09:00:00"));
      renderWithRouter(<AdminCalendar />);
      fireEvent.click(screen.getByRole("button", { name: /Today/i }));
      const dateHeader = screen.getByTestId("date-header");
      expect(dateHeader).toHaveTextContent(/Saturday/i);
      expect(dateHeader).toHaveTextContent(/15/);
      expect(dateHeader).toHaveTextContent(/November/);
      expect(dateHeader).toHaveTextContent(/2025/);
    });  

    // Style
    it ("correct style properties applied", async () => {
        vi.setSystemTime(new Date("2025-12-10T09:00:00"));  
        renderWithRouter(<AdminCalendar />);

        const timelineBtn = screen.getByTestId("timeline-btn");
        fireEvent.mouseDown(timelineBtn);
        fireEvent.mouseUp(timelineBtn);
        fireEvent.click(timelineBtn);
        const exam = examData[0];
        const item = await screen.findByText(new RegExp(exam.code, "i"));
        const style = window.getComputedStyle(item);

        expect(style.backgroundColor).toBe("rgb(76, 175, 80)");
        expect(style.color).toBe("rgb(255, 255, 255)");
        expect(style.border).toBe("");
        expect(style.borderRadius).not.toBe("");
    });
});