import { sendMessageToAI } from './api.js';
import { createChatBubble, createLoadingIndicator } from './components/chatUi.js';
import './styles/main.css';

let currentSessionId = null;

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const sessionListEl = document.getElementById('session-list');
const chatTitleEl = document.getElementById('current-chat-title');

function ensureSpacer() {
    // Cari apakah sudah ada spacer
    let spacer = document.getElementById('bottom-spacer');
    if (spacer) {
        // Jika ada, pindahkan ke paling bawah (cabut lalu pasang lagi)
        chatContainer.appendChild(spacer);
    } else {
        // Jika belum ada, buat baru
        spacer = document.createElement('div');
        spacer.id = 'bottom-spacer';
        spacer.style.height = '180px'; 
        spacer.style.width = '100%';
        spacer.style.flexShrink = '0'; 
        chatContainer.appendChild(spacer);
    }
}

const scrollToBottom = () => {
    ensureSpacer();
    
    setTimeout(() => {
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight, 
                behavior: 'smooth'
            });
        }
    }, 100);
}

async function loadSessions() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch("http://localhost:8000/api/sessions", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const sessions = await res.json();
        
        if (sessionListEl) {
            sessionListEl.innerHTML = '';
            sessions.forEach(session => {
                const btn = document.createElement('button');
                const isActive = session.id === currentSessionId;
                btn.className = `w-full text-left px-3 py-2 rounded-lg text-sm truncate mb-1 transition-colors ${
                    isActive ? 'bg-slate-700 text-white font-medium shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`;
                btn.innerHTML = `💬 ${session.title}`;
                btn.onclick = () => switchSession(session.id, session.title);
                sessionListEl.appendChild(btn);
            });
        }

        if (sessions.length === 0 && !currentSessionId) {
            await createNewSession();
        } else if (sessions.length > 0 && !currentSessionId) {
            switchSession(sessions[0].id, sessions[0].title);
        }
    } catch (err) { console.error("Gagal load session:", err); }
}

async function switchSession(id, title) {
    currentSessionId = id;
    if (chatTitleEl) chatTitleEl.textContent = title;
    
    // Refresh highlight sidebar
    const token = localStorage.getItem('access_token');
    if (token && sessionListEl) {
        const buttons = sessionListEl.querySelectorAll('button');
        buttons.forEach(btn => {
            if (btn.innerHTML.includes(title)) {
                btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm truncate mb-1 transition-colors bg-slate-700 text-white font-medium shadow-md';
            } else {
                btn.className = 'w-full text-left px-3 py-2 rounded-lg text-sm truncate mb-1 transition-colors text-slate-400 hover:bg-slate-800 hover:text-white';
            }
        });
    }
    await loadHistory(id);
}

window.createNewSession = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
        const res = await fetch("http://localhost:8000/api/sessions", {
            method: "POST", headers: { "Authorization": `Bearer ${token}` }
        });
        const newSession = await res.json();
        await loadSessions(); 
        switchSession(newSession.id, newSession.title);
    } catch (e) { alert("Gagal membuat sesi baru."); }
}

async function loadHistory(sessionId) {
    const token = localStorage.getItem('access_token');
    if (!token || !sessionId) return;

    chatContainer.innerHTML = ''; // Reset chat

    try {
        const res = await fetch(`http://localhost:8000/api/history/${sessionId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
            const chats = await res.json();
            if (chats.length === 0) {
                const welcome = createChatBubble('ai', "Halo! Workspace baru siap digunakan. 👋");
                chatContainer.appendChild(welcome);
            } else {
                chats.forEach(chat => {
                    chatContainer.appendChild(createChatBubble(chat.role, chat.content));
                });
            }
            scrollToBottom(); 
        }
    } catch (err) { console.error(err); }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    if (!currentSessionId) { alert("Loading sesi..."); return; }

    // User Message
    chatContainer.appendChild(createChatBubble('user', message));
    input.value = '';
    scrollToBottom(); 

    // Loading Indicator
    const loader = createLoadingIndicator();
    chatContainer.appendChild(loader);
    scrollToBottom(); 

    try {
        const data = await sendMessageToAI(message, currentSessionId);
        
        loader.remove();
        chatContainer.appendChild(createChatBubble('ai', data.response, data.task_type));
        
        loadSessions(); 

    } catch (error) {
        loader.remove();
        chatContainer.appendChild(createChatBubble('ai', '⚠️ Maaf, terjadi kesalahan koneksi.'));
    }
    
    scrollToBottom(); 
});

window.fillInput = (text) => { if(input) { input.value = text; input.focus(); } }
window.resetChat = async () => { if(confirm("Bersihkan chat?")) location.reload(); }

// INIT
document.addEventListener('DOMContentLoaded', loadSessions);