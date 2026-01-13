import { sendMessageToAI } from './api.js';
import { createChatBubble, createLoadingIndicator } from './components/chatUi.js';
import './styles/main.css';

// --- STATE MANAGEMENT ---
let currentSessionId = null;

// --- DOM ELEMENTS ---
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');
const sessionListEl = document.getElementById('session-list');
const chatTitleEl = document.getElementById('current-chat-title');
const fileInput = document.getElementById('file-upload');

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    chatContainer.appendChild(createChatBubble('user', `📂 Mengupload dokumen: ${file.name}...`));
    const loader = createLoadingIndicator();
    chatContainer.appendChild(loader);
    scrollToBottom();

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('access_token');

    try {
        const res = await fetch('http://localhost:8000/api/upload', {
            method: 'POST',
            headers: { "Authorization": `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        loader.remove();

        if (res.ok) {
            chatContainer.appendChild(createChatBubble('ai', `✅ **Dokumen Berhasil Dipelajari!**\n\nSaya sudah membaca isi file *${file.name}*. \nSilakan tanyakan apa saja terkait data di dalamnya.`));
        } else {
            chatContainer.appendChild(createChatBubble('ai', `❌ Gagal memproses dokumen.`));
        }
    } catch (err) {
        loader.remove();
        console.error(err);
        chatContainer.appendChild(createChatBubble('ai', `⚠️ Maaf, terjadi kesalahan koneksi.`));
    }

    scrollToBottom();
    fileInput.value = '';
})
 
// --- HELPER: SPACER MANAGER ---
function ensureSpacer() {
    let spacer = document.getElementById('bottom-spacer');
    if (spacer) {
        chatContainer.appendChild(spacer);
    } else {
        spacer = document.createElement('div');
        spacer.id = 'bottom-spacer';
        spacer.style.height = '180px'; 
        spacer.style.width = '100%';
        spacer.style.flexShrink = '0'; 
        chatContainer.appendChild(spacer);
    }
}

// --- HELPER: SCROLL TO BOTTOM ---
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

// --- SESSION LOGIC ---
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
                const isActive = session.id === currentSessionId;

                // WRAPPER (Parent)
                const wrapper = document.createElement('div');
                wrapper.className = "group relative mb-1"; 

                // TOMBOL SESI (Main Button)
                const btn = document.createElement('button');
                btn.className = `session-main-btn w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors pr-9 ${
                    isActive 
                    ? 'bg-slate-700 text-white font-medium shadow-md' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`;
                btn.innerHTML = `💬 ${session.title}`;
                
                // Simpan ID di dataset agar mudah dicari nanti
                btn.dataset.id = session.id;
                
                btn.onclick = () => switchSession(session.id, session.title);

                const delBtn = document.createElement('button');
                delBtn.className = `absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md 
                                    text-slate-500 hover:text-red-400 hover:bg-slate-900/50 
                                    opacity-0 group-hover:opacity-100 transition-all duration-200 z-10`;
                
                delBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                delBtn.title = "Hapus Sesi";
                
                delBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    deleteSession(session.id);
                };

                wrapper.appendChild(btn);
                wrapper.appendChild(delBtn);
                sessionListEl.appendChild(wrapper);
            });
        }

        if (sessions.length === 0 && !currentSessionId) {
            await createNewSession();
        } else if (sessions.length > 0 && !currentSessionId) {
            switchSession(sessions[0].id, sessions[0].title);
        }

    } catch (err) { console.error("Gagal load session:", err); }
}

// --- SWITCH SESSION ---
async function switchSession(id, title) {
    currentSessionId = id;
    if (chatTitleEl) chatTitleEl.textContent = title;
    
    // Refresh highlight sidebar
    if (sessionListEl) {
        const buttons = sessionListEl.querySelectorAll('.session-main-btn');
        
        buttons.forEach(btn => {
            if (btn.dataset.id == id) {
                btn.className = 'session-main-btn w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors pr-9 bg-slate-700 text-white font-medium shadow-md';
            } else {
                btn.className = 'session-main-btn w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors pr-9 text-slate-400 hover:bg-slate-800 hover:text-white';
            }
        });
    }
    await loadHistory(id);
}

// --- DELETE SESSION ---
async function deleteSession(sessionId) {
    if (!confirm("⚠️ Yakin ingin menghapus percakapan ini secara permanen?")) return;

    const token = localStorage.getItem('access_token');
    try {
        const res = await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            if (sessionId === currentSessionId) {
                currentSessionId = null;
                chatContainer.innerHTML = ''; 
                if (chatTitleEl) chatTitleEl.textContent = 'Percakapan Baru';
            }
            await loadSessions();
        } else {
            alert("Gagal menghapus percakapan.");
        }
    } catch (err) {
        console.error("Error deleting session:", err);
        alert("Terjadi Kesalahan Koneksi.");
    }
}

// --- CREATE NEW SESSION ---
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

// --- LOAD HISTORY ---
async function loadHistory(sessionId) {
    const token = localStorage.getItem('access_token');
    if (!token || !sessionId) return;

    chatContainer.innerHTML = '';

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
                    // Ambil mode dari database
                    let mode = chat.task_type || "UMUM";

                    // JIKA DATABASE TIDAK PUNYA DATA (UMUM), KITA TEBAK SENDIRI (AUTO-DETECT)
                    if (mode === "UMUM" && chat.role === 'assistant') {
                        const text = chat.content;

                        // Deteksi Mode JADWAL (Ciri: Ada tabel markdown dengan kolom Hari/Ide)
                        if (text.includes("| Hari |") || text.includes("| Ide Konten |")) {
                            mode = "JADWAL";
                        }
                        // Deteksi Mode SPY (Ciri: Ada kata kunci laporan spy)
                        else if (text.includes("🕵️ **Target**:") || text.includes("Reputasi Online")) {
                            mode = "SPY";
                        }
                        // Deteksi Mode SEO (Ciri: Format Judul & Deskripsi)
                        else if (text.includes("🏷️ JUDUL PRODUK") || text.includes("📝 DESKRIPSI PRODUK")) {
                            mode = "SEO";
                        }
                        // Deteksi Mode DATA/Excel (Ciri: Jawaban Data Analyst)
                        else if (text.includes("Total Baris:") || text.includes("CONTEXT DATA")) {
                            mode = "DATA";
                        }
                    }

                    // Render dengan mode yang sudah ditebak
                    chatContainer.appendChild(createChatBubble(chat.role, chat.content, mode));
                });
            }
            scrollToBottom(); 
        }
    } catch (err) { console.error(err); }
}

// --- SUBMIT HANDLER ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    if (!currentSessionId) { alert("Loading sesi..."); return; }

    chatContainer.appendChild(createChatBubble('user', message));
    input.value = '';
    scrollToBottom(); 

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
window.resetChat = async () => { if(confirm("Bersihkan chat di sesi ini?")) location.reload(); }

// INIT
document.addEventListener('DOMContentLoaded', loadSessions);