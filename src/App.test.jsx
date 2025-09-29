import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock FinancialCalculator component
vi.mock('./components/FinancialCalculator', () => ({
  default: () => <div data-testid="financial-calculator">Financial Calculator Mock</div>
}));

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('financial-calculator')).toBeInTheDocument();
  });

  it('should render FinancialCalculator component', () => {
    render(<App />);
    expect(screen.getByText('Financial Calculator Mock')).toBeInTheDocument();
  });

  it('should have App container', () => {
    const { container } = render(<App />);
    const appDiv = container.querySelector('.App');
    expect(appDiv).toBeInTheDocument();
  });
});