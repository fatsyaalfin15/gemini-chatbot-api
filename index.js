import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const ___filename = fileURLToPath(import.meta.url);
const ___dirname = path.dirname(___filename);


const app = express();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const GEMINI_MODEL = "gemini-2.5-flash";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(___dirname, 'public')));


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function extractText(resp) {
    try {
        const text =
            resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.response?.candidates?.[0]?.content?.text;

        return text ?? JSON.stringify(resp, null, 2);
    } catch (err) {
        console.log("Error extracting text:", err);
        return JSON.stringify(resp, null, 2);
    }
}

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if(!Array.isArray(messages)) throw new Error("Messages must be an array");
        const contents = messages.map(msg => ({
            role: msg.role,
            parts: [{text: msg.content}]
        }));
        const resp = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents
        });
        res.json({ result: extractText(resp)});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});