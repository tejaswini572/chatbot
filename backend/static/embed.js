(function () {

    // Create container for the widget
    const widgetContainer = document.createElement("div");

    widgetContainer.id = "chatbot-widget-root";

    document.body.appendChild(widgetContainer);


    // Load widget CSS
    const css = document.createElement("link");

    css.rel = "stylesheet";

    css.href = "http://localhost:8000/static/css/main.744a500a.css";

    document.head.appendChild(css);


    // Load widget JavaScript
    const script = document.createElement("script");

    script.src = "http://localhost:8000/static/js/main.fd8fb220.js";

    script.async = true;

    document.body.appendChild(script);

})();