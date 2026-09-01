import React from "react";

function FloatingButton({ onClick, config }) {
console.log("Floating Button Config:", config);
    return (

        <button
            className="floating-button"
            onClick={onClick}
            style={{
                position: "fixed",
                bottom: "24px",

                left: config.buttonPosition === "left" ? "24px" : "auto",
                right: config.buttonPosition === "right" ? "24px" : "auto",

                fontSize:
                    config.widgetSize === "small"
                        ? "36px"
                        : config.widgetSize === "large"
                        ? "56px"
                        : "46px",
            }}
        >
            {config.avatarUrl ? (
                <img
                    src={config.avatarUrl}
                    alt="Chat"
                    style={{
                        width:
                            config.widgetSize === "small"
                                ? "44px"
                                : config.widgetSize === "large"
                                ? "64px"
                                : "54px",
                        height:
                            config.widgetSize === "small"
                                ? "44px"
                                : config.widgetSize === "large"
                                ? "64px"
                                : "54px",
                        objectFit: "contain",
                        borderRadius: "50%",
                        display: "block"
                    }}
                />
            ) : (
                "💬"
            )}
        </button>
    )
}

    

export default FloatingButton;