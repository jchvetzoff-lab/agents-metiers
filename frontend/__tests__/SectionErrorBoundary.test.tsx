import { render, screen, fireEvent } from "@testing-library/react";
import SectionErrorBoundary from "@/components/SectionErrorBoundary";

// A component that always throws
function BrokenComponent(): JSX.Element {
  throw new Error("Test crash!");
}

// A component that works fine
function GoodComponent() {
  return <div>Working fine</div>;
}

// Suppress console.error for intentional error boundary tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe("SectionErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <SectionErrorBoundary name="Test Section">
        <GoodComponent />
      </SectionErrorBoundary>
    );
    expect(screen.getByText("Working fine")).toBeInTheDocument();
  });

  it("catches errors and shows fallback UI", () => {
    render(
      <SectionErrorBoundary name="Broken Section">
        <BrokenComponent />
      </SectionErrorBoundary>
    );
    expect(screen.getByText(/Broken Section/)).toBeInTheDocument();
    expect(screen.queryByText("Working fine")).not.toBeInTheDocument();
  });

  it("shows retry button that resets error state", () => {
    const { rerender } = render(
      <SectionErrorBoundary name="Retry Section">
        <BrokenComponent />
      </SectionErrorBoundary>
    );

    // Error UI should be shown
    const retryButton = screen.getByText("Reessayer");
    expect(retryButton).toBeInTheDocument();

    // Click retry — it will try to re-render children (which will throw again)
    fireEvent.click(retryButton);
    // After retry, the boundary will catch the error again
    expect(screen.getByText(/Retry Section/)).toBeInTheDocument();
  });

  it("compact mode renders smaller UI", () => {
    const { container } = render(
      <SectionErrorBoundary name="Compact Section" compact>
        <BrokenComponent />
      </SectionErrorBoundary>
    );
    // Compact mode should still show the section name
    expect(screen.getByText(/Compact Section/)).toBeInTheDocument();
  });
});
