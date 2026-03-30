const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const msgRender = document.getElementById('msg-render');
const chatWindow = document.getElementById('chat-window');
const welcome = document.getElementById('welcome');

// Enter key functionality
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-grow textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

function fastStart(text) {
    userInput.value = text;
    sendMessage();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    welcome.classList.add('hidden');
    addMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';
    
    const aiDiv = addMessage('assistant', '<div class="typing-dot"></div>');
    const aiContent = aiDiv.querySelector('.content-text');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: "user", content: text }] })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullRes = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (let line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim();
                    if (data === "[DONE]") break;
                    try {
                        const json = JSON.parse(data);
                        fullRes += json.response || json.choices?.[0]?.delta?.content || "";
                        // Render UI with Math support
                        aiContent.innerHTML = formatAIResponse(fullRes);
                    } catch (e) {}
                }
            }
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }
    } catch (e) {
        aiContent.innerText = "Connection lost. Try again.";
    }
}

function formatAIResponse(text) {
    // 1. Markdown
    let html = marked.parse(text);
    // 2. LaTeX Display ($$...$$)
    html = html.replace(/\$\$([\s\S]+?)\$\$/g, (m, eq) => katex.renderToString(eq, { displayMode: true }));
    // 3. LaTeX Inline ($...$)
    html = html.replace(/\$([\s\S]+?)\$/g, (m, eq) => katex.renderToString(eq, { displayMode: false }));
    // 4. Code Blocks Copy Button
    html = html.replace(/<pre>/g, '<pre><button class="copy-btn" onclick="copyText(this)">Copy</button>');
    return html;
}

function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `p-5 ${role === 'assistant' ? 'chat-bubble-ai' : 'chat-bubble-user'} animate-fade-in`;
    div.innerHTML = `
        <div class="flex gap-4">
            <div class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${role === 'user' ? 'bg-blue-600' : 'bg-emerald-600'}">
                ${role === 'user' ? 'U' : 'B'}
            </div>
            <div class="content-text overflow-x-auto text-sm leading-relaxed">${content}</div>
        </div>
    `;
    msgRender.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
}

function copyText(btn) {
    const code = btn.nextElementSibling.innerText;
    navigator.clipboard.writeText(code);
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = "Copy", 2000);
}
