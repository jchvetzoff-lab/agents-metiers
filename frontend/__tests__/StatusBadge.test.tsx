import { render, screen } from "@testing-library/react";
import StatusBadge from "@/components/StatusBadge";

// Mock framer-motion to avoid animation issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    span: ({
      children,
      className,
    }: any) => (
      <span className={className}>
        {children}
      </span>
    ),
  },
}));

describe("StatusBadge", () => {
  it("renders brouillon status", () => {
    render(<StatusBadge statut="brouillon" />);
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });

  it("renders enrichi status", () => {
    render(<StatusBadge statut="enrichi" />);
    expect(screen.getByText("Enrichi")).toBeInTheDocument();
  });

  it("renders valide status", () => {
    render(<StatusBadge statut="valide" />);
    expect(screen.getByText("Validé IA")).toBeInTheDocument();
  });

  it("renders publiee status", () => {
    render(<StatusBadge statut="publiee" />);
    expect(screen.getByText("Publiée")).toBeInTheDocument();
  });

  it("handles legacy en_validation as Validé IA", () => {
    render(<StatusBadge statut="en_validation" />);
    expect(screen.getByText("Validé IA")).toBeInTheDocument();
  });

  it("handles legacy archivee as Publiée", () => {
    render(<StatusBadge statut="archivee" />);
    expect(screen.getByText("Publiée")).toBeInTheDocument();
  });

  it("falls back to brouillon for unknown status", () => {
    render(<StatusBadge statut="unknown_status" />);
    expect(screen.getByText("Brouillon")).toBeInTheDocument();
  });
});
