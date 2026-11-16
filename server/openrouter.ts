import { z } from "zod";
import { ApiError } from "./errors";
export interface AIConfig {
  apiKey: string;
  model: string;
  problem: string | null;
}
export function configFromEnv(env: NodeJS.ProcessEnv = process.env): AIConfig {
  const apiKey = env.OPENROUTER_API_KEY?.trim() || "",
    model = env.OPENROUTER_MODEL?.trim() || "";
  const missing = [
    !apiKey ? "OPENROUTER_API_KEY" : null,
    !model ? "OPENROUTER_MODEL" : null,
  ].filter(Boolean);
  const problem = missing.length
    ? "Thiếu cấu hình máy chủ: " + missing.join(", ")
    : !/^[-\w.]+\/[-\w.:/]+$/.test(model)
      ? "OPENROUTER_MODEL không hợp lệ."
      : /[\r\n]/.test(apiKey)
        ? "OPENROUTER_API_KEY không hợp lệ."
        : null;
  return { apiKey, model, problem };
}
export interface Capabilities {
  tools: boolean;
  structured: boolean;
  promptPrice: number;
  completionPrice: number;
  maxParameter: "max_tokens" | "max_completion_tokens";
}
export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
export interface Completion {
  message: Message;
  usage: {
    promptTokens: number;
    completionTokens: number;
    cost: number | null;
  };
  generationId: string;
}
export interface Transport {
  capabilities(signal: AbortSignal): Promise<Capabilities>;
  complete(
    messages: Message[],
    tools: unknown[],
    final: boolean,
    signal: AbortSignal,
    responseSchema?: Record<string, unknown>,
  ): Promise<Completion>;
}
const toolCallSchema = z.object({
  id: z.string().min(1).max(128),
  type: z.literal("function"),
  function: z.object({
    name: z.string().max(100),
    arguments: z.string().max(4096),
  }),
});
const responseSchema = z.object({
  id: z.string().max(200).optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          role: z.literal("assistant"),
          content: z.string().max(12000).nullable().optional(),
          tool_calls: z.array(toolCallSchema).max(6).optional(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1)
    .max(10),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      cost: z.number().finite().nonnegative().nullable().optional(),
    })
    .optional(),
});
const selectionSchema = {
  type: "object",
  properties: {
    resultIds: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
  required: ["resultIds"],
  additionalProperties: false,
};
async function boundedJson(
  response: Response,
  max = 1024 * 1024,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader)
    throw new ApiError("AI_MALFORMED", 502, "AI trả về dữ liệu không hợp lệ.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        throw new ApiError("AI_MALFORMED", 502, "Phản hồi AI vượt giới hạn.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError("AI_MALFORMED", 502, "AI trả về dữ liệu không hợp lệ.");
  }
}
export class OpenRouterTransport implements Transport {
  private cached?: { expires: number; value: Capabilities };
  constructor(
    private config: AIConfig,
    private http: typeof fetch = fetch,
  ) {}
  async capabilities(signal: AbortSignal) {
    if (this.config.problem)
      throw new ApiError("AI_CONFIG", 503, this.config.problem);
    if (this.cached && this.cached.expires > Date.now())
      return this.cached.value;
    const url =
      "https://openrouter.ai/api/v1/models/" +
      this.config.model.split("/").map(encodeURIComponent).join("/") +
      "/endpoints";
    const response = await this.http(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
      redirect: "error",
    });
    if (!response.ok)
      throw new ApiError(
        "AI_MODEL",
        503,
        "Không xác minh được model đã cấu hình.",
      );
    const payload = await boundedJson(response);
    const schema = z.object({
      data: z.object({
        endpoints: z.array(
          z.object({
            supported_parameters: z.array(z.string()),
            pricing: z.object({ prompt: z.string(), completion: z.string() }),
          }),
        ),
      }),
    });
    const parsed = schema.safeParse(payload);
    if (!parsed.success)
      throw new ApiError("AI_MODEL", 503, "Metadata model không hợp lệ.");
    const endpoints = parsed.data.data.endpoints.filter(
      (e) =>
        e.supported_parameters.includes("tools") &&
        e.supported_parameters.includes("tool_choice"),
    );
    const candidates = endpoints.length
      ? endpoints
      : parsed.data.data.endpoints;
    const prices = candidates.map((e) => ({
      p: Number(e.pricing.prompt),
      c: Number(e.pricing.completion),
    }));
    if (
      !prices.length ||
      prices.some(
        (v) =>
          !Number.isFinite(v.p) || !Number.isFinite(v.c) || v.p < 0 || v.c < 0,
      )
    )
      throw new ApiError(
        "AI_PRICING",
        503,
        "Chưa có thông tin giá đáng tin để kiểm soát chi phí.",
      );
    const value: Capabilities = {
      tools: endpoints.length > 0,
      structured: candidates.some((e) =>
        e.supported_parameters.includes("response_format"),
      ),
      promptPrice: Math.max(...prices.map((v) => v.p)),
      completionPrice: Math.max(...prices.map((v) => v.c)),
      maxParameter: candidates.some((e) =>
        e.supported_parameters.includes("max_tokens"),
      )
        ? "max_tokens"
        : "max_completion_tokens",
    };
    this.cached = { expires: Date.now() + 300000, value };
    return value;
  }
  async complete(
    messages: Message[],
    tools: unknown[],
    final: boolean,
    signal: AbortSignal,
    outputSchema?: Record<string, unknown>,
  ): Promise<Completion> {
    const capability = await this.capabilities(signal);
    const body = {
      model: this.config.model,
      messages,
      stream: false,
      [capability.maxParameter]: 800,
      provider: { require_parameters: true, data_collection: "deny" },
      ...(final
        ? capability.structured
          ? {
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: outputSchema
                    ? "grounded_document_answer"
                    : "authorized_result_selection",
                  strict: true,
                  schema: outputSchema || selectionSchema,
                },
              },
            }
          : {}
        : { tools, tool_choice: "auto" }),
    };
    // UTF-8 byte count is a conservative upper bound; no character-to-token guess.
    if (Buffer.byteLength(JSON.stringify(body)) > 18000)
      throw new ApiError(
        "AI_INPUT_LIMIT",
        422,
        "Ngữ cảnh quá dài. Vui lòng thu hẹp câu hỏi.",
      );
    const response = await this.http(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + this.config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
      },
    );
    if (!response.ok) {
      const seconds = Number(response.headers.get("retry-after"));
      throw new ApiError(
        response.status === 429
          ? "AI_RATE_LIMIT"
          : response.status === 401 || response.status === 403
            ? "AI_AUTH"
            : response.status === 402
              ? "AI_CREDIT"
              : "AI_UPSTREAM",
        503,
        "Dịch vụ AI đang gián đoạn; sử dụng tra cứu xác định.",
        Number.isFinite(seconds) && seconds > 0
          ? Math.min(seconds, 3600)
          : undefined,
      );
    }
    const raw = await boundedJson(response);
    if (raw && typeof raw === "object" && "error" in raw)
      throw new ApiError(
        "AI_UPSTREAM",
        503,
        "Dịch vụ AI trả lỗi; sử dụng tra cứu xác định.",
      );
    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success)
      throw new ApiError("AI_MALFORMED", 502, "Phản hồi AI không hợp lệ.");
    const first = parsed.data.choices[0];
    if (
      first.message.refusal ||
      first.finish_reason === "length" ||
      first.finish_reason === "error"
    )
      throw new ApiError("AI_INCOMPLETE", 502, "AI chưa trả lời đầy đủ.");
    return {
      generationId: parsed.data.id || "",
      message: {
        role: "assistant",
        content: first.message.content || null,
        tool_calls: first.message.tool_calls,
      },
      usage: {
        promptTokens: parsed.data.usage?.prompt_tokens || 0,
        completionTokens: parsed.data.usage?.completion_tokens || 0,
        cost: parsed.data.usage?.cost ?? null,
      },
    };
  }
}
