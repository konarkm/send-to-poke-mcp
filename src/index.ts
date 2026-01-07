import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type OutputPayload = {
  status: "sent";
  http_status: number;
  response: unknown;
  raw_response?: string;
};

const DEFAULT_BASE_URL = "https://poke.com";
const DEFAULT_TIMEOUT_MS = 30000;

const SendToPokeInputBaseSchema = z.object({
  message: z.string().min(1).describe("Message to send to Poke"),
  include_raw_response: z
    .boolean()
    .optional()
    .describe("Include raw response text for debugging"),
});

const SendToPokeInputSchema = SendToPokeInputBaseSchema.superRefine((data, ctx) => {
  if (data.message.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "message cannot be empty",
      path: ["message"],
    });
  }
});

const SendToPokeOutputSchema = z.object({
  status: z.literal("sent"),
  http_status: z.number(),
  response: z.unknown(),
  raw_response: z.string().optional(),
});

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  } finally {
    clearTimeout(timeoutId);
  }
}

const server = new McpServer({
  name: "send-to-poke-mcp",
  version: "0.1.0",
});

type SendToPokeInput = z.infer<typeof SendToPokeInputSchema>;

server.registerTool(
  "send_to_poke",
  {
    title: "Send to Poke",
    description: "Send a message to Poke using the inbound webhook.",
    inputSchema: SendToPokeInputBaseSchema,
    outputSchema: SendToPokeOutputSchema,
    annotations: {
      readOnlyHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  async (args) => {
    try {
      const parsedArgs = SendToPokeInputSchema.parse(args) as SendToPokeInput;
      const apiKey = process.env.POKE_API_KEY;
      if (!apiKey) {
        throw new Error("POKE_API_KEY is required");
      }

      const baseUrl = process.env.POKE_BASE_URL ?? DEFAULT_BASE_URL;
      const timeoutMs = Number.parseInt(
        process.env.POKE_TIMEOUT ?? String(DEFAULT_TIMEOUT_MS),
        10
      );

      const message = parsedArgs.message.trim();
      const url = `${baseUrl}/api/v1/inbound-sms/webhook`;

      const { response, text } = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        },
        timeoutMs
      );

      if (!response.ok) {
        throw new Error(`Poke API error ${response.status}: ${text}`);
      }

      let parsedBody: unknown = text;
      if (text) {
        try {
          parsedBody = JSON.parse(text);
        } catch {
          parsedBody = text;
        }
      }

      const payload: OutputPayload = {
        status: "sent",
        http_status: response.status,
        response: parsedBody,
        ...(parsedArgs.include_raw_response ? { raw_response: text } : {}),
      };

      return {
        structuredContent: payload,
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("send_to_poke failed", message);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: message, status: "failed" }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("send-to-poke-mcp running on stdio");
}

main().catch((error) => {
  console.error("Fatal error", error);
  process.exit(1);
});
