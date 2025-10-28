#!/usr/bin/env node

/**
 * Test script to verify all dependencies are properly installed
 */

console.log('🧪 Testing AI Chat Core dependencies...\n');

async function testDependencies() {
  const tests = [];

  // Test core package import
  tests.push(async () => {
    const { ChatOrchestrator } = await import('./packages/ai-chat-core/src/index.js');
    console.log('✅ ChatOrchestrator import successful');
    return true;
  });

  // Test OpenAI SDK
  tests.push(async () => {
    const OpenAI = await import('openai');
    console.log('✅ OpenAI SDK import successful');
    return true;
  });

  // Test Anthropic SDK
  tests.push(async () => {
    const Anthropic = await import('@anthropic-ai/sdk');
    console.log('✅ Anthropic SDK import successful');
    return true;
  });

  // Test Google AI SDK
  tests.push(async () => {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    console.log('✅ Google AI SDK import successful');
    return true;
  });

  // Test Mistral SDK
  tests.push(async () => {
    const MistralAI = await import('@mistralai/mistralai');
    console.log('✅ Mistral SDK import successful');
    return true;
  });

  // Test node-fetch
  tests.push(async () => {
    const fetch = await import('node-fetch');
    console.log('✅ node-fetch import successful');
    return true;
  });

  // Run all tests
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All dependency tests passed! Ready to start the server.');
  } else {
    console.log('⚠️  Some dependencies failed. Run "npm install" in packages/ai-chat-core/');
    process.exit(1);
  }
}

// Change to the core package directory for testing
process.chdir('./packages/ai-chat-core');
testDependencies().catch(console.error);