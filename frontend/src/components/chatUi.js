import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

// Konfigurasi Marked (Markdown Parser)
marked.setOptions({
    breaks: true,  
    gfm: true      
});

// --- FUNGSI 1: DOWNLOAD PDF (Logic Utama) ---
async function downloadBubbleAsPDF(element, filename = 'Laporan-SuperAgent.pdf') {
    const { jsPDF } = window.jspdf;
    
    // Ubah kursor jadi waiting
    document.body.style.cursor = 'wait';

    try {
        // Capture elemen HTML jadi Gambar (Canvas)
        const canvas = await html2canvas(element, {
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff' 
        });

        // Hitung Dimensi agar muat di A4
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Scale gambar agar fit di lebar A4 (dikurangi margin)
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        // Masukkan gambar ke PDF
        const finalWidth = 190; 
        const finalHeight = (imgHeight * finalWidth) / imgWidth;

        pdf.addImage(imgData, 'PNG', 10, 10, finalWidth, finalHeight);
        pdf.save(filename);

    } catch (err) {
        console.error("Gagal export PDF:", err);
        alert("Gagal membuat PDF. Coba lagi.");
    } finally {
        document.body.style.cursor = 'default';
    }
}

// --- FUNGSI 2: MEMBUAT BALON CHAT (Main Logic) ---
export function createChatBubble(role, message, taskType = "UMUM") {
    const isUser = role === 'user';
    const bubble = document.createElement('div');
    
    // Layout Container Bubble
    bubble.className = `flex gap-3 animate-fade-in mb-6 ${isUser ? 'flex-row-reverse' : ''}`;

    // Avatar Icon
    const avatar = document.createElement('div');
    avatar.className = `w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center text-white shadow-sm mt-1 ${isUser ? 'bg-slate-800' : 'bg-blue-600'}`;
    avatar.innerHTML = isUser 
        ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" /></svg>`
        : `<span class="text-lg">🤖</span>`;

    // Content Box
    const content = document.createElement('div');
    
    if (isUser) {
        // Style User
        content.className = "bg-slate-800 text-white px-4 py-3 rounded-2xl rounded-tr-none shadow-sm max-w-[70%] whitespace-pre-wrap leading-relaxed text-sm";
        content.textContent = message;
    } else {
        // Style Bot (AI) - Tambah 'group' untuk hover effect
        content.className = "bot-content bg-white px-5 py-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm max-w-[85%] text-slate-700 text-sm group relative";
        
        // Parsing Markdown
        let formattedHtml = marked.parse(message);
        
        // --- STYLING CSS INJECTION ---
        // Paragraf
        formattedHtml = formattedHtml.replace(/<p>/g, '<p class="mb-4 leading-relaxed">'); 
        formattedHtml = formattedHtml.replace(/<br\s*\/?>/gi, '<br class="block my-3 content-[\'\']">');
        
        // List (Bullet Points)
        formattedHtml = formattedHtml.replace(/<ul>/g, '<ul class="list-disc ml-5 mb-4 space-y-2">');
        formattedHtml = formattedHtml.replace(/<ol>/g, '<ol class="list-decimal ml-5 mb-4 space-y-2">');
        formattedHtml = formattedHtml.replace(/<li>/g, '<li class="pl-1">');
        
        // Bold
        formattedHtml = formattedHtml.replace(/<strong>/g, '<strong class="font-bold text-slate-900">');

        // Tabel (Penting untuk Jadwal & Laporan)
        formattedHtml = formattedHtml.replace(/<table>/g, '<div class="overflow-x-auto my-4 rounded-lg border border-slate-200"><table class="w-full text-left border-collapse text-xs">');
        formattedHtml = formattedHtml.replace(/<\/table>/g, '</table></div>');
        formattedHtml = formattedHtml.replace(/<th>/g, '<th class="bg-slate-50 p-3 font-bold text-slate-700 border-b border-slate-200">');
        formattedHtml = formattedHtml.replace(/<td>/g, '<td class="p-3 border-b border-slate-100">');

        // Render HTML
        content.innerHTML = formattedHtml;

        // Cek apakah ada Gambar (Flux)
        const img = content.querySelector('img');
        if (img) {
            setupImageWithDownload(img);
        }

        // --- FITUR FILTER PDF BUTTON ---
        // Daftar mode yang diizinkan untuk download PDF
        const allowedModes = ['JADWAL', 'SPY', 'DATA', 'SEO'];

        // Logic: Jika TIDAK ada gambar DAN taskType termasuk dalam daftar yang diizinkan
        if (!img && allowedModes.includes(taskType)) {
            const footerDiv = document.createElement('div');
            footerDiv.className = "mt-4 pt-3 border-t border-slate-100 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300";

            // Teks Indikator Mode (Opsional, visual saja)
            const taskInfo = document.createElement('span');
            taskInfo.className = "text-[10px] text-slate-400 font-mono uppercase font-bold";
            taskInfo.innerText = `${taskType} REPORT`;

            // Tombol Download PDF
            const pdfBtn = document.createElement('button');
            pdfBtn.className = "flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition";
            pdfBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                Simpan PDF
            `;

            // Event Listener Klik Tombol PDF
            pdfBtn.onclick = () => {
                // Clone konten (agar tombol download tidak ikut tercetak)
                const clone = content.cloneNode(true);
                
                // Hapus footer (tombol) dari clone
                const cloneFooter = clone.querySelector('div.mt-4'); 
                if(cloneFooter) cloneFooter.remove();

                // Tambahkan Header/Kop Surat Laporan
                const header = document.createElement('div');
                header.innerHTML = `
                    <div style="border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 20px;">
                        <h2 style="color:#1e293b; font-size: 20px; font-weight:bold; margin:0;">Laporan Super Agent</h2>
                        <p style="color:#64748b; font-size: 12px; margin:5px 0 0 0;">Mode: ${taskType} • Tanggal: ${new Date().toLocaleDateString()}</p>
                    </div>
                `;
                clone.prepend(header);

                // Styling Clone untuk Cetak (Off-screen)
                clone.style.width = '700px'; 
                clone.style.padding = '40px';
                clone.style.background = 'white';
                clone.style.position = 'absolute';
                clone.style.top = '-9999px'; 
                clone.style.left = '-9999px';
                clone.style.color = '#334155'; 

                document.body.appendChild(clone);

                // Download dan Bersihkan
                downloadBubbleAsPDF(clone, `Laporan_${taskType}_${Date.now()}.pdf`).then(() => {
                    document.body.removeChild(clone); 
                });
            };

            footerDiv.appendChild(taskInfo);
            footerDiv.appendChild(pdfBtn);
            content.appendChild(footerDiv);
        }
    }

    bubble.appendChild(avatar);
    bubble.appendChild(content);
    return bubble;
}

// --- FUNGSI 3: LOADING INDICATOR ---
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

// --- FUNGSI 4: HELPER GAMBAR (FLUX) ---
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

            // CEK: Apakah ini Base64 (Data URL)?
            if (imageSrc.startsWith('data:')) {
                blob = dataURItoBlob(imageSrc);
            } else {
                // Jika URL biasa, pakai Fetch
                const response = await fetch(imageSrc);
                blob = await response.blob();
            }

            // Proses Download Blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `SuperAgent_Design_${Date.now()}.jpg`; 
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Feedback Sukses
            dlBtn.innerHTML = "✅ Tersimpan";
            dlBtn.className = "flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition";
            
            // Reset tombol
            setTimeout(() => { 
                dlBtn.innerHTML = "Simpan Gambar"; 
                dlBtn.disabled = false; 
                dlBtn.className = "flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition shadow hover:shadow-md";
            }, 3000);

        } catch (err) {
            console.error("Download Error:", err);
            alert("Gagal menyimpan. Coba klik kanan -> Save Image As.");
            dlBtn.innerHTML = "❌ Gagal";
            setTimeout(() => { dlBtn.disabled = false; dlBtn.innerHTML = "⬇️ Coba Lagi"; }, 2000);
        }
    };

    btnContainer.appendChild(dlBtn);
    imgElement.insertAdjacentElement('afterend', btnContainer);
}

// --- FUNGSI 5: HELPER CONVERT DATA URI ---
function dataURItoBlob(dataURI) {
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