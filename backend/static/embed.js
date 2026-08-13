(function () {

    // Create container for the widget
    const widgetContainer = document.createElement("div");

    widgetContainer.id = "chatbot-widget-root";

    document.body.appendChild(widgetContainer);


    // Load widget CSS
    const css = document.createElement("link");

    css.rel = "stylesheet";

    css.href = "http://localhost:8000/static/css/main.22cb9c06.css";

    document.head.appendChild(css);


    // Load widget JavaScript
    const script = document.createElement("script");

    script.src = "http://localhost:8000/static/js/main.2c8f2f8c.js";

    script.async = true;

    document.body.appendChild(script);

})();