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

const FinancialCalculator = () => {
  const [formData, setFormData] = useState(() => {
    try {
      console.log('🔧 Initializing FinancialCalculator with default form data...');
      const defaultData = getDefaultFormData();
      console.log('✅ Default form data loaded:', defaultData);
      return defaultData;
    } catch (error) {
      console.error('❌ Failed to load calculator configuration:', error);
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
    <div className="font-sans max-w-6xl mx-auto p-5 bg-gray-50 text-gray-800 min-h-screen">
      <div className="bg-white rounded-lg p-8 shadow-lg">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          ⚙️ Life Math 🔧
        </h1>

        {configError && (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-4">
            <strong>Configuration Warning:</strong> {configError}. Using fallback values.
          </div>
        )}

        {(() => {
          try {
            const configSource = getConfigSource();
            if (configSource === 'example') {
              return (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-4">
                  <strong>ℹ️ Using Template Configuration:</strong> Copy <code className="bg-gray-200 px-1 rounded">calculator-config.example.json</code> to <code className="bg-gray-200 px-1 rounded">calculator-config.json</code> and customize your values.
                </div>
              );
            } else if (configSource === 'minimal') {
              return (
                <div className="bg-yellow-100 border border-yellow-300 rounded p-3 mb-4">
                  <strong>⚠️ Using Minimal Configuration:</strong> No config files found. All values set to zero. Please add a configuration file.
                </div>
              );
            }
          } catch (error) {
            console.error('Error checking config source:', error);
          }
          return null;
        })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 border-b-2 border-blue-500 pb-2 mb-4">Basic Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Current Age:</label>
              <input
                type="number"
                value={formData.currentAge}
                onChange={(e) => handleInputChange('currentAge', e.target.value)}
                onKeyUp={(e) => handleInputChange('currentAge', e.target.value)}
                onBlur={(e) => handleInputBlur('currentAge', e.target.value)}
                min="25" max="70"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">End Age:</label>
              <input
                type="number"
                value={formData.endAge}
                onChange={(e) => handleInputChange('endAge', e.target.value)}
                onKeyUp={(e) => handleInputChange('endAge', e.target.value)}
                onBlur={(e) => handleInputBlur('endAge', e.target.value)}
                min="45" max="75"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Initial Ready Reserve Credited Hours:</label>
              <input
                type="number"
                value={formData.startingCareerHours}
                onChange={(e) => handleInputChange('startingCareerHours', e.target.value)}
                onKeyUp={(e) => handleInputChange('startingCareerHours', e.target.value)}
                onBlur={(e) => handleInputBlur('startingCareerHours', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Annual Work Hours:</label>
              <input
                type="number"
                value={formData.annualHours}
                onChange={(e) => handleInputChange('annualHours', e.target.value)}
                onKeyUp={(e) => handleInputChange('annualHours', e.target.value)}
                onBlur={(e) => handleInputBlur('annualHours', e.target.value)}
                min="100" max="2080"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Starting Profit Sharing ($):</label>
              <input
                type="number"
                value={formData.startingProfitSharing}
                onChange={(e) => handleInputChange('startingProfitSharing', e.target.value)}
                onKeyUp={(e) => handleInputChange('startingProfitSharing', e.target.value)}
                onBlur={(e) => handleInputBlur('startingProfitSharing', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Effective Tax Rate (%):</label>
              <input
                type="number"
                value={formData.taxRate}
                onChange={(e) => handleInputChange('taxRate', e.target.value)}
                onKeyUp={(e) => handleInputChange('taxRate', e.target.value)}
                onBlur={(e) => handleInputBlur('taxRate', e.target.value)}
                step="1" min="10" max="40"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Expense Inflation (%):</label>
              <input
                type="number"
                value={formData.expenseInflation}
                onChange={(e) => handleInputChange('expenseInflation', e.target.value)}
                onKeyUp={(e) => handleInputChange('expenseInflation', e.target.value)}
                onBlur={(e) => handleInputBlur('expenseInflation', e.target.value)}
                step="0.1" min="0" max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 border-b-2 border-blue-500 pb-2 mb-4">Current Balances</h3>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Retirement Accounts ($):</label>
              <input
                type="number"
                value={formData.retirementBalance}
                onChange={(e) => handleInputChange('retirementBalance', e.target.value)}
                onKeyUp={(e) => handleInputChange('retirementBalance', e.target.value)}
                onBlur={(e) => handleInputBlur('retirementBalance', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Taxable Accounts ($):</label>
              <input
                type="number"
                value={formData.taxableBalance}
                onChange={(e) => handleInputChange('taxableBalance', e.target.value)}
                onKeyUp={(e) => handleInputChange('taxableBalance', e.target.value)}
                onBlur={(e) => handleInputBlur('taxableBalance', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Cash Balance ($):</label>
              <input
                type="number"
                value={formData.cashBalance}
                onChange={(e) => handleInputChange('cashBalance', e.target.value)}
                onKeyUp={(e) => handleInputChange('cashBalance', e.target.value)}
                onBlur={(e) => handleInputBlur('cashBalance', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Investment Return (%):</label>
              <input
                type="number"
                value={formData.investmentReturn}
                onChange={(e) => handleInputChange('investmentReturn', e.target.value)}
                onKeyUp={(e) => handleInputChange('investmentReturn', e.target.value)}
                onBlur={(e) => handleInputBlur('investmentReturn', e.target.value)}
                step="0.1" min="3" max="12"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Cash Return (%):</label>
              <input
                type="number"
                value={formData.cashReturn}
                onChange={(e) => handleInputChange('cashReturn', e.target.value)}
                onKeyUp={(e) => handleInputChange('cashReturn', e.target.value)}
                onBlur={(e) => handleInputBlur('cashReturn', e.target.value)}
                step="0.01" min="0" max="8"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 border-b-2 border-blue-500 pb-2 mb-4">Income Settings</h3>

          <div className="space-y-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Current Hourly Rate ($):</label>
              <input
                type="number"
                value={formData.currentHourlyRate.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Annual Raise (%):</label>
              <input
                type="number"
                value={formData.annualRaise}
                onChange={(e) => handleInputChange('annualRaise', e.target.value)}
                onKeyUp={(e) => handleInputChange('annualRaise', e.target.value)}
                onBlur={(e) => handleInputBlur('annualRaise', e.target.value)}
                step="0.1" min="0" max="15"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Profit Sharing (% of W2):</label>
              <input
                type="number"
                value={formData.profitSharingPercent}
                onChange={(e) => handleInputChange('profitSharingPercent', e.target.value)}
                onKeyUp={(e) => handleInputChange('profitSharingPercent', e.target.value)}
                onBlur={(e) => handleInputBlur('profitSharingPercent', e.target.value)}
                step="1" min="0" max="25"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">PTO Payout ($):</label>
              <input
                type="number"
                value={formData.ptoPayout.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Other Annual Income ($):</label>
              <input
                type="number"
                value={formData.otherIncome}
                onChange={(e) => handleInputChange('otherIncome', e.target.value)}
                onKeyUp={(e) => handleInputChange('otherIncome', e.target.value)}
                onBlur={(e) => handleInputBlur('otherIncome', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>

            <div>
              <label className="block mb-2 font-semibold text-gray-700">Partner Monthly Income ($):</label>
              <input
                type="number"
                value={formData.partnerIncome}
                onChange={(e) => handleInputChange('partnerIncome', e.target.value)}
                onKeyUp={(e) => handleInputChange('partnerIncome', e.target.value)}
                onBlur={(e) => handleInputBlur('partnerIncome', e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-700"
              />
            </div>
          </div>
        </div>


        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 min-h-96 col-span-full">
          <h3 className="text-lg font-semibold text-gray-700 border-b-2 border-blue-500 pb-2 mb-4">Expense Settings</h3>

          <div className="flex bg-gray-100 rounded-lg p-1 mb-5 shadow-sm overflow-hidden">
            <button
              className={`flex-1 px-2 py-3 cursor-pointer font-semibold text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis border-none rounded-md transition-all duration-300 ${
                activeExpenseTab === 'monthly'
                  ? 'text-white bg-blue-500 shadow-md'
                  : 'text-gray-600 bg-transparent hover:text-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => setActiveExpenseTab('monthly')}
            >
              Monthly
            </button>
            <button
              className={`flex-1 px-2 py-3 cursor-pointer font-semibold text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis border-none rounded-md transition-all duration-300 ${
                activeExpenseTab === 'annual'
                  ? 'text-white bg-blue-500 shadow-md'
                  : 'text-gray-600 bg-transparent hover:text-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => setActiveExpenseTab('annual')}
            >
              Annual
            </button>
            <button
              className={`flex-1 px-2 py-3 cursor-pointer font-semibold text-sm text-center whitespace-nowrap overflow-hidden text-ellipsis border-none rounded-md transition-all duration-300 ${
                activeExpenseTab === 'overview'
                  ? 'text-white bg-blue-500 shadow-md'
                  : 'text-gray-600 bg-transparent hover:text-blue-500 hover:bg-blue-50'
              }`}
              onClick={() => setActiveExpenseTab('overview')}
            >
              Overview
            </button>
          </div>

          <div className="min-h-72">
            {(() => {
              try {
                const expenseCategories = getExpenseCategories();
                const expenseFields = getExpenseFields();

                if (activeExpenseTab === 'overview') {
                  return (
                    <div className="py-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-500 rounded-xl p-5 text-center transition-all duration-300">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Total Monthly</h4>
                          <div className="text-3xl font-bold text-gray-900 mb-2">${(formData.totalMonthlyExpenses || 0).toFixed(0)}</div>
                          <div className="text-xs text-gray-600">Monthly recurring expenses</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-100 to-green-200 border-2 border-green-500 rounded-xl p-5 text-center transition-all duration-300">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Total Annual</h4>
                          <div className="text-3xl font-bold text-gray-900 mb-2">${(formData.totalAnnualExpenses || 0).toFixed(0)}</div>
                          <div className="text-xs text-gray-600">Annual one-time expenses</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-500 rounded-xl p-5 text-center transition-all duration-300">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Combined Total</h4>
                          <div className="text-3xl font-bold text-gray-900 mb-2">${formData.currentExpenses.toFixed(0)}</div>
                          <div className="text-xs text-gray-600">All expenses (annual)</div>
                        </div>
                      </div>
                      <div className="bg-gray-100 border border-gray-300 rounded-lg p-5">
                        <h4 className="text-lg font-semibold text-gray-700 mb-4">Annual Breakdown</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span>Monthly Expenses × 12:</span>
                            <span className="font-semibold text-blue-600">${((formData.totalMonthlyExpenses || 0) * 12).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-gray-300">
                            <span>Annual Expenses:</span>
                            <span className="font-semibold text-blue-600">${(formData.totalAnnualExpenses || 0).toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between py-3 border-t-2 border-gray-700 mt-2 text-lg">
                            <span className="font-bold">Combined Total (Annual):</span>
                            <span className="font-bold text-blue-600">${formData.currentExpenses.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const filteredCategories = Object.keys(expenseCategories || {}).filter(categoryKey => {
                  const category = expenseCategories[categoryKey];
                  if (!category) return false;

                  const frequency = category.frequency || 'monthly';
                  return activeExpenseTab === 'monthly' ? frequency === 'monthly' : frequency === 'annual';
                });

                return (
                  <div className="flex flex-col gap-4 mb-5">
                    {filteredCategories.map(categoryKey => {
                      const category = expenseCategories[categoryKey];
                      const fields = expenseFields[categoryKey] || [];

                      if (!category) {
                        console.warn(`Category ${categoryKey} is undefined`);
                        return null;
                      }

                      const frequency = category.frequency || 'monthly';
                      const title = category.title || categoryKey;

                      // Calculate category total
                      const categoryTotal = fields.reduce((sum, field) => {
                        return sum + (getNumericValue(formData[field.key]) || 0);
                      }, 0);

                      return (
                        <div key={categoryKey} className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300 flex justify-between items-center">
                            <h4 className="text-base font-semibold text-gray-700">{title}</h4>
                            <div className="text-lg font-bold text-blue-600">
                              ${categoryTotal.toFixed(0)}
                              <span className="text-xs text-gray-600 font-normal">/{frequency === 'annual' ? 'year' : 'month'}</span>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {fields.map(field => {
                                if (!field || !field.key) {
                                  console.warn(`Invalid field in category ${categoryKey}:`, field);
                                  return null;
                                }

                                return (
                                  <div key={field.key}>
                                    <label className="block mb-1 text-sm font-medium text-gray-700">{field.label || field.key}:</label>
                                    <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                                      <span className="bg-gray-100 px-3 py-2 text-gray-600 font-medium border-r border-gray-300 text-sm">$</span>
                                      <input
                                        type="number"
                                        value={formData[field.key] === '' ? '' : (formData[field.key] || 0)}
                                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                                        onKeyUp={(e) => handleInputChange(field.key, e.target.value)}
                                        onBlur={(e) => handleInputBlur(field.key, e.target.value)}
                                        min="0"
                                        placeholder="0"
                                        className="flex-1 px-3 py-2 text-sm bg-transparent border-none focus:outline-none"
                                      />
                                      <span className="bg-gray-100 px-3 py-2 text-gray-600 text-xs border-l border-gray-300 whitespace-nowrap">/{frequency === 'annual' ? 'yr' : 'mo'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } catch (error) {
                console.error('Error loading expense categories:', error);
                // Fallback to minimal hardcoded structure
                return (
                  <div className="flex flex-col gap-4 mb-5">
                    <div className="bg-white border border-gray-300 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
                        <h4 className="text-base font-semibold text-gray-700">Essential Monthly Expenses</h4>
                      </div>
                      <div className="p-4">
                        <div className="mb-3">
                          <label className="block mb-1 text-sm font-medium text-gray-700">Rent:</label>
                          <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                            <span className="bg-gray-100 px-3 py-2 text-gray-600 font-medium border-r border-gray-300 text-sm">$</span>
                            <input
                              type="number"
                              value={formData.rent || 0}
                              onChange={(e) => handleInputChange('rent', e.target.value)}
                              onKeyUp={(e) => handleInputChange('rent', e.target.value)}
                              onBlur={(e) => handleInputBlur('rent', e.target.value)}
                              min="0"
                              className="flex-1 px-3 py-2 text-sm bg-transparent border-none focus:outline-none"
                            />
                            <span className="bg-gray-100 px-3 py-2 text-gray-600 text-xs border-l border-gray-300 whitespace-nowrap">/mo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>

        </div>

      </div>


      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 my-5">
          <h3 className="text-xl font-bold text-blue-900 mb-4">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <strong className="text-gray-700">Wage Growth:</strong><br />
              <span className="text-lg">${summary.wageGrowth.start} → ${summary.wageGrowth.end}/hour</span><br />
              <span className="text-green-600 font-semibold">{summary.wageGrowth.increase}% increase</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <strong className="text-gray-700">Account Depletion:</strong><br />
              <span>Cash: Age {summary.accountDepletion.cash}</span><br />
              <span>Taxable: Age {summary.accountDepletion.taxable}</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <strong className="text-gray-700">Final Net Worth:</strong><br />
              <span className="text-lg font-semibold text-green-600">${summary.finalNetWorth}</span><br />
              <span className="text-sm text-gray-600">(Age {summary.finalAge})</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <strong className="text-gray-700">Final Annual Shortfall:</strong><br />
              <span className="text-lg font-semibold">${summary.finalShortfall.amount}</span><br />
              <span className={`text-sm ${summary.finalShortfall.isNegative ? 'text-red-600' : 'text-green-600'}`}>
                {summary.finalShortfall.isNegative ? '(Needs additional income)' : '(Surplus)'}
              </span>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Age</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Work Income</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Unemployment Benefits</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">After-Tax</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">ACA Tax Refund</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Partner Income</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Expenses</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Shortfall</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Cash</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Taxable</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Retirement</th>
                <th className="border border-gray-300 px-3 py-2 bg-blue-500 text-white font-semibold text-center">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border border-gray-300 px-3 py-2 text-center">{row.age}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center cursor-help hover:bg-blue-50" title={`Hourly Rate: $${row.hourlyRate}, W2: $${parseInt(row.seasonalW2).toLocaleString()}, Profit Share: $${parseInt(row.profitShare).toLocaleString()}, PTO: $${parseInt(row.ptoPayout).toLocaleString()}`}>
                    ${parseInt(row.totalWorkIncome).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">${parseInt(row.unemploymentBenefits).toLocaleString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">${parseInt(row.afterTaxIncome).toLocaleString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-green-600 font-bold">${parseInt(row.acaTaxRefund).toLocaleString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">${parseInt(row.partnerIncome).toLocaleString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">${parseInt(row.annualExpenses).toLocaleString()}</td>
                  <td className={`border border-gray-300 px-3 py-2 text-center font-bold ${parseFloat(row.shortfall) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ${parseInt(row.shortfall).toLocaleString()}
                  </td>
                  <td className={`border border-gray-300 px-3 py-2 text-center ${parseFloat(row.cashBalance) <= 0 ? 'text-red-600' : ''}`}>
                    ${parseInt(row.cashBalance).toLocaleString()}
                  </td>
                  <td className={`border border-gray-300 px-3 py-2 text-center ${parseFloat(row.taxableBalance) <= 0 ? 'text-red-600' : ''}`}>
                    ${parseInt(row.taxableBalance).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center cursor-help hover:bg-blue-50" title={`Annual 401k Contribution: $${parseInt(row.contribution401k).toLocaleString()} (3% of Profit Sharing)`}>
                    ${parseInt(row.retirementBalance).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-green-600 font-bold">${parseInt(row.totalNetWorth).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
};

export default FinancialCalculator;