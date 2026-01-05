import { sendMessageToAI } from './api.js';
import { createChatBubble, createLoadingIndicator } from './components/chatUi.js';
import './styles/main.css';

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');

// Helper Scroll
const scrollToBottom = () => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function loadHistory() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const res = await fetch("http://localhost:8000/api/history", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const chats = await res.json();
            // Jika ada history, bersihkan pesan default
            if (chats.length > 0) chatContainer.innerHTML = ''; 
            
            chats.forEach(chat => {
                chatContainer.appendChild(createChatBubble(chat.role, chat.content));
            });
            scrollToBottom();
        }
    } catch (err) { console.error("History error:", err); }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // Tampilkan User Msg
    chatContainer.appendChild(createChatBubble('user', message));
    input.value = '';
    scrollToBottom();

    // Loading
    const loader = createLoadingIndicator();
    chatContainer.appendChild(loader);
    scrollToBottom();

    try {
        // Backend Call
        const data = await sendMessageToAI(message);
        
        loader.remove();
        // createChatBubble di chatUi.js sudah pakai marked, jadi format aman!
        chatContainer.appendChild(createChatBubble('ai', data.response, data.task_type));
        
    } catch (error) {
        loader.remove();
        chatContainer.appendChild(createChatBubble('ai', 'Maaf, server sedang sibuk atau error.'));
    }
    scrollToBottom();
});

window.fillInput = (text) => {
    input.value = text;
    input.focus();
}

window.resetChat = async () => {
    if (!confirm("Hapus semua chat?")) return;
    const token = localStorage.getItem('access_token');
    if (!token) return;
    
    try {
        await fetch("http://localhost:8000/api/history/reset", {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });
        location.reload(); // Refresh halaman agar bersih
    } catch (e) { alert("Gagal reset chat"); }
}

// Jalankan Load History
document.addEventListener('DOMContentLoaded', loadHistory);