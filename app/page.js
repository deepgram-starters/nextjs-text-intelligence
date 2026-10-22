"use client";

import { useEffect, useState } from "react";

const HISTORY_KEY = "deepgram_text_intelligence_history";
const EMPTY_RESULT = null;

function getHistory() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function ResultSection({ title, children }) {
  return <section className="result-section"><h2>{title}</h2>{children}</section>;
}

function Badges({ items, property, empty }) {
  if (!items.length) return <p className="muted-copy">{empty}</p>;
  return <div className="badges">{items.map((item, index) => <span className="result-badge" key={`${item[property]}-${index}`}>{item[property]}{item.confidence_score !== undefined && <small>{Number(item.confidence_score).toFixed(2)}</small>}</span>)}</div>;
}

function Results({ result, features }) {
  if (!result) return <div className="empty-state"><div className="empty-state__mark">AI</div><h1>Analyze Text with AI Intelligence</h1><p>Enter text or provide a URL, choose intelligence features, and analyze to get useful insights.</p></div>;
  const topics = result.topics?.segments?.flatMap((segment) => segment.topics || []) || [];
  const intents = result.intents?.segments?.flatMap((segment) => segment.intents || []) || [];
  const sentiment = result.sentiments?.average;
  return <div className="results-container">
    {features.summarize && <ResultSection title="Summary"><div className="result-text">{result.summary?.text || "No summary available."}</div></ResultSection>}
    {features.topics && <ResultSection title="Topics"><Badges items={topics} property="topic" empty="No topics detected." /></ResultSection>}
    {features.sentiment && <ResultSection title="Sentiment">{sentiment ? <div className={`sentiment sentiment--${sentiment.sentiment || "neutral"}`}><strong>{sentiment.sentiment || "neutral"}</strong>{sentiment.sentiment_score !== undefined && <span>Score {Number(sentiment.sentiment_score).toFixed(2)}</span>}</div> : <p className="muted-copy">No sentiment analysis available.</p>}</ResultSection>}
    {features.intents && <ResultSection title="Intents"><Badges items={intents} property="intent" empty="No intents detected." /></ResultSection>}
  </div>;
}

export default function Page() {
  const [inputMode, setInputMode] = useState("text");
  const [input, setInput] = useState("");
  const [features, setFeatures] = useState({ summarize: true, topics: false, sentiment: false, intents: false });
  const [result, setResult] = useState(EMPTY_RESULT);
  const [metadata, setMetadata] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("Deepgram Text Intelligence");

  useEffect(() => {
    setHistory(getHistory());
    fetch("/api/metadata").then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.title) { setTitle(data.title); document.title = data.title; }
    }).catch(() => {});
  }, []);

  function setFeature(feature) {
    setFeatures((current) => ({ ...current, [feature]: !current[feature] }));
  }

  function saveHistory(entry) {
    const next = [entry, ...history].slice(0, 10);
    setHistory(next);
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  async function analyze() {
    const value = input.trim();
    if (!value) { setStatus({ type: "error", message: `Enter ${inputMode === "text" ? "text" : "a URL"} to analyze.` }); return; }
    if (!Object.values(features).some(Boolean)) { setStatus({ type: "error", message: "Select at least one intelligence feature." }); return; }
    setBusy(true); setStatus({ type: "working", message: "Analyzing text..." });
    const params = new URLSearchParams({ language: "en" });
    Object.entries(features).forEach(([feature, enabled]) => { if (enabled) params.set(feature, "true"); });
    try {
      const session = await fetch("/api/session").then(async (response) => {
        if (!response.ok) throw new Error("Unable to start a session.");
        return response.json();
      });
      const response = await fetch(`/api/text-intelligence?${params}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
        body: JSON.stringify(inputMode === "text" ? { text: value } : { url: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Analysis failed.");
      const id = `request_${Date.now()}`;
      const entry = { id, timestamp: new Date().toISOString(), input: value, inputMode, features, results: data.results || {} };
      setResult(entry.results); setMetadata({ id, input: value, inputMode, timestamp: entry.timestamp }); setActiveId(id); saveHistory(entry); setStatus(null);
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Analysis failed." });
    } finally { setBusy(false); }
  }

  function openHistory(entry) {
    setResult(entry.results); setMetadata({ id: entry.id, input: entry.input, inputMode: entry.inputMode, timestamp: entry.timestamp }); setActiveId(entry.id); setStatus(null);
  }

  function clearHistory() {
    if (!window.confirm("Clear all saved analyses?")) return;
    window.localStorage.removeItem(HISTORY_KEY); setHistory([]); setActiveId(null); setResult(null); setMetadata(null);
  }

  return <div className="app-shell">
    <header className="app-header"><a className="brand" href="https://deepgram.com" target="_blank" rel="noreferrer">DEEPGRAM <span>Text Intelligence</span></a><nav><a href="https://github.com/deepgram-starters" target="_blank" rel="noreferrer">GitHub</a><a className="header-cta" href="https://console.deepgram.com" target="_blank" rel="noreferrer">Free API Key</a></nav></header>
    <div className="columns">
      <aside className="sidebar controls-panel">
        <div className="mode-toggle"><button className={inputMode === "text" ? "active" : ""} disabled={busy} onClick={() => setInputMode("text")}>Text Input</button><button className={inputMode === "url" ? "active" : ""} disabled={busy} onClick={() => setInputMode("url")}>URL Input</button></div>
        <label className="field-label" htmlFor="analysis-input">{inputMode === "text" ? "Enter Text" : "Enter URL"}</label>
        {inputMode === "text" ? <textarea id="analysis-input" value={input} disabled={busy} onChange={(event) => setInput(event.target.value)} placeholder="Enter the text you want to analyze..." rows="8" /> : <><input id="analysis-input" type="url" value={input} disabled={busy} onChange={(event) => setInput(event.target.value)} placeholder="https://example.com/text-file.txt" /><p className="field-hint">URL must point to a publicly accessible text file.</p></>}
        <fieldset disabled={busy}><legend>Intelligence Features</legend>{[["summarize", "Summarization"], ["topics", "Topic Detection"], ["sentiment", "Sentiment Analysis"], ["intents", "Intent Recognition"]].map(([feature, label]) => <label className="check" key={feature}><input type="checkbox" checked={features[feature]} onChange={() => setFeature(feature)} />{label}</label>)}</fieldset>
        <label className="field-label" htmlFor="language">Language</label><select id="language" disabled={busy} defaultValue="en"><option value="en">English</option></select>
        <button className="primary-button" disabled={busy} onClick={analyze}>{busy ? "Analyzing..." : "Analyze Text"}</button>
        {status && <div className={`status status--${status.type}`}>{status.message}</div>}
        {metadata && <section className="metadata"><h2>Metadata</h2><dl><div><dt>Request ID</dt><dd>{metadata.id}</dd></div><div><dt>Input Mode</dt><dd>{metadata.inputMode}</dd></div><div><dt>Input Preview</dt><dd>{metadata.input.slice(0, 52)}{metadata.input.length > 52 ? "..." : ""}</dd></div><div><dt>Timestamp</dt><dd>{new Date(metadata.timestamp).toLocaleString()}</dd></div></dl></section>}
      </aside>
      <main className="main-panel"><Results result={result} features={features} /></main>
      <aside className="sidebar history-panel"><div className="history-heading"><h2>History ({history.length})</h2>{history.length > 0 && <button className="text-button" onClick={clearHistory}>Clear</button>}</div>{history.length === 0 ? <div className="history-empty">No analyses yet</div> : <div className="history-list">{history.map((entry) => <button className={`history-item ${entry.id === activeId ? "history-item--active" : ""}`} key={entry.id} onClick={() => openHistory(entry)}><span>{entry.id}</span><small>{new Date(entry.timestamp).toLocaleString()}</small><em>{Object.entries(entry.features).filter(([, enabled]) => enabled).map(([feature]) => feature).join(", ")}</em></button>)}</div>}</aside>
    </div>
  </div>;
}
