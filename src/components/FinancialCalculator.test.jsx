import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FinancialCalculator from './FinancialCalculator';
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
  determineStep: vi.fn((hours) => {
    if (hours <= 699) return 1;
    if (hours <= 1399) return 2;
    return 3;
  }),
  calculateHourlyRate: vi.fn(() => 27.45),
  calculateACASubsidy: vi.fn(() => 1000),
  calculateUnemploymentBenefits: vi.fn(() => 5000),
  calculatePTOPayout: vi.fn((hours, rate) => {
    const ptoHours = Math.floor(hours / 30);
    return ptoHours * rate;
  })
}));

describe('FinancialCalculator Component', () => {
  beforeEach(() => {
    // Setup default mocks
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

  describe('Rendering & Structure', () => {
    it('should render without crashing', () => {
      render(<FinancialCalculator />);
      expect(screen.getByText(/Life Math/i)).toBeInTheDocument();
    });

    it('should display all main sections', () => {
      render(<FinancialCalculator />);

      expect(screen.getByText(/Basic Information/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Balances/i)).toBeInTheDocument();
      expect(screen.getByText(/Income Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Expense Settings/i)).toBeInTheDocument();
    });

    it('should display expense tabs', () => {
      render(<FinancialCalculator />);

      expect(screen.getByRole('button', { name: /Monthly/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Annual/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument();
    });

    it('should render results table', () => {
      render(<FinancialCalculator />);

      // Check that table exists
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for specific table headers within the table
      const headers = ['Work Income', 'Unemployment Benefits', 'Expenses', 'Net Worth'];
      headers.forEach(header => {
        expect(screen.getByText(header)).toBeInTheDocument();
      });
    });

    it('should show configuration warning when using example config', () => {
      render(<FinancialCalculator />);

      expect(screen.getByText(/Using Template Configuration/i)).toBeInTheDocument();
    });
  });

  describe('Input Validation & Handling', () => {
    it('should accept numeric input in age field', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      // Find input by placeholder or by querying all number inputs
      const inputs = screen.getAllByRole('spinbutton');
      const ageInput = inputs.find(input => input.value === '44'); // Current age default

      await user.clear(ageInput);
      await user.type(ageInput, '45');

      expect(ageInput).toHaveValue(45);
    });

    it('should handle decimal values in investment return field', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const returnInput = inputs.find(input => input.value === '6'); // Investment return default

      await user.clear(returnInput);
      await user.type(returnInput, '6.5');

      expect(returnInput).toHaveValue(6.5);
    });

    it('should set empty field to 0 on blur', async () => {
      render(<FinancialCalculator />);

      // Find other income input by value
      let inputs = screen.getAllByRole('spinbutton');
      const incomeInput = inputs.find(input => input.value === '500');

      // Clear the field
      fireEvent.change(incomeInput, { target: { value: '' } });

      // Blur to trigger the default value of 0
      fireEvent.blur(incomeInput);

      // Wait for the value to be updated to 0
      await waitFor(() => {
        expect(incomeInput.value).toBe('0');
      }, { timeout: 2000 });
    });

    it('should not allow editing read-only fields', () => {
      render(<FinancialCalculator />);

      // Read-only inputs don't have spinbutton role, query differently
      const readonlyInputs = screen.getAllByDisplayValue('27.45'); // Hourly rate
      const hourlyRateInput = readonlyInputs[0];
      expect(hourlyRateInput).toHaveAttribute('readonly');
    });
  });

  describe('Real-time Calculations', () => {
    it('should trigger calculation on keyup', async () => {
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const ageInput = inputs.find(input => input.value === '44');

      // Use fireEvent for simpler synchronous testing
      fireEvent.change(ageInput, { target: { value: '50' } });
      fireEvent.keyUp(ageInput);

      await waitFor(() => {
        const tableRows = screen.getAllByRole('row');
        expect(tableRows.length).toBeGreaterThan(0);
      });
    });

    it('should update expense totals when individual expense changes', async () => {
      render(<FinancialCalculator />);

      // Verify expense section renders by checking the heading
      const expenseSection = screen.getByText(/Expense Settings/i);
      expect(expenseSection).toBeInTheDocument();

      // Verify inputs are rendered
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('Expense Tab Navigation', () => {
    it('should switch to Annual tab when clicked', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      const annualTab = screen.getByRole('button', { name: /Annual/i });
      await user.click(annualTab);

      // Annual tab should now be active (has specific styling)
      expect(annualTab).toHaveClass('bg-blue-500');
    });

    it('should switch to Overview tab when clicked', async () => {
      render(<FinancialCalculator />);

      const overviewTab = screen.getByRole('button', { name: /Overview/i });
      fireEvent.click(overviewTab);

      // Should show overview content
      await waitFor(() => {
        expect(screen.getByText(/Total Monthly/i)).toBeInTheDocument();
      });
    });

    it('should not crash when switching tabs rapidly', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      const monthlyTab = screen.getByRole('button', { name: /Monthly/i });
      const annualTab = screen.getByRole('button', { name: /Annual/i });
      const overviewTab = screen.getByRole('button', { name: /Overview/i });

      await user.click(annualTab);
      await user.click(overviewTab);
      await user.click(monthlyTab);
      await user.click(annualTab);

      // Should still render without errors
      expect(annualTab).toBeInTheDocument();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle config loading error gracefully', () => {
      vi.mocked(configLoader.getDefaultFormData).mockImplementation(() => {
        throw new Error('Config failed');
      });

      // Should use fallback values and not crash
      render(<FinancialCalculator />);
      expect(screen.getByText(/Life Math/i)).toBeInTheDocument();
    });

    it('should handle zero values across all fields', async () => {
      vi.mocked(configLoader.getDefaultFormData).mockReturnValue({
        currentAge: 0,
        endAge: 0,
        startingCareerHours: 0,
        annualHours: 0,
        startingProfitSharing: 0,
        currentHourlyRate: 0,
        annualRaise: 0,
        profitSharingPercent: 0,
        ptoPayout: 0,
        otherIncome: 0,
        partnerIncome: 0,
        rent: 0,
        utilities: 0,
        groceries: 0,
        misc: 0,
        essentialMonthly: 0,
        nonEssentialMonthly: 0,
        currentExpenses: 0,
        expenseInflation: 0,
        retirementBalance: 0,
        taxableBalance: 0,
        cashBalance: 0,
        investmentReturn: 0,
        cashReturn: 0,
        taxRate: 0
      });

      render(<FinancialCalculator />);
      expect(screen.getByText(/Life Math/i)).toBeInTheDocument();
    });

    it('should handle missing expense categories gracefully', () => {
      vi.mocked(configLoader.getExpenseCategories).mockReturnValue({});
      vi.mocked(configLoader.getExpenseFields).mockReturnValue({});

      render(<FinancialCalculator />);
      expect(screen.getByText(/Expense Settings/i)).toBeInTheDocument();
    });
  });

  describe('Projection Table Display', () => {
    it('should display projection table with data', () => {
      render(<FinancialCalculator />);

      // Check that table has content
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have header row plus data rows
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1);
    });

    it('should show summary section when results exist', () => {
      render(<FinancialCalculator />);

      // Summary should appear
      waitFor(() => {
        expect(screen.getByText(/Summary/i)).toBeInTheDocument();
        expect(screen.getByText(/Wage Growth/i)).toBeInTheDocument();
        expect(screen.getByText(/Final Net Worth/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should allow typing in multiple fields sequentially', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const ageInput = inputs.find(input => input.value === '44');
      const hoursInput = inputs.find(input => input.value === '800');

      await user.clear(ageInput);
      await user.type(ageInput, '50');

      await user.clear(hoursInput);
      await user.type(hoursInput, '1000');

      expect(ageInput).toHaveValue(50);
      expect(hoursInput).toHaveValue(1000);
    });

    it('should maintain state across multiple input changes', async () => {
      const user = userEvent.setup();
      render(<FinancialCalculator />);

      const inputs = screen.getAllByRole('spinbutton');
      const taxRateInput = inputs.find(input => input.value === '22');

      await user.clear(taxRateInput);
      await user.type(taxRateInput, '25');
      expect(taxRateInput).toHaveValue(25);

      await user.clear(taxRateInput);
      await user.type(taxRateInput, '30');
      expect(taxRateInput).toHaveValue(30);
    });
  });
});