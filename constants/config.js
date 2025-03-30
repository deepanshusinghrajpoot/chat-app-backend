

const corsOptions = {
        origin: ["http://localhost:5173", "http://localhost:4173", "http://localhost:5173", process.env.CLIENT_URL, ],
        credentials: true,
}


const CHAT_TOKEN = "chat-token";

export {corsOptions, CHAT_TOKEN} 