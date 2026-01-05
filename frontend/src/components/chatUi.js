import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

marked.setOptions({
    breaks: true,  
    gfm: true      
});

export function createChatBubble(role, message, taskType = "UMUM") {
    const isUser = role === 'user';
    const bubble = document.createElement('div');
    
    // Layout Bubble
    bubble.className = `flex gap-3 animate-fade-in mb-6 ${isUser ? 'flex-row-reverse' : ''}`;

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = `w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center text-white shadow-sm mt-1 ${isUser ? 'bg-slate-800' : 'bg-blue-600'}`;
    avatar.innerHTML = isUser 
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>`
        : `<span class="text-lg">🤖</span>`;

    // Content Box
    const content = document.createElement('div');
    
    if (isUser) {
        content.className = "bg-slate-800 text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[70%] whitespace-pre-wrap leading-relaxed text-sm";
        content.textContent = message;
    } else {
        content.className = "bot-content bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm max-w-[85%] text-slate-700 text-sm";
        
        let formattedHtml = marked.parse(message);
        formattedHtml = formattedHtml.replace(/<p>/g, '<p class="mb-4 leading-relaxed">'); 
        formattedHtml = formattedHtml.replace(/<br\s*\/?>/gi, '<br class="block my-3 content-[\'\']">');
        formattedHtml = formattedHtml.replace(/<ul>/g, '<ul class="list-disc ml-5 mb-4 space-y-2">');
        formattedHtml = formattedHtml.replace(/<ol>/g, '<ol class="list-decimal ml-5 mb-4 space-y-2">');
        formattedHtml = formattedHtml.replace(/<li>/g, '<li class="pl-1">');
        formattedHtml = formattedHtml.replace(/<strong>/g, '<strong class="font-bold text-slate-900">');

        // Render HTML
        content.innerHTML = formattedHtml;

        // Logic Gambar & Download
        const img = content.querySelector('img');
        if (img) {
            setupImageWithDownload(img);
        }
    }

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    return bubble;
}

export function createLoadingIndicator() {
    const loader = document.createElement('div');
    loader.className = "flex gap-3 animate-pulse mb-6";
    loader.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white"><span class="text-lg">🤖</span></div>
        <div class="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
            <div class="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150"></div>
        </div>
    `;
    return loader;
}

function setupImageWithDownload(imgElement) {
    // Styling Gambar
    imgElement.className = "rounded-lg shadow-md max-w-[350px] w-full h-auto border border-slate-100 mt-3 mb-3 block cursor-pointer hover:opacity-95 transition";
    
    // Container Tombol
    const btnContainer = document.createElement('div');
    btnContainer.className = "flex justify-start mt-1";
    
    // Tombol Download
    const dlBtn = document.createElement('button');
    dlBtn.className = "flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition shadow hover:shadow-md";
    dlBtn.innerHTML = `Simpan Gambar`;

    dlBtn.onclick = async (e) => {
        e.preventDefault();
        
        try {
            dlBtn.innerHTML = "⏳ Memproses...";
            dlBtn.disabled = true;

            let blob;
            const imageSrc = imgElement.src;

            // 1. CEK: Apakah ini Base64 (Data URL)?
            if (imageSrc.startsWith('data:')) {
                // JURUS ANTI GAGAL: Konversi Manual (Tanpa Fetch)
                blob = dataURItoBlob(imageSrc);
            } else {
                // 2. Jika URL biasa (http...), baru pakai Fetch
                const response = await fetch(imageSrc);
                blob = await response.blob();
            }

            // 3. Proses Download Blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            // Gunakan .jpg karena Flux menghasilkan JPEG
            a.download = `SuperAgent_Design_${Date.now()}.jpg`; 
            
            document.body.appendChild(a);
            a.click();
            
            // Bersihkan memori
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Feedback Sukses
            dlBtn.innerHTML = "✅ Tersimpan di Galeri";
            dlBtn.className = "flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition";
            
            // Reset tombol setelah 3 detik
            setTimeout(() => { 
                dlBtn.innerHTML = "Simpan Gambar"; 
                dlBtn.disabled = false; 
                dlBtn.className = "flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition shadow hover:shadow-md";
            }, 3000);

        } catch (err) {
            console.error("Download Error:", err);
            alert("Gagal menyimpan. Coba klik kanan pada gambar lalu pilih 'Save Image As'.");
            dlBtn.innerHTML = "❌ Gagal";
            setTimeout(() => { dlBtn.disabled = false; dlBtn.innerHTML = "⬇️ Coba Lagi"; }, 2000);
        }
    };

    btnContainer.appendChild(dlBtn);
    imgElement.insertAdjacentElement('afterend', btnContainer);
}

function dataURItoBlob(dataURI) {
    // Pisahkan metadata dan data
    const splitData = dataURI.split(',');
    const byteString = atob(splitData[1]); 
    const mimeString = splitData[0].split(':')[1].split(';')[0]; 

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], {type: mimeString});
}