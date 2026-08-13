import React from "react";

function WidgetHome({ closeWidget, startChat, config }) {

    return (

                <div 
            className="chat-popup"
            style={{
                left: config.buttonPosition === "left" ? "24px" : "auto",
                right: config.buttonPosition === "right" ? "24px" : "auto"
            }}
        >


            <div
                className="chat-header"
                style={{ backgroundColor: config.primaryColor }}
            >
                

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

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

            <div className="welcome-screen">

                <p>
                    {config.welcomeMessage}
                </p>

                <button
                    onClick={startChat}
                    style={{ backgroundColor: config.primaryColor }}
                >
                    Chat with us
                </button>

            </div>

        </div>

    );
}

export default WidgetHome;