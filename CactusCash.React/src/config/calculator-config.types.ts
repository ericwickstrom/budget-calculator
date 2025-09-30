// Type definitions for the calculator configuration

export interface CalculatorConfig {
  metadata: ConfigMetadata;
  defaultValues: DefaultValues;
  governmentRates: GovernmentRates;
  payScale: PayScale;
  businessRules: BusinessRules;
  validation: ValidationRules;
}

export interface ConfigMetadata {
  version: string;
  lastUpdated: string;
  description: string;
  dataYear: number;
}

export interface DefaultValues {
  personalInfo: PersonalInfo;
  income: IncomeDefaults;
  expenses: ExpenseDefaults;
  accounts: AccountDefaults;
  taxes: TaxDefaults;
}

export interface PersonalInfo {
  currentAge: number;
  endAge: number;
  startingCareerHours: number;
  annualHours: number;
}

export interface IncomeDefaults {
  startingProfitSharing: number;
  annualRaise: number;
  profitSharingPercent: number;
  otherIncome: number;
  partnerIncome: number;
}

export interface ExpenseDefaults {
  categories: ExpenseCategories;
  inflation: InflationRates;
}

export interface ExpenseCategories {
  [categoryKey: string]: ExpenseCategory;
}

export interface ExpenseCategory {
  title: string;
  frequency: 'monthly' | 'annual';
  fields: ExpenseFields;
}

export interface ExpenseFields {
  [fieldKey: string]: ExpenseField;
}

export interface ExpenseField {
  label: string;
  default: number;
}

// Legacy interfaces for backward compatibility (can be removed later)
export interface EssentialExpenses {
  rent: number;
  pets: number;
  subscriptions: number;
  carInsurance: number;
  motoInsurance: number;
  groceries: number;
  gas: number;
  phone: number;
  utilities: number;
  carLoan: number;
  homeLoan: number;
}

export interface NonEssentialExpenses {
  entertainment: number;
  diningOut: number;
  hobbies: number;
  shopping: number;
  travel: number;
  misc: number;
}

export interface InflationRates {
  expenseInflation: number;
}

export interface AccountDefaults {
  retirementBalance: number;
  taxableBalance: number;
  cashBalance: number;
  investmentReturn: number;
  cashReturn: number;
}

export interface TaxDefaults {
  effectiveTaxRate: number;
}

export interface GovernmentRates {
  aca: ACASettings;
  unemployment: UnemploymentSettings;
}

export interface ACASettings {
  federalPovertyLevel: number;
  benchmarkPremiumMonthly: number;
  subsidyRates: Record<string, number>;
  incomeThresholds: {
    minimumPercent: number;
    maximumPercent: number;
  };
}

export interface UnemploymentSettings {
  utah2025: UtahUnemploymentRules;
}

export interface UtahUnemploymentRules {
  minimumEarnings: number;
  quarterMultiplier: number;
  weeklyBenefitDeduction: number;
  weeksPerQuarter: number;
  maxWeeklyBenefit: number;
  durationMultiplier: number;
  minDurationWeeks: number;
  maxDurationWeeks: number;
}

export interface PayScale {
  year: number;
  stepRates: Record<string, number>;
  stepThresholds: Record<string, number>;
  annualRaiseRate: number;
}

export interface BusinessRules {
  pto: PTORules;
  retirement: RetirementRules;
  calculations: CalculationRules;
}

export interface PTORules {
  hoursPerPTOHour: number;
  description: string;
}

export interface RetirementRules {
  contributionRate: number;
  description: string;
}

export interface CalculationRules {
  maxCareerHours: number;
  displayOverflow: string;
}

export interface ValidationRules {
  ranges: ValidationRanges;
}

export interface ValidationRanges {
  age: { min: number; max: number };
  hours: { min: number; max: number };
  taxRate: { min: number; max: number };
  investmentReturn: { min: number; max: number };
  cashReturn: { min: number; max: number };
}

// Helper type for form data - flattened structure from config
export interface FormData {
  currentAge: number;
  endAge: number;
  startingCareerHours: number;
  annualHours: number;
  startingProfitSharing: number;
  currentHourlyRate: number;
  annualRaise: number;
  profitSharingPercent: number;
  ptoPayout: number;
  otherIncome: number;
  partnerIncome: number;
  rent: number;
  pets: number;
  subscriptions: number;
  carInsurance: number;
  motoInsurance: number;
  groceries: number;
  gas: number;
  phone: number;
  utilities: number;
  carLoan: number;
  homeLoan: number;
  entertainment: number;
  diningOut: number;
  hobbies: number;
  shopping: number;
  travel: number;
  miscNonEssential: number;
  essentialMonthly: number;
  nonEssentialMonthly: number;
  currentExpenses: number;
  expenseInflation: number;
  retirementBalance: number;
  taxableBalance: number;
  cashBalance: number;
  investmentReturn: number;
  cashReturn: number;
  taxRate: number;
}