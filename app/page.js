"use client";
import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    const text = new FormData(event.currentTarget).get("text");
    const session = await fetch("/api/session").then((r) => r.json());
    const response = await fetch("/api/text-intelligence?summarize=true&topics=true&sentiment=true&intents=true", { method: "POST", headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    setResult(JSON.stringify(await response.json(), null, 2)); setBusy(false);
  }
  return <main><p>Deepgram starter</p><h1>Analyze text.</h1><p>Summarize text and detect topics, sentiment, and intents.</p><form onSubmit={submit}><textarea name="text" required placeholder="Paste text to analyze" /><button disabled={busy}>{busy ? "Analyzing..." : "Analyze"}</button></form>{result && <pre>{result}</pre>}</main>;
}
