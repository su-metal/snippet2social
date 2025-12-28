import OpenAI from "openai";
import { STRATEGIES, GOOGLE_MAP_INTENT_IDS } from "../constants";
import type { PlatformStrategy } from "../types";

const getPerspectiveInstruction = (): string => {
  return `
    \n[Perspective: Official / Business]
    ROLE: Official Business Account (Owner/Staff). Speak as 'We', 'Our shop', or 'I (the owner)'.
    Tone: Professional, welcoming, reliable, and gently promotional.
    Goal: Promote YOUR own products, services, or brand while sounding like the official shop account.
    PROHIBITED: Do not act as a customer or third-party (e.g., Avoid 'I found this shop', 'I recommend this product').
  `;
};

const getAntiThirdPersonGuardrails = (): string => {
  return `
[ANTI-THIRD-PERSON GUARDRAILS - STRICT]
You are the business owner/staff writing about YOUR OWN shop.
Even if the perspective is correct, DO NOT use influencer/reviewer phrasing.

BANNED PHRASES (JP):
見つけました, 行ってきました, おすすめのお店, このお店は, ここは, してみた, 最高でした, リピ確, 神○○

BANNED PHRASES (EN):
I found, we found, this place, I tried, highly recommend this spot

WORDING RULES:
- Do not refer to the shop as "this shop/this place/here". Use "当店/私たち/店主" instead.
- Replace “discovery/review” vibe with “we prepared/we offer/our commitment” vibe.

FINAL SELF-CHECK (mandatory):
- If any banned phrase appears, rewrite that sentence.
- If any sentence sounds like a customer or outsider, rewrite it using "当店/私たち/店主" voice.
- Ensure at least one explicit business-subject phrase appears: 当店 / 私たち / 店主 / うち
`;
};

const getHumorGuidance = (platformId: string, level: number): string => {
  const isGoogleMap = platformId === "googlemap";
  if (isGoogleMap) {
    if (level < 35) {
      return "Keep the reply calm, concise, and respectful; use simple, professional vocabulary and avoid any jokes or playful imagery.";
    }
    if (level > 70) {
      return 'Still suppress humor, but add gentle warmth through softer adjectives and a friendly closing (e.g., "心より感謝しております"); no puns or slang.';
    }
    return 'Stay polite and composed while letting a touch of friendliness peek through (favor words like "ありがとうございます" or "嬉しく感じます").';
  }

  if (level < 30) {
    return "Keep the tone serious and precise, using fact-focused vocabulary, short sentences, and no metaphors or playful comparisons.";
  }
  if (level <= 70) {
    return "Blend clarity with a mild friendly voice; sprinkle a light analogy or a conversational aside, but avoid full jokes or sarcasm.";
  }
  return "Lean into playful, witty language—add gentle humor, a friendly comparison, or a tiny rhetorical question while staying respectful.";
};

const getEmotionGuidance = (platformId: string, level: number): string => {
  const isGoogleMap = platformId === "googlemap";
  if (level < 30) {
    return isGoogleMap
      ? "Acknowledge the review with concise, objective sentences, mention the specific points raised, and keep emotional adjectives to a minimum."
      : "Focus on logic and clarity: highlight facts, action steps, and use bullet-style or short sentences without emotional flourishes.";
  }
  if (level <= 70) {
    return isGoogleMap
      ? 'Share polite gratitude and a gentle mention of care, using mild adjectives like "ありがたく" or "丁寧"; keep structure tidy.'
      : "Mix useful insights with a touch of feeling—introduce one emotional word, mention how it made you feel, and keep balance.";
  }
  return isGoogleMap
    ? 'Show deep empathy: reflect on the reviewer’s feelings, use heartfelt phrases such as "心より", and close with warm gratitude without requesting anything extra.'
    : 'Lead with empathetic language, describe your own reaction, use vivid adjectives, and finish with a heartfelt closing (e.g., "It truly touched me").';
};

const getMoodInstruction = (
  platformId: string,
  humor: number,
  emotion: number
): string => {
  const humorInstr = getHumorGuidance(platformId, humor);
  const emotionInstr = getEmotionGuidance(platformId, emotion);

  return `
    \n[Tone & Style Settings]
    - Humor Level (${humor}/100): ${humorInstr}
    - Emotion Level (${emotion}/100): ${emotionInstr}
  `;
};

const getLengthInstruction = (
  option: string,
  platformId: string,
  allowPremiumLong: boolean
): string => {
  let instruction = "";
  switch (option) {
    case "short":
      instruction =
        "Keep the content very concise and to the point. Omit unnecessary filler. Focus on impact.";
      break;
    case "long":
      instruction =
        "Provide a detailed and expansive explanation. Explore the topic in depth. Use more descriptive language.";
      break;
    default:
      instruction =
        "Write at a standard length, balancing detail and readability.";
  }
  const defaultLimitNote =
    "Note: Even for 'Long', strictly adhere to the hard character limits of the selected platform (e.g., 280 characters for a Twitter single post).";
  const premiumLongNote =
    "Note: This is an X Premium long post—use up to 4,000 characters in a single message while keeping readability high.";
  const limitNote =
    platformId === "twitter" && allowPremiumLong
      ? premiumLongNote
      : defaultLimitNote;
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
    You are writing for an X Premium (formerly Twitter Blue) account. Compose one cohesive post up to 4,000 characters—no threads, no numbering (1/x).
    Use short paragraphs, strong hook, and a conclusion. Keep readability high with line breaks or bullet points if necessary, but do not split into multiple tweets.
  `;
};

const MULTI_LENGTH_GUIDES: Record<
  string,
  { twitter: string; instagram: string }
> = {
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

const getMultiLengthGuidance = (
  option: string,
  allowPremiumLong: boolean
): string => {
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
    : "Keep the Twitter output within a single tweet (up to 280 characters).";
  return `
    [MULTI-PLATFORM DISTINCT FORMATTING]
    Twitter (X):
      - Hook-first: lead with a punchy sentence followed by 1-2 compact paragraphs.
      - Limit emoji use to at most one character and keep the CTA short, direct, and urgent.
      - ${twitterLengthNote}
    LinkedIn:
      - Deliver a professional insight with a short headline plus 2-3 concise sentences focused on takeaways.
      - Keep the formatting calm (minimal emojis) and end with a reflective, yet actionable CTA.
    Instagram:
      - Craft a caption-style narrative with 4-8 lines separated by blank lines and vivid, descriptive language.
      - Include 2-6 emojis and finish with an expressive hashtag block if it fits the tone.
      - Make the CTA warm and inviting without reusing the Twitter wording.
    Do NOT reuse the same sentences, metaphors, or CTA between X, LinkedIn, and Instagram.
    Before finalizing the JSON bundle, confirm every platform copy reads noticeably different; if any appear similar, rewrite while keeping the specified tone and length.
  `;
};

type HardLengthTarget = {
  label: string;
  rangeDescription: string;
  note?: string;
  min?: number;
  max?: number;
  unit?: "characters" | "words";
};

const RELATIVE_LENGTH_PERCENTAGES: Record<string, [number, number]> = {
  short: [0.25, 0.4],
  medium: [0.45, 0.65],
  long: [0.7, 0.95],
};

const TWITTER_LENGTH_CONFIG: Record<string, { min: number; max: number }> = {
  short: { min: 90, max: 140 },
  medium: { min: 150, max: 220 },
  long: { min: 220, max: 280 },
};

const INSTAGRAM_WORD_CONFIG: Record<
  string,
  { min: number; max: number; sentences: string }
> = {
  short: { min: 50, max: 90, sentences: "2-3 sentences" },
  medium: { min: 100, max: 140, sentences: "4-6 sentences" },
  long: { min: 150, max: 200, sentences: "6-8 sentences" },
};

const GOOGLE_MAP_LENGTH_CONFIG: Record<
  string,
  { jp: string; en: string; sentences: string }
> = {
  short: { jp: "60-120", en: "20-40", sentences: "1-2 sentences" },
  medium: { jp: "120-220", en: "40-80", sentences: "3-4 sentences" },
  long: { jp: "220-400", en: "80-140", sentences: "5-7 sentences" },
};

const getRelativeLengthRange = (
  maxChars: number,
  lengthOption: string
): { min: number; max: number } => {
  const percentages = RELATIVE_LENGTH_PERCENTAGES[lengthOption] || [0.45, 0.65];
  const min = Math.max(1, Math.ceil(maxChars * percentages[0]));
  const max = Math.min(
    maxChars,
    Math.max(min, Math.floor(maxChars * percentages[1]))
  );
  return { min, max };
};

const buildHardLengthInstruction = (
  targets: HardLengthTarget[],
  extra?: string
): string => {
  const targetLines = targets
    .map((target) => {
      const note = target.note ? ` (${target.note})` : "";
      return `  TARGET RANGE (${target.label}): ${target.rangeDescription}${note}`;
    })
    .join("\n");
  const rewriteReminder =
    "  MUST REWRITE IF OUT OF RANGE: If the result slips outside these ranges, rewrite while preserving the chosen Humor/Emotion tone and platform hard limits; lengthOption dictates structure, not the other way around.";
  return `
    [HARD LENGTH TARGET]
${targetLines}
${rewriteReminder}
${extra ? `\n${extra}` : ""}
  `;
};

const getPlatformHardLengthTarget = (
  platformId: string,
  lengthOption: string,
  language: string,
  strategy: PlatformStrategy,
  allowPremiumLong: boolean
): HardLengthTarget => {
  if (platformId === "twitter") {
    const baseRange = TWITTER_LENGTH_CONFIG[lengthOption] || {
      min: 150,
      max: 220,
    };
    const max =
      allowPremiumLong && lengthOption === "long" ? 4000 : baseRange.max;
    return {
      label: strategy.name,
      rangeDescription: `${baseRange.min}-${max} characters`,
      min: baseRange.min,
      max,
      unit: "characters",
    };
  }

  if (platformId === "instagram") {
    const config =
      INSTAGRAM_WORD_CONFIG[lengthOption] || INSTAGRAM_WORD_CONFIG.medium;
    return {
      label: strategy.name,
      rangeDescription: `${config.min}-${config.max} words`,
      note: config.sentences,
      min: config.min,
      max: config.max,
      unit: "words",
    };
  }

  if (platformId === "googlemap") {
    const config =
      GOOGLE_MAP_LENGTH_CONFIG[lengthOption] || GOOGLE_MAP_LENGTH_CONFIG.medium;
    return {
      label: strategy.name,
      rangeDescription: `${config.jp} Japanese characters or ${config.en} English words`,
      note: `${config.sentences} (match the guidance above for ${language}).`,
    };
  }

  const relativeRange = getRelativeLengthRange(strategy.maxChars, lengthOption);
  return {
    label: strategy.name,
    rangeDescription: `${relativeRange.min}-${relativeRange.max} characters`,
    min: relativeRange.min,
    max: relativeRange.max,
    unit: "characters",
  };
};

const getHardLengthTargets = (
  platformId: string,
  lengthOption: string,
  language: string,
  strategy: PlatformStrategy,
  allowPremiumLong: boolean
): string => {
  if (platformId === "multi") {
    const twitterTarget = getPlatformHardLengthTarget(
      "twitter",
      lengthOption,
      language,
      STRATEGIES.twitter,
      allowPremiumLong
    );
    const instagramTarget = getPlatformHardLengthTarget(
      "instagram",
      lengthOption,
      language,
      STRATEGIES.instagram,
      false
    );
    const compliance = `
    Length Compliance Check:
    - twitter.text must fall within ${twitterTarget.rangeDescription}. If it exceeds, trim non-essential detail before adjusting tone; if it falls below ${twitterTarget.min} characters when long, add another concrete detail derived from the input without inventing facts.
    - instagram.caption must stay within ${instagramTarget.rangeDescription}. For short outputs that feel long, cut optional sentences first; for long outputs that feel short, expand by describing one more specific element from the request.
    - Apply these checks before emitting the JSON object so both twitter.text and instagram.caption honor the chosen lengthOption.
    `;
    return buildHardLengthInstruction(
      [twitterTarget, instagramTarget],
      compliance
    );
  }

  const target = getPlatformHardLengthTarget(
    platformId,
    lengthOption,
    language,
    strategy,
    allowPremiumLong
  );
  return buildHardLengthInstruction([target]);
};

const VARIANT_STYLE_GUIDE = (variantIndex: number): string => {
  const normalizedIndex = Math.min(Math.max(variantIndex, 1), 3);
  const labels = ["A", "B", "C"];
  const variantDescriptions = [
    `Variant A (「結論→根拠→行動」型): begin with a clear conclusion or takeaway in the first line, follow with the reason/appeal, and end with a direct CTA. Avoid bullet lists (use them only if truly necessary). Keep the tone unchanged while keeping each sentence lean and readable.`,
    `Variant B (「ベネフィット→具体→証拠」型): start by highlighting the customer benefit, then add one more concrete detail drawn from the input (ingredient, time, quantity, or process) before closing with evidence/trust plus a CTA. Maintain the same tone and refrain from inventing facts.`,
    `Variant C (「ミニ場面描写→こだわり→ひとこと」型): open with a short scene-setting line (weather, prep moment, shop vibe), transition to the shop's dedication/detail, and finish with a gentle closing. Let rhythm and line breaks create the distinction while keeping the tone consistent.`,
  ];
  const commonInstructions = `
Do NOT change the humor/emotion settings. Do NOT increase/decrease emoji usage beyond what the Tone settings already require.
Respect the lengthOption and platform hard limits; do not expand or shorten beyond the current length guide.
LengthOption is the highest priority; do not vary overall length for differentiation—use structure, rhythm, and sentence placement alone.
Ensure each variant has a different opening line, information order, and closing/CTA; avoid reusing the same phrasing, metaphor, or punctuation rhythm across the outputs.
Before finalizing, verify the variants differ in structure, opening, and closing/CTA. If they are too similar, rewrite them while preserving the tone and length constraints described above.
  `;
  const variantLabel = labels[normalizedIndex - 1];
  const variantText = variantDescriptions[normalizedIndex - 1];
  return `
    [VARIANT ${variantLabel} STYLE GUIDE]
    ${variantText}
${commonInstructions}
  `;
};

const getIntentInstruction = (intent: string): string => {
  // NOTE:
  // - SNS向け intent は 4種 (promotion / educational / story / engagement)
  // - Google Map は GOOGLE_MAP_INTENT_IDS.* を使う
  // - intent が空 or default の場合は「自動」扱い（強い型指定をしない）

  // ---- SNS intents (4) ----
  const SNS_INTENTS: Record<string, string> = {
    promotion: `
[Post Intent: Promotion / 宣伝・告知]
Goal: Drive action (visit / reservation / purchase / inquiry) without sounding pushy.
Must include:
- What: what is offered (menu/service/event)
- Why now: a concrete, non-fake reason (limited quantity, seasonal, today-only, new arrival, etc.) ONLY if supported by user input; otherwise omit urgency.
- CTA: a simple next step (e.g., "ご予約はプロフィールから", "本日もお待ちしております", "気になったら保存してね")
Structure:
1) Hook (1 line)
2) Details (2-4 lines)
3) CTA (1 line)
Avoid:
- Inventing discounts, dates, limited offers not in user input.
      - Avoid overly corporate language; stay friendly and conversational.
`,

    educational: `
[Post Intent: Educational / 豆知識・コツ]
Goal: Provide genuinely useful tips that improve trust and save the owner’s time.
Must include:
- 2–5 practical tips OR a mini checklist
- Simple explanation ("なぜそれが効くか" を1行)
- End with a soft CTA (save/share/comment is okay, no hard selling)
Structure:
1) Hook: problem statement or promise
2) Tips: bullet points preferred (platform-appropriate)
3) Wrap-up: one-line summary + soft CTA
Avoid:
- Generic vague advice with no actionable steps.
- Medical/legal claims or guarantees.
`,

    story: `
[Post Intent: Story / 日常・裏側]
Goal: Humanize the shop/owner; build familiarity and brand warmth.
Must include:
- A small scene from daily work (prep, behind-the-scenes, a tiny episode)
- One specific detail (ingredient, tool, moment, short dialogue, weather, etc.)
- A gentle close (no hard CTA; "今日もお待ちしてます" 程度はOK)
Structure:
1) Scene (1–2 lines)
2) Detail + feeling (2–4 lines)
3) Soft close (1 line)
Avoid:
- Turning it into an ad copy. This is not a promotion post.
`,

    engagement: `
[Post Intent: Engagement / 問いかけ]
Goal: Generate comments with a clear, easy-to-answer prompt.
Must include:
- One clear question OR a 2-choice poll
- Provide context so the audience can answer without thinking hard
- Encourage reply ("コメントで教えて", "どっち派？" etc.)
Structure:
1) Setup (1–2 lines)
2) Question (1 line, explicit "?" or Japanese question ending)
3) Nudge to comment (1 line)
Examples of question styles:
- 2択: "A派？B派？"
- 予想: "どっちだと思う？"
- 体験共有: "おすすめの◯◯ある？"
Avoid:
- Asking multiple unrelated questions.
- Questions that require private info or off-platform actions.
`,
  };

  if (SNS_INTENTS[intent]) return SNS_INTENTS[intent];

  // ---- Google Map intents (existing) ----
  switch (intent) {
    case GOOGLE_MAP_INTENT_IDS.THANK_YOU:
      return "\n[Post Intent: Google Map — Thank You]\nRespond with gratitude, reference the positive points in the review, and close with a warm welcome back.";
    case GOOGLE_MAP_INTENT_IDS.APOLOGY:
      return "\n[Post Intent: Google Map — Apology]\nApologize sincerely, acknowledge the issues raised, and assure the reviewer you are addressing them.";
    case GOOGLE_MAP_INTENT_IDS.ANSWER:
      return "\n[Post Intent: Google Map — Question Answer]\nThank the reviewer for their question, restate it briefly, and provide a clear, helpful answer.";
    case GOOGLE_MAP_INTENT_IDS.AUTO:
      return "\n[Post Intent: Google Map — Auto]\nDetermine whether the review is praise, a complaint, or a question, then use the structure for that scenario.";
    default:
      // default / empty / unknown => no additional intent constraint
      // (UI側で「指定なし」を消しても、ここで落ちない)
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
  PROHIBITED: Do not invent promotions, discounts, or specific campaign dates that are not in the user input.
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

const getStructureInstruction = (
  platformId: string,
  intent: string
): string => {
  if (platformId !== "googlemap") return "";
  return (
    STRUCTURE_INSTRUCTIONS[intent] ||
    STRUCTURE_INSTRUCTIONS[GOOGLE_MAP_INTENT_IDS.AUTO]
  );
};

const ensureOpenAIKey = (): OpenAI => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("Missing OPENAI_API_KEY in environment variables.");
  }
  return new OpenAI({ apiKey: key });
};

const buildSystemInstruction = (
  strategyInstruction: string,
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
  premiumLongInstruction: string
): string => {
  return (
    strategyInstruction +
    perspectiveInstruction +
    intentInstruction +
    moodInstruction +
    lengthInstruction +
    googleMapLengthInstruction +
    threadInstruction +
    videoInstruction +
    languageInstruction +
    googleMapContextInstruction +
    structureInstruction +
    customUserInstruction +
    premiumLongInstruction
  );
};

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
  const openai = ensureOpenAIKey();

  if (platformId === "multi" && !isPro) {
    throw new Error("Pro Plan Required for Multi-Post (All) feature.");
  }

  const strategy = STRATEGIES[platformId];
  if (!strategy) throw new Error(`Invalid platform selected: ${platformId}`);

  const modelName = "gpt-4.1-mini";
  console.log(
    `[Snippet2Social] Generating: model=${modelName}, platform=${platformId}, persona=official-business`
  );

  const perspectiveInstruction = getPerspectiveInstruction();
  const intentInstruction = getIntentInstruction(postIntent);
  const moodInstruction = getMoodInstruction(
    platformId,
    humorLevel,
    emotionLevel
  );
  const premiumLongActive = platformId === "twitter" && isPremiumLongPost;
  const lengthInstruction = getLengthInstruction(
    lengthOption,
    platformId,
    premiumLongActive
  );
  const googleMapLengthInstruction =
    platformId === "googlemap"
      ? getGoogleMapLengthInstruction(lengthOption)
      : "";
  const threadInstruction =
    platformId === "twitter" ? getThreadInstruction(isThreadMode) : "";
  const videoInstruction =
    platformId === "tiktok" ? getVideoInstruction(isLongVideo) : "";
  const languageInstruction = `
[LANGUAGE]
Output must be written entirely in ${language}.
Do not mix other languages. Do not include translations or bilingual parentheses unless the user explicitly asks.
`;
  const googleMapContextInstruction =
    platformId === "googlemap" ? GOOGLE_MAP_CONTEXT_INSTRUCTION : "";
  const structureInstruction = getStructureInstruction(platformId, postIntent);
  const customUserInstruction =
    isPro && customInstruction.trim()
      ? `\n\n[IMPORTANT USER INSTRUCTION]: ${customInstruction.trim()}`
      : "";
  const premiumLongInstruction =
    platformId === "twitter"
      ? getPremiumLongInstruction(premiumLongActive)
      : "";

  const baseSystemInstruction = buildSystemInstruction(
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
    premiumLongInstruction
  );
  const multiLengthGuidanceSegment =
    platformId === "multi"
      ? getMultiLengthGuidance(lengthOption, premiumLongActive)
      : "";
  const multiDistinctInstructionSegment =
    platformId === "multi"
      ? getMultiPlatformDistinctionInstruction(premiumLongActive)
      : "";
  const multiOutputRequirements =
    platformId === "multi"
      ? `
      \n[MULTI-PLATFORM OUTPUT REQUIREMENTS]
      You must provide distinct content for Twitter, LinkedIn, and Instagram.
      All outputs should sound like the official shop account, using "we", "our", or "I (the owner/staff)" as the speaker.
      - Twitter: Viral thread or high-impact tweet.
      - LinkedIn: Professional and insight-driven.
      - Instagram: Engaging caption with emojis.

      OUTPUT FORMAT: Strictly valid JSON.
    `
      : "";
  const hardLengthInstructionSegment = getHardLengthTargets(
    platformId,
    lengthOption,
    language,
    strategy,
    premiumLongActive
  );

  const antiThirdPersonSegment = getAntiThirdPersonGuardrails();
  const assembleSystemInstruction = (variantIndex: number): string => {
    return [
      baseSystemInstruction,
      multiLengthGuidanceSegment,
      hardLengthInstructionSegment,
      antiThirdPersonSegment,
      multiDistinctInstructionSegment,
      VARIANT_STYLE_GUIDE(variantIndex),
      multiOutputRequirements,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const buildUserMessage = (text: string) => {
    const trimmed = text.trim();
    return `
User Input:
${trimmed}

Platform: ${strategy.name}
Length Option: ${lengthOption}
`;
  };

  const generateOnce = async (variantIndex: number = 1) => {
    try {
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: "system", content: assembleSystemInstruction(variantIndex) },
          { role: "user", content: buildUserMessage(inputText) },
        ],
        temperature: 0.7,
      });

      const text = response.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("No content generated.");
      return text;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw error;
    }
  };

  if (variantCount > 1) {
    const promises = Array.from({ length: variantCount }, (_, index) =>
      generateOnce(index + 1)
    );
    return await Promise.all(promises);
  }

  return generateOnce(variantCount >= 1 ? 1 : 1);
};

export const generatePostImage = async (
  postContent: string,
  platform: string
): Promise<string> => {
  const openai = ensureOpenAIKey();

  const imagePrompt = `
Create a single stylized visual inspired by the following social media post. Keep the art modern, cinematic, and suitable for ${platform} marketing.
Focus on clean composition, warm lighting, and subtle textual hints that reinforce the tone of the post. Output only the prompt text.

Post: ${postContent.substring(0, 800)}
`;

  const imageResponse = await openai.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    size: "1024x1024",
  });

  const b64 = imageResponse.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("Failed to generate image.");
  }

  return `data:image/png;base64,${b64}`;
};
