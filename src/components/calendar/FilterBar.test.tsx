import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import FilterBar from "@/components/calendar/FilterBar";
import { FAMILY_MEMBERS, FAMILY_MEMBER_IDS, type MemberId } from "@/types/index";

function renderFilterBar(activeFilter: MemberId[] | "all" = "all", onFilterChange = vi.fn()) {
  return {
    onFilterChange,
    ...render(<FilterBar members={[...FAMILY_MEMBERS].reverse()} activeFilter={activeFilter} onFilterChange={onFilterChange} />),
  };
}

describe("FilterBar", () => {
  it("renders ALL plus one chip per family member", () => {
    renderFilterBar();

    expect(screen.getAllByRole("button")).toHaveLength(8);
  });

  it("renders chips with the correct member names", () => {
    renderFilterBar();

    for (const member of FAMILY_MEMBERS) {
      expect(screen.getByRole("button", { name: member.name })).toBeTruthy();
    }
  });

  it("orders member chips by household order even when members are passed unsorted", () => {
    renderFilterBar();

    const labels = screen.getAllByRole("button").map((button) => button.textContent?.trim());

    expect(labels).toEqual(["All", ...FAMILY_MEMBERS.map((member) => member.name)]);
  });

  it("marks the ALL chip as pressed when the active filter is all", () => {
    renderFilterBar("all");

    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Tyler" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("marks only the active member chips as pressed for subset filters", () => {
    renderFilterBar(["tyler", "erin"]);

    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "Tyler" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Erin" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Heather" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("removes a member from the implicit all-family filter when their chip is clicked", () => {
    const { onFilterChange } = renderFilterBar("all");

    fireEvent.click(screen.getByRole("button", { name: "Heather" }));

    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(FAMILY_MEMBER_IDS.filter((memberId) => memberId !== "heather"));
  });

  it("resets to all when ALL is clicked from a subset", () => {
    const { onFilterChange } = renderFilterBar(["tyler", "erin"]);

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(onFilterChange).toHaveBeenCalledWith("all");
  });

  it("removes an active member from an existing subset", () => {
    const { onFilterChange } = renderFilterBar(["tyler", "erin", "leo"]);

    fireEvent.click(screen.getByRole("button", { name: "Erin" }));

    expect(onFilterChange).toHaveBeenCalledWith(["tyler", "leo"]);
  });

  it("adds an inactive member to an existing subset in family order", () => {
    const { onFilterChange } = renderFilterBar(["erin", "leo"]);

    fireEvent.click(screen.getByRole("button", { name: "Tyler" }));

    expect(onFilterChange).toHaveBeenCalledWith(["tyler", "erin", "leo"]);
  });

  it("normalizes an empty selection back to all", () => {
    const { onFilterChange } = renderFilterBar(["tyler"]);

    fireEvent.click(screen.getByRole("button", { name: "Tyler" }));

    expect(onFilterChange).toHaveBeenCalledWith("all");
  });

  it("normalizes a fully selected subset back to all", () => {
    const nearlyAll = FAMILY_MEMBER_IDS.filter((memberId) => memberId !== "lily");
    const { onFilterChange } = renderFilterBar(nearlyAll);

    fireEvent.click(screen.getByRole("button", { name: "Lily" }));

    expect(onFilterChange).toHaveBeenCalledWith("all");
  });
});
