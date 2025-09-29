import { CalculatorConfig, FormData } from './calculator-config.types';
import exampleConfig from './calculator-config.example.json';

class ConfigError extends Error {
  constructor(message: string) {
    super(`Calculator Config Error: ${message}`);
    this.name = 'ConfigError';
  }
}

class CalculatorConfigLoader {
  private config: CalculatorConfig;
  private configSource: 'main' | 'example' | 'minimal' = 'minimal';

  constructor() {
    console.log('🔧 Loading calculator configuration...');
    this.config = this.loadConfigWithFallbacks();
    this.validateConfig();
  }

  /**
   * Load configuration with fallback hierarchy
   */
  private loadConfigWithFallbacks(): CalculatorConfig {
    // Start async loading of main config in background
    this.loadMainConfigAsync();

    // For now, try example config or minimal
    if (exampleConfig) {
      this.configSource = 'example';
      console.log('✅ Loaded example configuration file');
      return exampleConfig as CalculatorConfig;
    }

    // Fall back to minimal config
    this.configSource = 'minimal';
    console.log('🔄 Using minimal default configuration');
    return this.createMinimalConfig();
  }

  /**
   * Try to load main configuration file asynchronously
   */
  private async loadMainConfigAsync(): Promise<void> {
    try {
      const mainConfigModule = await import('./calculator-config.json');
      const mainConfig = mainConfigModule.default;
      if (mainConfig) {
        this.config = mainConfig as CalculatorConfig;
        this.configSource = 'main';
        console.log('✅ Loaded main configuration file (async)');
        // Trigger re-validation
        this.validateConfig();
      }
    } catch (error) {
      console.log('🔍 Main config not found, using fallback');
    }
  }


  /**
   * Create minimal configuration with zero defaults
   */
  private createMinimalConfig(): CalculatorConfig {
    return {
      metadata: {
        version: "minimal-fallback",
        lastUpdated: new Date().toISOString().split('T')[0],
        description: "Minimal fallback configuration with zero defaults",
        dataYear: new Date().getFullYear()
      },
      defaultValues: {
        personalInfo: {
          currentAge: 0,
          endAge: 0,
          startingCareerHours: 0,
          annualHours: 0
        },
        income: {
          startingProfitSharing: 0,
          annualRaise: 0,
          profitSharingPercent: 0,
          otherIncome: 0,
          partnerIncome: 0
        },
        expenses: {
          categories: {
            essential: {
              title: "Essential Monthly Expenses",
              frequency: "monthly",
              fields: {
                rent: { label: "Rent", default: 0 },
                utilities: { label: "Utilities", default: 0 },
                groceries: { label: "Groceries", default: 0 }
              }
            },
            nonEssential: {
              title: "Non-Essential Monthly Expenses",
              frequency: "monthly",
              fields: {
                misc: { label: "Miscellaneous", default: 0 }
              }
            }
          },
          inflation: {
            expenseInflation: 0
          }
        },
        accounts: {
          retirementBalance: 0,
          taxableBalance: 0,
          cashBalance: 0,
          investmentReturn: 0,
          cashReturn: 0
        },
        taxes: {
          effectiveTaxRate: 0
        }
      },
      governmentRates: {
        aca: {
          federalPovertyLevel: 15060,
          benchmarkPremiumMonthly: 450,
          subsidyRates: {
            "150": 0.0285,
            "200": 0.0570,
            "250": 0.0855,
            "300": 0.1140,
            "400": 0.095
          },
          incomeThresholds: {
            minimumPercent: 100,
            maximumPercent: 400
          }
        },
        unemployment: {
          utah2025: {
            minimumEarnings: 5300,
            quarterMultiplier: 1.5,
            weeklyBenefitDeduction: 5,
            weeksPerQuarter: 26,
            maxWeeklyBenefit: 777,
            durationMultiplier: 0.27,
            minDurationWeeks: 10,
            maxDurationWeeks: 26
          }
        }
      },
      payScale: {
        year: new Date().getFullYear(),
        stepRates: {
          "1": 0, "2": 0, "3": 0, "4": 0, "5": 0,
          "6": 0, "7": 0, "8": 0, "9": 0, "10": 0,
          "11": 0, "12": 0, "13": 0
        },
        stepThresholds: {
          "1": 699, "2": 1399, "3": 2099, "4": 3499, "5": 4899,
          "6": 6299, "7": 7699, "8": 9099, "9": 10499, "10": 11899,
          "11": 13299, "12": 14699, "13": 99999
        },
        annualRaiseRate: 0
      },
      businessRules: {
        pto: {
          hoursPerPTOHour: 30,
          description: "1 PTO hour earned per 30 hours worked"
        },
        retirement: {
          contributionRate: 0,
          description: "0% of profit sharing goes to 401k"
        },
        calculations: {
          maxCareerHours: 14700,
          displayOverflow: "----"
        }
      },
      validation: {
        ranges: {
          age: { min: 0, max: 100 },
          hours: { min: 0, max: 8760 },
          taxRate: { min: 0, max: 100 },
          investmentReturn: { min: 0, max: 50 },
          cashReturn: { min: 0, max: 50 }
        }
      }
    };
  }

  /**
   * Validates the loaded configuration structure
   */
  private validateConfig(): void {
    const warnings: string[] = [];

    if (!this.config.metadata?.version) {
      warnings.push('Missing metadata.version');
    }

    if (!this.config.defaultValues) {
      warnings.push('Missing defaultValues section');
    }

    if (!this.config.payScale?.stepRates) {
      warnings.push('Missing payScale.stepRates');
    }

    if (!this.config.governmentRates?.aca?.federalPovertyLevel) {
      warnings.push('Missing ACA federal poverty level');
    }

    if (warnings.length > 0 && this.configSource !== 'minimal') {
      console.warn('⚠️ Configuration validation warnings:', warnings);
    }

    const sourceLabel = this.configSource === 'main' ? 'custom' : this.configSource;
    console.log(`✅ Calculator config loaded from ${sourceLabel}: v${this.config.metadata?.version || 'unknown'} (${this.config.metadata?.dataYear || 'unknown'})`);
  }

  /**
   * Get the full configuration object
   */
  getConfig(): CalculatorConfig {
    return this.config;
  }

  /**
   * Get default form values in the flattened structure expected by React component
   */
  getDefaultFormData(): FormData {
    const defaults = this.config.defaultValues;

    // Start with base fields
    const formData: any = {
      // Personal Info
      currentAge: defaults.personalInfo.currentAge,
      endAge: defaults.personalInfo.endAge,
      startingCareerHours: defaults.personalInfo.startingCareerHours,
      annualHours: defaults.personalInfo.annualHours,

      // Income
      startingProfitSharing: defaults.income.startingProfitSharing,
      currentHourlyRate: 0, // This will be calculated
      annualRaise: defaults.income.annualRaise,
      profitSharingPercent: defaults.income.profitSharingPercent,
      ptoPayout: 0, // This will be calculated
      otherIncome: defaults.income.otherIncome,
      partnerIncome: defaults.income.partnerIncome,

      // Calculated fields (will be computed)
      essentialMonthly: 0,
      nonEssentialMonthly: 0,
      currentExpenses: 0,

      // Inflation
      expenseInflation: defaults.expenses.inflation.expenseInflation,

      // Accounts
      retirementBalance: defaults.accounts.retirementBalance,
      taxableBalance: defaults.accounts.taxableBalance,
      cashBalance: defaults.accounts.cashBalance,
      investmentReturn: defaults.accounts.investmentReturn,
      cashReturn: defaults.accounts.cashReturn,

      // Taxes
      taxRate: defaults.taxes.effectiveTaxRate
    };

    // Dynamically add expense fields from all categories
    if (defaults.expenses && defaults.expenses.categories) {
      Object.keys(defaults.expenses.categories).forEach(categoryKey => {
        const category = defaults.expenses.categories[categoryKey];
        if (category && category.fields) {
          Object.keys(category.fields).forEach(fieldKey => {
            const field = category.fields[fieldKey];
            if (field && typeof field.default !== 'undefined') {
              formData[fieldKey] = field.default;
            }
          });
        }
      });
    } else {
      console.warn('No expense categories found in configuration, using legacy structure');
      // Fallback for old structure
      if (defaults.expenses.essential) {
        Object.keys(defaults.expenses.essential).forEach(fieldKey => {
          formData[fieldKey] = defaults.expenses.essential[fieldKey];
        });
      }
      if (defaults.expenses.nonEssential) {
        Object.keys(defaults.expenses.nonEssential).forEach(fieldKey => {
          formData[fieldKey] = defaults.expenses.nonEssential[fieldKey];
        });
      }
    }

    // Legacy field mapping for backwards compatibility
    if (formData.misc !== undefined) {
      formData.miscNonEssential = formData.misc;
    }

    return formData as FormData;
  }

  /**
   * Get pay scale configuration
   */
  getPayScale() {
    return this.config.payScale;
  }

  /**
   * Get government rates for calculations
   */
  getGovernmentRates() {
    return this.config.governmentRates;
  }

  /**
   * Get business rules for calculations
   */
  getBusinessRules() {
    return this.config.businessRules;
  }

  /**
   * Get validation rules for form inputs
   */
  getValidationRules() {
    return this.config.validation;
  }

  /**
   * Get configuration metadata
   */
  getMetadata() {
    return this.config.metadata;
  }

  /**
   * Get the source of the loaded configuration
   */
  getConfigSource() {
    return this.configSource;
  }

  /**
   * Get expense field definitions for dynamic form generation
   */
  getExpenseFields() {
    try {
      const categories = this.config.defaultValues?.expenses?.categories;
      if (!categories) {
        console.warn('No expense categories found in configuration');
        return {};
      }

      const result: any = {};

      Object.keys(categories).forEach(categoryKey => {
        const category = categories[categoryKey];
        if (!category || !category.fields) {
          console.warn(`Invalid category structure for ${categoryKey}`);
          result[categoryKey] = [];
          return;
        }

        result[categoryKey] = Object.keys(category.fields).map(fieldKey => {
          const field = category.fields[fieldKey];
          return {
            key: fieldKey,
            label: field?.label || fieldKey,
            defaultValue: field?.default || 0
          };
        });
      });

      return result;
    } catch (error) {
      console.error('Error in getExpenseFields:', error);
      return {};
    }
  }

  /**
   * Get expense categories with metadata for UI generation
   */
  getExpenseCategories() {
    try {
      const categories = this.config.defaultValues?.expenses?.categories;
      if (!categories) {
        console.warn('No expense categories found in configuration');
        return {};
      }
      return categories;
    } catch (error) {
      console.error('Error in getExpenseCategories:', error);
      return {};
    }
  }

  /**
   * Format field name into human-readable label
   */
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .charAt(0).toUpperCase() +
      fieldName.slice(1).replace(/([A-Z])/g, ' $1');
  }

  /**
   * Validate a form field value against configuration rules
   */
  validateField(fieldName: string, value: number): { isValid: boolean; message?: string } {
    const ranges = this.config.validation.ranges;

    switch (fieldName) {
      case 'currentAge':
      case 'endAge':
        if (value < ranges.age.min || value > ranges.age.max) {
          return {
            isValid: false,
            message: `Age must be between ${ranges.age.min} and ${ranges.age.max}`
          };
        }
        break;

      case 'annualHours':
        if (value < ranges.hours.min || value > ranges.hours.max) {
          return {
            isValid: false,
            message: `Hours must be between ${ranges.hours.min} and ${ranges.hours.max}`
          };
        }
        break;

      case 'taxRate':
        if (value < ranges.taxRate.min || value > ranges.taxRate.max) {
          return {
            isValid: false,
            message: `Tax rate must be between ${ranges.taxRate.min}% and ${ranges.taxRate.max}%`
          };
        }
        break;

      case 'investmentReturn':
        if (value < ranges.investmentReturn.min || value > ranges.investmentReturn.max) {
          return {
            isValid: false,
            message: `Investment return must be between ${ranges.investmentReturn.min}% and ${ranges.investmentReturn.max}%`
          };
        }
        break;

      case 'cashReturn':
        if (value < ranges.cashReturn.min || value > ranges.cashReturn.max) {
          return {
            isValid: false,
            message: `Cash return must be between ${ranges.cashReturn.min}% and ${ranges.cashReturn.max}%`
          };
        }
        break;
    }

    return { isValid: true };
  }
}

// Singleton instance
export const calculatorConfig = new CalculatorConfigLoader();

// Named exports for convenience
export const getConfig = () => calculatorConfig.getConfig();
export const getDefaultFormData = () => calculatorConfig.getDefaultFormData();
export const getPayScale = () => calculatorConfig.getPayScale();
export const getGovernmentRates = () => calculatorConfig.getGovernmentRates();
export const getBusinessRules = () => calculatorConfig.getBusinessRules();
export const getExpenseFields = () => calculatorConfig.getExpenseFields();
export const getExpenseCategories = () => calculatorConfig.getExpenseCategories();
export const getConfigSource = () => calculatorConfig.getConfigSource();
export const validateField = (field: string, value: number) => calculatorConfig.validateField(field, value);