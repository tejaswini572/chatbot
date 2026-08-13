import React from "react";
import ReactDOM from "react-dom/client";

import Widget from "./components/Widget/Widget";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <React.StrictMode>
        <Widget />
    </React.StrictMode>
);