import { NextResponse } from "next/server";
import { generatePostImage } from "@/services/geminiService";

export async function POST(req: Request) {
  try {
    const { postContent, platform } = await req.json();

    const url = await generatePostImage(postContent, platform);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("OpenAI API Error (generate-image):", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "内部エラー" },
      { status: 500 }
    );
  }
}
