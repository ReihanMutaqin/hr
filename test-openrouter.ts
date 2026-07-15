import dotenv from "dotenv";
dotenv.config();

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

async function test() {
  console.log("Key:", process.env.OPENROUTER_API_KEY?.substring(0, 15) + "...");
  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "HR App",
    },
    body: JSON.stringify({
      model: "google/gemma-4-31b-it:free",
      messages: [{ role: "user", content: "Test message. Reply 'OK' if you receive this." }],
    }),
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

test();
