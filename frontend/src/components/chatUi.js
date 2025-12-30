// Fungsi membuat Bubble Chat
export function createChatBubble(role, text, taskType = null) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    div.className = `flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''} mb-4`;

    let badge = '';
    if (!isUser) {
        if (taskType === 'KONTEN') badge = '<span class="block mb-1 text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit">🎨 KONTEN KREATOR</span>';
        if (taskType === 'REVIEW') badge = '<span class="block mb-1 text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded w-fit">🛡️ REPUTATION GUARD</span>';
    }

    const bubbleStyle = isUser 
        ? 'bg-indigo-600 text-white rounded-tr-none' 
        : 'bg-white text-gray-900 border border-gray-200 shadow-sm rounded-tl-none';

    div.innerHTML = `
        <div class="w-8 h-8 rounded-full ${isUser ? 'bg-gray-300' : 'bg-indigo-100'} flex items-center justify-center text-xs font-bold shadow-sm">
            ${isUser ? 'U' : 'AI'}
        </div>
        <div class="flex flex-col w-full max-w-[85%] p-3 rounded-2xl ${bubbleStyle}">
            ${badge}
            <p class="text-sm leading-relaxed whitespace-pre-wrap">${text}</p>
        </div>
    `;
    return div;
}

// Fungsi Loading Indicator
export function createLoadingIndicator() {
    const div = document.createElement('div');
    div.id = 'loading-indicator';
    div.className = 'flex items-start gap-2.5 mb-4';
    div.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold">AI</div>
        <div class="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm">
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
            </div>
        </div>
    `;
    return div;
}