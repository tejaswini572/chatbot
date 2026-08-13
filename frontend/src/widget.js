import React from "react";
import ReactDOM from "react-dom/client";

import Widget from "./components/Widget/Widget";

const root = ReactDOM.createRoot(
    document.getElementById("chatbot-widget-root")
);

root.render(
    <React.StrictMode>
        <Widget mode="general" />
    </React.StrictMode>
);