import { useState, useEffect, useCallback, useMemo } from 'react';
import './FinancialCalculator.css';
import { getDefaultFormData, getPayScale, getGovernmentRates, getBusinessRules, getExpenseFields, getExpenseCategories, getConfigSource } from '../config/calculator-config.loader';

const determineStep = (rrchHours) => {
  const payScale = getPayScale();
  const thresholds = payScale.stepThresholds;

  for (let step = 1; step <= 13; step++) {
    if (rrchHours <= thresholds[step.toString()]) {
      return step;
    }
  }
  return 13;
};

const calculateHourlyRate = (rrchHours, yearsFromBase) => {
  const payScale = getPayScale();
  const step = determineStep(rrchHours);
  const baseRate = payScale.stepRates[step.toString()];
  return baseRate * Math.pow(1 + payScale.annualRaiseRate, yearsFromBase);
};

const calculateACASubsidy = (afterTaxIncome) => {
  const govRates = getGovernmentRates();
  const aca = govRates.aca;

  const benchmarkPremiumAnnual = aca.benchmarkPremiumMonthly * 12;
  const incomePercentFPL = (afterTaxIncome / aca.federalPovertyLevel) * 100;

  if (incomePercentFPL < aca.incomeThresholds.minimumPercent ||
      incomePercentFPL > aca.incomeThresholds.maximumPercent) {
    return 0;
  }

  let applicablePercentage;
  if (incomePercentFPL <= 150) applicablePercentage = aca.subsidyRates['150'];
  else if (incomePercentFPL <= 200) applicablePercentage = aca.subsidyRates['200'];
  else if (incomePercentFPL <= 250) applicablePercentage = aca.subsidyRates['250'];
  else if (incomePercentFPL <= 300) applicablePercentage = aca.subsidyRates['300'];
  else {
    const percentAbove300 = (incomePercentFPL - 300) / 100;
    applicablePercentage = aca.subsidyRates['300'] - (percentAbove300 * 0.019);
  }

  const expectedContribution = afterTaxIncome * applicablePercentage;
  return Math.max(0, benchmarkPremiumAnnual - expectedContribution);
};

const calculateUnemploymentBenefits = (currentYearW2, priorYearW2) => {
  const govRates = getGovernmentRates();
  const unemploymentRules = govRates.unemployment.utah2025;

  const totalBasePeriodEarnings = currentYearW2 + priorYearW2;
  const highestQuarterEarnings = Math.max(currentYearW2 / 4, priorYearW2 / 4);

  if (totalBasePeriodEarnings < unemploymentRules.minimumEarnings ||
      totalBasePeriodEarnings < (highestQuarterEarnings * unemploymentRules.quarterMultiplier)) {
    return 0;
  }

  let weeklyBenefit = Math.round((highestQuarterEarnings / unemploymentRules.weeksPerQuarter) - unemploymentRules.weeklyBenefitDeduction);
  weeklyBenefit = Math.min(weeklyBenefit, unemploymentRules.maxWeeklyBenefit);

  if (weeklyBenefit <= 0) return 0;

  let durationWeeks = Math.floor((totalBasePeriodEarnings * unemploymentRules.durationMultiplier) / weeklyBenefit);
  durationWeeks = Math.max(unemploymentRules.minDurationWeeks, Math.min(unemploymentRules.maxDurationWeeks, durationWeeks));

  return weeklyBenefit * durationWeeks;
};

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

  const handleInputChange = (field, value) => {
    // Allow empty string to clear the field, otherwise parse as float
    const numericValue = value === '' ? '' : (parseFloat(value) || 0);
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
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

  // Helper function to safely get numeric value from formData
  const getNumericValue = (fieldValue) => {
    return fieldValue === '' ? 0 : (parseFloat(fieldValue) || 0);
  };


  const updateCurrentHourlyRate = useCallback(() => {
    const rate = calculateHourlyRate(getNumericValue(formData.startingCareerHours), 0);
    setFormData(prev => ({ ...prev, currentHourlyRate: rate }));
  }, [formData.startingCareerHours]);

  const updatePTOPayout = useCallback(() => {
    try {
      const businessRules = getBusinessRules();
      const ptoHours = Math.floor(getNumericValue(formData.annualHours) / businessRules.pto.hoursPerPTOHour);
      const ptoPayout = ptoHours * getNumericValue(formData.currentHourlyRate);
      setFormData(prev => ({ ...prev, ptoPayout }));
    } catch (error) {
      console.error('Error updating PTO payout:', error);
      // Fallback calculation
      const ptoHours = Math.floor(getNumericValue(formData.annualHours) / 30);
      const ptoPayout = ptoHours * getNumericValue(formData.currentHourlyRate);
      setFormData(prev => ({ ...prev, ptoPayout }));
    }
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

      const businessRules = getBusinessRules();
      const ptoHours = Math.floor(getNumericValue(formData.annualHours) / businessRules.pto.hoursPerPTOHour);
      const ptoPayout = ptoHours * hourlyRate;

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
        otherIncome: formData.otherIncome.toFixed(0),
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
  }, [formData]);

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

  // Create a memoized string of all expense values to detect changes
  const expenseFieldsString = useMemo(() => {
    try {
      const expenseFields = getExpenseFields();
      const allFields = Object.values(expenseFields).flat();
      return allFields.map(field => `${field.key}:${formData[field.key] || 0}`).join(',');
    } catch (error) {
      console.warn('Error getting expense fields for dependency tracking:', error);
      // Fallback to hardcoded fields including new annual ones
      return `rent:${formData.rent || 0},pets:${formData.pets || 0},utilities:${formData.utilities || 0},misc:${formData.misc || 0},carTabs:${formData.carTabs || 0}`;
    }
  }, [formData]);

  useEffect(() => {
    updateAnnualExpenses();
  }, [updateAnnualExpenses]);

  useEffect(() => {
    calculateProjection();
  }, [calculateProjection]);

  return (
    <div className="calculator-container">
      <div className="container">
        <h1>⚙️ Life Math 🔧</h1>

        {configError && (
          <div className="warning">
            <strong>Configuration Warning:</strong> {configError}. Using fallback values.
          </div>
        )}

        {(() => {
          try {
            const configSource = getConfigSource();
            if (configSource === 'example') {
              return (
                <div className="warning">
                  <strong>ℹ️ Using Template Configuration:</strong> Copy <code>calculator-config.example.json</code> to <code>calculator-config.json</code> and customize your values.
                </div>
              );
            } else if (configSource === 'minimal') {
              return (
                <div className="warning">
                  <strong>⚠️ Using Minimal Configuration:</strong> No config files found. All values set to zero. Please add a configuration file.
                </div>
              );
            }
          } catch (error) {
            console.error('Error checking config source:', error);
          }
          return null;
        })()}

      <div className="inputs">
        <div className="input-group">
          <h3>Basic Information</h3>
          <label>Current Age:</label>
          <input
            type="number"
            value={formData.currentAge}
            onChange={(e) => handleInputChange('currentAge', e.target.value)}
            onBlur={(e) => handleInputBlur('currentAge', e.target.value)}
            min="25" max="70"
          />

          <label>End Age:</label>
          <input
            type="number"
            value={formData.endAge}
            onChange={(e) => handleInputChange('endAge', e.target.value)}
            onBlur={(e) => handleInputBlur('endAge', e.target.value)}
            min="45" max="75"
          />

          <label>Initial Ready Reserve Credited Hours:</label>
          <input
            type="number"
            value={formData.startingCareerHours}
            onChange={(e) => handleInputChange('startingCareerHours', e.target.value)}
            onBlur={(e) => handleInputBlur('startingCareerHours', e.target.value)}
            min="0"
          />

          <label>Annual Work Hours:</label>
          <input
            type="number"
            value={formData.annualHours}
            onChange={(e) => handleInputChange('annualHours', e.target.value)}
            onBlur={(e) => handleInputBlur('annualHours', e.target.value)}
            min="100" max="2080"
          />

          <label>Starting Profit Sharing ($):</label>
          <input
            type="number"
            value={formData.startingProfitSharing}
            onChange={(e) => handleInputChange('startingProfitSharing', e.target.value)}
            onBlur={(e) => handleInputBlur('startingProfitSharing', e.target.value)}
            min="0"
          />
        </div>

        <div className="input-group">
          <h3>Income Settings</h3>
          <label>Current Hourly Rate ($):</label>
          <input
            type="number"
            value={formData.currentHourlyRate.toFixed(2)}
            readOnly
            className="readonly-input"
          />

          <label>Annual Raise (%):</label>
          <input
            type="number"
            value={formData.annualRaise}
            onChange={(e) => handleInputChange('annualRaise', e.target.value)}
            onBlur={(e) => handleInputBlur('annualRaise', e.target.value)}
            step="0.1" min="0" max="15"
          />

          <label>Profit Sharing (% of W2):</label>
          <input
            type="number"
            value={formData.profitSharingPercent}
            onChange={(e) => handleInputChange('profitSharingPercent', e.target.value)}
            onBlur={(e) => handleInputBlur('profitSharingPercent', e.target.value)}
            step="1" min="0" max="25"
          />

          <label>PTO Payout ($):</label>
          <input
            type="number"
            value={formData.ptoPayout.toFixed(2)}
            readOnly
            className="readonly-input"
          />

          <label>Other Annual Income ($):</label>
          <input
            type="number"
            value={formData.otherIncome}
            onChange={(e) => handleInputChange('otherIncome', e.target.value)}
            onBlur={(e) => handleInputBlur('otherIncome', e.target.value)}
            min="0"
          />

          <label>Partner Monthly Income ($):</label>
          <input
            type="number"
            value={formData.partnerIncome}
            onChange={(e) => handleInputChange('partnerIncome', e.target.value)}
            onBlur={(e) => handleInputBlur('partnerIncome', e.target.value)}
            min="0"
          />
        </div>

        <div className="input-group">
          <h3>Expense Settings</h3>
          {(() => {
            try {
              const expenseCategories = getExpenseCategories();
              const expenseFields = getExpenseFields();

              return Object.keys(expenseCategories || {}).map(categoryKey => {
                const category = expenseCategories[categoryKey];
                const fields = expenseFields[categoryKey] || [];

                if (!category) {
                  console.warn(`Category ${categoryKey} is undefined`);
                  return null;
                }

                const frequency = category.frequency || 'monthly';
                const title = category.title || categoryKey;

                return (
                  <div key={categoryKey}>
                    <h4>{title}</h4>
                    {fields.map(field => {
                      if (!field || !field.key) {
                        console.warn(`Invalid field in category ${categoryKey}:`, field);
                        return null;
                      }

                      return (
                        <div key={field.key}>
                          <label>{field.label || field.key} ({frequency === 'annual' ? 'Annual' : 'Monthly'} $):</label>
                          <input
                            type="number"
                            value={formData[field.key] === '' ? '' : (formData[field.key] || 0)}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            onBlur={(e) => handleInputBlur(field.key, e.target.value)}
                            min="0"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              }).filter(Boolean);
            } catch (error) {
              console.error('Error loading expense categories:', error);
              // Fallback to minimal hardcoded structure
              return (
                <div>
                  <h4>Essential Monthly Expenses</h4>
                  <div>
                    <label>Rent ($):</label>
                    <input
                      type="number"
                      value={formData.rent || 0}
                      onChange={(e) => handleInputChange('rent', e.target.value)}
                      onBlur={(e) => handleInputBlur('rent', e.target.value)}
                      min="0"
                    />
                  </div>
                  <h4>Non-Essential Monthly Expenses</h4>
                  <div>
                    <label>Miscellaneous ($):</label>
                    <input
                      type="number"
                      value={formData.misc || 0}
                      onChange={(e) => handleInputChange('misc', e.target.value)}
                      onBlur={(e) => handleInputBlur('misc', e.target.value)}
                      min="0"
                    />
                  </div>
                </div>
              );
            }
          })()}

          <h4>Calculated Totals</h4>
          <label>Essential Monthly Total ($):</label>
          <input
            type="number"
            value={formData.essentialMonthly.toFixed(0)}
            readOnly
            className="readonly-input"
          />

          <label>Non-Essential Monthly Total ($):</label>
          <input
            type="number"
            value={formData.nonEssentialMonthly.toFixed(0)}
            readOnly
            className="readonly-input"
          />

          <label>Total Monthly Expenses ($):</label>
          <input
            type="number"
            value={(formData.totalMonthlyExpenses || 0).toFixed(0)}
            readOnly
            className="readonly-input"
          />

          <label>Total Annual Expenses ($):</label>
          <input
            type="number"
            value={(formData.totalAnnualExpenses || 0).toFixed(0)}
            readOnly
            className="readonly-input"
          />

          <label>Combined Annual Expenses ($):</label>
          <input
            type="number"
            value={formData.currentExpenses.toFixed(0)}
            readOnly
            className="readonly-input"
          />

          <label>Expense Inflation (%):</label>
          <input
            type="number"
            value={formData.expenseInflation}
            onChange={(e) => handleInputChange('expenseInflation', e.target.value)}
            onBlur={(e) => handleInputBlur('expenseInflation', e.target.value)}
            step="0.1" min="0" max="10"
          />
        </div>

        <div className="input-group">
          <h3>Current Balances</h3>
          <label>Retirement Accounts ($):</label>
          <input
            type="number"
            value={formData.retirementBalance}
            onChange={(e) => handleInputChange('retirementBalance', e.target.value)}
            onBlur={(e) => handleInputBlur('retirementBalance', e.target.value)}
            min="0"
          />

          <label>Taxable Accounts ($):</label>
          <input
            type="number"
            value={formData.taxableBalance}
            onChange={(e) => handleInputChange('taxableBalance', e.target.value)}
            onBlur={(e) => handleInputBlur('taxableBalance', e.target.value)}
            min="0"
          />

          <label>Cash Balance ($):</label>
          <input
            type="number"
            value={formData.cashBalance}
            onChange={(e) => handleInputChange('cashBalance', e.target.value)}
            onBlur={(e) => handleInputBlur('cashBalance', e.target.value)}
            min="0"
          />

          <label>Investment Return (%):</label>
          <input
            type="number"
            value={formData.investmentReturn}
            onChange={(e) => handleInputChange('investmentReturn', e.target.value)}
            onBlur={(e) => handleInputBlur('investmentReturn', e.target.value)}
            step="0.1" min="3" max="12"
          />

          <label>Cash Return (%):</label>
          <input
            type="number"
            value={formData.cashReturn}
            onChange={(e) => handleInputChange('cashReturn', e.target.value)}
            onBlur={(e) => handleInputBlur('cashReturn', e.target.value)}
            step="0.01" min="0" max="8"
          />
        </div>

        <div className="input-group">
          <h3>Tax Settings</h3>
          <label>Effective Tax Rate (%):</label>
          <input
            type="number"
            value={formData.taxRate}
            onChange={(e) => handleInputChange('taxRate', e.target.value)}
            onBlur={(e) => handleInputBlur('taxRate', e.target.value)}
            step="1" min="10" max="40"
          />
        </div>
      </div>

      <button onClick={calculateProjection}>
        Calculate Projection
      </button>

      {summary && (
        <div className="summary">
          <h3>Summary</h3>
          <div className="summary-grid">
            <div>
              <strong>Wage Growth:</strong><br />
              ${summary.wageGrowth.start} → ${summary.wageGrowth.end}/hour<br />
              {summary.wageGrowth.increase}% increase
            </div>
            <div>
              <strong>Account Depletion:</strong><br />
              Cash: Age {summary.accountDepletion.cash}<br />
              Taxable: Age {summary.accountDepletion.taxable}
            </div>
            <div>
              <strong>Final Net Worth:</strong><br />
              ${summary.finalNetWorth}<br />
              (Age {summary.finalAge})
            </div>
            <div>
              <strong>Final Annual Shortfall:</strong><br />
              ${summary.finalShortfall.amount}<br />
              {summary.finalShortfall.isNegative ? '(Needs additional income)' : '(Surplus)'}
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th>Age</th>
                <th>Work Income</th>
                <th>Unemployment Benefits</th>
                <th>After-Tax</th>
                <th>ACA Tax Refund</th>
                <th>Partner Income</th>
                <th>Expenses</th>
                <th>Shortfall</th>
                <th>Cash</th>
                <th>Taxable</th>
                <th>Retirement</th>
                <th>Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, index) => (
                <tr key={index}>
                  <td>{row.age}</td>
                  <td className="work-income" title={`Hourly Rate: $${row.hourlyRate}, W2: $${parseInt(row.seasonalW2).toLocaleString()}, Profit Share: $${parseInt(row.profitShare).toLocaleString()}, PTO: $${parseInt(row.ptoPayout).toLocaleString()}`}>
                    ${parseInt(row.totalWorkIncome).toLocaleString()}
                  </td>
                  <td>${parseInt(row.unemploymentBenefits).toLocaleString()}</td>
                  <td>${parseInt(row.afterTaxIncome).toLocaleString()}</td>
                  <td className="positive">${parseInt(row.acaTaxRefund).toLocaleString()}</td>
                  <td>${parseInt(row.partnerIncome).toLocaleString()}</td>
                  <td>${parseInt(row.annualExpenses).toLocaleString()}</td>
                  <td className={parseFloat(row.shortfall) > 0 ? 'negative' : 'positive'}>
                    ${parseInt(row.shortfall).toLocaleString()}
                  </td>
                  <td className={parseFloat(row.cashBalance) <= 0 ? 'negative' : ''}>
                    ${parseInt(row.cashBalance).toLocaleString()}
                  </td>
                  <td className={parseFloat(row.taxableBalance) <= 0 ? 'negative' : ''}>
                    ${parseInt(row.taxableBalance).toLocaleString()}
                  </td>
                  <td className="retirement-cell" title={`Annual 401k Contribution: $${parseInt(row.contribution401k).toLocaleString()} (3% of Profit Sharing)`}>
                    ${parseInt(row.retirementBalance).toLocaleString()}
                  </td>
                  <td className="positive">${parseInt(row.totalNetWorth).toLocaleString()}</td>
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