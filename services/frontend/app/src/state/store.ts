import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

type ExamPrefs = {
  order: "asc" | "desc";
  orderBy: string;
  page: number;
  rowsPerPage: number;
  searchQuery: string;
  searchDraft: string;
};

type VenuePrefs = {
  order: "asc" | "desc";
  orderBy: string;
  page: number;
  rowsPerPage: number;
  searchQuery: string;
  searchDraft: string;
};

type StudentPrefs = {
  searchQuery: string;
  searchDraft: string;
  sortOrder: "asc" | "desc";
  sortBy: string;
};

type InvigilatorPrefs = {
  viewMode: "list" | "grid" | "calendar";
  firstLetter: string;
  lastLetter: string;
  searchQuery: string;
  searchDraft: string;
  sortField: "firstName" | "lastName";
  sortOrder: "asc" | "desc";
  page: number;
  showAll: boolean;
};

type CalendarPrefs = {
  viewMode: "grid" | "timeline";
  currentDate: string; // ISO date string
  searchQuery: string;
  page: number;
  searchDraft: string;
};

type DashboardPrefs = {
  selectedSchool: string;
  notificationQuery: string;
  selectedNotificationType: string | null;
  selectedInvigilatorId: number | null;
};

type AdminTableState = {
  exams: ExamPrefs;
  venues: VenuePrefs;
  students: StudentPrefs;
  invigilators: InvigilatorPrefs;
  calendar: CalendarPrefs;
  dashboard: DashboardPrefs;
};

const initialState: AdminTableState = {
  exams: {
    order: "asc",
    orderBy: "code",
    page: 0,
    rowsPerPage: 10,
    searchQuery: "",
    searchDraft: "",
  },
  venues: {
    order: "asc",
    orderBy: "name",
    page: 0,
    rowsPerPage: 10,
    searchQuery: "",
    searchDraft: "",
  },
  students: {
    searchQuery: "",
    searchDraft: "",
    sortOrder: "asc",
    sortBy: "student_name",
  },
  invigilators: {
    viewMode: "grid",
    firstLetter: "All",
    lastLetter: "All",
    searchQuery: "",
    searchDraft: "",
    sortField: "firstName",
    sortOrder: "asc",
    page: 1,
    showAll: false,
  },
  calendar: {
    viewMode: "grid",
    currentDate: "",
    searchQuery: "",
    page: 1,
    searchDraft: "",
  },
  dashboard: {
    selectedSchool: "",
    notificationQuery: "",
    selectedNotificationType: null,
    selectedInvigilatorId: null,
  },
};

const adminTablesSlice = createSlice({
  name: "adminTables",
  initialState,
  reducers: {
    setExamsPrefs(state, action: PayloadAction<Partial<ExamPrefs>>) {
      Object.assign(state.exams, action.payload);
    },
    setVenuesPrefs(state, action: PayloadAction<Partial<VenuePrefs>>) {
      Object.assign(state.venues, action.payload);
    },
    setStudentsPrefs(state, action: PayloadAction<Partial<StudentPrefs>>) {
      Object.assign(state.students, action.payload);
    },
    setInvigilatorsPrefs(state, action: PayloadAction<Partial<InvigilatorPrefs>>) {
      Object.assign(state.invigilators, action.payload);
    },
    setCalendarPrefs(state, action: PayloadAction<Partial<CalendarPrefs>>) {
      Object.assign(state.calendar, action.payload);
    },
    setDashboardPrefs(state, action: PayloadAction<Partial<DashboardPrefs>>) {
      Object.assign(state.dashboard, action.payload);
    },
    resetAdminPrefs(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setExamsPrefs,
  setVenuesPrefs,
  setStudentsPrefs,
  setInvigilatorsPrefs,
  setCalendarPrefs,
  setDashboardPrefs,
  resetAdminPrefs,
} = adminTablesSlice.actions;

// Factory so tests/components can get an isolated store instance when needed
export const createStoreInstance = () =>
  configureStore({
    reducer: {
      adminTables: adminTablesSlice.reducer,
    },
  });

// Default app-wide store
export const store = createStoreInstance();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
