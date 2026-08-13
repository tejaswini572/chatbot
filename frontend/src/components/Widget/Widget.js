import React, { useState, useEffect } from "react";
import FloatingButton from "./FloatingButton";
import WidgetHome from "./WidgetHome";
import ChatWindow from "./ChatWindow";
import "./Widget.css";

function Widget({ config: previewConfig, mode ="document" }) {

    const [isOpen, setIsOpen] = useState(false);
    const [isChatStarted, setIsChatStarted] = useState(false);

        const [config, setConfig] = useState(previewConfig || {
        primaryColor: "#46d8e5",
        botName: "AI Assistant",
        welcomeMessage: "Hi!",
        buttonPosition: "right",
        widgetSize: "medium",
        avatarUrl: ""
    });


    // If preview config is passed, use it immediately
    useEffect(() => {
        if (previewConfig) {
            setConfig(previewConfig);
            
        }
    }, [previewConfig])

    // Otherwise load from backend (normal widget)
    useEffect(() => {
        if (previewConfig) return;

        fetch("http://localhost:8000/widget-config")
            .then((res) => res.json())
            .then((data) => {
                if (data) {
                    setConfig(data);
                }
            })
            .catch((err) => console.error(err));
    }, [previewConfig]);

    function openWidget() {
        setIsOpen(true);
    }

    function closeWidget() {
        setIsOpen(false);
        setIsChatStarted(false);
    }

    function startChat() {
        setIsChatStarted(true);
    }
    console.log(
    previewConfig ? "PREVIEW WIDGET" : "NORMAL WIDGET",
    previewConfig
);
    return (
        <>
            {!isOpen ? (
                <FloatingButton
                    onClick={openWidget}
                    config={config}
                />
            ) : !isChatStarted ? (
                <WidgetHome
                    closeWidget={closeWidget}
                    startChat={startChat}
                    config={config}
                />
            ) : (
                <ChatWindow
                    closeWidget={closeWidget}
                    config={config}
                    mode={mode}
                />
            )}
        </>
    );
}

export default Widget;