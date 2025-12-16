import('./src/orchestrator/ChatOrchestrator.js').then(m => {
  console.log('ChatOrchestrator imported:', !!m.ChatOrchestrator);
}).catch(e => {
  console.error('Error:', e.message);
});