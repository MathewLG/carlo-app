import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

export const MODEL = 'claude-opus-5-5';

const Grouping = z.object({
  events: z.array(
    z.object({
      title: z.string(),
      memoryIds: z.array(z.string()),
    }),
  ),
});

const SYSTEM = `You organize a family's memories of a child named Carlo into the events of his life, for a timeline he will read when he is older. Each memory comes with an id, the day it happened, Carlo's age that day, a category tag the family chose, and the start of the text, in Spanish.

Group memories that are about the same moment or occasion (the same trip, celebration, holiday, or stretch of days) into one event. Memories far apart in time are different events even when they are alike: two birthdays are two events. A memory that matches no other is an event on its own.

Name each event in Spanish, speaking to Carlo as "tú", in six words or fewer, warm and specific, like "Tu primer cumpleaños", "Vacaciones en la playa" or "Navidad con los abuelos". Use only what the memories say; never invent places, people or facts. No emoji or quotation marks. Add a year only when it is what tells two events apart, as in "Navidad 2024".

Every memory id must appear in exactly one event.`;

// Groups and names the memories with Claude. Returns [{ title, memoryIds }],
// or null when Claude is not configured or cannot answer; the timeline then
// groups by month. Only the day, age, tag and start of each memory's text are
// sent: no names, photos or voice notes.
export const groupWithClaude = async (items) => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });

  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If a safety check declines, the API retries on Anthropic's recommended model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: 'medium', format: betaZodOutputFormat(Grouping) },
      messages: [{ role: 'user', content: JSON.stringify({ recuerdos: items }) }],
    });
    if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') {
      console.warn(`Timeline grouping stopped: ${response.stop_reason}`);
      return null;
    }
    return response.parsed_output?.events ?? null;
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn('Timeline grouping rate limited; using months for now');
    } else if (error instanceof Anthropic.APIError) {
      console.error(`Timeline grouping failed: HTTP ${error.status}`, error.message);
    } else {
      console.error('Timeline grouping failed', error);
    }
    return null;
  }
};
