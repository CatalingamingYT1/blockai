/**
 * BlockAI - Backend (Cloudflare Worker)
 * Powered by Cloudflare Workers AI
 */

export interface Env {
  // Binding-ul către AI definit în dashboard-ul Cloudflare
  AI: any;
  // Binding-ul către resursele statice (HTML, JS, CSS)
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

// Modelul LLM utilizat - Llama 3.1 este rapid și foarte bun la cod și teme
const MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8";

// Instrucțiunile de sistem care definesc comportamentul BlockAI
const SYSTEM_PROMPT = `
You are BlockAI, a premium AI assistant developed by Cătălin. 
Your goal is to be the best assistant for students and developers.
- When asked for help with homework: Provide step-by-step explanations and clear answers.
- When asked for help with code: Use Markdown code blocks (\`\`\`language\\n code \`\`\`), write clean code, and explain how it works.
- Always identify as BlockAI. 
- Be professional, helpful, and never make mistakes in calculations or syntax.
- Language: Respond in the same language the user uses.
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Ruta pentru API-ul de Chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json() as { messages: any[] };
        const messages = body.messages || [];

        // Inserăm prompt-ul de sistem la începutul conversației pentru context
        if (!messages.some((msg: any) => msg.role === "system")) {
          messages.unshift({
            role: "system",
            content: SYSTEM_PROMPT
          });
        }

        // Rulăm modelul AI cu opțiunea de streaming activată
        const stream = await env.AI.run(MODEL_ID, {
          messages: messages,
          stream: true,
        });

        // Returnăm stream-ul direct către frontend cu header-ul corect
        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });

      } catch (error) {
        console.error("BlockAI Error:", error);
        return new Response(
          JSON.stringify({ error: "Internal Server Error", details: error }),
          { 
            status: 500, 
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
    }

    // 2. Ruta pentru fișierele statice (index.html, chat.js)
    // Dacă URL-ul nu începe cu /api/, Cloudflare va căuta fișierul în folderul public
    return env.ASSETS.fetch(request);
  },
};
