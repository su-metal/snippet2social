"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getOnboarding, setOnboarding } from "@/lib/onboardingStorage";

const BUSINESS_TYPES = [
  "飲食店",
  "カフェ",
  "居酒屋",
  "美容室",
  "サロン",
  "整体",
  "ジム",
  "小売",
  "その他",
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [businessType, setBusinessType] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = getOnboarding();
    if (saved) {
      setBusinessType(saved.businessType);
      setBusinessName(saved.businessName);
    }
  }, []);

  const trimmedName = businessName.trim();
  const isNameValid = trimmedName.length >= 2;
  const canSubmit = Boolean(businessType) && isNameValid && !isSaving;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setOnboarding({
      businessType,
      businessName: trimmedName,
    });
    router.replace("/");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg shadow-slate-400/20">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Misepo Onboarding</p>
          <h1 className="text-3xl font-bold text-slate-900">
            まずはお店の情報を設定してください
          </h1>
          <p className="text-sm text-slate-600">
            業種と店名は文章の精度に関わります。あとで変更できます。
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">業種</label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_TYPES.map((type) => {
                const isSelected = businessType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBusinessType(type)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? "border-brand-500 bg-brand-500/10 text-brand-600"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
            {!businessType && (
              <p className="text-[13px] text-rose-500">業種を1つ選んでください。</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">店名</label>
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="例：〇〇食堂"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-base text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="text-[13px] text-slate-500">
              2文字以上の店名を入力してください（前後の空白は自動で除去されます）。
            </p>
            {!isNameValid && (
              <p className="text-[13px] text-rose-500">店名は2文字以上必要です。</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-2xl px-4 py-3 text-center text-base font-bold text-white transition ${
              canSubmit
                ? "bg-brand-600 hover:bg-brand-700"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? "保存中..." : "保存してはじめる"}
          </button>
        </form>
      </div>
    </main>
  );
}
