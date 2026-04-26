import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Send, Image as ImageIcon, CheckCircle, TrainFront, Briefcase, AlignLeft, CloudRain, Sun, Cloud, Snowflake, Moon, HelpCircle, MoreHorizontal, CloudLightning, Database, Trash2, RefreshCw, XCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...classes: ClassValue[]) => twMerge(clsx(classes));

type FormData = {
  date: string;
  outboundWeather: string;
  outboundRainLevel: string;
  outboundWeatherOther: string;
  inboundWeather: string;
  inboundRainLevel: string;
  inboundWeatherOther: string;
  overallScore: number;
  workScore: number;
  commuteType: 'commuted' | 'wentOut' | 'none';
  outboundSat: 'yes' | 'no' | 'none';
  outboundStation: string;
  outboundDelay: 'yes' | 'no';
  outboundDelayMins: string;
  outboundDelayOther: string;
  inboundSat: 'yes' | 'no' | 'none';
  inboundStation: string;
  inboundDelay: 'yes' | 'no';
  inboundDelayMins: string;
  inboundDelayOther: string;
  unpleasantEvents: string;
  diary: string;
};

type BatchFile = {
  id: string;
  file: File;
  preview: string;
  inferredDate: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  message?: string;
  base64Data?: string;
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function App() {
  const [sleepImageBase64, setSleepImageBase64] = useState<string | null>(null);
  const [sleepFileName, setSleepFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { register, handleSubmit, watch, control, setValue } = useForm<FormData>({
    defaultValues: {
      date: getTodayString(),
      overallScore: 70,
      workScore: 70,
      commuteType: 'commuted',
      outboundDelay: 'no',
      outboundDelayMins: '5',
      inboundDelay: 'no',
      inboundDelayMins: '5',
      outboundWeather: '',
      outboundRainLevel: '0',
      outboundWeatherOther: '嵐',
      inboundWeather: '',
      inboundRainLevel: '0',
      inboundWeatherOther: '嵐'
    }
  });

  const watchCommuteType = watch('commuteType');
  const watchOutboundSat = watch('outboundSat');
  const watchInboundSat = watch('inboundSat');
  const watchOutboundDelay = watch('outboundDelay');
  const watchInboundDelay = watch('inboundDelay');
  const watchOutboundMins = watch('outboundDelayMins');
  const watchInboundMins = watch('inboundDelayMins');
  const watchOutboundWeather = watch('outboundWeather');
  const watchInboundWeather = watch('inboundWeather');

  useEffect(() => {
    const isCommuting = watchCommuteType === 'commuted' || watchCommuteType === 'wentOut';
    if (isCommuting) {
      if (watchOutboundWeather === '不明') setValue('outboundWeather', '');
      if (watchInboundWeather === '不明') setValue('inboundWeather', '');
    }
  }, [watchCommuteType, watchOutboundWeather, watchInboundWeather, setValue]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSleepFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSleepImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!data.outboundWeather || !data.inboundWeather) {
      alert("天気を必ずどちらも選択してください。");
      return;
    }
    setIsSubmitting(true);
    try {
      const getFormattedWeather = (w: string, r: string, o: string) => {
        if (w === 'その他') return o || 'その他';
        if (w === '雨') return r ? `雨(Lv${r})` : '雨';
        return w;
      };
      const isCommuting = data.commuteType === 'commuted' || data.commuteType === 'wentOut';
      const outLabel = isCommuting ? '行き' : '午前';
      const inLabel = isCommuting ? '帰り' : '午後';
      const weatherStr = `${outLabel}: ${getFormattedWeather(data.outboundWeather, data.outboundRainLevel, data.outboundWeatherOther)} / ${inLabel}: ${getFormattedWeather(data.inboundWeather, data.inboundRainLevel, data.inboundWeatherOther)}`;

      const payload = {
        date: data.date,
        weather: weatherStr,
        overallScore: data.overallScore,
        workScore: data.workScore,
        commuteType: data.commuteType === 'commuted' ? '通勤あり' : data.commuteType === 'wentOut' ? '外出あり' : '外出なし',
        outboundSat: data.outboundSat === 'yes' ? 'はい' : data.outboundSat === 'no' ? 'いいえ' : '移動なし',
        outboundStation: data.outboundSat === 'yes' ? data.outboundStation : '',
        outboundDelay: data.outboundDelay === 'yes' ? (data.outboundDelayMins === 'その他' ? (data.outboundDelayOther || 'その他') : `${data.outboundDelayMins}分`) : 'なし',
        inboundSat: data.inboundSat === 'yes' ? 'はい' : data.inboundSat === 'no' ? 'いいえ' : '移動なし',
        inboundStation: data.inboundSat === 'yes' ? data.inboundStation : '',
        inboundDelay: data.inboundDelay === 'yes' ? (data.inboundDelayMins === 'その他' ? (data.inboundDelayOther || 'その他') : `${data.inboundDelayMins}分`) : 'なし',
        unpleasantEvents: data.unpleasantEvents,
        diary: data.diary,
        sleepImage: sleepImageBase64
      };

      const url = import.meta.env.VITE_GAS_URL;
      if (!url) {
        alert("GAS URL is not set in environment variables!");
        setIsSubmitting(false);
        return;
      }

      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      const result = await res.json();
      if (result.status === 'success') {
        setIsSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert("送信エラー: " + result.message);
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const url = import.meta.env.VITE_GAS_URL;
      if (!url) {
        alert("GAS URL is not set in environment variables!");
        return;
      }
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ action: 'analyze' }),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      const result = await res.json();
      if (result.status === 'success') {
        setAnalysisResult(result.report);
      } else {
        alert("分析エラー: " + result.message);
      }
    } catch (e) {
      alert("通信エラーが発生しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newBatchFiles: BatchFile[] = await Promise.all(
        filesArray.map(async (file) => {
          const id = Math.random().toString(36).substring(7);
          const preview = URL.createObjectURL(file);
          // 最終更新日時から日付を推測 (例: 2026-04-26)
          const d = new Date(file.lastModified);
          const inferredDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          return new Promise<BatchFile>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve({
                id,
                file,
                preview,
                inferredDate,
                status: 'pending',
                base64Data: reader.result as string
              });
            };
            reader.readAsDataURL(file);
          });
        })
      );
      setBatchFiles((prev) => [...prev, ...newBatchFiles]);
    }
    e.target.value = '';
  };

  const removeBatchFile = (id: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateBatchFileDate = (id: string, newDate: string) => {
    setBatchFiles(prev => prev.map(f => f.id === id ? { ...f, inferredDate: newDate } : f));
  };

  const startBatchRecovery = async () => {
    if (batchFiles.length === 0) return;
    setIsBatchProcessing(true);
    
    const url = import.meta.env.VITE_GAS_URL;
    if (!url) {
      alert("GAS URL is not set!");
      setIsBatchProcessing(false);
      return;
    }

    // 1件ずつ直列で処理
    for (let i = 0; i < batchFiles.length; i++) {
      const bf = batchFiles[i];
      if (bf.status === 'success') continue; // すでに成功しているものはスキップ

      setBatchFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'uploading' } : f));

      try {
        const payload = {
          action: 'recover_sleep_data',
          date: bf.inferredDate,
          sleepImage: bf.base64Data
        };

        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const result = await res.json();
        
        if (result.status === 'success') {
          setBatchFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'success', message: '修復完了' } : f));
        } else {
          setBatchFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'error', message: result.message || 'エラー' } : f));
        }
      } catch (e) {
        setBatchFiles(prev => prev.map(f => f.id === bf.id ? { ...f, status: 'error', message: '通信エラー' } : f));
      }
      
      // レート制限やサーバー負荷を考慮して1秒待機
      await new Promise(r => setTimeout(r, 1000));
    }
    
    setIsBatchProcessing(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">記録完了！</h1>
        <p className="text-slate-400">今日もお疲れ様でした！AIが睡眠データと合わせてデータを蓄積します。</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-8 px-6 py-2 bg-slate-800 text-slate-300 rounded-full hover:bg-slate-700 transition"
        >
          新しく記録する
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-8 animate-in fade-in duration-500">
      <header className="mb-2">
        <h1 className="text-3xl font-black tracking-tight bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">Daily Sync</h1>
        <div className="mt-2 flex items-center gap-2">
          <input 
            type="date" 
            {...register('date')}
            className="bg-transparent text-slate-300 text-sm font-medium border-b border-slate-700 focus:border-indigo-500 outline-none pb-1"
          />
          <span className="text-slate-400 text-sm">の記録</span>
        </div>
      </header>
      
      {/* AI ダッシュボード */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <span className="text-lg">📊</span> 過去直近データの相関分析
          </h2>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="text-xs px-3 py-1.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-all disabled:opacity-50 flex items-center gap-1 active:scale-95"
          >
            {isAnalyzing ? (
              <><span className="w-3 h-3 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin"></span> 分析中...</>
            ) : "実行する"}
          </button>
        </div>
        
        {analysisResult && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                {analysisResult}
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Commute logic */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrainFront className="w-4 h-4 text-pink-400"/> 今日の外出・移動
          </h2>
          
          <div className="flex gap-2 bg-slate-800/80 p-1 rounded-xl">
            {[
              { id: 'commuted', label: '通勤あり' },
              { id: 'wentOut', label: '外出のみ' },
              { id: 'none', label: '外出なし' },
            ].map((c) => (
              <label key={c.id} className="flex-1 text-center cursor-pointer">
                <input type="radio" value={c.id} {...register('commuteType')} className="peer sr-only" />
                <div className="py-2.5 text-[13px] font-medium rounded-lg peer-checked:bg-slate-600 peer-checked:text-white text-slate-400 transition-colors">
                  {c.label}
                </div>
              </label>
            ))}
          </div>
        </div>



        {/* Weather */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
          
          <div>
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400"/> {(watchCommuteType === 'commuted' || watchCommuteType === 'wentOut') ? '行きの天気' : '午前の天気'}
            </h2>
            <div className="grid gap-2 grid-cols-5">
              {[
                { icon: Sun, label: '晴れ', color: 'text-amber-400' },
                { icon: Cloud, label: 'くもり', color: 'text-slate-300' },
                { icon: CloudRain, label: '雨', color: 'text-blue-400' },
                { icon: MoreHorizontal, label: 'その他', color: 'text-indigo-200' },
                { icon: HelpCircle, label: '不明', color: 'text-slate-500' }
              ].map((w) => (
                <label key={w.label} className="cursor-pointer group">
                  <input type="radio" value={w.label} {...register('outboundWeather')} className="peer sr-only" />
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 bg-slate-800/50 peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 transition-all active:scale-95 group-hover:bg-slate-800">
                    <w.icon className={cn("w-6 h-6 mb-1", w.color)} />
                    <span className="text-[10px] text-slate-300 font-medium">{w.label}</span>
                  </div>
                </label>
              ))}
            </div>
            {watchOutboundWeather === '雨' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-semibold text-slate-400 mb-2 block">雨の強さ (0:小雨 〜 5:土砂降り)</label>
                <div className="flex gap-1">
                  {['0', '1', '2', '3', '4', '5'].map((level) => (
                    <label key={level} className="flex-1">
                      <input type="radio" value={level} {...register('outboundRainLevel')} className="peer sr-only"/>
                      <div className="text-center font-bold text-sm py-1.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                        {level}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {watchOutboundWeather === 'その他' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-semibold text-slate-400 mb-2 block">天気の詳細</label>
                <div className="flex gap-2">
                  {[
                    { val: '嵐', icon: CloudLightning },
                    { val: '雪', icon: Snowflake },
                    { val: 'ひょう', icon: CloudRain }
                  ].map((item) => (
                    <label key={item.val} className="flex-1">
                      <input type="radio" value={item.val} {...register('outboundWeatherOther')} className="peer sr-only"/>
                      <div className="flex items-center justify-center gap-1 font-bold text-xs py-2 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 peer-checked:text-indigo-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                        <item.icon className="w-4 h-4" />
                        {item.val}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4 text-cyan-400"/> {(watchCommuteType === 'commuted' || watchCommuteType === 'wentOut') ? '帰りの天気' : '午後の天気'}
            </h2>
            <div className="grid gap-2 grid-cols-5">
              {[
                { icon: Sun, label: '晴れ', color: 'text-amber-400' },
                { icon: Cloud, label: 'くもり', color: 'text-slate-300' },
                { icon: CloudRain, label: '雨', color: 'text-blue-400' },
                { icon: MoreHorizontal, label: 'その他', color: 'text-indigo-200' },
                { icon: HelpCircle, label: '不明', color: 'text-slate-500' }
              ].map((w) => (
                <label key={w.label} className="cursor-pointer group">
                  <input type="radio" value={w.label} {...register('inboundWeather')} className="peer sr-only" />
                  <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 bg-slate-800/50 peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 transition-all active:scale-95 group-hover:bg-slate-800">
                    <w.icon className={cn("w-6 h-6 mb-1", w.color)} />
                    <span className="text-[10px] text-slate-300 font-medium">{w.label}</span>
                  </div>
                </label>
              ))}
            </div>
            {watchInboundWeather === '雨' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-semibold text-slate-400 mb-2 block">雨の強さ (0:小雨 〜 5:土砂降り)</label>
                <div className="flex gap-1">
                  {['0', '1', '2', '3', '4', '5'].map((level) => (
                    <label key={level} className="flex-1">
                      <input type="radio" value={level} {...register('inboundRainLevel')} className="peer sr-only"/>
                      <div className="text-center font-bold text-sm py-1.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                        {level}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {watchInboundWeather === 'その他' && (
              <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-[11px] font-semibold text-slate-400 mb-2 block">天気の詳細</label>
                <div className="flex gap-2">
                  {[
                    { val: '嵐', icon: CloudLightning },
                    { val: '雪', icon: Snowflake },
                    { val: 'ひょう', icon: CloudRain }
                  ].map((item) => (
                    <label key={item.val} className="flex-1">
                      <input type="radio" value={item.val} {...register('inboundWeatherOther')} className="peer sr-only"/>
                      <div className="flex items-center justify-center gap-1 font-bold text-xs py-2 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 peer-checked:text-indigo-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                        <item.icon className="w-4 h-4" />
                        {item.val}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Train Details */}
        {watchCommuteType === 'commuted' && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">

            <div className="space-y-6 pt-2">
              {/* 行き */}
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 border-l-2 border-blue-500 pl-2">
                  行きの電車
                </h3>
                
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400">座れましたか？</label>
                  <div className="flex gap-2">
                     {['yes', 'no'].map((val) => (
                       <label key={val} className="flex-1">
                         <input type="radio" value={val} {...register('outboundSat')} className="peer sr-only"/>
                         <div className="text-center font-medium text-[13px] py-2.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-blue-500/20 peer-checked:border-blue-500 peer-checked:text-blue-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                           {val === 'yes' ? 'はい' : 'いいえ'}
                         </div>
                       </label>
                     ))}
                  </div>
                  {watchOutboundSat === 'yes' && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <select {...register('outboundStation')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium">
                        <option value="">座った駅を選択...</option>
                        <option value="保土ヶ谷">保土ヶ谷</option>
                        <option value="横浜">横浜</option>
                        <option value="新川崎">新川崎</option>
                        <option value="武蔵小杉">武蔵小杉</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400">遅延はありましたか？</label>
                  <div className="flex gap-2">
                     {['no', 'yes'].map((val) => (
                       <label key={val} className="flex-1">
                         <input type="radio" value={val} {...register('outboundDelay')} className="peer sr-only"/>
                         <div className="text-center font-medium text-[13px] py-2.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-pink-500/20 peer-checked:border-pink-500 peer-checked:text-pink-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                           {val === 'yes' ? 'あり' : 'なし'}
                         </div>
                       </label>
                     ))}
                  </div>
                  {watchOutboundDelay === 'yes' && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                      <select {...register('outboundDelayMins')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none appearance-none font-medium">
                        {Array.from({length: 30}, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m}分</option>
                        ))}
                        <option value="その他">その他 (重大な遅延)</option>
                      </select>
                      {watchOutboundMins === 'その他' && (
                        <input type="text" placeholder="例: 人身事故で2時間遅延" {...register('outboundDelayOther')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none placeholder:text-slate-600" />
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* 帰り */}
              <div className="space-y-5 pt-6 border-t border-slate-800/50">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 border-l-2 border-orange-500 pl-2">
                  帰りの電車
                </h3>
                
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400">座れましたか？</label>
                  <div className="flex gap-2">
                     {['yes', 'no'].map((val) => (
                       <label key={val} className="flex-1">
                         <input type="radio" value={val} {...register('inboundSat')} className="peer sr-only"/>
                         <div className="text-center font-medium text-[13px] py-2.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-orange-500/20 peer-checked:border-orange-500 peer-checked:text-orange-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                           {val === 'yes' ? 'はい' : 'いいえ'}
                         </div>
                       </label>
                     ))}
                  </div>
                  {watchInboundSat === 'yes' && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <select {...register('inboundStation')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none appearance-none font-medium">
                        <option value="">座った駅を選択...</option>
                        <option value="品川">品川</option>
                        <option value="西大井">西大井</option>
                        <option value="武蔵小杉">武蔵小杉</option>
                        <option value="新川崎">新川崎</option>
                        <option value="その他">その他</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400">遅延はありましたか？</label>
                  <div className="flex gap-2">
                     {['no', 'yes'].map((val) => (
                       <label key={val} className="flex-1">
                         <input type="radio" value={val} {...register('inboundDelay')} className="peer sr-only"/>
                         <div className="text-center font-medium text-[13px] py-2.5 border border-slate-700 bg-slate-800/50 rounded-lg peer-checked:bg-pink-500/20 peer-checked:border-pink-500 peer-checked:text-pink-300 text-slate-400 transition-all active:scale-95 cursor-pointer">
                           {val === 'yes' ? 'あり' : 'なし'}
                         </div>
                       </label>
                     ))}
                  </div>
                  {watchInboundDelay === 'yes' && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300 space-y-3">
                      <select {...register('inboundDelayMins')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none appearance-none font-medium">
                        {Array.from({length: 30}, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m}分</option>
                        ))}
                        <option value="その他">その他 (重大な遅延)</option>
                      </select>
                      {watchInboundMins === 'その他' && (
                        <input type="text" placeholder="例: 人身事故で2時間遅延" {...register('inboundDelayOther')} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 text-sm text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none placeholder:text-slate-600" />
                      )}
                    </div>
                  )}
                </div>

              </div>

              {/* Unpleasant Commute text */}
              <div className="pt-6 border-t border-slate-800/50">
                <label className="text-xs font-semibold text-slate-400 mb-2 block">通勤で不愉快なことはありましたか？</label>
                <textarea 
                  {...register('unpleasantEvents')} 
                  placeholder="例: 変なおじさんに負けた、クソみたいな運転..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-pink-500 outline-none resize-none h-24 placeholder:text-slate-600 font-medium leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>
        )}


        {/* Scores */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl space-y-8">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-indigo-400"/> 総合点
              </h2>
              <Controller
                control={control}
                name="overallScore"
                render={({ field }) => (
                  <div className="bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                    <span className="text-2xl font-black text-indigo-400">{field.value}</span>
                  </div>
                )}
              />
            </div>
            <input type="range" min="0" max="100" step="5" {...register('overallScore')} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
            <div className="flex justify-between text-xs text-slate-500 font-medium mt-2"><span>0</span><span>50</span><span>100</span></div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400"/> 仕事・プライベート点
              </h2>
              <Controller
                control={control}
                name="workScore"
                render={({ field }) => (
                  <div className="bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                     <span className="text-2xl font-black text-purple-400">{field.value}</span>
                  </div>
                )}
              />
            </div>
            <input type="range" min="0" max="100" step="5" {...register('workScore')} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500" />
            <div className="flex justify-between text-xs text-slate-500 font-medium mt-2"><span>0</span><span>50</span><span>100</span></div>
          </div>
        </div>

        {/* Diary */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-emerald-400"/> 自由記入欄 (日記)
          </h2>
          <textarea 
            {...register('diary')} 
            placeholder="今日あったこと、仕事の進捗、感情の揺れなど自由に書いてください"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-32 placeholder:text-slate-600 font-medium leading-relaxed"
          ></textarea>
        </div>

        {/* Sleep Data */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl transition-all">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Moon className="w-4 h-4 text-cyan-400"/> 睡眠データ (Apple Watch)
          </h2>
          <label className="flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/40 hover:bg-slate-800 transition-colors group">
            <div className="flex flex-col items-center justify-center py-6 px-4">
              <ImageIcon className={cn("w-8 h-8 transition-colors mb-3", sleepImageBase64 ? "text-cyan-400" : "text-slate-500 group-hover:text-cyan-400")} />
              <p className="text-xs font-medium text-slate-400 text-center break-all">
                {sleepFileName ? sleepFileName : 'タップしてスクショを選択'}
              </p>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </label>
          {sleepImageBase64 && (
            <div className="mt-4 relative rounded-xl overflow-hidden border border-slate-700 shadow-lg animate-in fade-in duration-300">
              <img src={sleepImageBase64} alt="Sleep Preview" className="w-full max-h-64 object-contain bg-slate-900 opacity-90 p-2" />
            </div>
          )}
        </div>

        {/* Submit */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-xl shadow-indigo-500/20 active:scale-95 transition-all outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
             <><Send className="w-5 h-5 drop-shadow-sm" /> 記録を保存する</>
          )}
        </button>
      </form>

      {/* Batch Recovery Tool */}
      <div className="mt-12 bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-rose-400"/> 【データ修復】過去の睡眠データ一括リカバリ
        </h2>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          解析エラーになってしまった過去の睡眠データを修復します。カメラロールから該当する日のスクショを複数選択してアップロードしてください。（画像の日付から自動で該当行を上書きします）
        </p>

        <label className="flex flex-col items-center justify-center w-full min-h-[80px] border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/40 hover:bg-slate-800 transition-colors mb-4">
          <span className="text-sm font-medium text-slate-300 py-4">画像を選択 (複数可)</span>
          <input type="file" multiple className="hidden" accept="image/*" onChange={handleBatchFileChange} disabled={isBatchProcessing} />
        </label>

        {batchFiles.length > 0 && (
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-2">
            {batchFiles.map((bf) => (
              <div key={bf.id} className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
                <img src={bf.preview} alt="preview" className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">対象日付:</span>
                    <input 
                      type="date" 
                      value={bf.inferredDate} 
                      onChange={(e) => updateBatchFileDate(bf.id, e.target.value)}
                      disabled={isBatchProcessing || bf.status === 'success'}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1 outline-none"
                    />
                  </div>
                  <div className="text-xs flex items-center gap-1">
                    {bf.status === 'pending' && <span className="text-slate-400">待機中...</span>}
                    {bf.status === 'uploading' && <span className="text-blue-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin"/> 修復中...</span>}
                    {bf.status === 'success' && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {bf.message}</span>}
                    {bf.status === 'error' && <span className="text-rose-400 flex items-center gap-1"><XCircle className="w-3 h-3"/> {bf.message}</span>}
                  </div>
                </div>
                {bf.status !== 'uploading' && bf.status !== 'success' && (
                  <button onClick={() => removeBatchFile(bf.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {batchFiles.length > 0 && (
          <button 
            onClick={startBatchRecovery}
            disabled={isBatchProcessing || batchFiles.every(f => f.status === 'success')}
            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-all outline-none disabled:opacity-50"
          >
            {isBatchProcessing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> 修復を実行中...</>
            ) : batchFiles.every(f => f.status === 'success') ? (
              <><CheckCircle className="w-4 h-4 text-green-400" /> 全ての修復が完了しました</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> 修復を開始する</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
