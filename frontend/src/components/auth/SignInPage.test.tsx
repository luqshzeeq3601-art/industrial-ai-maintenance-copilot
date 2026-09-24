import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInPage } from "./SignInPage";
import { axeViolations } from "../../test/axe";

function renderPage(props: Partial<Parameters<typeof SignInPage>[0]> = {}) {
  const onLoginSuccess = vi.fn();
  const onClose = vi.fn();
  const utils = render(<SignInPage apiBase="" onLoginSuccess={onLoginSuccess} onClose={onClose} {...props} />);
  return { ...utils, onLoginSuccess, onClose };
}

describe("SignInPage", () => {
  it("has no axe violations", async () => {
    const { container } = renderPage({ sessionExpired: true });
    expect(await axeViolations(container)).toEqual([]);
  });

  it("asks for both fields before calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your username and password.");
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks both fields and clears the password on wrong credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    const { onLoginSuccess } = renderPage();
    await userEvent.type(screen.getByLabelText("Username"), "tech1");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Username or password is incorrect.");
    expect(screen.getByLabelText("Username")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByLabelText("Password")).toHaveFocus();
    expect(onLoginSuccess).not.toHaveBeenCalled();
  });

  it("signs in and closes on success", async () => {
    const user = { user_id: "1", username: "tech1", full_name: "Tech One", role: "technician" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(user), { status: 200 })));
    const { onLoginSuccess, onClose } = renderPage();
    await userEvent.type(screen.getByLabelText("Username"), "tech1");
    await userEvent.type(screen.getByLabelText("Password"), "TechPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(user));
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on Escape, and explains an expired session", async () => {
    const { onClose } = renderPage({ sessionExpired: true });
    expect(screen.getByRole("status")).toHaveTextContent("Your session expired");
    await userEvent.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("warns when Caps Lock is on", async () => {
    renderPage();
    const password = screen.getByLabelText("Password");
    await userEvent.click(password);
    await userEvent.keyboard("{CapsLock}A");
    expect(screen.getByText("Caps Lock is on.")).toBeInTheDocument();
    expect(password.getAttribute("aria-describedby")).toContain("signin-caps");
  });
});
