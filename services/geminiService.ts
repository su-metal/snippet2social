
import { GoogleGenAI, Type } from "@google/genai";
import { STRATEGIES } from "../constants";

const getPerspectiveInstruction = (perspective: string): string => {
  if (perspective === 'business') {
    return `
      \n[Perspective: Official / Business]
      ROLE: Official Business Account (Owner/Staff). Speak as 'We', 'Our shop', or 'I (the owner)'. 
      Tone: Professional, welcoming, and reliable. 
      Goal: Promote YOUR own products, services, or brand. 
      PROHIBITED: Do not act as a customer or third-party (e.g., Avoid 'I found this shop', 'I recommend this product').
    `;
  }
  return `
    \n[Perspective: Personal / Reviewer]
    ROLE: Personal User / Influencer / Enthusiast. Speak as 'I', 'Me'. 
    Tone: Enthusiastic, authentic, sharing a discovery or personal experience. 
    Goal: Share a review, thought, or recommendation. 
    PROHIBITED: Do not sound like a corporate ad or an official representative of the brand/shop mentioned.
  `;
};

const getMoodInstruction = (humor: number, emotion: number): string => {
  let humorInstr = "";
  if (humor < 30) humorInstr = "Strictly serious, formal, and professional. No jokes.";
  else if (humor > 70) humorInstr = "Very humorous, witty, and entertaining. Include jokes or playful remarks.";
  else humorInstr = "Balanced tone, authentic and natural.";

  let emotionInstr = "";
  if (emotion < 30) emotionInstr = "Purely logical, analytical, and fact-based. Focus on data and reasoning.";
  else if (emotion > 70) emotionInstr = "Highly emotional, empathetic, and feelings-focused. Focus on human connection.";
  else emotionInstr = "Balanced mix of logic and emotion.";

  return `
    \n[Tone & Style Settings]
    - Humor Level (${humor}/100): ${humorInstr}
    - Emotion Level (${emotion}/100): ${emotionInstr}
  `;
};

const getLengthInstruction = (option: string): string => {
  let instruction = "";
  switch (option) {
    case 'short':
      instruction = "Keep the content very concise and to the point. Omit unnecessary filler. Focus on impact.";
      break;
    case 'long':
      instruction = "Provide a detailed and expansive explanation. Explore the topic in depth. Use more descriptive language.";
      break;
    default:
      instruction = "Write at a standard length, balancing detail and readability.";
  }
  return `\n[Content Length: ${option.toUpperCase()}]\n${instruction} Note: Even for 'Long', strictly adhere to the hard character limits of the selected platform (e.g., 280 chars for Twitter single tweet).`;
};

const getIntentInstruction = (intent: string): string => {
  switch (intent) {
    case 'promotion':
      return "\n[Post Intent: Promotion]\nWrite a persuasive promotional post. Focus on benefits, urgency, and include a strong Call to Action (CTA).";
    case 'story':
      return "\n[Post Intent: Storytelling]\nWrite a personal story or narrative. Focus on experience, emotions, and storytelling.";
    case 'educational':
      return "\n[Post Intent: Educational]\nWrite an educational post. Focus on providing value, tips, or 'how-to' knowledge.";
    case 'engagement':
      return "\n[Post Intent: Engagement]\nWrite to generate comments. Ask questions and encourage interaction with the audience.";
    default:
      return "";
  }
};

const getThreadInstruction = (isThreadMode: boolean): string => {
  if (!isThreadMode) return "";
  
  return `
    \n[SPECIAL MODE: TWITTER THREAD]
    Generate the content as a multi-tweet thread instead of a single tweet.
    Requirements:
    1. Divide the content into 3 to 7 logical tweets.
    2. Add numbering (1/x, 2/x) at the beginning of each tweet.
    3. The first tweet must be a high-impact "Hook".
    4. Each tweet must be under 280 characters.
    5. Separate each tweet in the output with two newlines.
  `;
};

const getVideoInstruction = (isLongVideo: boolean): string => {
  if (isLongVideo) {
    return `
      \n[SPECIAL MODE: 3-MINUTE LONG VIDEO SCRIPT]
      Task: Generate a comprehensive 3-minute educational video script.
      Structure:
      1. 【Title】: Catchy cover text.
      2. 【0-10s Hook】: Immediate attention grabber.
      3. 【Part 1 & 2: Deep Dive】: Comprehensive explanation with concrete examples.
      4. 【Summary & CTA】: Value recap and clear call to action.
      Target Length: 800-1000 characters.
    `;
  } else {
    return `
      \n[MODE: 60-SECOND VIRAL SCRIPT]
      Task: Generate a high-energy 60-second viral script.
      Structure: Hook, Fast-paced body, Outro.
    `;
  }
};

/**
 * Generates a social media post using the Gemini API.
 */
export const generatePost = async (
  inputText: string,
  platformId: string,
  language: string,
  humorLevel: number,
  emotionLevel: number,
  postIntent: string,
  isThreadMode: boolean = false,
  isLongVideo: boolean = false,
  isPro: boolean = false,
  customInstruction: string = '',
  lengthOption: string = 'medium',
  perspective: string = 'personal',
  variantCount: number = 1
): Promise<string | string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (platformId === 'multi' && !isPro) {
    throw new Error("Pro Plan Required for Multi-Post (All) feature.");
  }

  const strategy = STRATEGIES[platformId];
  if (!strategy) throw new Error(`Invalid platform selected: ${platformId}`);

  // Select model based on Pro status or Multi mode
  const modelName = 'gemini-2.5-flash';
  console.log(`[Snippet2Social] Generating: model=${modelName}, platform=${platformId}, perspective=${perspective}`);

  const perspectiveInstruction = getPerspectiveInstruction(perspective);
  const intentInstruction = getIntentInstruction(postIntent);
  const moodInstruction = getMoodInstruction(humorLevel, emotionLevel);
  const lengthInstruction = getLengthInstruction(lengthOption);
  const threadInstruction = platformId === 'twitter' ? getThreadInstruction(isThreadMode) : "";
  const videoInstruction = platformId === 'tiktok' ? getVideoInstruction(isLongVideo) : "";
  const languageInstruction = `\n\nIMPORTANT: Output the final result in ${language}.`;
  
  // Append Pro-only custom instruction if provided
  const customUserInstruction = (isPro && customInstruction.trim()) 
    ? `\n\n[IMPORTANT USER INSTRUCTION]: ${customInstruction.trim()}`
    : "";
  
  let finalSystemInstruction = strategy.systemInstruction + perspectiveInstruction + intentInstruction + moodInstruction + lengthInstruction + threadInstruction + videoInstruction + languageInstruction + customUserInstruction;

  // Handle Multi-Post specifically with JSON output
  if (platformId === 'multi') {
    finalSystemInstruction += `
      \n[MULTI-PLATFORM OUTPUT REQUIREMENTS]
      You must provide distinct content for Twitter, LinkedIn, and Instagram.
      - Twitter: Viral thread or high-impact tweet.
      - LinkedIn: Professional and insight-driven.
      - Instagram: Engaging caption with emojis.

      OUTPUT FORMAT: Strictly valid JSON.
    `;
  }

  const configOverrides = {
    systemInstruction: finalSystemInstruction,
    temperature: 0.7,
    ...(platformId === 'multi'
      ? {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              twitter: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              instagram: { type: Type.STRING },
            },
            required: ["twitter", "linkedin", "instagram"],
          },
        }
      : {}),
  };

  const generateOnce = async () => {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: inputText,
        config: configOverrides,
      });

      const text = response.text;
      if (!text) throw new Error("No content generated.");
      return text;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  };

  if (variantCount > 1) {
    const variants: string[] = [];
    for (let i = 0; i < variantCount; i += 1) {
      variants.push(await generateOnce());
    }
    return variants;
  }

  return generateOnce();
};

/**
 * Generates an image based on the post content with prompt refinement.
 */
export const generatePostImage = async (postContent: string, platform: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Prompt Refinement (Art Direction)
  const promptRefiner = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Convert the following social media post into a high-quality English image generation prompt. 
    Subject: Main topic of the post.
    Style: Modern, professional, cinematic lighting, 4k, artistic. 
    Context: ${platform}. 
    Output ONLY the English prompt.
    
    Post: ${postContent.substring(0, 1000)}`,
  });

  const refinedPrompt = promptRefiner.text?.trim() || "A professional background for social media.";

  // 2. Image Generation
  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: refinedPrompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  // 3. Extract Base64
  for (const part of imageResponse.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate image.");
};
