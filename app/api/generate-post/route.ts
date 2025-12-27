import { NextResponse } from "next/server";
import { generatePost } from "@/services/geminiService";

export async function POST(req: Request) {
  try {
    const {
      inputText,
      selectedPlatform,
      selectedLanguage,
      humorLevel,
      emotionLevel,
      postIntent,
      isThreadMode,
      isLongVideo,
      isPro,
      customInstruction,
      lengthOption,
      perspective,
      variantMode,
      isXPremiumLongPost = false,
    } = await req.json();

    const variantCount = variantMode ? 3 : 1;
    const result = await generatePost(
      inputText,
      selectedPlatform,
      selectedLanguage,
      humorLevel,
      emotionLevel,
      postIntent,
      isThreadMode,
      isLongVideo,
      isPro,
      customInstruction,
      lengthOption,
      perspective,
      variantCount,
      isXPremiumLongPost
    );

    if (Array.isArray(result)) {
      return NextResponse.json({
        result: result[0] ?? "",
        variants: result,
      });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("OpenAI API Error (generate-post):", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "内部エラー" },
      { status: 500 }
    );
  }
}
