// Simple test to verify configuration loading
import { getConfig, getDefaultFormData, getPayScale, getGovernmentRates, getBusinessRules } from './calculator-config.loader.js';

console.log('=== Configuration Test ===');

try {
  // Test basic config loading
  const config = getConfig();
  console.log('✅ Config loaded successfully');
  console.log('📋 Config version:', config.metadata.version);
  console.log('📅 Data year:', config.metadata.dataYear);

  // Test default form data
  const formData = getDefaultFormData();
  console.log('✅ Default form data loaded');
  console.log('👤 Default current age:', formData.currentAge);
  console.log('💰 Default rent:', formData.rent);

  // Test pay scale
  const payScale = getPayScale();
  console.log('✅ Pay scale loaded');
  console.log('💵 Step 9 rate: $' + payScale.stepRates['9']);

  // Test government rates
  const govRates = getGovernmentRates();
  console.log('✅ Government rates loaded');
  console.log('🏥 FPL 2025: $' + govRates.aca.federalPovertyLevel);

  // Test business rules
  const businessRules = getBusinessRules();
  console.log('✅ Business rules loaded');
  console.log('🏖️ PTO ratio: 1 hour per', businessRules.pto.hoursPerPTOHour, 'worked');

  console.log('🎉 All configuration tests passed!');

} catch (error) {
  console.error('❌ Configuration test failed:', error);
}