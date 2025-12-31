// Fungsi membuat Bubble Chat
export function createChatBubble(role, text, taskType = null) {
    const isUser = role === 'user';
    const div = document.createElement('div');
    // Tambahkan animasi fade-in
    div.className = `flex gap-4 ${isUser ? 'flex-row-reverse' : ''} animate-fade-in`;

    const renderTextWithImage = (rawText) => {
        const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
        
        let renderedHtml = rawText.replace(imageRegex, (match, alt, url) => {
            const cleanUrl = url.trim();
            
            return `<div class="my-3 rounded-xl overflow-hidden shadow-sm border border-slate-200 group relative"><img src="${cleanUrl}" alt="${alt}" class="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" onerror="this.onerror=null; this.nextElementSibling.style.display='flex';" /><div class="hidden absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white text-xs font-medium cursor-pointer" onclick="window.open('${cleanUrl}', '_blank')">🔍 Klik untuk perbesar</div></div>`;
        });

        return renderedHtml.replace(/\n/g, '<br>');
    };

    // Logic Badge (Tampilan Label yang lebih rapi)
    let badge = '';
    if (!isUser) {
        if (taskType === 'KONTEN') {
            badge = `
            <div class="flex items-center gap-1.5 mb-2 bg-indigo-50 w-fit px-2.5 py-1 rounded-lg border border-indigo-100">
                <span class="text-xs">🎨</span>
                <span class="text-[10px] font-bold tracking-wide text-indigo-700 uppercase">Creative Partner</span>
            </div>`;
        }
        if (taskType === 'REVIEW') {
            badge = `
            <div class="flex items-center gap-1.5 mb-2 bg-orange-50 w-fit px-2.5 py-1 rounded-lg border border-orange-100">
                <span class="text-xs">🛡️</span>
                <span class="text-[10px] font-bold tracking-wide text-orange-700 uppercase">Reputation Guard</span>
            </div>`;
        }
    }

    // Avatar Styling (Gradient untuk AI, Solid Dark untuk User)
    const avatarHTML = isUser 
        ? `<div class="w-10 h-10 rounded-full bg-slate-800 flex flex-shrink-0 items-center justify-center text-white shadow-md order-1">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>
           </div>`
        : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-indigo-50 flex flex-shrink-0 items-center justify-center shadow-sm">
             <span class="text-lg">🤖</span>
           </div>`;

    // Bubble Styling
    const bubbleStyle = isUser 
        ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-lg shadow-indigo-200' 
        : 'bg-white text-slate-700 border border-gray-100 shadow-sm rounded-tl-none';

    div.innerHTML = `
        ${avatarHTML}
        <div class="flex flex-col w-full max-w-[85%]">
            <div class="p-5 rounded-2xl ${bubbleStyle} text-[15px] leading-relaxed">
                ${badge}
                <div class="whitespace-pre-wrap font-medium">${renderTextWithImage(text)}</div>
            </div>
            ${isUser ? '' : '<span class="text-[10px] text-gray-400 mt-1 ml-2">Baru saja</span>'}
        </div>
    `;
    return div;
}

// Fungsi Loading Indicator (Lebih clean)
export function createLoadingIndicator() {
    const div = document.createElement('div');
    div.id = 'loading-indicator';
    div.className = 'flex gap-4 animate-pulse';
    div.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-white border border-indigo-50 flex flex-shrink-0 items-center justify-center shadow-sm">
             <span class="text-lg">🤖</span>
        </div>
        <div class="bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-1.5 h-fit mt-1">
            <span class="text-xs font-medium text-gray-400 mr-2">Sedang berpikir</span>
            <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
            <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
            <div class="w-1.5 h-1.5 bg-indigo-400 rounded-full typing-dot"></div>
        </div>
    `;
    return div;
}