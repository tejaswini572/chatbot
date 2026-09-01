import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE = "http://localhost:8000";

function ChatWindow({ closeWidget, config , mode, sessionId}) {

    const [message, setMessage] = useState("");

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: config.welcomeMessage
        }
    ]);

    const [conversationId, setConversationId] = useState(null);
    async function sendGeneralMessage() {
    const userMessage = message.trim();

    setMessages(prev => [
        ...prev,
        {
            sender: "user",
            text: userMessage
        }
    ]);

    setMessage("");

    try {
        const response = await fetch(
            `${API_BASE}/widget_chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userMessage,
                    session_id : sessionId
                })
            }
        );

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Failed to get response");
        }

        setMessages(prev => [
            ...prev,
            {
                sender: "bot",
                text: data.answer
            }
        ]);

    } catch (error) {
        console.error("General widget chat error:", error);

        setMessages(prev => [
            ...prev,
            {
                sender: "bot",
                text: "Something went wrong. Please try again."
            }
        ]);
    }
}
    async function sendMessage() {
        console.log("CHAT MODE:", mode);
        if (message.trim() === "") {
            return;
        }
        if( mode === "standalone"){
            await sendGeneralMessage();
            return;
        }
        console.log("CHAT WINDOW MODE:", mode);
console.log("CHAT WINDOW SESSION:", sessionId);

        let currentConversationId = conversationId;

        try {

            // Create conversation if one doesn't exist
            if (!currentConversationId) {

                const convResponse = await fetch(
                    `${API_BASE}/conversations`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("authToken")}`
                        }
                    }
                );

                const convData = await convResponse.json();

                currentConversationId = convData.id;

                setConversationId(currentConversationId);
            }

            // Show user message immediately
            setMessages(prev => [
                ...prev,
                {
                    sender: "user",
                    text: message
                }
            ]);

            const userMessage = message;

            setMessage("");

            // Send to backend
            const response = await fetch(
                `${API_BASE}/chat`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("authToken")}`
                    },

                    body: JSON.stringify({
                        query: userMessage,
                        conversation_id: currentConversationId
                    })
                }
            );

            const data = await response.json();

            setMessages(prev => [
                ...prev,
                {
                    sender: "bot",
                    text: data.answer
                }
            ]);

        }
        catch (error) {

            console.error(error);

            setMessages(prev => [
                ...prev,
                {
                    sender: "bot",
                    text: "Something went wrong."
                }
            ]);

        }

    }

    return (

                <div 
            className={`chat-popup ${config.widgetSize}`}
            style={{
                left: config.buttonPosition === "left" ? "24px" : "auto",
                right: config.buttonPosition === "right" ? "24px" : "auto"
            }}
        >

            <div
                className="chat-header"
                style={{
                    backgroundColor: config.primaryColor
                }}
            >
                

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                    }}
                >

                    {config.avatarUrl && (
                        <img
                            src={config.avatarUrl}
                            alt="Bot Avatar"
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                objectFit: "cover"
                            }}
                        />
                    )}

                    <h3>{config.botName}</h3>

                </div>

                <button onClick={closeWidget}>
                    ✕
                </button>

            </div>

            <div className="messages">

          {messages.map((msg, index) => (
    <div
        key={index}
        className={msg.sender}
    >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
    </div>
))}

            </div>

            <div className="widget-chat-input">

                <input

                    value={message}

                    onChange={(e) => setMessage(e.target.value)}

                    placeholder="Type message..."

                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            sendMessage();
                        }
                    }}

                />

                <button
                    onClick={sendMessage}
                    style={{
                        backgroundColor: config.primaryColor
                    }}
                >
                    Send
                </button>

            </div>

        </div>

    );

}

export default ChatWindow;