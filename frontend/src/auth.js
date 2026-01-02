const API_URL = "http://localhost:8000/api"; // Sesuaikan port backend Anda

// 1. Logic untuk LOGIN
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('submitBtn');

        // Loading State
        btn.innerHTML = "Memproses...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Simpan data user ke Browser (LocalStorage)
                localStorage.setItem('user_session', JSON.stringify({
                    id: data.user_id,
                    name: data.name
                }));
                
                // Redirect ke Dashboard
                alert("Login Berhasil! Mengalihkan...");
                window.location.href = "index.html";
            } else {
                alert(`Gagal: ${data.detail || 'Email/Password salah'}`);
            }
        } catch (error) {
            alert("Error: Tidak bisa konek ke server backend.");
            console.error(error);
        } finally {
            btn.innerHTML = "Masuk Sekarang";
            btn.disabled = false;
        }
    });
}

// 2. Logic untuk REGISTER
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = document.getElementById('submitBtn');

        btn.innerHTML = "Mendaftar...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    email: email, 
                    full_name: fullName, 
                    password: password 
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Pendaftaran Berhasil! Silakan Login.");
                window.location.href = "login.html";
            } else {
                alert(`Gagal: ${data.detail || 'Terjadi kesalahan'}`);
            }
        } catch (error) {
            alert("Error: Backend tidak merespon.");
        } finally {
            btn.innerHTML = "Daftar Akun";
            btn.disabled = false;
        }
    });
}