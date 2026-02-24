import { render, screen } from "@testing-library/react";
import {
  BulletList,
  NumberedList,
  LevelBadge,
  SourceTag,
  toStringItem,
  toStringArray,
  getItemLevel,
} from "@/components/FicheHelpers";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, style }: any) => (
      <div className={className} style={style}>
        {children}
      </div>
    ),
  },
}));

// Mock IntersectionObserver (not available in jsdom)
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

describe("toStringItem", () => {
  it("returns string as-is", () => {
    expect(toStringItem("hello")).toBe("hello");
  });

  it("extracts nom from object", () => {
    expect(toStringItem({ nom: "Programmation" })).toBe("Programmation");
  });

  it("converts other types to string", () => {
    expect(toStringItem(42)).toBe("42");
  });

  it("handles null", () => {
    expect(toStringItem(null)).toBe("null");
  });
});

describe("toStringArray", () => {
  it("converts array of strings", () => {
    expect(toStringArray(["a", "b"])).toEqual(["a", "b"]);
  });

  it("converts array of objects with nom", () => {
    expect(toStringArray([{ nom: "A" }, { nom: "B" }])).toEqual(["A", "B"]);
  });

  it("returns empty array for null/undefined", () => {
    expect(toStringArray(null as any)).toEqual([]);
    expect(toStringArray(undefined as any)).toEqual([]);
    expect(toStringArray([])).toEqual([]);
  });
});

describe("getItemLevel", () => {
  it("returns niveau from object", () => {
    expect(getItemLevel({ nom: "x", niveau: "avance" })).toBe("avance");
  });

  it("returns importance from object", () => {
    expect(getItemLevel({ nom: "x", importance: "haute" })).toBe("haute");
  });

  it("returns null for string", () => {
    expect(getItemLevel("hello")).toBeNull();
  });

  it("returns null for object without niveau/importance", () => {
    expect(getItemLevel({ nom: "x" })).toBeNull();
  });
});

describe("LevelBadge", () => {
  it("renders nothing for null level", () => {
    const { container } = render(<LevelBadge level={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders badge for valid level", () => {
    render(<LevelBadge level="avancé" />);
    expect(screen.getByText("avancé")).toBeInTheDocument();
  });

  it("renders badge with fallback style for unknown level", () => {
    render(<LevelBadge level="custom" />);
    expect(screen.getByText("custom")).toBeInTheDocument();
  });
});

describe("BulletList", () => {
  it("renders items", () => {
    render(<BulletList items={["Item 1", "Item 2", "Item 3"]} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("renders object items with nom", () => {
    render(<BulletList items={[{ nom: "Skill A" }, { nom: "Skill B" }]} />);
    expect(screen.getByText("Skill A")).toBeInTheDocument();
    expect(screen.getByText("Skill B")).toBeInTheDocument();
  });
});

describe("NumberedList", () => {
  it("renders numbered items", () => {
    render(<NumberedList items={["First", "Second"]} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders items with level badges", () => {
    render(
      <NumberedList
        items={[{ nom: "Skill", niveau: "avancé" }]}
      />
    );
    expect(screen.getByText("Skill")).toBeInTheDocument();
    expect(screen.getByText("avancé")).toBeInTheDocument();
  });
});

describe("SourceTag", () => {
  it("renders children", () => {
    render(<SourceTag>Source: France Travail</SourceTag>);
    expect(screen.getByText("Source: France Travail")).toBeInTheDocument();
  });
});
