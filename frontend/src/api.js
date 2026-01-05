const API_URL = "http://localhost:8000/api";

export async function sendMessageToAI(message, sessionId) {
    const token = localStorage.getItem('access_token');

    // Jika tidak ada token, paksa logout/login ulang
    if (!token) {
        alert("Sesi habis. Silakan login kembali.");
        window.location.href = "login.html";
        throw new Error("No token found");
    }

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            // [UPDATE PENTING] Sertakan session_id di sini!
            body: JSON.stringify({ 
                message: message,
                session_id: sessionId 
            })
        });

        // Handle jika token kadaluarsa (401 Unauthorized)
        if (response.status === 401) {
            alert("Sesi Anda telah berakhir. Mohon login ulang.");
            localStorage.removeItem('access_token');
            localStorage.removeItem('user_session');
            window.location.href = "login.html";
            return;
        }

        // Handle error lain (termasuk 422)
        if (!response.ok) {
            // Kita coba baca pesan error dari server jika ada
            const errorData = await response.json().catch(() => ({}));
            console.error("Server Error Detail:", errorData);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
}