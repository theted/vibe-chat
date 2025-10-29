Feature('Hello world');

Scenario('landing page renders welcome content', async ({ I }) => {
  I.amOnPage('/');
  I.waitForText('AI Chat Realtime', 10);
  I.see('Welcome to AI Chat Realtime!');
  I.see('Join Chat');
});
