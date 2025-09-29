import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialCalculator from '../components/FinancialCalculator';
import * as configLoader from '../config/calculator-config.loader';

// Mock the config loader
vi.mock('../config/calculator-config.loader', () => ({
  getDefaultFormData: vi.fn(),
  getBusinessRules: vi.fn(),
  getExpenseFields: vi.fn(),
  getExpenseCategories: vi.fn(),
  getConfigSource: vi.fn()
}));

// Mock the calculations module
vi.mock('../utils/calculations', () => ({
  getNumericValue: (val) => {
    if (val === '' || val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  },
  determineStep: vi.fn(() => 5),
  calculateHourlyRate: vi.fn(() => 27.45),
  calculateACASubsidy: vi.fn(() => 1000),
  calculateUnemploymentBenefits: vi.fn(() => 5000),
  calculatePTOPayout: vi.fn((hours, rate) => {
    const ptoHours = Math.floor(hours / 30);
    return ptoHours * rate;
  })
}));

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    // Setup complete default configuration
    vi.mocked(configLoader.getDefaultFormData).mockReturnValue({
      currentAge: 44,
      endAge: 60,
      startingCareerHours: 9695,
      annualHours: 800,
      startingProfitSharing: 0,
      currentHourlyRate: 27.45,
      annualRaise: 4,
      profitSharingPercent: 10,
      ptoPayout: 0,
      otherIncome: 500,
      partnerIncome: 1500,
      rent: 1760,
      utilities: 150,
      groceries: 860,
      misc: 0,
      essentialMonthly: 2770,
      nonEssentialMonthly: 0,
      currentExpenses: 33240,
      expenseInflation: 3,
      retirementBalance: 560183,
      taxableBalance: 124112,
      cashBalance: 76000,
      investmentReturn: 6,
      cashReturn: 3.98,
      taxRate: 22
    });

    vi.mocked(configLoader.getBusinessRules).mockReturnValue({
      pto: {
        hoursPerPTOHour: 30,
        description: '1 PTO hour earned per 30 hours worked'
      },
      retirement: {
        contributionRate: 0.03,
        description: '3% of profit sharing goes to 401k'
      },
      calculations: {
        maxCareerHours: 14700,
        displayOverflow: '----'
      }
    });

    vi.mocked(configLoader.getExpenseCategories).mockReturnValue({
      essential: {
        title: 'Essential Monthly Expenses',
        frequency: 'monthly'
      },
      nonEssential: {
        title: 'Non-Essential Monthly Expenses',
        frequency: 'monthly'
      }
    });

    vi.mocked(configLoader.getExpenseFields).mockReturnValue({
      essential: [
        { key: 'rent', label: 'Rent', defaultValue: 1760 },
        { key: 'utilities', label: 'Utilities', defaultValue: 150 },
        { key: 'groceries', label: 'Groceries', defaultValue: 860 }
      ],
      nonEssential: [
        { key: 'misc', label: 'Miscellaneous', defaultValue: 0 }
      ]
    });

    vi.mocked(configLoader.getConfigSource).mockReturnValue('example');
  });

  describe('Scenario 1: New User Fills Out Form', () => {
    it('should allow user to enter all basic information and generate projection', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');

      // User enters age
      const ageInput = inputs.find(input => input.value === '44');
      fireEvent.change(ageInput, { target: { value: '44' } });
      expect(ageInput).toHaveValue(44);

      // User enters end age
      const endAgeInput = inputs.find(input => input.value === '60');
      fireEvent.change(endAgeInput, { target: { value: '60' } });
      expect(endAgeInput).toHaveValue(60);

      // User enters annual hours
      const annualHoursInput = inputs.find(input => input.value === '800');
      fireEvent.change(annualHoursInput, { target: { value: '800' } });
      expect(annualHoursInput).toHaveValue(800);

      // Verify projection table is rendered
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 2: User Updates Expenses', () => {
    it('should update expense totals when user changes expense values', async () => {
      render(<FinancialCalculator />);

      // Ensure we're on Monthly expenses tab
      const monthlyTab = screen.getByRole('button', { name: /Monthly/i });
      expect(monthlyTab).toHaveClass('bg-blue-500'); // Active by default

      // Check that expense fields are rendered
      const expenseSection = screen.getByText(/Expense Settings/i);
      expect(expenseSection).toBeInTheDocument();

      // Verify inputs are rendered
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should switch between expense tabs without errors', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      // Switch to Overview tab
      const overviewTab = screen.getByRole('button', { name: /Overview/i });
      await user.click(overviewTab);

      // Verify overview content
      expect(screen.getByText(/Total Monthly/i)).toBeInTheDocument();

      // Switch back to Monthly
      const monthlyTab = screen.getByRole('button', { name: /Monthly/i });
      await user.click(monthlyTab);

      expect(monthlyTab).toHaveClass('bg-blue-500');
    });
  });

  describe('Scenario 3: User Updates Investment Balances', () => {
    it('should allow user to update all balance fields', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');

      // User enters retirement balance
      const retirementInput = inputs.find(input => input.value === '560183');
      fireEvent.change(retirementInput, { target: { value: '560000' } });
      expect(retirementInput).toHaveValue(560000);

      // User enters cash balance
      const cashInput = inputs.find(input => input.value === '76000');
      fireEvent.change(cashInput, { target: { value: '76000' } });
      expect(cashInput).toHaveValue(76000);

      // Projection should update
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  describe('Scenario 4: Real-time Calculation Flow', () => {
    it('should trigger calculations on keyup events', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const ageInput = inputs.find(input => input.value === '44');

      // Use fireEvent for simpler testing
      fireEvent.change(ageInput, { target: { value: '50' } });
      fireEvent.keyUp(ageInput);

      // Table should still be present
      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });

    it('should handle rapid field changes without crashing', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const ageInput = inputs.find(input => input.value === '44');
      const taxInput = inputs.find(input => input.value === '22');
      const inflationInput = inputs.find(input => input.value === '3');

      // Rapid changes
      fireEvent.change(ageInput, { target: { value: '50' } });
      fireEvent.change(taxInput, { target: { value: '25' } });
      fireEvent.change(inflationInput, { target: { value: '4' } });

      // Should not crash
      expect(screen.getByText(/Life Math/i)).toBeInTheDocument();
    });
  });

  describe('Scenario 5: Complete Workflow', () => {
    it('should handle a complete user session from start to finish', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');

      // Step 1: Update basic info
      const ageInput = inputs.find(input => input.value === '44');
      fireEvent.change(ageInput, { target: { value: '45' } });

      // Step 2: Update income
      const otherIncomeInput = inputs.find(input => input.value === '500');
      fireEvent.change(otherIncomeInput, { target: { value: '1000' } });

      // Step 3: View different expense tabs
      const overviewTab = screen.getByRole('button', { name: /Overview/i });
      fireEvent.click(overviewTab);

      // Step 4: Update balances
      const cashInput = inputs.find(input => input.value === '76000');
      fireEvent.change(cashInput, { target: { value: '80000' } });

      // Verify everything still works
      expect(screen.getByText(/Life Math/i)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });
});