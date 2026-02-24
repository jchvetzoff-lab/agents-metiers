import { render, screen, fireEvent } from "@testing-library/react";
import OffresSection from "@/components/OffresSection";
import { getTranslations } from "@/lib/translations";

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

// Mock FadeInView
// Mock IntersectionObserver (not available in jsdom)
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

const t = getTranslations("fr");

const mockOffres = {
  code_rome: "A1234",
  region: null,
  region_name: null,
  total: 3,
  offres: [
    {
      offre_id: "1",
      titre: "Développeur React",
      entreprise: "TechCorp",
      lieu: "Paris",
      type_contrat: "CDI",
      salaire: "45-55k€",
      experience: "3 ans",
      date_publication: new Date().toISOString(),
      url: "https://example.com/1",
    },
    {
      offre_id: "2",
      titre: "Développeur Vue.js",
      entreprise: "StartupInc",
      lieu: "Lyon",
      type_contrat: "CDD",
      salaire: "35-40k€",
      experience: "1 an",
      date_publication: new Date().toISOString(),
      url: "https://example.com/2",
    },
    {
      offre_id: "3",
      titre: "Intégrateur Web",
      entreprise: null,
      lieu: "Marseille",
      type_contrat: "intérim",
      salaire: null,
      experience: null,
      date_publication: null,
      url: null,
    },
  ],
  from_cache: false,
};

describe("OffresSection", () => {
  it("renders loading state", () => {
    render(
      <OffresSection
        t={t}
        offres={null}
        offresLoading={true}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    // Check for loading spinner or text
    expect(screen.getByText(t.liveOffersLoading)).toBeInTheDocument();
  });

  it("renders empty state", () => {
    render(
      <OffresSection
        t={t}
        offres={{ ...mockOffres, total: 0, offres: [] }}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    expect(screen.getByText(t.liveOffersEmpty)).toBeInTheDocument();
  });

  it("renders offres list", () => {
    render(
      <OffresSection
        t={t}
        offres={mockOffres}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    expect(screen.getByText("Développeur React")).toBeInTheDocument();
    expect(screen.getByText("Développeur Vue.js")).toBeInTheDocument();
    expect(screen.getByText("Intégrateur Web")).toBeInTheDocument();
  });

  it("shows entreprise or confidential fallback", () => {
    render(
      <OffresSection
        t={t}
        offres={mockOffres}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    // Real company names
    expect(screen.getByText(/TechCorp/)).toBeInTheDocument();
    // Confidential fallback for null entreprise
    expect(screen.getByText(new RegExp(t.liveOfferConfidential))).toBeInTheDocument();
  });

  it("calls onContractFilterChange when filter button clicked", () => {
    const onFilterChange = jest.fn();
    render(
      <OffresSection
        t={t}
        offres={mockOffres}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={onFilterChange}
      />
    );
    // Click CDI filter button (use getByRole to avoid matching CDI badge in offer cards)
    fireEvent.click(screen.getByRole("button", { name: "CDI" }));
    expect(onFilterChange).toHaveBeenCalledWith("CDI");
  });

  it("shows total count", () => {
    render(
      <OffresSection
        t={t}
        offres={mockOffres}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    // Text is split across child nodes ("3" + " " + "offre(s) disponible(s)")
    expect(
      screen.getByText((_, el) => {
        return el?.tagName === "SPAN" && el.textContent?.includes(`3 ${t.liveOffersCount}`) === true;
      })
    ).toBeInTheDocument();
  });

  it("renders error state when offres is null and not loading", () => {
    render(
      <OffresSection
        t={t}
        offres={null}
        offresLoading={false}
        offresContractFilter="all"
        onContractFilterChange={jest.fn()}
      />
    );
    expect(screen.getByText(t.liveOffersError)).toBeInTheDocument();
  });
});
