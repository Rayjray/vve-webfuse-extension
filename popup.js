// VvE Helpdesk - Webfuse Extension Popup
// ElevenLabs Conversational AI with Session MCP integration

const AGENT_ID = "agent_4701kjs96cgcew6v08wya98c1vv9";
const AI_TYPE_SPEED_MS = 10;

// --- State ---
let conversation = null;
let sessionId = null;
let microphoneOn = true;
let lastAIMessage = "";

// --- DOM refs ---
const messagesEl = document.getElementById("messages");
const statusDot = document.getElementById("statusDot");
const orbEl = document.getElementById("orb");
const orbLabel = document.getElementById("orbLabel");
const loadingBar = document.getElementById("loadingBar");
const errorBanner = document.getElementById("errorBanner");
const sessionIdDisplay = document.getElementById("session-id-display");
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");
const micBtn = document.getElementById("micBtn");

// --- Init: get session ID from Webfuse ---
async function initSessionId() {
  try {
    const info = await browser.webfuseSession.getSessionInfo();
    sessionId = info?.id || info?.session_id || null;
    if (sessionId) {
      sessionIdDisplay.textContent = sessionId.substring(0, 20) + "...";
    } else {
      sessionIdDisplay.textContent = "niet gevonden";
    }
  } catch (err) {
    console.error("[VvE] Error:", err);
    sessionId = "fSwHO4V8yhigSlimQ3sWz6KpHA"; sessionIdDisplay.textContent = sessionId.substring(0, 20) + "...";
  }
}

// --- Typing effect for AI messages ---
function typeMessage(el, remaining, speed) {
  if (!remaining) return;
  el.textContent += remaining[0];
  messagesEl.scrollTop = messagesEl.scrollHeight;
  setTimeout(() => typeMessage(el, remaining.slice(1), speed),
    Math.random() * (speed / 2) + (speed / 2));
}

// --- Print a message bubble ---
function printMessage(source, message) {
  message = message?.trim();
  if (!message || message === "...") return;

  // De-duplicate consecutive AI messages
  if (source === "ai" && message === lastAIMessage) return;
  if (source === "ai") lastAIMessage = message;

  // Remove welcome message on first real message
  const welcome = messagesEl.querySelector(".welcome-message");
  if (welcome) welcome.remove();

  const el = document.createElement("div");
  el.classList.add("message", `message--${source}`);

  if (source === "ai") {
    typeMessage(el, message, AI_TYPE_SPEED_MS);
  } else {
    el.textContent = message;
  }

  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// --- Error display ---
function showError(msg) {
  errorBanner.textContent = msg;
  errorBanner.classList.add("visible");
  setTimeout(() => errorBanner.classList.remove("visible"), 5000);
}

// --- Orb state ---
let deactivateOrbTimeout;
function setOrbState(state) {
  orbEl.classList.remove("active", "speaking");
  clearTimeout(deactivateOrbTimeout);

  switch (state) {
    case "listening":
      orbEl.classList.add("active");
      orbEl.textContent = "🎙️";
      orbLabel.textContent = "Luisteren...";
      break;
    case "speaking":
      orbEl.classList.add("speaking");
      orbEl.textContent = "🔊";
      orbLabel.textContent = "Agent spreekt...";
      break;
    case "idle":
      orbEl.textContent = "🎙️";
      orbLabel.textContent = "Klik om te starten";
      break;
    case "stopped":
      orbEl.textContent = "▶️";
      orbLabel.textContent = "Klik om opnieuw te starten";
      break;
  }
}

// --- ElevenLabs Conversation handlers ---
const CONVERSATION_HANDLERS = {
  onConnect() {
    statusDot.classList.add("connected");
    loadingBar.classList.remove("active");
    setOrbState("listening");
    printMessage("ai", "Verbonden! Ik ben uw VvE Helpdesk assistent. Hoe kan ik u helpen met het verduurzamen van uw appartementencomplex?");
  },

  onDisconnect() {
    statusDot.classList.remove("connected");
    setOrbState("stopped");
    printMessage("ai", "Gesprek beëindigd. Klik op de microfoon om opnieuw te beginnen.");
  },

  onError(error) {
    console.error("[VvE] ElevenLabs error:", error);
    loadingBar.classList.remove("active");
    showError("Verbindingsfout: " + (error?.message || "onbekende fout"));
    setOrbState("stopped");
  },

  onMessage(message) {
    if (message?.source && message?.message) {
      printMessage(message.source, message.message);
    }
  },

  onModeChange(mode) {
    clearTimeout(deactivateOrbTimeout);
    if (mode?.mode === "speaking") {
      setOrbState("speaking");
    } else {
      deactivateOrbTimeout = setTimeout(() => setOrbState("listening"), 750);
    }
  }
};

// --- Start conversation ---
async function startConversation() {
  if (conversation) return;

  if (!sessionId) {
    showError("Geen sessie ID beschikbaar. Herlaad de extensie.");
    return;
  }

  loadingBar.classList.add("active");
  setOrbState("listening");
  orbLabel.textContent = "Verbinden...";

  try {
    // Dynamic variable: pass session_id to the agent
    // The agent uses this to call MCP tools with the correct session
    const { Conversation } = await import("https://unpkg.com/@elevenlabs/client@latest/dist/index.js");

    conversation = await Conversation.startSession({
      agentId: AGENT_ID,
      connectionType: "webrtc",
      dynamicVariables: {
        session_id: sessionId,
        space_url: "https://proxy.webtoppings.bar/+vve-helpdesk/"
      },
      ...CONVERSATION_HANDLERS
    });

    // Set mic state
    conversation.setMicMuted(!microphoneOn);

  } catch (err) {
    console.error("[VvE] Failed to start conversation:", err);
    loadingBar.classList.remove("active");
    showError("Kan agent niet starten: " + (err?.message || err));
    setOrbState("stopped");
  }
}

// --- Stop conversation ---
async function stopConversation() {
  if (!conversation) return;
  try {
    await conversation.endSession();
  } catch (e) { /* ignore */ }
  conversation = null;
}

// --- Send text message ---
function sendTextMessage() {
  const msg = textInput.value.trim();
  if (!msg || !conversation) {
    if (!conversation) {
      showError("Start eerst een gesprek door op de microfoon te klikken.");
    }
    return;
  }
  conversation.sendUserMessage(msg);
  printMessage("user", msg);
  textInput.value = "";
}

// --- Toggle microphone ---
function toggleMic() {
  if (!conversation) {
    showError("Start eerst een gesprek.");
    return;
  }
  microphoneOn = !microphoneOn;
  conversation.setMicMuted(!microphoneOn);
  micBtn.classList.toggle("active", !microphoneOn);
  micBtn.textContent = microphoneOn ? "🎤" : "🔇";
}

// --- Event listeners ---
orbEl.addEventListener("click", async () => {
  if (conversation) {
    await stopConversation();
  } else {
    await startConversation();
  }
});

micBtn.addEventListener("click", toggleMic);

sendBtn.addEventListener("click", sendTextMessage);

textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextMessage();
});

// --- Boot ---
initSessionId();
