import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ title: "Next.js Text Intelligence", useCase: "text-intelligence", language: "javascript", framework: "nextjs", sdk: "@deepgram/sdk" }); }
