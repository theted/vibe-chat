import('./dist/orchestrator/ChatOrchestrator.js').then(m => {
  const c = new m.ChatOrchestrator();
  console.log('Has addMentionToResponse:', 'addMentionToResponse' in c);
  console.log('Has determineInteractionStrategy:', 'determineInteractionStrategy' in c);

  // Test addMentionToResponse
  try {
    const result = c.addMentionToResponse('Hello there!', 'user123');
    console.log('addMentionToResponse works:', result);
  } catch (e) {
    console.log('addMentionToResponse error:', e.message);
  }
}).catch(e => {
  console.error('Error:', e.message);
});
