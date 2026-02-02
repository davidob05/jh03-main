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

type InvigilatorDialogDraft = {
  activeStep: number;
  preferredName: string;
  fullName: string;
  loginUsername: string;
  tempPassword: string;
  showPassword: boolean;
  mobile: string;
  mobileTextOnly: string;
  altPhone: string;
  universityEmail: string;
  personalEmail: string;
  contractedHours: string;
  notes: string;
  qualifications: string[];
  restrictions: string[];
  resigned: boolean;
  availabilityDiets: string[];
  initialized?: boolean;
};

type AnnouncementDialogDraft = {
  title: string;
  body: string;
  audience: "" | "invigilator" | "all";
  imageData: string;
  imageName: string | null;
  publishedAt: string;
  expiresAt: string;
  priority: number | "";
  isActive: boolean;
  error: string | null;
};

type DietManagerDiet = {
  id: number;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  restriction_cutoff: string | null;
  is_active: boolean;
};

type DietDraft = {
  id?: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  restriction_cutoff: string;
  is_active: boolean;
};

type DietManagerDraft = {
  dialogOpen: boolean;
  draft: DietDraft;
  error: string;
  dietToDelete: DietManagerDiet | null;
  snackbar: { open: boolean; message: string };
};

type UploadFileDraft = {
  uploadType: string;
  uploading: boolean;
  snackbar: { type: "success" | "error" | null; message: string };
};

type ExportInvigilatorDialogDraft = {
  onlyConfirmed: boolean;
  includeCancelled: boolean;
  includeProvisions: boolean;
};

type NotifyDialogDraft = {
  subject: string;
  message: string;
  error: string | null;
};

type ExamsPageUi = {
  addOpen: boolean;
  deleteOpen: boolean;
  deleteTargetIds: number[];
  deleteError: string | null;
};

type ExamPageUi = {
  editOpen: boolean;
  successOpen: boolean;
  successMessage: string;
  deleteOpen: boolean;
  deleting: boolean;
  assignOpen: boolean;
  assignVenueId: number | null;
};

type AddExamUi = {
  snackbarOpen: boolean;
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
  invigilatorDialogs: {
    add: InvigilatorDialogDraft;
    edit: Record<number, InvigilatorDialogDraft>;
  };
  announcementDialog: AnnouncementDialogDraft;
  dietManager: DietManagerDraft;
  uploadFile: UploadFileDraft;
  exportInvigilatorDialog: ExportInvigilatorDialogDraft;
  notifyDialog: NotifyDialogDraft;
  examsPage: ExamsPageUi;
  examPage: ExamPageUi;
  addExamUi: AddExamUi;
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

const emptyInvigilatorDraft: InvigilatorDialogDraft = {
  activeStep: 0,
  preferredName: "",
  fullName: "",
  loginUsername: "",
  tempPassword: "TempPass123!",
  showPassword: false,
  mobile: "",
  mobileTextOnly: "",
  altPhone: "",
  universityEmail: "",
  personalEmail: "",
  contractedHours: "100",
  notes: "",
  qualifications: [],
  restrictions: [],
  resigned: false,
  availabilityDiets: [],
};

const emptyAnnouncementDraft: AnnouncementDialogDraft = {
  title: "",
  body: "",
  audience: "",
  imageData: "",
  imageName: null,
  publishedAt: "",
  expiresAt: "",
  priority: "",
  isActive: true,
  error: null,
};

const emptyDietDraft: DietDraft = {
  code: "",
  name: "",
  start_date: "",
  end_date: "",
  restriction_cutoff: "",
  is_active: true,
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
  invigilatorDialogs: {
    add: { ...emptyInvigilatorDraft },
    edit: {},
  },
  announcementDialog: { ...emptyAnnouncementDraft },
  dietManager: {
    dialogOpen: false,
    draft: { ...emptyDietDraft },
    error: "",
    dietToDelete: null,
    snackbar: { open: false, message: "" },
  },
  uploadFile: {
    uploadType: "",
    uploading: false,
    snackbar: { type: null, message: "" },
  },
  exportInvigilatorDialog: {
    onlyConfirmed: false,
    includeCancelled: false,
    includeProvisions: false,
  },
  notifyDialog: {
    subject: "",
    message: "",
    error: null,
  },
  examsPage: {
    addOpen: false,
    deleteOpen: false,
    deleteTargetIds: [],
    deleteError: null,
  },
  examPage: {
    editOpen: false,
    successOpen: false,
    successMessage: "",
    deleteOpen: false,
    deleting: false,
    assignOpen: false,
    assignVenueId: null,
  },
  addExamUi: {
    snackbarOpen: false,
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
    setAddInvigilatorDraft(state, action: PayloadAction<Partial<InvigilatorDialogDraft>>) {
      Object.assign(state.invigilatorDialogs.add, action.payload);
    },
    resetAddInvigilatorDraft(state) {
      state.invigilatorDialogs.add = { ...emptyInvigilatorDraft };
    },
    setEditInvigilatorDraft(
      state,
      action: PayloadAction<{ invigilatorId: number; draft: Partial<InvigilatorDialogDraft> }>
    ) {
      const { invigilatorId, draft } = action.payload;
      state.invigilatorDialogs.edit[invigilatorId] = {
        ...(state.invigilatorDialogs.edit[invigilatorId] || { ...emptyInvigilatorDraft }),
        ...draft,
      };
    },
    resetEditInvigilatorDraft(state, action: PayloadAction<number>) {
      delete state.invigilatorDialogs.edit[action.payload];
    },
    setAnnouncementDraft(state, action: PayloadAction<Partial<AnnouncementDialogDraft>>) {
      Object.assign(state.announcementDialog, action.payload);
    },
    resetAnnouncementDraft(state) {
      state.announcementDialog = { ...emptyAnnouncementDraft };
    },
    setDietManagerDraft(state, action: PayloadAction<Partial<DietManagerDraft>>) {
      Object.assign(state.dietManager, action.payload);
    },
    setUploadFileDraft(state, action: PayloadAction<Partial<UploadFileDraft>>) {
      Object.assign(state.uploadFile, action.payload);
    },
    setExportInvigilatorDialogDraft(state, action: PayloadAction<Partial<ExportInvigilatorDialogDraft>>) {
      Object.assign(state.exportInvigilatorDialog, action.payload);
    },
    resetExportInvigilatorDialogDraft(state) {
      state.exportInvigilatorDialog = {
        onlyConfirmed: false,
        includeCancelled: false,
        includeProvisions: false,
      };
    },
    setNotifyDialogDraft(state, action: PayloadAction<Partial<NotifyDialogDraft>>) {
      Object.assign(state.notifyDialog, action.payload);
    },
    resetNotifyDialogDraft(state) {
      state.notifyDialog = { subject: "", message: "", error: null };
    },
    setExamsPageUi(state, action: PayloadAction<Partial<ExamsPageUi>>) {
      Object.assign(state.examsPage, action.payload);
    },
    resetExamsPageUi(state) {
      state.examsPage = {
        addOpen: false,
        deleteOpen: false,
        deleteTargetIds: [],
        deleteError: null,
      };
    },
    setExamPageUi(state, action: PayloadAction<Partial<ExamPageUi>>) {
      Object.assign(state.examPage, action.payload);
    },
    resetExamPageUi(state) {
      state.examPage = {
        editOpen: false,
        successOpen: false,
        successMessage: "",
        deleteOpen: false,
        deleting: false,
        assignOpen: false,
        assignVenueId: null,
      };
    },
    setAddExamUi(state, action: PayloadAction<Partial<AddExamUi>>) {
      Object.assign(state.addExamUi, action.payload);
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
  setAddInvigilatorDraft,
  resetAddInvigilatorDraft,
  setEditInvigilatorDraft,
  resetEditInvigilatorDraft,
  setAnnouncementDraft,
  resetAnnouncementDraft,
  setDietManagerDraft,
  setUploadFileDraft,
  setExportInvigilatorDialogDraft,
  resetExportInvigilatorDialogDraft,
  setNotifyDialogDraft,
  resetNotifyDialogDraft,
  setExamsPageUi,
  resetExamsPageUi,
  setExamPageUi,
  resetExamPageUi,
  setAddExamUi,
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
