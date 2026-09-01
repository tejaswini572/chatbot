export function getOrCreateSessionId() {
    const storageKey = "standalone_widget_session_id";

    let sessionId = localStorage.getItem(storageKey);

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
}