const chatWindow = document.getElementById('chat-window');
const welcomeScreen = document.getElementById('welcome-screen');
const msgContainer = document.getElementById('messages-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const chatList = document.getElementById('chat-list');
const sidebar = document.getElementById('sidebar');

let currentChatId = null;
let conversations = JSON.parse(localStorage.getItem('blockai_chats')) || {};

// Load History in Sidebar
function updateSidebar() {
    chatList.innerHTML = '';
    Object.keys(conversations).sort((a,b) => b - a).forEach(id => {
        const item = document.createElement('div');
        item.className = "flex justify-between items-center p-2 hover:bg-white/10 rounded cursor-pointer group";
        item.innerHTML = `
            <span class="truncate text-sm" onclick="loadChat('${id}')">💬 ${conversations[id].title}</span>
            <button onclick="deleteChat('${id}')" class="hidden group-hover:block text-red-500">🗑️</button>
        `;
        chatList.appendChild(item);
    });
}

// Start with a specific prompt (Homework/Code)
function startSpecific(prompt) {
    newChat();
    userInput.value = prompt;
    sendMessage();
}

function newChat() {
    currentChatId = Date.now().toString();
    welcomeScreen.classList.add('hidden');
    msgContainer.classList.remove('hidden');
    msgContainer.innerHTML = '';
    userInput.focus();
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    if (!currentChatId) newChat();

    addMessage('user', text);
    userInput.value = '';

    // Create entry in memory if new
    if (!conversations[currentChatId]) {
        conversations[currentChatId] = { title: text.substring(0, 20), messages: [] };
    }
    conversations[currentChatId].messages.push({ role: 'user', content: text });

    const assistantDiv = addMessage('assistant', '...');
    const assistantP = assistantDiv.querySelector('p');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({ messages: conversations[currentChatId].messages })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullRes = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data:')) {
                    const data = line.slice(5).trim();
                    if (data === "[DONE]") break;
                    try {
                        const json = JSON.parse(data);
                        const content = json.response || json.choices?.[0]?.delta?.content || "";
                        fullRes += content;
                        // Format code blocks
                        assistantP.innerHTML = formatAIResponse(fullRes);
                    } catch(e){}
                }
            }
        }
        conversations[currentChatId].messages.push({ role: 'assistant', content: fullRes });
        saveData();
    } catch (e) {
        assistantP.innerText = "Error connecting to BlockAI.";
    }
}

function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `p-6 flex ${role === 'user' ? 'message-user' : 'message-assistant'}`;
    div.innerHTML = `
        <div class="max-w-3xl mx-auto flex w-full">
            <span class="mr-4 font-bold text-blue-400">${role === 'user' ? 'You' : 'BlockAI'}</span>
            <p class="flex-1 whitespace-pre-wrap">${content}</p>
        </div>
    `;
    msgContainer.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
}

function formatAIResponse(text) {
    // Basic code block formatting
    return text.replace(/```(\w+)?\n([\s\S]+?)```/g, (m, lang, code) => {
        return `<pre><code>${code.trim()}</code><button class="copy-btn" onclick="copyCode(this)">Copy</button></pre>`;
    });
}

function copyCode(btn) {
    const code = btn.previousElementSibling.innerText;
    navigator.clipboard.writeText(code);
    btn.innerText = "Copied!";
    setTimeout(() => btn.innerText = "Copy", 2000);
}

function loadChat(id) {
    currentChatId = id;
    welcomeScreen.classList.add('hidden');
    msgContainer.classList.remove('hidden');
    msgContainer.innerHTML = '';
    conversations[id].messages.forEach(m => addMessage(m.role, m.content));
}

function deleteChat(id) {
    delete conversations[id];
    saveData();
    location.reload();
}

function saveData() {
    localStorage.setItem('blockai_chats', JSON.stringify(conversations));
    updateSidebar();
}

document.getElementById('new-chat-btn').onclick = newChat;
document.getElementById('menu-toggle').onclick = () => sidebar.classList.toggle('open');
document.getElementById('toggle-dark').onclick = () => document.documentElement.classList.toggle('dark');
sendBtn.onclick = sendMessage;
updateSidebar();
