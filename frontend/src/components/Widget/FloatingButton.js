import React from "react";

function FloatingButton({ onClick, config }) {
console.log("Floating Button Config:", config);
    return (

        <button
            className="floating-button"
            onClick={onClick}
            style={{
    backgroundColor: config.primaryColor,

    position: "fixed",
    bottom: "24px",

    left: config.buttonPosition === "left" ? "24px" : "auto",
    right: config.buttonPosition === "right" ? "24px" : "auto",

    width:
        config.widgetSize === "small"
            ? "55px"
            : config.widgetSize === "large"
            ? "75px"
            : "65px",

    height:
        config.widgetSize === "small"
            ? "55px"
            : config.widgetSize === "large"
            ? "75px"
            : "65px",
            }}
            >

        {config.avatarUrl ? (
        <img
            src={config.avatarUrl}
            alt="Chat"
            style={{
                width: "70%",
                height: "70%",
                objectFit: "contain"
            }}
        />
    ) : (
        "💬"
    )}
    </button>
    )
}

    

export default FloatingButton;