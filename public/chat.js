const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

let chatHistory = [
	{ role: "assistant", content: "Hello! I am BlockAI. How can I assist you today?" }
];
let isProcessing = false;

// Auto-resize input box
userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = this.scrollHeight + "px";
});

// Submit on Enter
userInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});

sendButton.addEventListener("click", sendMessage);

async function sendMessage() {
	const text = userInput.value.trim();
	if (text === "" || isProcessing) return;

	isProcessing = true;
	userInput.disabled = true;
	sendButton.disabled = true;

	// Update UI
	addMessageToChat("user", text);
	userInput.value = "";
	userInput.style.height = "auto";
	typingIndicator.classList.add("visible");
	chatHistory.push({ role: "user", content: text });

	try {
		const assistantMsgDiv = document.createElement("div");
		assistantMsgDiv.className = "message assistant-message";
		assistantMsgDiv.innerHTML = "<p></p>";
		chatMessages.appendChild(assistantMsgDiv);
		const assistantText = assistantMsgDiv.querySelector("p");

		const response = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages: chatHistory }),
		});

		if (!response.ok) throw new Error("API Error");

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let fullResponse = "";
		let buffer = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop();

			for (const line of lines) {
				if (line.startsWith("data:")) {
					const dataStr = line.slice(5).trim();
					if (dataStr === "[DONE]") break;
					try {
						const json = JSON.parse(dataStr);
						const content = json.response || json.choices?.[0]?.delta?.content || "";
						if (content) {
							fullResponse += content;
							assistantText.textContent = fullResponse;
							chatMessages.scrollTop = chatMessages.scrollHeight;
						}
					} catch (e) {}
				}
			}
		}
		chatHistory.push({ role: "assistant", content: fullResponse });
	} catch (err) {
		addMessageToChat("assistant", "Sorry, BlockAI encountered an error. Please try again.");
	} finally {
		typingIndicator.classList.remove("visible");
		isProcessing = false;
		userInput.disabled = false;
		sendButton.disabled = false;
		userInput.focus();
	}
}

function addMessageToChat(role, content) {
	const div = document.createElement("div");
	div.className = `message ${role}-message`;
	div.innerHTML = `<p>${content}</p>`;
	chatMessages.appendChild(div);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}
