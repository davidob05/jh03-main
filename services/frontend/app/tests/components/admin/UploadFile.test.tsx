import React from "react";
import {render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadFile } from "@/components/admin/UploadFile";
import { apiBaseUrl } from "@/utils/api";


vi.mock("@/utils/api", () => ({
    apiBaseUrl: "http://test-api"
}));
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<any>("@mui/material");

  return {
    ...actual,

    Select: ({ value, onChange, children }: any) => (
      <select
        data-testid="upload-type-select"
        value={value}
        onChange={onChange}
      >
        {children}
      </select>
    ),

    MenuItem: ({ value, children }: any) => (
      <option value={value}>{children}</option>
    ),
  };
});




describe("Components - UploadFile", () => {
    const mockFile = new File(["test"], "test.csv", {type: "text/csv"});

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it ("renders initial UI", () => {
        render(<UploadFile />);

        expect(screen.getByText("Upload Data")).toBeInTheDocument();
        expect(screen.getByText(/Select a file type and upload/i)).toBeInTheDocument();
        expect(screen.getByRole("button", {name:"Upload" })).toBeInTheDocument();
    });

    it ("enables file selection once upload type is chosen", () => {
        render(<UploadFile />);
        const chooseFileButton = screen.getByText("Choose File");
        expect(chooseFileButton).toHaveAttribute("aria-disabled", "true");

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "exam" },
        });
        expect(chooseFileButton).not.toHaveAttribute("aria-disabled");
    });
    it ("shows selected file name after choosing a file", async () => {
        render(<UploadFile />);

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "provisions" },
        });

        const input = screen.getByTestId("file-upload") as HTMLInputElement;
        await userEvent.upload(input, mockFile);

        expect(screen.getByText("test.csv")).toBeInTheDocument();
    });
    it ("disables Upload button until type and file are chosen", async () => {
        render(<UploadFile />);
        const uploadButton = screen.getByRole("button", { name: /upload/i });
        expect(uploadButton).toBeDisabled();

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "exam" },
        });
        expect(uploadButton).toBeDisabled();

        const input = screen.getByTestId("file-upload") as HTMLInputElement;
        await userEvent.upload(input, new File(["x"], "test.csv"));
        expect(uploadButton).not.toBeDisabled();
    });


    it ("uploads file successfully and shows success message", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ count: 5 })
        }) as any;

        render(<UploadFile />);

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "exam" },
        });

        const input = screen.getByTestId("file-upload") as HTMLInputElement;
        await userEvent.upload(input, mockFile);

        await userEvent.click(screen.getByRole("button", { name: /upload/i }));

        expect(await screen.findByText(
        "Successfully uploaded test.csv. 5 records added to database."
        )).toBeInTheDocument();

        expect(fetch).toHaveBeenCalledWith(
            "http://test-api/exams-upload",
            expect.objectContaining({
                method: "POST"
            })
        );
    });
    it ("shows error message when upload fails", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false
        }) as any;

        render(<UploadFile />);

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "invigilators" },
        });

        const input = screen.getByTestId("file-upload") as HTMLInputElement;
        await userEvent.upload(input, mockFile);

        await userEvent.click(screen.getByRole("button", { name: /upload/i}));

        expect(await screen.findByText("Upload failed")).toBeInTheDocument();
    });
    it ("shows generic error when fetch throws", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as any;

        render(<UploadFile />);

        fireEvent.change(screen.getByTestId("upload-type-select"), {
            target: { value: "exam" },
        });

        const input = screen.getByTestId("file-upload") as HTMLInputElement;
        await userEvent.upload(input, new File(["x"], "test.csv"));

        await userEvent.click(screen.getByRole("button", { name: "Upload" }));

        expect(await screen.findByText("Network error")).toBeInTheDocument();
    });

    it("shows spinner instead of upload icon while uploading", async () => {
    let resolveFetch!: (value: any) => void;

    global.fetch = vi.fn().mockImplementation(
        () => new Promise((res) => (resolveFetch = res))
    ) as any;

    render(<UploadFile />);

    // Select upload type (native select mock)
    fireEvent.change(screen.getByTestId("upload-type-select"), {
        target: { value: "exam" },
    });

    // Upload file
    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    await userEvent.upload(input, new File(["test"], "test.csv"));

    // Start upload
    const uploadButton = screen.getByRole("button", { name: /upload/i });
    await userEvent.click(uploadButton);

    // Assertions while uploading
    expect(screen.getByText("Uploading...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(uploadButton).toBeDisabled();

    // Resolve fetch
    resolveFetch({
        ok: true,
        json: async () => ({ count: 1 }),
    });

    // Final success state
    expect(
        await screen.findByText(
            "Successfully uploaded test.csv. 1 records added to database."
        )
    ).toBeInTheDocument();
});

    it("clears the file input after successful upload", async () => {
    let resolveFetch!: (value: any) => void;

    global.fetch = vi.fn().mockImplementation(
        () => new Promise((res) => (resolveFetch = res))
    ) as any;

    render(<UploadFile />);

    fireEvent.change(screen.getByTestId("upload-type-select"), {
        target: { value: "exam" },
    });

    const input = screen.getByTestId("file-upload") as HTMLInputElement;
    await userEvent.upload(input, new File(["x"], "test.csv"));

    await userEvent.click(screen.getByRole("button", { name: /upload/i }));

    resolveFetch({
        ok: true,
        json: async () => ({ count: 1 }),
    });

    await waitFor(() => {
        expect(input.value).toBe("");
    });
    });

    it("handles zero-byte file upload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ count: 0 }),
    }) as any;

    render(<UploadFile />);

    fireEvent.change(screen.getByTestId("upload-type-select"), {
        target: { value: "exam" },
    });

    const zeroByteFile = new File([""], "empty.csv", { type: "text/csv" });
    const fileInput = screen.getByTestId("file-upload") as HTMLInputElement;

    await userEvent.upload(fileInput, zeroByteFile);

    await userEvent.click(screen.getByRole("button", { name: /upload/i }));

    expect(
        await screen.findByText(
        "Successfully uploaded empty.csv. 0 records added to database."
        )
    ).toBeInTheDocument();
    });

})