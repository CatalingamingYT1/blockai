export interface Env { AI: any; ASSETS: { fetch: (r: Request) => Promise<Response> }; }

const PROMPT = `
You are BlockAI.
Format Rules:
1. Math: Always use LaTeX. Display math in $$...$$. Inline math in $...$. 
   Example: To show one over one, use $1 \\over 1$.
2. Logic: Be very precise with homework help.
3. Code: Use markdown blocks.
4. Quizzes: If asked, create interactive multiple-choice quizzes.
`;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === "/api/chat" && request.method === "POST") {
            const { messages } = await request.json() as any;
            messages.unshift({ role: "system", content: PROMPT });

            const stream = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
                messages,
                stream: true,
            });
            return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
        }
        return env.ASSETS.fetch(request);
    }
}
