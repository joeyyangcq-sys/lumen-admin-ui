import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResourceJsonDrawer } from "./ResourceJsonDrawer";

describe("<ResourceJsonDrawer>", () => {
  it("renders the editor pre-populated and is hidden when closed", () => {
    const { rerender, container } = render(
      <ResourceJsonDrawer
        open={false}
        mode="view"
        title="route-1"
        initialJson="{}"
        readOnly
        onClose={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();

    rerender(
      <ResourceJsonDrawer
        open
        mode="view"
        title="route-1"
        initialJson='{"id":"r1"}'
        readOnly
        onClose={() => {}}
      />,
    );
    const textarea = screen.getByRole<HTMLTextAreaElement>("textbox");
    expect(textarea).toHaveValue('{"id":"r1"}');
    expect(textarea).toHaveAttribute("readonly");
  });

  it("blocks save and shows the parse-error alert when JSON is malformed", async () => {
    const onSubmit = vi.fn();
    render(
      <ResourceJsonDrawer
        open
        mode="create"
        title="New route"
        initialJson="not json"
        readOnly={false}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // Tight assertion via data-error-type — independent of the V8/jsdom
    // phrasing of the underlying JSON.parse message. parseResourceJson.test.ts
    // covers the message itself.
    const alert = await screen.findByTestId("json-parse-error");
    expect(alert).toHaveAttribute("data-error-type", "invalid_json");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects array roots — the gateway expects a JSON object", async () => {
    const onSubmit = vi.fn();
    render(
      <ResourceJsonDrawer
        open
        mode="create"
        title="New route"
        initialJson="[]"
        readOnly={false}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    const alert = await screen.findByTestId("json-parse-error");
    expect(alert).toHaveAttribute("data-error-type", "non_object_root");
    expect(alert).toHaveTextContent("JSON root must be an object");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with parsed JSON and closes on success", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    render(
      <ResourceJsonDrawer
        open
        mode="create"
        title="New route"
        initialJson='{"id":"r1","uri":"/x"}'
        readOnly={false}
        onSubmit={onSubmit}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ id: "r1", uri: "/x" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("renders the API error message when onSubmit throws", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("conflict"));
    render(
      <ResourceJsonDrawer
        open
        mode="create"
        title="New route"
        initialJson='{"id":"r1"}'
        readOnly={false}
        onSubmit={onSubmit}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    const alert = await screen.findByTestId("json-submit-error");
    expect(alert).toHaveTextContent("conflict");
  });
});
