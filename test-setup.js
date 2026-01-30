/**
 * Quick test to verify the AI Chat system works
 */

import { ChatOrchestrator } from './packages/ai-chat-core/src/index.js';

console.log('🧪 Testing AI Chat Core System...\n');

async function testChatOrchestrator() {
  try {
    // Create orchestrator
    const orchestrator = new ChatOrchestrator({
      maxMessages: 10,
      maxAIMessages: 3, // Reduced for testing
      minDelayBetweenAI: 1000, // 1 second for testing
      maxDelayBetweenAI: 3000   // 3 seconds for testing
    });

    console.log('✅ ChatOrchestrator created');

    // Test without any AI services (should work but with no AIs)
    const status = orchestrator.getStatus();
    console.log('✅ Status retrieved:', {
      aiServices: status.aiServices,
      activeAIs: status.activeAIs,
      contextSize: status.contextSize
    });

    // Test message handling
    const testMessage = {
      sender: 'TestUser',
      content: 'Hello, this is a test message!',
      senderType: 'user',
      roomId: 'test-room',
      priority: 1000
    };

    // Add message
    orchestrator.addMessage(testMessage);
    console.log('✅ Test message added to orchestrator');

    // Test context manager
    const contextStatus = orchestrator.contextManager.size();
    console.log('✅ Context manager working, size:', contextStatus);

    // Test topic change
    orchestrator.changeTopic('Testing Topic', 'TestUser', 'test-room');
    console.log('✅ Topic change test completed');

    // Cleanup
    orchestrator.cleanup();
    console.log('✅ Cleanup completed');

    console.log('\n🎉 All core tests passed!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add at least one AI API key to .env');
    console.log('3. Run: ./setup.sh or docker-compose up');
    console.log('4. Open http://localhost:3000');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testChatOrchestrator();