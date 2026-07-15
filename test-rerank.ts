import dotenv from "dotenv";
dotenv.config();

async function testRerank() {
  const OPENROUTER_URL = "https://openrouter.ai/api/v1/rerank";
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = "nvidia/llama-nemotron-rerank-vl-1b-v2:free";

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      query: "Looking for an expert React developer with 5 years experience.",
      documents: [
        "I am a backend developer who writes Python and SQL.",
        "I am a React developer with 6 years of experience building SPAs.",
        "I like to play basketball.",
      ],
      top_n: 3,
    }),
  });

  const text = await res.text();
  console.log(text);
}

testRerank();
