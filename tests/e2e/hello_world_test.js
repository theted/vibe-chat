Feature("Hello world");

Scenario("landing page renders welcome content", async ({ I }) => {
  I.amOnPage("/");
  I.waitForText("Vibe chat", 10);
  I.see("Vibe chat");
});
