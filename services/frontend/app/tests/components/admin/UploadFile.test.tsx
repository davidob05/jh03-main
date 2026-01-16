import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadFile } from "@/components/admin/UploadFile";
import { apiFetch, apiBaseUrl } from "@/utils/api";

// Mock MUI Select/MenuItem to work in tests
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<any>("@mui/material");
  return {
    ...actual,
    Select: ({ value, onChange, children }: any) => (
      <select data-testid="upload-type-select" value={value} onChange={onChange}>
        {children}
      </select>
    ),
    MenuItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  };
});

// Mock apiBaseUrl and apiFetch
vi.mock("@/utils/api", () => ({
  apiBaseUrl: "http://test-api",
  apiFetch: vi.fn(),
}));

describe("Components - UploadFile", () => {
  const mockFile = new File(["test"], "test.csv", { type: "text/csv" });
  const uploadWithFireEvent = (input: HTMLInputElement, file: File) => {
    fireEvent.change(input, { target: { files: [file] } });
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders initial UI", () => {
    render(<UploadFile />);

    expect(screen.getByText("Upload data")).toBeInTheDocument();
    expect(screen.getByText(/Select a file type and upload/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Upload/i })).toBeDisabled();
  });

  it("enables file selection once upload type is chosen", () => {
    render(<UploadFile />);
    const chooseFileButton = screen.getByText("Choose File");

    expect(chooseFileButton).toHaveAttribute("aria-disabled", "true");

    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    expect(chooseFileButton).not.toHaveAttribute("aria-disabled");
  });

  it("shows selected file name after choosing a file", async () => {
    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "provisions" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    expect(screen.getByText("test.csv")).toBeInTheDocument();
  });

  it("enables Upload button only after type and file are selected", async () => {
    render(<UploadFile />);
    const uploadButton = screen.getByRole("button", { name: /upload/i });
    expect(uploadButton).toBeDisabled();

    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });
    expect(uploadButton).toBeDisabled();

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);
    expect(uploadButton).not.toBeDisabled();
  });

  it("uploads file successfully and shows success message", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ records_created: 5, records_updated: 2, records_deleted: 1 }),
    });

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(await screen.findByText((content) =>
      content.includes("Upload complete: Exam timetable (test.csv). Added 5, Updated 2, Deleted 1.")
    )).toBeInTheDocument();

    expect(apiFetch).toHaveBeenCalledWith(
      "http://test-api/exams-upload",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows error message when upload fails", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({ ok: false });

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(await screen.findByText("Upload failed")).toBeInTheDocument();
  });

  it("shows generic error when apiFetch throws", async () => {
    (apiFetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("shows spinner while uploading", async () => {
    let resolveFetch!: (value: any) => void;
    (apiFetch as jest.Mock).mockImplementation(
      () => new Promise((res) => (resolveFetch = res))
    );

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    const uploadButton = screen.getByRole("button", { name: /upload/i });
    fireEvent.click(uploadButton);

    // Button shows uploading spinner
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(uploadButton).toBeDisabled();

    // Resolve fetch
    resolveFetch({ ok: true, json: async () => ({ records_created: 1 }) });

    expect(await screen.findByText((content) =>
      content.includes("Upload complete: Exam timetable (test.csv). Added 1")
    )).toBeInTheDocument();
  });

  it("clears file input after successful upload", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ records_created: 1 }),
    });

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, mockFile);

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    await waitFor(() => expect(input.value).toBe(""));
  });

  it("handles zero-byte file upload", async () => {
    (apiFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ records_created: 0, records_updated: 0, records_deleted: 0 }),
    });

    render(<UploadFile />);
    fireEvent.change(screen.getByTestId("upload-type-select"), { target: { value: "exam" } });

    const zeroByteFile = new File([""], "empty.csv", { type: "text/csv" });
    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    uploadWithFireEvent(input, zeroByteFile);

    fireEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(await screen.findByText((content) =>
      content.includes("Upload complete: Exam timetable (empty.csv). Added 0, Updated 0")
    )).toBeInTheDocument();
  });
});
