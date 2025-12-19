
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Twitter, Instagram, Linkedin, Video, Sparkles, Mic, Eraser, 
  AlertCircle, ChevronDown, ChevronUp, Target, Settings, Layers, 
  Timer, Image as ImageIcon, Download, Copy, Check, Lock, 
  Crown, MessageSquareText, User, Building2, Clock, X, Trash2, History,
  Languages, Ruler, Smile, Heart, Wand2
} from 'lucide-react';
import { STRATEGIES, DEFAULT_STRATEGY_ID } from '../constants';
import { HistoryItem } from '../types';
import { Button } from '../components/Button';
import { useUser } from '../context/UserContext';

type MultiContent = { twitter: string; linkedin: string; instagram: string };
type ImageMap = Record<string, string>;
type ImageStatusMap = Record<string, 'idle' | 'loading' | 'success' | 'error'>;

const LANGUAGES = ['Japanese', 'English', 'Spanish', 'French', 'Chinese', 'Korean'];

const INTENTS = [
  { id: 'default', label: '指定なし (Default)' },
  { id: 'promotion', label: '📣 宣伝・告知 (Promotion)' },
  { id: 'story', label: '📖 ストーリー・感想 (Story)' },
  { id: 'educational', label: '💡 お役立ち情報 (Educational)' },
  { id: 'engagement', label: '❓ 問いかけ・交流 (Engagement)' },
];

export default function Home() {
  const { isPro, usageCount, maxUsage, incrementUsage } = useUser();
  const [inputText, setInputText] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [multiContent, setMultiContent] = useState<MultiContent | null>(null);
  const [activeTab, setActiveTab] = useState<'twitter' | 'linkedin' | 'instagram'>('twitter');
  
  const [images, setImages] = useState<ImageMap>({});
  const [imageStatuses, setImageStatuses] = useState<ImageStatusMap>({});
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [selectedPlatform, setSelectedPlatform] = useState(DEFAULT_STRATEGY_ID);
  const [postIntent, setPostIntent] = useState('default');
  const [isThreadMode, setIsThreadMode] = useState(false);
  const [isLongVideo, setIsLongVideo] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('Japanese');
  const [humorLevel, setHumorLevel] = useState(50);
  const [emotionLevel, setEmotionLevel] = useState(50);
  const [customInstruction, setCustomInstruction] = useState('');
  const [lengthOption, setLengthOption] = useState('medium');
  const [perspective, setPerspective] = useState('personal');
  const [variantMode, setVariantMode] = useState(false);
  const [variantResponses, setVariantResponses] = useState<string[] | null>(null);
  const [copiedVariantIndex, setCopiedVariantIndex] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isThreadLike = /[\(\[]?\d+\/\d+[\)\]]?/.test(generatedContent);
  const isThreadView = selectedPlatform === 'twitter' && (isThreadMode || isThreadLike);

  useEffect(() => {
    const saved = localStorage.getItem('s2s_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (text: string, platform: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      text,
      platform,
      perspective,
      lengthOption,
      timestamp: Date.now(),
    };
    const updatedHistory = [newItem, ...history].slice(0, 20);
    setHistory(updatedHistory);
    localStorage.setItem('s2s_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('s2s_history', JSON.stringify(updated));
  };

  const restoreHistory = (item: HistoryItem) => {
    setGeneratedContent(item.text);
    setSelectedPlatform(item.platform);
    setPerspective(item.perspective);
    setLengthOption(item.lengthOption);
    
    if (item.platform === 'multi') {
      try {
        const parsed = JSON.parse(item.text);
        setMultiContent(parsed);
        setGeneratedContent(parsed.twitter);
        setActiveTab('twitter');
      } catch (e) {
        setMultiContent(null);
      }
    } else {
      setMultiContent(null);
    }
    
    setImages({});
    setImageStatuses({});
    setStatus('success');
    setIsHistoryOpen(false);
    setTimeout(() => {
      document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const getRelativeTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return '今さっき';
    if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
    return `${Math.floor(diff / 86400)}日前`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  useEffect(() => {
    if (selectedPlatform !== 'twitter') setIsThreadMode(false);
    if (selectedPlatform !== 'tiktok') setIsLongVideo(false);
  }, [selectedPlatform]);

  const usageReached = !isPro && usageCount >= maxUsage;
  const variantOptionAvailable = isPro && selectedPlatform !== 'multi';

  useEffect(() => {
    if (!variantOptionAvailable && variantMode) {
      setVariantMode(false);
    }
  }, [variantOptionAvailable, variantMode]);

  useEffect(() => {
    if (!variantMode) {
      setVariantResponses(null);
    }
  }, [variantMode]);

  useEffect(() => {
    setCopiedVariantIndex(null);
  }, [variantResponses]);
  const getCurrentPlatformKey = () => {
    return selectedPlatform === 'multi' ? activeTab : selectedPlatform;
  };

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    if (usageReached) {
      setErrorMessage("利用制限に達しました。PROプランに切り替えて無制限に生成しましょう。");
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setGeneratedContent('');
    setMultiContent(null);
    setImages({});
    setImageStatuses({});
    setVariantResponses(null);
    setCopiedVariantIndex(null);

    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
          variantMode: variantMode && variantOptionAvailable,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? 'AI生成に失敗しました');
      }

      const { result, variants } = await response.json();
      setVariantResponses(Array.isArray(variants) ? variants : null);
      
      if (selectedPlatform === 'multi') {
        try {
          const parsed: MultiContent = JSON.parse(result);
          setMultiContent(parsed);
          setGeneratedContent(parsed.twitter);
          setActiveTab('twitter');
        } catch (e) {
          setGeneratedContent(result);
        }
      } else {
        setGeneratedContent(result);
      }
      
      saveToHistory(result, selectedPlatform);
      incrementUsage();
      setStatus('success');
      setTimeout(() => document.getElementById('result-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "エラーが発生しました");
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedContent || !isPro) return;
    
    const key = getCurrentPlatformKey();
    setImageStatuses(prev => ({ ...prev, [key]: 'loading' }));
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postContent: generatedContent,
          platform: key,
        }),
      });

      if (!response.ok) {
        setImageStatuses(prev => ({ ...prev, [key]: 'error' }));
        return;
      }

      const data = await response.json();
      if (!data?.url) {
        setImageStatuses(prev => ({ ...prev, [key]: 'error' }));
        return;
      }

      setImages(prev => ({ ...prev, [key]: data.url }));
      setImageStatuses(prev => ({ ...prev, [key]: 'success' }));
    } catch (error) {
      setImageStatuses(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyVariant = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedVariantIndex(index);
    setTimeout(() => setCopiedVariantIndex(null), 2000);
  };

  const getPlatformIcon = (id: string, size = 24) => {
    const cls = `w-${size/4} h-${size/4}`;
    switch (id) {
      case 'twitter': return <Twitter className={cls} />;
      case 'instagram': return <Instagram className={cls} />;
      case 'linkedin': return <Linkedin className={cls} />;
      case 'tiktok': return <Video className={cls} />;
      case 'multi': return <Layers className={cls} />;
      default: return <Sparkles className={cls} />;
    }
  };

  return (
    <div className="min-h-screen pb-40 animate-fade-in bg-slate-50/50">
      
      {/* 履歴サイドバー */}
      <div className={`fixed inset-0 z-50 transition-all duration-500 ${isHistoryOpen ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${isHistoryOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setIsHistoryOpen(false)} 
        />
        <div className={`absolute right-0 top-0 h-full w-full max-w-xs bg-white shadow-2xl transition-transform duration-500 transform ${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <h2 className="font-bold flex items-center gap-2 text-slate-700">
              <History size={18} className="text-brand-500" /> 
              最近の履歴
            </h2>
            <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100%-68px)] p-3 space-y-3">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400 space-y-2">
                <Clock className="w-10 h-10 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">履歴がありません</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => restoreHistory(item)}
                  className="group relative p-4 rounded-2xl border border-slate-100 bg-white hover:border-brand-200 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-slate-50 rounded-lg text-slate-500 group-hover:text-brand-500 transition-colors">
                        {getPlatformIcon(item.platform, 14)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {getRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteHistoryItem(item.id, e)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    {item.text.startsWith('{') ? '【マルチプラットフォーム一括生成】' : item.text}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
            <Sparkles size={18}/>
          </div>
          <h1 className="font-bold text-lg tracking-tight">Snippet2Social</h1>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 rounded-xl transition-all relative group"
            title="履歴"
          >
            <Clock size={22} />
            {history.length > 0 && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand-500 rounded-full border-2 border-white" />}
          </button>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-tight transition-all duration-300 ${isPro ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
            {isPro ? (
              <div className="flex items-center gap-1">
                <Crown className="w-3 h-3 text-amber-500" />
                <span>PRO</span>
              </div>
            ) : (
              <span>FREE ({usageCount}/{maxUsage})</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        {/* Step 1: Platform Selection */}
        <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 ring-1 ring-slate-900/5 animate-slide-up">
          <label className="text-xs font-bold text-slate-400 uppercase mb-4 block tracking-widest px-1">1. 配信プラットフォーム</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {Object.values(STRATEGIES).map(s => {
              const isLocked = s.id === 'multi' && !isPro;
              const isSelected = selectedPlatform === s.id;
              return (
                <button 
                  key={s.id} 
                  onClick={() => {
                    if (isLocked) return alert("マルチポスト機能はPROプラン専用です。");
                    setSelectedPlatform(s.id);
                  }} 
                  className={`relative flex flex-col items-center py-3.5 rounded-2xl border transition-all duration-300 ${isSelected ? 'bg-brand-600 border-brand-600 text-white shadow-xl shadow-brand-500/20 scale-105 z-10' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-brand-300 hover:bg-white'} ${isLocked ? 'opacity-70 grayscale' : ''}`}
                >
                  {getPlatformIcon(s.id)}
                  <span className="text-[10px] font-bold text-center mt-1">{s.name}</span>
                  {isLocked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-slate-400" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Input Textarea */}
        <section className="space-y-3 animate-slide-up">
          <label className="text-xs font-bold text-slate-400 uppercase block tracking-widest px-1">2. メモ・下書き入力</label>
          <div className="relative group">
            <textarea 
              ref={textareaRef} 
              value={inputText} 
              onChange={e => setInputText(e.target.value)} 
              placeholder="ここに思考の断片やメモを入力してください..." 
              className="w-full min-h-[160px] p-6 text-lg bg-white border border-slate-200 rounded-[2rem] focus:ring-8 focus:ring-brand-500/5 focus:border-brand-500 outline-none resize-none transition-all shadow-sm" 
              disabled={status === 'loading'} 
            />
            <div className="absolute bottom-5 right-5 flex gap-2">
              {inputText && (
                <button 
                  onClick={() => setInputText('')} 
                  className="p-3 text-slate-400 hover:text-red-500 bg-white rounded-full shadow-md border border-slate-100 transition-all hover:scale-110 active:scale-95"
                  title="入力をクリア"
                >
                  <Eraser size={20}/>
                </button>
              )}
              <button className="p-3 text-slate-400 hover:text-brand-600 bg-white rounded-full shadow-md border border-slate-100 transition-all hover:scale-110 active:scale-95">
                <Mic size={20}/>
              </button>
            </div>
          </div>
        </section>

        {/* Step 3: Options */}
        <section className="space-y-6 animate-slide-up">
          {/* Post Intent Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase block tracking-widest px-1 flex items-center gap-2">
              <Target size={14} /> 3. 投稿の目的
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INTENTS.map((intent) => (
                <button
                  key={intent.id}
                  onClick={() => setPostIntent(intent.id)}
                  className={`px-4 py-3.5 rounded-2xl border text-sm font-bold text-left transition-all ${postIntent === intent.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  {intent.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings Accordion */}
          <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm shadow-slate-200/50">
            <button 
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                  <Settings size={18} />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-slate-700 tracking-tight">詳細オプション設定</h3>
                  <p className="text-[10px] text-slate-400 font-medium">トーン、長さ、視点、追加指示など</p>
                </div>
              </div>
              {isAdvancedOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>

            <div className={`transition-all duration-300 ease-in-out ${isAdvancedOpen ? 'max-h-[1200px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <div className="p-6 space-y-8">
                {/* Language & Length */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Languages size={12}/> 出力言語</label>
                    <select 
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Ruler size={12}/> コンテンツの長さ</label>
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                      {['short', 'medium', 'long'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setLengthOption(opt)}
                          className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${lengthOption === opt ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Perspective */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={12}/> 発信者視点</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPerspective('personal')}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${perspective === 'personal' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <User size={18} />
                      <div className="text-left">
                        <div className="text-xs font-bold">個人・ユーザー</div>
                        <div className="text-[9px] opacity-70">個人の感想・レビュー</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => setPerspective('business')}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${perspective === 'business' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <Building2 size={18} />
                      <div className="text-left">
                        <div className="text-xs font-bold">公式・ビジネス</div>
                        <div className="text-[9px] opacity-70">企業のアナウンス・宣伝</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Humor & Emotion Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Smile size={12}/> ユーモアレベル</label>
                      <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{humorLevel}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={humorLevel}
                      onChange={(e) => setHumorLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase">
                      <span>真面目</span>
                      <span>爆笑</span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Heart size={12}/> 感情・共感レベル</label>
                      <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{emotionLevel}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" value={emotionLevel}
                      onChange={(e) => setEmotionLevel(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-slate-300 uppercase">
                      <span>論理的</span>
                      <span>感情的</span>
                    </div>
                  </div>
                </div>

                {/* Special Modes (Conditional) */}
                {(selectedPlatform === 'twitter' || selectedPlatform === 'tiktok') && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">プラットフォーム専用モード</h4>
                    {selectedPlatform === 'twitter' && (
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                            <Layers size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-700">スレッド形式で生成</div>
                            <p className="text-[9px] text-slate-400">長文を複数の連投ツイートに分割します</p>
                          </div>
                        </div>
                        <input type="checkbox" checked={isThreadMode} onChange={() => setIsThreadMode(!isThreadMode)} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                    )}
                    {selectedPlatform === 'tiktok' && (
                      <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-500 transition-colors">
                            <Timer size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-700">3分長尺スクリプト</div>
                            <p className="text-[9px] text-slate-400">より深い解説や教育的な動画構成にします</p>
                          </div>
                        </div>
                        <input type="checkbox" checked={isLongVideo} onChange={() => setIsLongVideo(!isLongVideo)} className="w-5 h-5 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                      </label>
                    )}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-4 py-3 bg-white/70 border border-slate-100 rounded-2xl shadow-sm">
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">3パターン生成</p>
                      <p className="text-[11px] text-slate-400">
                        PRO限定で同じ条件から別表現の候補を3つ受け取れます（マルチプラットフォーム選択時は無効）。
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variantMode}
                        disabled={!variantOptionAvailable}
                        onChange={() => setVariantMode(!variantMode)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${variantMode ? 'text-brand-600' : 'text-slate-500'}`}>
                        {variantMode ? 'ON' : 'OFF'}
                      </span>
                    </label>
                  </div>
                  {!variantOptionAvailable && (
                    <p className="text-[11px] text-amber-600">
                      PROかつ単一プラットフォーム選択時のみ利用可能です。
                    </p>
                  )}
                </div>

                {/* Custom Instruction (Pro Only) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wand2 size={12}/> AIへの追加注文 (Custom Prompt)</label>
                    {!isPro && <div className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-black uppercase flex items-center gap-1"><Lock size={8}/> PRO</div>}
                  </div>
                  <div className="relative">
                    <textarea 
                      value={customInstruction}
                      onChange={(e) => setCustomInstruction(e.target.value)}
                      placeholder={isPro ? "例：専門用語は避けて、中学生にもわかるように説明して。語尾は『〜だね』で統一して。" : "PROプランで利用可能です。特定の口調の指定や、強調したいポイントの指示ができます。"}
                      disabled={!isPro}
                      className={`w-full h-24 p-4 text-xs font-medium rounded-xl border outline-none transition-all ${isPro ? 'bg-slate-50 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/5' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed italic'}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status Area */}
        {status === 'error' && (
          <div className="p-5 bg-red-50 text-red-600 rounded-[2rem] border border-red-100 shadow-sm flex items-start gap-3 animate-slide-up">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-sm">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Result Area */}
        {(status === 'success' || generatedContent) && (
          <div id="result-section" className="space-y-8 animate-fade-in duration-700">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI生成された投稿</h2>
              <span className={`text-[10px] px-3 py-1 rounded-full font-bold shadow-sm ${isPro ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
                {STRATEGIES[selectedPlatform].name}
              </span>
            </div>

            {/* Multi-Post Tabs */}
            {selectedPlatform === 'multi' && multiContent && (
              <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5">
                {(['twitter', 'linkedin', 'instagram'] as const).map((tab) => (
                  <button 
                    key={tab} 
                    onClick={() => {
                      setActiveTab(tab);
                      setGeneratedContent(multiContent[tab]);
                    }} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-bold uppercase rounded-xl transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {getPlatformIcon(tab, 14)}
                    {tab}
                  </button>
                ))}
              </div>
            )}
            
            {/* Content Card */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-2xl shadow-slate-200 ring-1 ring-slate-900/5">
              <div className="p-2">
                <ResultArea 
                  content={generatedContent} 
                  setContent={setGeneratedContent} 
                  isThreadView={isThreadView} 
                />
              </div>
              
              <div className="p-4 bg-slate-50/80 backdrop-blur-sm border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-bold text-slate-400">
                   <MessageSquareText size={14}/>
                   <span>{generatedContent.length} chars</span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleCopy} 
                    icon={copied ? <Check size={16}/> : <Copy size={16}/>} 
                    className={`text-[10px] font-black h-11 px-6 bg-white border border-slate-200 transition-all ${copied ? 'text-green-600 border-green-200 bg-green-50' : ''}`}
                  >
                    {copied ? 'COPIED!' : 'COPY ALL'}
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={handleGenerateImage} 
                    disabled={!isPro} 
                    icon={!isPro ? <Lock size={18}/> : <ImageIcon size={18}/>} 
                    className={`text-[10px] px-6 h-11 border shadow-sm transition-all ${!isPro ? 'opacity-50 grayscale cursor-not-allowed border-slate-200 text-slate-400' : 'bg-brand-50 text-brand-700 border-brand-100 hover:bg-brand-100'}`}
                  >
                    {isPro ? 'AIビジュアル作成' : '画像生成 (PRO)'}
                  </Button>
                </div>
              </div>
            </div>

            {variantResponses?.length ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">他の提案 (Pro)</h3>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-600">VARIANT MODE</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {variantResponses.map((variant, index) => (
                    <div key={`variant-${index}`} className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                          VAR-{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyVariant(variant, index)}
                          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 rounded-full border border-slate-200 px-3 py-1 transition-colors hover:border-brand-200 hover:text-brand-600"
                        >
                          <Copy className="w-3 h-3" />
                          {copiedVariantIndex === index ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
                        {variant}
                      </p>
                      {index === 0 && (
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">上部の結果はこのバリエーションです。</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Generated Image Card */}
            {imageStatuses[getCurrentPlatformKey()] && (
              <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden ring-1 ring-slate-900/5 animate-slide-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-700">AIビジュアル</h3>
                      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{getCurrentPlatformKey()} Optimized</p>
                    </div>
                  </div>
                  {images[getCurrentPlatformKey()] && (
                    <a 
                      href={images[getCurrentPlatformKey()]} 
                      download={`s2s-image-${Date.now()}.png`}
                      className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 transition-all active:scale-90"
                    >
                      <Download size={20} />
                    </a>
                  )}
                </div>
                <div className="aspect-square bg-slate-100 relative group overflow-hidden">
                  {imageStatuses[getCurrentPlatformKey()] === 'loading' ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 animate-pulse">
                      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <span className="text-xs font-black text-brand-700 uppercase tracking-widest">描画中...</span>
                    </div>
                  ) : imageStatuses[getCurrentPlatformKey()] === 'success' ? (
                    <img 
                      src={images[getCurrentPlatformKey()]} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                      alt="AI Generated Social Media Visual"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-red-50">
                      <AlertCircle size={40} className="text-red-300 mb-4" />
                      <p className="text-sm font-bold text-red-600">画像の生成に失敗しました。</p>
                      <button onClick={handleGenerateImage} className="mt-4 text-[10px] font-black text-red-700 uppercase border-b-2 border-red-200 pb-1">再試行する</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Global Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-slate-200 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-2xl mx-auto flex gap-4">
          <Button 
            className={`flex-1 py-5 text-xl font-black rounded-[2rem] shadow-2xl transition-all duration-300 active:scale-95 ${usageReached ? 'opacity-50 grayscale cursor-not-allowed bg-slate-400 shadow-none' : isPro ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30'}`} 
            onClick={handleGenerate} 
            isLoading={status === 'loading'} 
            disabled={!inputText.trim() || usageReached} 
            icon={usageReached ? <Lock size={24}/> : (isPro ? <Crown size={24}/> : <Sparkles size={24}/>)}
          >
            {usageReached ? '生成回数制限' : status === 'loading' ? '編集中...' : `投稿を生成 (${isPro ? 'Pro' : 'Flash'})`}
          </Button>
        </div>
      </footer>
    </div>
  );
}

const ResultArea = ({ content, setContent, isThreadView }: { content: string; setContent: (s: string) => void; isThreadView: boolean; }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const getThreadParts = (text: string) => {
    return text
      .split(/(?=(?:^|\n)(?:\d+[\/.]\d+|\[\d+\/\d+\]))/)
      .map(t => t.trim())
      .map(t => t.replace(/^(?:\d+[\/.]\d+|\[\d+\/\d+\])\.?\s*/, ''))
      .filter(Boolean);
  };

  if (isThreadView) {
    const parts = getThreadParts(content);
    return (
      <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar bg-slate-50/50 rounded-[2rem]">
        {parts.map((part, index) => (
          <div key={index} className="flex gap-4 group">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black shadow-sm z-10 shrink-0">
                {index + 1}
              </div>
              {index < parts.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm p-5 hover:border-brand-500 transition-all hover:shadow-lg">
              <textarea
                value={part}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = e.target.value;
                  setContent(newParts.join('\n\n'));
                }}
                className="w-full text-base leading-relaxed text-slate-700 bg-transparent outline-none resize-none font-medium h-32"
              />
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                 <div className="flex items-center gap-2">
                   <div className={`w-1 h-1 rounded-full ${part.length > 280 ? 'bg-red-500' : 'bg-brand-500'}`} />
                   <span className={`text-[9px] font-black ${part.length > 280 ? 'text-red-500' : 'text-slate-400'}`}>{part.length} / 280</span>
                 </div>
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(part);
                     setCopiedIndex(index);
                     setTimeout(() => setCopiedIndex(null), 2000);
                   }}
                   className={`p-2 rounded-xl transition-all ${copiedIndex === index ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-brand-600 bg-slate-50'}`}
                 >
                   {copiedIndex === index ? <Check size={16}/> : <Copy size={16}/>}
                 </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      className="w-full h-[500px] p-8 text-lg leading-relaxed text-slate-800 bg-white outline-none resize-none font-medium"
      placeholder="AIが生成した投稿がここに表示されます..."
    />
  );
};
