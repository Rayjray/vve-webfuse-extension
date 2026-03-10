// VvE Helpdesk - Webfuse Extension Popup
// Gebaseerd op: webfuse-com/extension-elevenlabs-mcp
// Yauhen Shulitski (yauhen@surfly.com), maart 2026

async function init() {
  const dynamicVariables = {
    // REST key voor MCP authenticatie — komt uit manifest.json env
    "space__rest_key": `Bearer ${browser.webfuseSession.env.SPACE_REST_KEY}`,
    // Session ID voor MCP routing — dubbele underscore vereist
    "session__id": (await browser.webfuseSession.getSessionInfo()).sessionId
  };

  // Maak de ElevenLabs widget aan
  const el = document.createElement("elevenlabs-convai");
  el.setAttribute("agent-id", browser.webfuseSession.env.AGENT_KEY);
  el.setAttribute("dynamic-variables", JSON.stringify(dynamicVariables));
  document.body.appendChild(el);
}

document.addEventListener("DOMContentLoaded", init);
