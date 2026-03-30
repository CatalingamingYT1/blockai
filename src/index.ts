export interface Env {
	AI: any;
	ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// You can change this to other models like @cf/meta/llama-3-8b-instruct
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";
const SYSTEM_PROMPT = "You are BlockAI, a helpful and intelligent AI assistant. Always identify yourself as BlockAI. Provide accurate and concise information in English.";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// Serve the static frontend
		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		// Chat API Route
		if (url.pathname === "/api/chat" && request.method === "POST") {
			const { messages = [] } = await request.json() as any;
			
			// Inject system prompt if missing
			if (!messages.some((msg: any) => msg.role === "system")) {
				messages.unshift({ role: "system", content: SYSTEM_PROMPT });
			}

			const stream = await env.AI.run(MODEL_ID, {
				messages,
				max_tokens: 1500,
				stream: true,
			});

			return new Response(stream, {
				headers: { 
					"content-type": "text/event-stream", 
					"cache-control": "no-cache",
					"connection": "keep-alive"
				},
			});
		}

		return new Response("Not Found", { status: 404 });
	},
};
