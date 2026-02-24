import { render, screen } from "@testing-library/react";
import ValidationIASummary from "@/components/ValidationIASummary";

describe("ValidationIASummary", () => {
  it("renders score badge", () => {
    render(
      <ValidationIASummary
        details={{
          score: 85,
          criteres: {},
        }}
      />
    );
    expect(screen.getByText("85/100")).toBeInTheDocument();
    expect(screen.getByText("Résultat de la validation IA")).toBeInTheDocument();
  });

  it("renders without score", () => {
    render(
      <ValidationIASummary
        details={{
          criteres: {
            completude: { score: 90, commentaire: "Bien" },
          },
        }}
      />
    );
    expect(screen.getByText("Résultat de la validation IA")).toBeInTheDocument();
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });

  it("categorizes criteria correctly", () => {
    render(
      <ValidationIASummary
        details={{
          score: 70,
          criteres: {
            completude: { score: 90, commentaire: "Bien" },
            qualite: { score: 65, commentaire: "Moyen" },
            coherence: { score: 30, commentaire: "Faible" },
          },
        }}
      />
    );
    // Points forts (>= 80)
    expect(screen.getByText("Points forts")).toBeInTheDocument();
    expect(screen.getByText("completude (90)")).toBeInTheDocument();

    // À améliorer (50-80)
    expect(screen.getByText("À améliorer")).toBeInTheDocument();
    expect(screen.getByText("qualite (65)")).toBeInTheDocument();

    // Points faibles (< 50)
    expect(screen.getByText("Points faibles")).toBeInTheDocument();
    expect(screen.getByText("coherence (30)")).toBeInTheDocument();
  });

  it("renders problems", () => {
    render(
      <ValidationIASummary
        details={{
          score: 50,
          problemes: ["Missing salaries", "Incomplete skills"],
        }}
      />
    );
    expect(screen.getByText("Problèmes détectés")).toBeInTheDocument();
    expect(screen.getByText("Missing salaries")).toBeInTheDocument();
    expect(screen.getByText("Incomplete skills")).toBeInTheDocument();
  });

  it("renders suggestions", () => {
    render(
      <ValidationIASummary
        details={{
          score: 60,
          suggestions: ["Add more formations", "Update salary data"],
        }}
      />
    );
    expect(screen.getByText("Suggestions")).toBeInTheDocument();
    expect(screen.getByText("Add more formations")).toBeInTheDocument();
    expect(screen.getByText("Update salary data")).toBeInTheDocument();
  });

  it("handles empty details gracefully", () => {
    render(<ValidationIASummary details={{}} />);
    expect(screen.getByText("Résultat de la validation IA")).toBeInTheDocument();
    // Should not show sections for empty data
    expect(screen.queryByText("Points forts")).not.toBeInTheDocument();
    expect(screen.queryByText("À améliorer")).not.toBeInTheDocument();
    expect(screen.queryByText("Points faibles")).not.toBeInTheDocument();
    expect(screen.queryByText("Problèmes détectés")).not.toBeInTheDocument();
    expect(screen.queryByText("Suggestions")).not.toBeInTheDocument();
  });

  it("renders score with correct color class for high score", () => {
    const { container } = render(
      <ValidationIASummary details={{ score: 85 }} />
    );
    const scoreBadge = screen.getByText("85/100");
    expect(scoreBadge.className).toContain("green");
  });

  it("renders score with correct color class for low score", () => {
    render(<ValidationIASummary details={{ score: 30 }} />);
    const scoreBadge = screen.getByText("30/100");
    expect(scoreBadge.className).toContain("red");
  });
});
