import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { StatsTracker } from '../../dist/src/services/StatsTracker.js';

const TOTAL_MESSAGES_KEY = 'ai-chat:stats:messages:total';
const TOTAL_AI_MESSAGES_KEY = 'ai-chat:stats:messages:ai';

describe('StatsTracker', () => {
  afterEach(() => {
    mock.reset();
  });

  it('records assistant messages when redis is available', async () => {
    const tracker = new StatsTracker({
      clientFactory: async () => {
        await fakeClient.connect();
        return fakeClient;
      },
    });
    tracker.enabled = true;
    const pipeline = {
      incr: mock.fn(() => pipeline),
      lPush: mock.fn(() => pipeline),
      lTrim: mock.fn(() => pipeline),
      exec: mock.fn(async () => {}),
    };
    const fakeClient = {
      connect: mock.fn(async () => {}),
      on: mock.fn(() => {}),
      multi: mock.fn(() => pipeline),
    };

    const content = 'a'.repeat(1500);

    await tracker.recordMessage({
      role: 'assistant',
      content,
      provider: 'ProviderA',
      model: 'model-a',
    });

    assert.strictEqual(fakeClient.connect.mock.callCount(), 1);
    assert.strictEqual(fakeClient.multi.mock.callCount(), 1);

    assert.strictEqual(pipeline.incr.mock.callCount(), 2);
    assert.deepStrictEqual(
      pipeline.incr.mock.calls.map(({ arguments: [key] }) => key),
      [TOTAL_MESSAGES_KEY, TOTAL_AI_MESSAGES_KEY]
    );

    assert.strictEqual(pipeline.lPush.mock.callCount(), 1);
    const payload = pipeline.lPush.mock.calls[0].arguments[1];
    const parsed = JSON.parse(payload);
    assert.strictEqual(parsed.role, 'assistant');
    assert.strictEqual(parsed.provider, 'ProviderA');
    assert.strictEqual(parsed.model, 'model-a');
    assert.strictEqual(parsed.content.length, 1000);
    assert.strictEqual(parsed.content, 'a'.repeat(1000));

    assert.strictEqual(pipeline.lTrim.mock.callCount(), 1);
    assert.strictEqual(pipeline.exec.mock.callCount(), 1);
  });

  it('disables redis usage when connection fails', async () => {
    const tracker = new StatsTracker({
      clientFactory: async () => null,
    });
    tracker.enabled = true;

    await assert.doesNotReject(
      tracker.recordMessage({
        role: 'assistant',
        content: 'hello',
        provider: 'Provider',
        model: 'model',
      })
    );

    assert.strictEqual(tracker.enabled, false);
  });
});
