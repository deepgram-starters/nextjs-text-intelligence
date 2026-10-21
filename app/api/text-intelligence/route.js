import { NextResponse } from "next/server";
import { DeepgramClient } from "@deepgram/sdk";
import { hasValidSession } from "../../../lib/session";

export const runtime = "nodejs";
const truthy = (value) => value === "true" || value === "v2";

export async function POST(request) {
  if (!hasValidSession(request.headers.get("authorization"))) return NextResponse.json({ error: { type: "AuthenticationError", code: "MISSING_TOKEN", message: "Authorization header with Bearer token is required" } }, { status: 401 });
  if (!process.env.DEEPGRAM_API_KEY) return NextResponse.json({ error: { type: "ConfigurationError", code: "MISSING_API_KEY", message: "DEEPGRAM_API_KEY is required" } }, { status: 500 });
  const { text, url } = await request.json();
  if ((!text && !url) || (text && url)) return NextResponse.json({ error: { type: "validation_error", code: "INVALID_TEXT", message: "Request must contain either text or url field" } }, { status: 400 });
  try {
    const body = url ? { url } : { text };
    const query = request.nextUrl.searchParams;
    const data = await new DeepgramClient({ apiKey: process.env.DEEPGRAM_API_KEY }).read.v1.text.analyze({ body, language: query.get("language") || "en", ...(truthy(query.get("summarize")) ? { summarize: query.get("summarize") === "v2" ? "v2" : true } : {}), ...(truthy(query.get("topics")) ? { topics: true } : {}), ...(truthy(query.get("sentiment")) ? { sentiment: true } : {}), ...(truthy(query.get("intents")) ? { intents: true } : {}) });
    return NextResponse.json({ results: data.results || {} });
  } catch (error) {
    return NextResponse.json({ error: { type: "processing_error", code: "INVALID_TEXT", message: error instanceof Error ? error.message : "Text processing failed" } }, { status: 400 });
  }
}
