import OpenAI from "openai";
import { STRATEGIES, GOOGLE_MAP_INTENT_IDS } from "../constants";

const getPerspectiveInstruction = (): string => {
  return `
    \n[Perspective: Official / Business]
    ROLE: Official Business Account (Owner/Staff). Speak as 'We', 'Our shop', or 'I (the owner)'.
    Tone: Professional, welcoming, reliable, and gently promotional.
    Goal: Promote YOUR own products, services, or brand while sounding like the official shop account.
    PROHIBITED: Do not act as a customer or third-party (e.g., Avoid 'I found this shop', 'I recommend this product').
  `;
};

const getMoodInstruction = (humor: number, emotion: number): string => {
  let humorInstr = "";
  if (humor < 30)
    humorInstr =
      "Strictly serious, formal, and professional. Avoid jokes, playful grammar, or emoji; focus on precise, factual sentences.";
  else if (humor > 70)
    humorInstr =
      "Very humorous, witty, and entertaining. Sprinkle mild jokes, playful metaphors, and lively punctuation to make the tone vivid.";
  else humorInstr = "Balanced tone - natural, friendly, and conversational without leaning too far toward jokes or stiffness.";

  let emotionInstr = "";
  if (emotion < 30)
    emotionInstr =
      "Purely logical, analytical, and fact-based. Keep sentences grounded, avoid emotional adjectives, and use structured reasoning.";
  else if (emotion > 70)
    emotionInstr =
      "Highly emotional, empathetic, and feelings-focused. Emphasize human connection, describe sensations, and end sentences with warmth.";
  else emotionInstr = "Balanced mix of logic and emotion, combining clear reasoning with glimpses of feeling.";

  return `
    \n[Tone & Style Settings]
    - Humor Level (${humor}/100): ${humorInstr}
    - Emotion Level (${emotion}/100): ${emotionInstr}
  `;
};

const getLengthInstruction = (option: string, platformId: string, allowPremiumLong: boolean): string => {
  let instruction = "";
  switch (option) {
    case "short":
      instruction = "Keep the content very concise and to the point. Omit unnecessary filler. Focus on impact.";
      break;
    case "long":
      instruction = "Provide a detailed and expansive explanation. Explore the topic in depth. Use more descriptive language.";
      break;
    default:
      instruction = "Write at a standard length, balancing detail and readability.";
  }
  const defaultLimitNote =
    "Note: Even for 'Long', strictly adhere to the hard character limits of the selected platform (e.g., 280 characters for a Twitter single post).";
  const premiumLongNote =
    "Note: This is an X Premium long post - use up to 4,000 characters in a single message while keeping readability high.";
  const limitNote = platformId === "twitter" && allowPremiumLong ? premiumLongNote : defaultLimitNote;
  return `\n[Content Length: ${option.toUpperCase()}]\n${instruction} ${limitNote}`;
};

const GOOGLE_MAP_LENGTH_GUIDES: Record<string, string> = {
  short: `
    \n[Google Map Length: Short]
    1-2 sentences. Keep it extremely concise: thank/apologize/answer with just the core point, avoid extra background, aim for ~60-120 Japanese characters or 20-40 English words.
    Purpose: fast replies for busy teams.
  `,
  medium: `
    \n[Google Map Length: Medium]
    3-4 sentences. Start with a greeting, summarize the review in one sentence, deliver the key response, and finish with a brief closing thought (~120-220 Japanese characters or 40-80 English words).
    Purpose: the standard polite reply.
  `,
  long: `
    \n[Google Map Length: Long]
    5-7 sentences. Include a greeting, mention 1-2 specific review points, provide a fuller thank-you/apology/answer (with improvement note if relevant), and end with a sincere close (~220-400 Japanese characters or 80-140 English words).
    Purpose: show extra care without drifting into a wall of text.
  `,
};

const getGoogleMapLengthInstruction = (option: string): string => {
  return GOOGLE_MAP_LENGTH_GUIDES[option] || GOOGLE_MAP_LENGTH_GUIDES.medium;
};

const getPremiumLongInstruction = (enabled: boolean): string => {
  if (!enabled) return "";
  return `
    \n[SPECIAL MODE: X PREMIUM LONG POST]
    You are writing for an X Premium (formerly Twitter Blue) account. Compose one cohesive post up to 4,000 characters - no threads, no numbering (1/x).
    Use short paragraphs, strong hook, and a conclusion. Keep readability high with line breaks or bullet points if necessary, but do not split into multiple tweets.
  `;
};

const MULTI_LENGTH_GUIDES: Record<string, { twitter: string; instagram: string }> = {
  short: {
    twitter:
      "Keep the X post to 1-2 focused sentences (about 90-140 characters) that stay well under the 280-character cap and use at most two hashtags.",
    instagram:
      "Write 2-3 short sentences (about 50-90 words) so the caption feels noticeably shorter than the medium/long outputs.",
  },
  medium: {
    twitter:
      "Use 3-4 sentences (about 150-220 characters) that balance detail with clarity while still remaining a single tweet at 280 characters.",
    instagram:
      "Produce 4-6 sentences (about 100-140 words) with a gentle hook, a couple of supporting details, and 5-7 hashtags at the end.",
  },
  long: {
    twitter:
      "Deliver 4-5 sentences (about 220-280 characters) that expand on the story or rationale while still fitting into one tweet; keep punctuation clean.",
    instagram:
      "Craft 6-8 sentences (about 150-200 words) that go deeper into context or emotion, describe the scene, and finish with 6-10 hashtags.",
  },
};

const getMultiLengthGuidance = (option: string, allowPremiumLong: boolean): string => {
  const guide = MULTI_LENGTH_GUIDES[option] || MULTI_LENGTH_GUIDES.medium;
  const limitReminder = allowPremiumLong
    ? "If X Premium Long mode applies elsewhere, you may expand toward 4,000 characters while keeping a single cohesive post."
    : "Every X output must still stay within a single 280-character tweet.";
  return `
    [MULTI-PLATFORM LENGTH GUIDANCE]
    Selected length option: ${option.toUpperCase()}.
    - X (Twitter): ${guide.twitter} ${limitReminder}
    - Instagram: ${guide.instagram}
  `;
};

const getMultiPlatformDistinctionInstruction = (
  allowPremiumLong: boolean
): string => {
  const twitterLengthNote = allowPremiumLong
    ? "You may expand toward 4,000 characters while keeping a single cohesive, hook-first post."
    : "Keep the Twitter output within a single tweet (≤ 280 characters).";
  return `
    [MULTI-PLATFORM DISTINCT FORMATTING]
    Twitter (X):
      - Hook-first structure: start with a punchy sentence, then 1-2 paragraphs with minimal line breaks.
      - Limit emoji use to at most 1 character; keep the CTA short, direct, and urgent.
      - ${twitterLengthNote}
    Instagram:
      - Craft a caption-style narrative with 4-8 lines separated by line breaks and an overall soft, conversational tone.
      - Include 2-6 emojis and finish with a hashtag block at the end if helpful.
      - Use descriptive language, more context, and an expressive CTA that invites saves/comments.
    Do NOT reuse the same sentences or phrases between Twitter and Instagram.
    If a sentence appears in the Twitter output, it must not appear in the Instagram output.
    The two outputs must be meaningfully different in wording, structure, and tone.
    Before outputting the final JSON, verify that twitter.text and instagram.caption are meaningfully different.
    If they are similar, rewrite one of them until they differ.
  `;
};

const getIntentInstruction = (intent: string): string => {
  switch (intent) {
    case "promotion":
      return "\n[Post Intent: Promotion]\nWrite a persuasive promotional post. Focus on benefits, urgency, and include a strong Call to Action (CTA).";
    case "story":
      return "\n[Post Intent: Storytelling]\nWrite a personal story or narrative. Focus on experience, emotions, and storytelling.";
    case "educational":
      return "\n[Post Intent: Educational]\nWrite an educational post. Focus on providing value, tips, or 'how-to' knowledge.";
    case "engagement":
      return "\n[Post Intent: Engagement]\nWrite to generate comments. Ask questions and encourage interaction with the audience.";
    case GOOGLE_MAP_INTENT_IDS.THANK_YOU:
      return "\n[Post Intent: Google Map – Thank You]\nRespond with gratitude, reference the positive points in the review, and close with a warm welcome back.";
    case GOOGLE_MAP_INTENT_IDS.APOLOGY:
      return "\n[Post Intent: Google Map – Apology]\nApologize sincerely, acknowledge the issues raised, and assure the reviewer you are addressing them.";
    case GOOGLE_MAP_INTENT_IDS.ANSWER:
      return "\n[Post Intent: Google Map – Question Answer]\nThank the reviewer for their question, restate it briefly, and provide a clear, helpful answer.";
    case GOOGLE_MAP_INTENT_IDS.AUTO:
      return "\n[Post Intent: Google Map – Auto]\nDetermine whether the review is praise, a complaint, or a question, then use the structure for that scenario.";
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
  }
  return `
    \n[MODE: 60-SECOND VIRAL SCRIPT]
    Task: Generate a high-energy 60-second viral script.
    Structure: Hook, Fast-paced body, Outro.
  `;
};

const GOOGLE_MAP_CONTEXT_INSTRUCTION = `
  \n[Google Map Reply Context]
  Treat the user's input as a Google Maps review. Reply as the business, using "we", "our team", or "I" (owner/staff) voice.
  Mention one or two concrete points from the review to show you read it, keep the tone sincere and non-promotional, and avoid hashtags or numbered lists.
  Never ask the reviewer to visit the store or require in-person contact; do not request phone, email, DM, or form follow-up, nor ask them any further questions. Keep the reply fully self-contained without asking for any additional action.
  When referencing the review, do not parrot the exact sentences or wording. Summarize the impression from the business perspective using naturally phrased gratitude, empathy, or explanation.
  Stick to short-to-medium length sentences and limit emojis; the output should be a single reply message with no extra commentary.
`;

const STRUCTURE_INSTRUCTIONS: Record<string, string> = {
  [GOOGLE_MAP_INTENT_IDS.THANK_YOU]: `
    \n[Google Map Structure: Thank You Reply]
    1. Begin with a heartfelt thank-you for their positive review.
    2. Reference one or two specific highlights they mentioned.
    3. Close by inviting them back or expressing continued support.
    Keep the tone warm, sincere, and concise. Do not turn this into a promotional pitch or a numbered list. A gentle re-invitation like "またのご来店をお待ちしております" is fine here.
  `,
  [GOOGLE_MAP_INTENT_IDS.APOLOGY]: `
    \n[Google Map Structure: Apology / Issue Response]
    1. Open with a sincere apology for the experience they described.
    2. Acknowledge that you understand the issue they raised.
    3. Mention the steps you are taking (or will take) to improve.
    4. Keep the reply fully self-contained: do NOT invite further contact or ask for additional information, and do not direct them to visit the store.
    Paraphrase their concern from the staff perspective rather than repeating their wording, and emphasize empathy plus improvement intent.
    Keep the tone calm, solution-focused, and avoid defensive language.
  `,
  [GOOGLE_MAP_INTENT_IDS.ANSWER]: `
    \n[Google Map Structure: Question Response]
    1. Thank them for their question or curiosity.
    2. Restate the question in your own words to show understanding.
    3. Provide a concise, accurate answer.
    4. Add any helpful details (e.g., hours, reservation info, or access tips) if relevant.
    Provide the requested information directly without asking for a follow-up, and paraphrase the question from your own voice rather than mirroring the reviewer's words.
    Keep the reply practical, friendly, and easy to understand.
  `,
  [GOOGLE_MAP_INTENT_IDS.AUTO]: `
    \n[Google Map Structure: Automatic Selection]
    Decide whether the review is praise, a complaint, or a question, then follow the most appropriate structure above.
    Always include at least one specific detail from the review, keep the tone measured, and do not introduce hashtags or overt marketing language.
    Do not ask for any further contact or task outside this reply; describe the review points with your own phrasing rather than repeating them.
  `,
};

const getStructureInstruction = (platformId: string, intent: string): string => {
  if (platformId !== "googlemap") return "";
  return STRUCTURE_INSTRUCTIONS[intent] || STRUCTURE_INSTRUCTIONS[GOOGLE_MAP_INTENT_IDS.AUTO];
};

const toJsonOrText = (content: string, platformId: string): string => {
  if (platformId !== "multi") return content;
  try {
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (error) {
    console.warn("Multi-post output is not valid JSON. Returning raw content.");
    return content;
  }
};

const createOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }
  return new OpenAI({ apiKey });
};

const buildSystemInstruction = (
  strategySystem: string,
  perspectiveInstruction: string,
  intentInstruction: string,
  moodInstruction: string,
  lengthInstruction: string,
  googleMapLengthInstruction: string,
  threadInstruction: string,
  videoInstruction: string,
  languageInstruction: string,
  googleMapContextInstruction: string,
  structureInstruction: string,
  customUserInstruction: string,
  premiumLongInstruction: string,
  multiLengthGuidance: string,
  multiDistinctInstruction: string,
  isMulti: boolean
): string => {
  const components = [
    strategySystem,
    perspectiveInstruction,
    intentInstruction,
    moodInstruction,
    lengthInstruction,
    googleMapLengthInstruction,
    threadInstruction,
    videoInstruction,
    languageInstruction,
    googleMapContextInstruction,
    structureInstruction,
    customUserInstruction,
    premiumLongInstruction,
  ];

  if (isMulti) {
    if (multiLengthGuidance) {
      components.push(multiLengthGuidance);
    }
    if (multiDistinctInstruction) {
      components.push(multiDistinctInstruction);
    }
    components.push(`
      \n[MULTI-PLATFORM OUTPUT REQUIREMENTS]
      You must provide distinct content for Twitter, LinkedIn, and Instagram.
      All outputs should sound like the official shop account, using "we", "our", or "I (the owner/staff)" as the speaker.
      - Twitter: Viral thread or high-impact tweet.
      - LinkedIn: Professional and insight-driven.
      - Instagram: Engaging caption with emojis.

      OUTPUT FORMAT: Strictly valid JSON with keys 'twitter', 'linkedin', and 'instagram'.
      Do not wrap the JSON in code fences or add extra explanation. Respond with only the JSON object.
    `);
  }

  return components
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("\n\n");
};

const buildUserMessage = (inputText: string, platformId: string): string => `
Input (raw memo or review):
${inputText.trim()}

Instructions above describe exactly how the final ${platformId === "multi" ? "multi-platform bundle" : "post"} must read. Do not add any labels, explanations, or table wrappers. Deliver only the final text (or JSON object for multi-platform).`;

const OPENAI_MODEL = "gpt-4.1";
const IMAGE_PROMPT_MODEL = "gpt-4o-mini";

/**
 * Generates a social media post using the OpenAI API.
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
  customInstruction: string = "",
  lengthOption: string = "medium",
  _perspective: string = "personal",
  variantCount: number = 1,
  isPremiumLongPost: boolean = false
): Promise<string | string[]> => {
  if (platformId === "multi" && !isPro) {
    throw new Error("Pro Plan Required for Multi-Post (All) feature.");
  }

  const strategy = STRATEGIES[platformId];
  if (!strategy) throw new Error(`Invalid platform selected: ${platformId}`);

  const client = createOpenAIClient();
  const perspectiveInstruction = getPerspectiveInstruction();
  const intentInstruction = getIntentInstruction(postIntent);
  const moodInstruction = getMoodInstruction(humorLevel, emotionLevel);
  const premiumLongActive = platformId === "twitter" && isPremiumLongPost;
  const lengthInstruction = getLengthInstruction(lengthOption, platformId, premiumLongActive);
  const googleMapLengthInstruction = platformId === "googlemap" ? getGoogleMapLengthInstruction(lengthOption) : "";
  const threadInstruction = platformId === "twitter" ? getThreadInstruction(isThreadMode) : "";
  const videoInstruction = platformId === "tiktok" ? getVideoInstruction(isLongVideo) : "";
  const languageInstruction = `\n[LANGUAGE]\n  Output the final result only in ${language}.`;
  const customUserInstruction = isPro && customInstruction.trim()
    ? `\n[IMPORTANT USER INSTRUCTION]\n    ${customInstruction.trim()}`
    : "";
  const premiumLongInstruction = platformId === "twitter" ? getPremiumLongInstruction(premiumLongActive) : "";
  const googleMapContextInstruction = platformId === "googlemap" ? GOOGLE_MAP_CONTEXT_INSTRUCTION : "";
  const structureInstruction = getStructureInstruction(platformId, postIntent);
  const multiLengthGuidance =
    platformId === "multi"
      ? getMultiLengthGuidance(lengthOption, premiumLongActive)
      : "";
  const multiDistinctInstruction =
    platformId === "multi"
      ? getMultiPlatformDistinctionInstruction(premiumLongActive)
      : "";
  const systemInstruction = buildSystemInstruction(
    strategy.systemInstruction,
    perspectiveInstruction,
    intentInstruction,
    moodInstruction,
    lengthInstruction,
    googleMapLengthInstruction,
    threadInstruction,
    videoInstruction,
    languageInstruction,
    googleMapContextInstruction,
    structureInstruction,
    customUserInstruction,
    premiumLongInstruction,
    multiLengthGuidance,
    multiDistinctInstruction,
    platformId === "multi"
  );
  const userMessage = buildUserMessage(inputText, platformId);

  const generateOnce = async (): Promise<string> => {
    try {
      const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const raw = response.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error("OpenAI did not return any text.");
      return toJsonOrText(raw, platformId);
    } catch (error) {
      console.error("OpenAI API Error:", error);
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
  const client = createOpenAIClient();

  const refinementPrompt = `Convert the following social media post into an English image prompt suitable for a modern, cinematic result. Use the following structure:
- Subject: Main focus
- Style: Modern, high-end, cinematic lighting, 4K
- Mood: Positive, professional
- Context: ${platform}

Post: ${postContent}`;

  const refinedResponse = await client.chat.completions.create({
    model: IMAGE_PROMPT_MODEL,
    messages: [
      { role: "system", content: "You are an expert art director crafting prompts for stunning AI image generation." },
      { role: "user", content: refinementPrompt },
    ],
    temperature: 0.2,
    max_tokens: 250,
  });

  const refinedPrompt = refinedResponse.choices?.[0]?.message?.content?.trim() || "A professional social media background with clean, cinematic lighting.";

  const imageResponse = await client.images.generate({
    model: "gpt-image-1",
    prompt: refinedPrompt,
    size: "1024x1024",
    background: "transparent",
  });

  const b64 = imageResponse.data?.[0]?.b64_json;
  if (!b64) throw new Error("Failed to generate image.");
  return `data:image/png;base64,${b64}`;
};
