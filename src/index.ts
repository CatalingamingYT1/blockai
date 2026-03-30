export interface Env { AI: any; ASSETS: { fetch: (r: Request) => Promise<Response> }; }

const SYSTEM_PROMPT = `
You are BlockAI. 
For Mathematics: Use LaTeX format for all calculations. Wrap display equations in $$...$$ and inline in $...$. Example: $$1 \\over 1 = 1$$.
For Quizzes: If asked for a quiz, provide multiple choice questions (A, B, C, D) and wait for user answer.
For Coding: Use markdown code blocks.
Your UI must be clean and academic. Identify as BlockAI.
`;

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        if (url.pathname === "/api/chat" && request.method === "POST") {
            const { messages } = await request.json() as any;
            messages.unshift({ role: "system", content: SYSTEM_PROMPT });

            const stream = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
                messages,
                stream: true,
            });
            return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
        }
        return env.ASSETS.fetch(request);
    }
}
