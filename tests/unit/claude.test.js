import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The SDK client, without the network. Error classes keep the SDK's shape:
// RateLimitError is an APIError with a status.
const parse = vi.fn();
vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
  class RateLimitError extends APIError {}
  class Anthropic {
    constructor() {
      this.beta = { messages: { parse } };
    }
  }
  Anthropic.APIError = APIError;
  Anthropic.RateLimitError = RateLimitError;
  return { default: Anthropic };
});

const { default: Anthropic } = await import('@anthropic-ai/sdk');
const { groupWithClaude, MODEL } = await import('@utils/services/claude');

const items = [{ id: 'a', day: '2024-05-15', age: 'Carlo tenía 1 año', tag: '#r', text: 'Tu fiesta' }];

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  parse.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  vi.restoreAllMocks();
});

describe('groupWithClaude', () => {
  it('asks Claude Opus 5.5 for structured groups, with the server-side refusal fallback', async () => {
    parse.mockResolvedValue({ stop_reason: 'end_turn', parsed_output: { events: [{ title: 'Tu fiesta', memoryIds: ['a'] }] } });

    expect(await groupWithClaude(items)).toEqual([{ title: 'Tu fiesta', memoryIds: ['a'] }]);

    const request = parse.mock.calls[0][0];
    expect(MODEL).toBe('claude-opus-5-5');
    expect(request).toMatchObject({
      model: 'claude-opus-5-5',
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: expect.any(Object) },
    });
    expect(JSON.parse(request.messages[0].content)).toEqual({ recuerdos: items });
    expect(request.system).toContain('Every memory id must appear in exactly one event');
  });

  it('does nothing without an API key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await groupWithClaude(items)).toBeNull();
    expect(parse).not.toHaveBeenCalled();
  });

  it.each([['refusal'], ['max_tokens']])('gives up on stop reason %s', async (stop_reason) => {
    parse.mockResolvedValue({ stop_reason, parsed_output: null });
    expect(await groupWithClaude(items)).toBeNull();
  });

  it('gives up on API errors, rate limits and anything else, without throwing', async () => {
    parse.mockRejectedValueOnce(new Anthropic.RateLimitError(429, 'slow down'));
    expect(await groupWithClaude(items)).toBeNull();
    parse.mockRejectedValueOnce(new Anthropic.APIError(500, 'oops'));
    expect(await groupWithClaude(items)).toBeNull();
    parse.mockRejectedValueOnce(new Error('network'));
    expect(await groupWithClaude(items)).toBeNull();
  });
});
