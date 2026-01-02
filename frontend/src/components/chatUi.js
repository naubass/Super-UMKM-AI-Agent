// Fungsi membuat Bubble Chat
export function createChatBubble(role, text, taskType = null) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    // Animasi fade in
    div.className = `flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in w-full max-w-4xl mx-auto`;

    const renderTextWithImage = (rawText) => {
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        
        let renderedHtml = rawText.replace(imageRegex, (match, alt, url) => {
            const cleanUrl = url.trim();
            // Card Gambar yang lebih solid (kotak putih tegas)
            return `<div class="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white group relative">
                        <img src="${cleanUrl}" alt="${alt}" class="w-full h-auto object-cover" loading="lazy" onerror="this.onerror=null; this.nextElementSibling.style.display='flex';" />
                        <div class="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                             <span class="text-xs font-semibold text-slate-500">Creative Generated</span>
                             <button onclick="window.open('${cleanUrl}', '_blank')" class="text-xs text-blue-600 hover:underline font-bold">Download HD ⬇</button>
                        </div>
                    </div>`;
        });

        return renderedHtml.replace(/\n/g, '<br>');
    };

    // Badge Logic (Warna disesuaikan)
    let badge = '';
    if (!isUser) {
        if (taskType === 'KONTEN') {
            badge = `
            <div class="inline-flex items-center gap-1 mb-2 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wide">🎨 Creative Mode</span>
            </div>`;
        }
        if (taskType === 'REVIEW') {
            badge = `
            <div class="inline-flex items-center gap-1 mb-2 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">
                <span class="text-[10px] font-bold text-orange-600 uppercase tracking-wide">🛡️ CS Mode</span>
            </div>`;
        }
    }

    // Avatar HTML (User: Biru Tua, AI: Logo Biru)
    const avatarHTML = isUser 
        ? `<div class="w-9 h-9 rounded-lg bg-slate-800 flex flex-shrink-0 items-center justify-center text-white shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>
           </div>`
        : `<div class="w-9 h-9 rounded-lg bg-blue-600 flex flex-shrink-0 items-center justify-center text-white shadow-blue-200 shadow-md">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M16.5 7.5h-9v9h9v-9z" /><path fill-rule="evenodd" d="M8.25 2.25A1.5 1.5 0 006.75 3.75v16.5a1.5 1.5 0 001.5 1.5h7.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5h-7.5zM6 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 01.75.75v16.5a.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3.75z" clip-rule="evenodd" /></svg>
           </div>`;

    // Bubble Style (User: Biru Solid, AI: Abu-abu Terang)
    const bubbleStyle = isUser 
        ? 'bg-blue-600 text-white rounded-tr-none shadow-md' 
        : 'bg-slate-50 text-slate-700 border border-slate-200 rounded-tl-none';

    div.innerHTML = `
        ${isUser ? '' : avatarHTML}
        <div class="flex flex-col w-full max-w-[80%]">
            <div class="p-4 rounded-2xl ${bubbleStyle} text-[15px] leading-relaxed shadow-sm">
                ${badge}
                <div class="whitespace-pre-wrap font-medium">${renderTextWithImage(text)}</div>
            </div>
            <span class="text-[10px] text-slate-400 mt-1 ${isUser ? 'text-right' : 'text-left'}">Just now</span>
        </div>
        ${isUser ? avatarHTML : ''}
    `;
    return div;
}

// Loading Indicator (Biru)
export function createLoadingIndicator() {
    const div = document.createElement('div');
    div.id = 'loading-indicator';
    div.className = 'flex gap-4 animate-pulse w-full max-w-4xl mx-auto';
    div.innerHTML = `
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex flex-shrink-0 items-center justify-center text-white shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M16.5 7.5h-9v9h9v-9z" /></svg>
        </div>
        <div class="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2 h-fit mt-1">
            <span class="text-xs font-semibold text-slate-400">AI sedang mengetik</span>
            <div class="flex gap-1">
                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
            </div>
        </div>
    `;
    return div;
}