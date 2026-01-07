# send-to-poke-mcp

Minimal MCP server for sending messages to Poke via the inbound webhook.

## Features
- Single MCP tool: `send_to_poke`
- Sends a message to Poke using the inbound webhook
- Structured tool output with normalized response

## Requirements
- Node.js >= 18
- `POKE_API_KEY` environment variable

## MCP client config
Add the following config to your MCP client:
```json
{
  "mcpServers": {
    "send-to-poke": {
      "command": "npx",
      "args": ["-y", "send-to-poke-mcp"],
      "env": {
        "POKE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Local development
```bash
npm install
npm run build
```

## Smoke test (optional)
```bash
POKE_API_KEY=your-api-key-here npm run build
POKE_API_KEY=your-api-key-here npm run smoke-test
```
Note: this test requires network access and may fail in restricted environments.

## MCP Tool
### `send_to_poke`
Send a message to Poke.

**Input**
```json
{
  "message": "string",
  "include_raw_response": false
}
```

**Output**
```json
{
  "status": "sent",
  "http_status": 200,
  "response": {},
  "raw_response": ""
}
```

## Environment Variables
- `POKE_API_KEY` (required)
- `POKE_BASE_URL` (default: `https://poke.com`)
- `POKE_TIMEOUT` (default: `30000`)

## Notes
- Tool responses are returned as MCP `structuredContent` (with a text fallback for display).
- This project is not affiliated with Interaction Co.
