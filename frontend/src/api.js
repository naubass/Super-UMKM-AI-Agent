const API_URL = "http://localhost:8000/api/chat";

export async function sendMessageToAI(message) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching AI response:", error);
        throw error;
    }
}