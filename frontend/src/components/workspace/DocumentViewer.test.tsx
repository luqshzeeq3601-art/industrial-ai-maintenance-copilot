import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DocumentViewer } from "./DocumentViewer";
import { stubFetch } from "../../test/fetch";

describe("DocumentViewer", () => {
  it("renders the cited manual as markdown", async () => {
    const fetchMock = stubFetch([[/\/api\/documents\/sop_spindle_bearing_replacement\.md$/, () => new Response("# Spindle bearings\n\n1. Apply **LOTO**\n2. Remove the drawbar")]]);
    render(<DocumentViewer apiBase="" citation={{ source: "sop_spindle_bearing_replacement.md", snippet: "Apply LOTO" }} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "SOP spindle bearing replacement" })).toBeInTheDocument();
    // The markdown renderer is lazy-loaded; the first import can be slow under the test transformer
    expect(await screen.findByRole("heading", { name: "Spindle bearings" }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText("LOTO").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows an error when the document can't be loaded", async () => {
    stubFetch([[/\/api\/documents\//, () => new Response("", { status: 404 })]]);
    render(<DocumentViewer apiBase="" citation={{ source: "missing.md" }} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't be loaded");
  });

  it("never requests a source that isn't a plain markdown file name", () => {
    const fetchMock = stubFetch([]);
    render(<DocumentViewer apiBase="" citation={{ source: "../../.env", snippet: "cited text" }} onClose={vi.fn()} />);
    expect(screen.getByText("cited text")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
