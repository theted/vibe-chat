/**
 * Integration OK test for Gemini models
 * Usage: node tests/integration-ok-gemini.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

const buildMessages = ({ instruction }) => [
  { role: "user", content: instruction },
];

executeOkIntegrationTest({
  providerKey: "GEMINI",
  providerLabel: "Gemini",
  buildMessages,
});

