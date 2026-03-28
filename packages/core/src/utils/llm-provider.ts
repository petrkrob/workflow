/**
 * LLM Provider Abstraction — swap between providers without changing module code.
 *
 * Supports: Anthropic Claude, OpenAI, and extensible to any provider.
 * Handles: structured JSON output, token counting, cost tracking, retries.
 */

export interface LLMProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean; // Request structured JSON output
  maxTokens?: number;
  temperature?: number;
  metadata?: {
    module: string;
    promptVersion: string;
    caseId?: string;
  };
}

export interface LLMResponse {
  content: string;
  parsedJson?: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
  };
  model: string;
  provider: string;
  latencyMs: number;
}

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  name: string;
}

/**
 * Creates an LLM provider instance based on configuration.
 *
 * Usage:
 * ```ts
 * const llm = createLLMProvider({
 *   provider: 'anthropic',
 *   model: 'claude-sonnet-4-20250514',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 * });
 *
 * const response = await llm.generate({
 *   systemPrompt: '...',
 *   userPrompt: '...',
 *   jsonMode: true,
 *   metadata: { module: 'meeting_summary', promptVersion: '1.0.0' },
 * });
 * ```
 */
export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'openai':
      return createOpenAIProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }
}

function createAnthropicProvider(config: LLMProviderConfig): LLMProvider {
  return {
    name: `anthropic/${config.model}`,
    async generate(request: LLMRequest): Promise<LLMResponse> {
      const startTime = Date.now();

      // Dynamic import to avoid bundling issues
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: config.apiKey });

      const response = await client.messages.create({
        model: config.model,
        max_tokens: request.maxTokens ?? config.maxTokens ?? 4096,
        temperature: request.temperature ?? config.temperature ?? 0.2,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const content = response.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map((block) => block.text)
        .join('');

      let parsedJson: unknown = undefined;
      if (request.jsonMode) {
        try {
          // Extract JSON from markdown code blocks if present
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
          parsedJson = JSON.parse(jsonMatch[1]?.trim() ?? content);
        } catch {
          // JSON parsing failed — return raw content, caller handles validation
        }
      }

      const inputTokens = response.usage?.input_tokens ?? 0;
      const outputTokens = response.usage?.output_tokens ?? 0;

      return {
        content,
        parsedJson,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCostUsd: estimateCost(config.model, inputTokens, outputTokens),
        },
        model: config.model,
        provider: 'anthropic',
        latencyMs: Date.now() - startTime,
      };
    },
  };
}

function createOpenAIProvider(config: LLMProviderConfig): LLMProvider {
  return {
    name: `openai/${config.model}`,
    async generate(request: LLMRequest): Promise<LLMResponse> {
      const startTime = Date.now();

      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: config.apiKey,
        ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
      });

      const response = await client.chat.completions.create({
        model: config.model,
        max_tokens: request.maxTokens ?? config.maxTokens ?? 4096,
        temperature: request.temperature ?? config.temperature ?? 0.2,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        ...(request.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });

      const content = response.choices[0]?.message?.content ?? '';

      let parsedJson: unknown = undefined;
      if (request.jsonMode) {
        try {
          parsedJson = JSON.parse(content);
        } catch {
          // JSON parsing failed
        }
      }

      const inputTokens = response.usage?.prompt_tokens ?? 0;
      const outputTokens = response.usage?.completion_tokens ?? 0;

      return {
        content,
        parsedJson,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCostUsd: estimateCost(config.model, inputTokens, outputTokens),
        },
        model: config.model,
        provider: 'openai',
        latencyMs: Date.now() - startTime,
      };
    },
  };
}

/**
 * Rough cost estimation per model. Update as pricing changes.
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // Anthropic (per 1M tokens)
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-opus-4-20250514': { input: 15, output: 75 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
    // OpenAI (per 1M tokens)
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
  };

  const rates = pricing[model] ?? { input: 5, output: 15 }; // Conservative default
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}
