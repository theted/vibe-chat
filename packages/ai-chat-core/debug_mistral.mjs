import dotenv from 'dotenv';
import { AIServiceFactory } from './dist/services/AIServiceFactory.js';
import { AI_PROVIDERS } from './dist/config/aiProviders/index.js';

dotenv.config({ path: '../../.env' });

console.log('Testing Mistral service...');
console.log('MISTRAL_API_KEY exists:', !!process.env.MISTRAL_API_KEY);
console.log('MISTRAL_API_KEY value (first 10 chars):', process.env.MISTRAL_API_KEY?.substring(0, 10));

console.log('Available providers:', Object.keys(AI_PROVIDERS));
console.log('MISTRAL provider exists:', !!AI_PROVIDERS.MISTRAL);

if (AI_PROVIDERS.MISTRAL) {
  console.log('MISTRAL models:', Object.keys(AI_PROVIDERS.MISTRAL.models));
  console.log('MISTRAL_LARGE model:', AI_PROVIDERS.MISTRAL.models.MISTRAL_LARGE);
}

try {
  const service = AIServiceFactory.createServiceByName('MISTRAL', 'MISTRAL_LARGE');
  console.log('✓ Service created successfully');

  // Try to initialize with validation disabled
  await service.initialize({ validateOnInit: false });
  console.log('✓ Service initialized without validation');

  // Check if it's configured
  console.log('isConfigured():', service.isConfigured());

  // Try making a simple API call directly to see the actual error
  try {
    console.log('Making direct API call...');
    const testMessages = [{ role: 'user', content: 'ping' }];
    const response = await service.generateResponse(testMessages);
    console.log('API call successful:', response);
  } catch (apiError) {
    console.error('API call failed:', apiError.message);
    console.error('API error details:', {
      name: apiError.name,
      status: apiError.status,
      code: apiError.code
    });
  }

  // Try health check directly to see the actual error
  try {
    console.log('Running health check...');
    const healthCheck = await service.healthCheck();
    console.log('Health check result:', healthCheck);
  } catch (healthError) {
    console.error('Health check failed:', healthError.message);
    console.error('Health check stack:', healthError.stack);
  }

  // Now try validation
  try {
    const isValid = await service.validateConfiguration();
    console.log('Validation result:', isValid);
  } catch (validationError) {
    console.error('Validation failed:', validationError.message);
    console.error('Validation stack:', validationError.stack);
  }
} catch (error) {
  console.error('Error:', error.message);
  if (error.stack) {
    console.error('Stack:', error.stack);
  }
}