/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

import { LandingBackRedirect } from "@/components/layout/landing-back-redirect";

describe("LandingBackRedirect", () => {
  it("redirects to the login page when the browser back button is pressed", () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    render(<LandingBackRedirect />);
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(pushStateSpy).toHaveBeenCalledWith(
      { landingBackRedirect: true },
      "",
      window.location.href,
    );
    expect(replace).toHaveBeenCalledWith("/login");

    pushStateSpy.mockRestore();
  });
});
