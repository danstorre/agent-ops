import type Anthropic from "@anthropic-ai/sdk";

// Claude Opus 5.5 prices in USD per million tokens. Writing to the 5-minute cache costs 1.25x
// the input price once; reading from it costs 1/20 of the input price.
export const PRICES_PER_MILLION = { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 } as const;

type UsageCounters = Pick<Anthropic.Usage, "input_tokens" | "output_tokens"> &
  Partial<Pick<Anthropic.Usage, "cache_creation_input_tokens" | "cache_read_input_tokens">>;

// Dan's formula: each counter times its price, added up, divided by one million.
export interface Prices {
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

export function costOfTurn(usage: UsageCounters, prices: Prices = PRICES_PER_MILLION): number {
  const input = usage.input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  return (input * prices.input + cacheWrite * prices.cacheWrite + cacheRead * prices.cacheRead + output * prices.output) / 1_000_000;
}
