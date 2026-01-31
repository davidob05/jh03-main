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

type AssignInvigilatorInputs = {
  start: string;
  end: string;
  role: string;
};

type AssignInvigilatorDraft = {
  selectedIds: number[];
  search: string;
  onlyAvailable: boolean;
  expandedIds: number[];
  assignmentInputs: Record<number, AssignInvigilatorInputs>;
  initialized?: boolean;
};

type VenueDialogDraft = {
  venueName: string;
  capacity: number | "";
  venueType: string;
  isAccessible: boolean;
  provisions: string[];
  initialized?: boolean;
};

type ExamVenueDraft = {
  id: number | string;
  venue_name: string;
  start_time: string;
  exam_length: number | null;
  provision_capabilities: string[];
};

type ExamDialogDraft = {
  name: string;
  code: string;
  examType: string;
  students: number | "";
  school: string;
  contact: string;
  mainVenue: string;
  mainStart: string;
  mainLength: number | "";
  mainProvisions: string[];
  extraVenues: ExamVenueDraft[];
  initialized?: boolean;
};

type ExamDialogState = {
  add: ExamDialogDraft;
  edit: Record<number, ExamDialogDraft>;
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
  examDialogs: ExamDialogState;
  assignInvigilatorDialogs: Record<number, AssignInvigilatorDraft>;
  venueDialogs: {
    add: VenueDialogDraft;
    edit: Record<string, VenueDialogDraft>;
  };
  dashboard: DashboardPrefs;
};

const emptyExamDraft: ExamDialogDraft = {
  name: "",
  code: "",
  examType: "",
  students: "",
  school: "",
  contact: "",
  mainVenue: "",
  mainStart: "",
  mainLength: "",
  mainProvisions: [],
  extraVenues: [],
};

const emptyVenueDraft: VenueDialogDraft = {
  venueName: "",
  capacity: "",
  venueType: "",
  isAccessible: true,
  provisions: [],
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
  examDialogs: {
    add: { ...emptyExamDraft },
    edit: {},
  },
  assignInvigilatorDialogs: {},
  venueDialogs: {
    add: { ...emptyVenueDraft },
    edit: {},
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
    setAssignInvigilatorDraft(
      state,
      action: PayloadAction<{ key: number; draft: Partial<AssignInvigilatorDraft> }>
    ) {
      const { key, draft } = action.payload;
      state.assignInvigilatorDialogs[key] = {
        ...(state.assignInvigilatorDialogs[key] || {
          selectedIds: [],
          search: "",
          onlyAvailable: true,
          expandedIds: [],
          assignmentInputs: {},
        }),
        ...draft,
      };
    },
    resetAssignInvigilatorDraft(state, action: PayloadAction<number>) {
      delete state.assignInvigilatorDialogs[action.payload];
    },
    setAddVenueDraft(state, action: PayloadAction<Partial<VenueDialogDraft>>) {
      Object.assign(state.venueDialogs.add, action.payload);
    },
    resetAddVenueDraft(state) {
      state.venueDialogs.add = { ...emptyVenueDraft };
    },
    setEditVenueDraft(
      state,
      action: PayloadAction<{ venueId: string; draft: Partial<VenueDialogDraft> }>
    ) {
      const { venueId, draft } = action.payload;
      state.venueDialogs.edit[venueId] = {
        ...(state.venueDialogs.edit[venueId] || { ...emptyVenueDraft }),
        ...draft,
      };
    },
    resetEditVenueDraft(state, action: PayloadAction<string>) {
      delete state.venueDialogs.edit[action.payload];
    },
    setAddExamDraft(state, action: PayloadAction<Partial<ExamDialogDraft>>) {
      Object.assign(state.examDialogs.add, action.payload);
    },
    resetAddExamDraft(state) {
      state.examDialogs.add = { ...emptyExamDraft };
    },
    setEditExamDraft(
      state,
      action: PayloadAction<{ examId: number; draft: Partial<ExamDialogDraft> }>
    ) {
      const { examId, draft } = action.payload;
      state.examDialogs.edit[examId] = {
        ...(state.examDialogs.edit[examId] || { ...emptyExamDraft }),
        ...draft,
      };
    },
    resetEditExamDraft(state, action: PayloadAction<number>) {
      delete state.examDialogs.edit[action.payload];
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
  setAssignInvigilatorDraft,
  resetAssignInvigilatorDraft,
  setAddVenueDraft,
  resetAddVenueDraft,
  setEditVenueDraft,
  resetEditVenueDraft,
  setAddExamDraft,
  resetAddExamDraft,
  setEditExamDraft,
  resetEditExamDraft,
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
