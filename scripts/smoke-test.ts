import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";

const apiKey = process.env.POKE_API_KEY;
if (!apiKey) {
  console.error("POKE_API_KEY is required for smoke test");
  process.exit(1);
}

const serverPath = path.resolve(process.cwd(), "dist/index.js");
const transport = new StdioClientTransport({
  command: "node",
  args: [serverPath],
  env: { POKE_API_KEY: apiKey },
});

const client = new Client({ name: "send-to-poke-smoke", version: "0.0.1" });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log("tools:", tools.tools.map((t) => t.name));

  const result = await client.callTool({
    name: "send_to_poke",
    arguments: {
      message: "Hello from send-to-poke-mcp smoke test",
    },
  });

  const content = result.content?.[0]?.text ?? "";
  console.log("tool result:", content);
  await client.close();
} catch (error) {
  console.error("smoke test failed", error);
  process.exit(1);
}
