const msgContainer = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const welcome = document.getElementById('welcome');

let chatHistory = JSON.parse(localStorage.getItem('blockai_history')) || [];

function quickStart(text) {
    userInput.value = text;
    sendMessage();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if(!text) return;

    welcome.classList.add('hidden');
    addMessage('user', text);
    userInput.value = '';
    
    const aiDiv = addMessage('assistant', '<span class="animate-pulse">...</span>');
    const aiP = aiDiv.querySelector('.content-area');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages: [{role: "user", content: text}] })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullRes = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for(let line of lines) {
                if(line.startsWith('data:')) {
                    const data = line.slice(5).trim();
                    if(data === "[DONE]") break;
                    try {
                        const json = JSON.parse(data);
                        fullRes += json.response || json.choices?.[0]?.delta?.content || "";
                        // Render Math & Markdown
                        aiP.innerHTML = renderResponse(fullRes);
                    } catch(e){}
                }
            }
        }
    } catch(e) { aiP.innerText = "Error. Check your connection."; }
}

function renderResponse(text) {
    // 1. Render Markdown
    let html = marked.parse(text);
    // 2. Render Math (KaTeX) - caută simboluri $...$ sau $$...$$
    html = html.replace(/\$\$(.*?)\$\$/g, (m, equation) => {
        return katex.renderToString(equation, { displayMode: true });
    });
    html = html.replace(/\$(.*?)\$/g, (m, equation) => {
        return katex.renderToString(equation, { displayMode: false });
    });
    return html;
}

function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `p-6 ${role === 'assistant' ? 'message-ai' : 'message-user'}`;
    div.innerHTML = `
        <div class="max-w-3xl mx-auto flex">
            <div class="w-8 h-8 rounded-sm mr-4 flex-shrink-0 flex items-center justify-center font-bold ${role === 'user' ? 'bg-indigo-500' : 'bg-emerald-500'}">
                ${role === 'user' ? 'U' : 'B'}
            </div>
            <div class="content-area overflow-x-auto">${content}</div>
        </div>
    `;
    msgContainer.appendChild(div);
    document.getElementById('chat-window').scrollTop = document.getElementById('chat-window').scrollHeight;
    return div;
}

sendBtn.onclick = sendMessage;
