import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDefaultFormData, getBusinessRules, getExpenseFields, getExpenseCategories, getConfigSource } from '../config/calculator-config.loader';
import {
  getNumericValue,
  determineStep,
  calculateHourlyRate,
  calculateACASubsidy,
  calculateUnemploymentBenefits,
  calculatePTOPayout
} from '../utils/calculations';
import FinancialCalculator from './FinancialCalculator';

const Dashboard = () => {
  const [formData, setFormData] = useState(() => {
    try {
      console.log('Initializing Dashboard with default form data...');
      const defaultData = getDefaultFormData();
      console.log('Default form data loaded:', defaultData);
      return defaultData;
    } catch (error) {
      console.error('Failed to load calculator configuration:', error);
      // Fallback to hardcoded defaults if config fails
      return {
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
        pets: 300,
        subscriptions: 56,
        carInsurance: 135,
        motoInsurance: 40,
        groceries: 860,
        gas: 100,
        phone: 100,
        utilities: 150,
        carLoan: 550,
        homeLoan: 364,
        entertainment: 0,
        diningOut: 0,
        hobbies: 0,
        shopping: 0,
        travel: 0,
        miscNonEssential: 0,
        essentialMonthly: 4415,
        nonEssentialMonthly: 0,
        currentExpenses: 52980,
        expenseInflation: 3,
        retirementBalance: 560183,
        taxableBalance: 124112,
        cashBalance: 76000,
        investmentReturn: 6,
        cashReturn: 3.98,
        taxRate: 22
      };
    }
  });

  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [configError] = useState(null);
  const [activeExpenseTab, setActiveExpenseTab] = useState('monthly');

  const handleInputChange = (field, value) => {
    // Store the raw value to allow natural typing (including partial decimals)
    // The getNumericValue helper will handle conversion for calculations
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputBlur = (field, value) => {
    // When user navigates away from empty field, set it to 0
    // Also handle cases where input might be just whitespace
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    if (trimmedValue === '' || trimmedValue === null || trimmedValue === undefined || isNaN(Number(trimmedValue))) {
      console.log(`Setting ${field} to 0 (was: "${value}")`);
      setFormData(prev => ({
        ...prev,
        [field]: 0
      }));
    }
  };

  const updateCurrentHourlyRate = useCallback(() => {
    const rate = calculateHourlyRate(getNumericValue(formData.startingCareerHours), 0);
    setFormData(prev => ({ ...prev, currentHourlyRate: rate }));
  }, [formData.startingCareerHours]);

  const updatePTOPayout = useCallback(() => {
    const ptoPayout = calculatePTOPayout(
      getNumericValue(formData.annualHours),
      getNumericValue(formData.currentHourlyRate)
    );
    setFormData(prev => ({ ...prev, ptoPayout }));
  }, [formData.annualHours, formData.currentHourlyRate]);

  const updateAnnualExpenses = useCallback(() => {
    try {
      const expenseCategories = getExpenseCategories();
      const expenseFields = getExpenseFields();

      let totalMonthlyExpenses = 0;
      let totalAnnualExpenses = 0;
      let essentialMonthly = 0;
      let nonEssentialMonthly = 0;
      let essentialAnnual = 0;
      let nonEssentialAnnual = 0;

      // Calculate totals by category, considering frequency
      Object.keys(expenseCategories || {}).forEach(categoryKey => {
        const category = expenseCategories[categoryKey];
        if (!category) return;

        const fields = expenseFields[categoryKey] || [];

        let categoryTotal = fields.reduce((sum, field) => {
          return sum + getNumericValue(formData[field.key]);
        }, 0);

        const frequency = category.frequency || 'monthly'; // Default to monthly if not specified

        if (frequency === 'monthly') {
          totalMonthlyExpenses += categoryTotal;
          // Categorize as essential or non-essential based on category name
          if (categoryKey.toLowerCase().includes('essential')) {
            essentialMonthly += categoryTotal;
          } else {
            nonEssentialMonthly += categoryTotal;
          }
        } else if (frequency === 'annual') {
          totalAnnualExpenses += categoryTotal;
          // Categorize as essential or non-essential based on category name
          if (categoryKey.toLowerCase().includes('essential')) {
            essentialAnnual += categoryTotal;
          } else {
            nonEssentialAnnual += categoryTotal;
          }
        }
      });

      // Convert annual to monthly for consistent display
      const annualToMonthly = totalAnnualExpenses / 12;
      const currentExpenses = (totalMonthlyExpenses + annualToMonthly) * 12;

      setFormData(prev => ({
        ...prev,
        essentialMonthly: essentialMonthly + (essentialAnnual / 12),
        nonEssentialMonthly: nonEssentialMonthly + (nonEssentialAnnual / 12),
        currentExpenses,
        totalAnnualExpenses, // Add this for reference
        totalMonthlyExpenses  // Add this for reference
      }));
    } catch (error) {
      console.error('Error calculating expenses dynamically, using fallback:', error);
      // Fallback to minimal calculation
      const essentialTotal = getNumericValue(formData.rent) + getNumericValue(formData.utilities) + getNumericValue(formData.groceries);
      const nonEssentialTotal = getNumericValue(formData.misc);
      const currentExpenses = (essentialTotal + nonEssentialTotal) * 12;

      setFormData(prev => ({
        ...prev,
        essentialMonthly: essentialTotal,
        nonEssentialMonthly: nonEssentialTotal,
        currentExpenses
      }));
    }
  }, [formData]);

  const calculateProjection = useCallback(() => {
    const results = [];
    let currentCash = getNumericValue(formData.cashBalance);
    let currentTaxable = getNumericValue(formData.taxableBalance);
    let currentRetirement = getNumericValue(formData.retirementBalance);
    let cashDepleted = false;
    let taxableDepleted = false;
    let priorYearW2 = 0;
    let priorYearIncome = 0;

    for (let age = getNumericValue(formData.currentAge); age <= getNumericValue(formData.endAge); age++) {
      const yearsWorked = age - getNumericValue(formData.currentAge);
      const rrchHours = getNumericValue(formData.startingCareerHours) + (yearsWorked * getNumericValue(formData.annualHours));
      const step = determineStep(rrchHours);
      const hourlyRate = calculateHourlyRate(rrchHours, yearsWorked);
      const seasonalW2 = hourlyRate * getNumericValue(formData.annualHours);

      const ptoPayout = calculatePTOPayout(getNumericValue(formData.annualHours), hourlyRate);
      const businessRules = getBusinessRules();

      const unemploymentBenefits = calculateUnemploymentBenefits(seasonalW2, priorYearW2);

      let profitShare = 0;
      if (age === getNumericValue(formData.currentAge)) {
        profitShare = getNumericValue(formData.startingProfitSharing);
      } else {
        profitShare = priorYearW2 * (getNumericValue(formData.profitSharingPercent) / 100);
      }

      const contribution401k = profitShare * businessRules.retirement.contributionRate;
      const totalWorkIncome = seasonalW2 + profitShare + ptoPayout;
      const totalGrossIncome = totalWorkIncome + getNumericValue(formData.otherIncome) + unemploymentBenefits;
      const afterTaxIncome = totalGrossIncome * (1 - getNumericValue(formData.taxRate) / 100);

      let acaTaxRefund = 0;
      if (age > getNumericValue(formData.currentAge)) {
        acaTaxRefund = calculateACASubsidy(priorYearIncome);
      }

      const partnerAnnualIncome = formData.partnerIncome * 12;
      const totalHouseholdIncome = afterTaxIncome + partnerAnnualIncome + acaTaxRefund;
      const annualExpenses = formData.currentExpenses * Math.pow(1 + formData.expenseInflation/100, yearsWorked);
      const shortfall = annualExpenses - totalHouseholdIncome;

      if (!cashDepleted) {
        currentCash = currentCash * (1 + formData.cashReturn/100);
        if (shortfall > 0) {
          if (currentCash >= shortfall) {
            currentCash -= shortfall;
          } else {
            currentCash = 0;
            cashDepleted = true;
          }
        } else {
          currentCash += Math.abs(shortfall);
        }
      }

      if (cashDepleted && !taxableDepleted) {
        currentTaxable = currentTaxable * (1 + formData.investmentReturn/100);
        if (shortfall > 0) {
          if (currentTaxable >= shortfall) {
            currentTaxable -= shortfall;
          } else {
            currentTaxable = 0;
            taxableDepleted = true;
          }
        }
      } else if (!cashDepleted) {
        currentTaxable = currentTaxable * (1 + formData.investmentReturn/100);
      }

      currentRetirement = currentRetirement * (1 + formData.investmentReturn/100) + contribution401k;

      results.push({
        age,
        rrchHours: rrchHours > businessRules.calculations.maxCareerHours ? businessRules.calculations.displayOverflow : rrchHours.toLocaleString(),
        step,
        hourlyRate: hourlyRate.toFixed(2),
        seasonalW2: seasonalW2.toFixed(0),
        otherIncome: getNumericValue(formData.otherIncome).toFixed(0),
        profitShare: profitShare.toFixed(0),
        ptoPayout: ptoPayout.toFixed(0),
        totalWorkIncome: totalWorkIncome.toFixed(0),
        unemploymentBenefits: unemploymentBenefits.toFixed(0),
        contribution401k: contribution401k.toFixed(0),
        totalIncome: totalGrossIncome.toFixed(0),
        afterTaxIncome: afterTaxIncome.toFixed(0),
        acaTaxRefund: acaTaxRefund.toFixed(0),
        partnerIncome: partnerAnnualIncome.toFixed(0),
        annualExpenses: annualExpenses.toFixed(0),
        shortfall: shortfall.toFixed(0),
        cashBalance: currentCash.toFixed(0),
        taxableBalance: currentTaxable.toFixed(0),
        retirementBalance: currentRetirement.toFixed(0),
        totalNetWorth: (currentCash + currentTaxable + currentRetirement).toFixed(0)
      });

      priorYearW2 = seasonalW2;
      priorYearIncome = afterTaxIncome;
    }

    setResults(results);
    generateSummary(results);
  }, [
    formData.currentAge, formData.endAge, formData.startingCareerHours, formData.annualHours,
    formData.cashBalance, formData.taxableBalance, formData.retirementBalance,
    formData.startingProfitSharing, formData.profitSharingPercent, formData.otherIncome,
    formData.partnerIncome, formData.taxRate, formData.currentExpenses, formData.expenseInflation,
    formData.investmentReturn, formData.cashReturn
  ]);

  const generateSummary = (results) => {
    const firstYear = results[0];
    const lastYear = results[results.length - 1];
    const cashDepletedAge = results.find(r => parseFloat(r.cashBalance) <= 0)?.age || 'Never';
    const taxableDepletedAge = results.find(r => parseFloat(r.taxableBalance) <= 0)?.age || 'Never';

    setSummary({
      wageGrowth: {
        start: firstYear.hourlyRate,
        end: lastYear.hourlyRate,
        increase: ((parseFloat(lastYear.hourlyRate) / parseFloat(firstYear.hourlyRate) - 1) * 100).toFixed(1)
      },
      accountDepletion: {
        cash: cashDepletedAge,
        taxable: taxableDepletedAge
      },
      finalNetWorth: parseInt(lastYear.totalNetWorth).toLocaleString(),
      finalAge: lastYear.age,
      finalShortfall: {
        amount: parseInt(lastYear.shortfall).toLocaleString(),
        isNegative: parseFloat(lastYear.shortfall) > 0
      }
    });
  };

  useEffect(() => {
    updateCurrentHourlyRate();
  }, [updateCurrentHourlyRate]);

  useEffect(() => {
    updatePTOPayout();
  }, [updatePTOPayout]);

  // Track expense changes using a ref to avoid dependency issues
  const lastExpenseValues = useRef({});

  useEffect(() => {
    // Get all expense field values
    let expenseFields = {};
    try {
      const configFields = getExpenseFields();
      Object.values(configFields).flat().forEach(field => {
        expenseFields[field.key] = getNumericValue(formData[field.key]);
      });
    } catch (error) {
      // Fallback to known fields
      ['rent', 'pets', 'utilities', 'groceries', 'carInsurance', 'motoInsurance',
       'gas', 'phone', 'carLoan', 'homeLoan', 'entertainment', 'diningOut',
       'hobbies', 'shopping', 'travel', 'misc', 'miscNonEssential', 'subscriptions',
       'carRegistration', 'homeInsurance', 'lifeInsurance', 'taxPreparation',
       'vacations', 'gifts', 'homeImprovements'].forEach(field => {
        expenseFields[field] = getNumericValue(formData[field]);
      });
    }

    // Check if any expense field changed
    const hasChanged = Object.keys(expenseFields).some(field =>
      lastExpenseValues.current[field] !== expenseFields[field]
    );

    if (hasChanged) {
      lastExpenseValues.current = expenseFields;
      updateAnnualExpenses();
    }
  });

  useEffect(() => {
    calculateProjection();
  }, [calculateProjection]);

  return (
    <FinancialCalculator
      formData={formData}
      results={results}
      summary={summary}
      configError={configError}
      activeExpenseTab={activeExpenseTab}
      onInputChange={handleInputChange}
      onInputBlur={handleInputBlur}
      onTabChange={setActiveExpenseTab}
    />
  );
};

export default Dashboard;
