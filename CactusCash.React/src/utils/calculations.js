import { getPayScale, getGovernmentRates, getBusinessRules } from '../config/calculator-config.loader';

/**
 * Helper function to safely get numeric value from form data
 * Handles empty values, null, undefined, and NaN cases
 */
export const getNumericValue = (fieldValue) => {
  // Handle empty values
  if (fieldValue === '' || fieldValue === null || fieldValue === undefined) {
    return 0;
  }

  // If it's already a number, return it
  if (typeof fieldValue === 'number') {
    return isNaN(fieldValue) ? 0 : fieldValue;
  }

  // For strings, parse as float and handle invalid values
  const parsed = parseFloat(fieldValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Determine the step based on Ready Reserve Credited Hours (RRCH)
 * @param {number} rrchHours - Total career hours
 * @returns {number} - Step number (1-13)
 */
export const determineStep = (rrchHours) => {
  const payScale = getPayScale();
  const thresholds = payScale.stepThresholds;

  for (let step = 1; step <= 13; step++) {
    if (rrchHours <= thresholds[step.toString()]) {
      return step;
    }
  }
  return 13;
};

/**
 * Calculate hourly rate based on RRCH hours and years from base
 * @param {number} rrchHours - Total career hours
 * @param {number} yearsFromBase - Years since starting
 * @returns {number} - Calculated hourly rate
 */
export const calculateHourlyRate = (rrchHours, yearsFromBase) => {
  const payScale = getPayScale();
  const step = determineStep(rrchHours);
  const baseRate = payScale.stepRates[step.toString()];
  return baseRate * Math.pow(1 + payScale.annualRaiseRate, yearsFromBase);
};

/**
 * Calculate ACA subsidy based on after-tax income
 * @param {number} afterTaxIncome - Annual after-tax income
 * @returns {number} - ACA tax refund/subsidy amount
 */
export const calculateACASubsidy = (afterTaxIncome) => {
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

/**
 * Calculate unemployment benefits based on current and prior year W2
 * @param {number} currentYearW2 - Current year W2 earnings
 * @param {number} priorYearW2 - Prior year W2 earnings
 * @returns {number} - Total unemployment benefits
 */
export const calculateUnemploymentBenefits = (currentYearW2, priorYearW2) => {
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

/**
 * Calculate PTO payout based on annual hours and hourly rate
 * @param {number} annualHours - Annual work hours
 * @param {number} hourlyRate - Current hourly rate
 * @returns {number} - PTO payout amount
 */
export const calculatePTOPayout = (annualHours, hourlyRate) => {
  try {
    const businessRules = getBusinessRules();
    const ptoHours = Math.floor(annualHours / businessRules.pto.hoursPerPTOHour);
    return ptoHours * hourlyRate;
  } catch (error) {
    console.error('Error calculating PTO payout:', error);
    // Fallback calculation
    const ptoHours = Math.floor(annualHours / 30);
    return ptoHours * hourlyRate;
  }
};