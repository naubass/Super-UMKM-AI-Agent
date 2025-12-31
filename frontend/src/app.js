import { sendMessageToAI } from './api.js';
import { createChatBubble, createLoadingIndicator } from './components/chatUi.js';
import './styles/main.css'; // Import CSS agar diproses Vite

const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatContainer = document.getElementById('chat-container');

// Helper untuk auto scroll
const scrollToBottom = () => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Handle Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    // Tampilkan Pesan User
    chatContainer.appendChild(createChatBubble('user', message));
    input.value = '';
    scrollToBottom();

    // Tampilkan Loading
    const loader = createLoadingIndicator();
    chatContainer.appendChild(loader);
    scrollToBottom();

    try {
        // Panggil Backend
        const data = await sendMessageToAI(message);
        
        // Hapus Loading & Tampilkan Balasan
        loader.remove();
        chatContainer.appendChild(createChatBubble('ai', data.response, data.task_type));
        
    } catch (error) {
        loader.remove();
        chatContainer.appendChild(createChatBubble('ai', 'Maaf, server sedang sibuk atau error.'));
    }
    scrollToBottom();
});

// Expose fungsi ke window agar bisa dipanggil tombol rekomendasi di HTML
window.fillInput = (text) => {
    input.value = text;
    input.focus();
}