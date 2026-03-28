import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Send, Image as ImageIcon, CheckCircle, TrainFront, Briefcase, AlignLeft, CloudRain, Sun, Cloud, Snowflake, Moon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...classes: ClassValue[]) => twMerge(clsx(classes));

type FormData = {
  weather: string;
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

export default function App() {
  const [sleepImageBase64, setSleepImageBase64] = useState<string | null>(null);
  const [sleepFileName, setSleepFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, watch, control } = useForm<FormData>({
    defaultValues: {
      overallScore: 70,
      workScore: 70,
      commuteType: 'commuted',
      outboundDelay: 'no',
      outboundDelayMins: '5',
      inboundDelay: 'no',
      inboundDelayMins: '5',
      weather: '晴れ'
    }
  });

  const watchCommuteType = watch('commuteType');
  const watchOutboundSat = watch('outboundSat');
  const watchInboundSat = watch('inboundSat');
  const watchOutboundDelay = watch('outboundDelay');
  const watchInboundDelay = watch('inboundDelay');
  const watchOutboundMins = watch('outboundDelayMins');
  const watchInboundMins = watch('inboundDelayMins');

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
    setIsSubmitting(true);
    try {
      const payload = {
        date: new Date().toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"}),
        weather: data.weather,
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
        <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('ja-JP')} の記録</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Weather */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-xl transition-all">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400"/> 今日の天気
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Sun, label: '晴れ', color: 'text-amber-400' },
              { icon: Cloud, label: 'くもり', color: 'text-slate-300' },
              { icon: CloudRain, label: '雨', color: 'text-blue-400' },
              { icon: Snowflake, label: '雪/大雨', color: 'text-indigo-200' },
            ].map((w) => (
              <label key={w.label} className="cursor-pointer group">
                <input type="radio" value={w.label} {...register('weather')} className="peer sr-only" />
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-700 bg-slate-800/50 peer-checked:bg-indigo-500/20 peer-checked:border-indigo-500 transition-all active:scale-95 group-hover:bg-slate-800">
                  <w.icon className={cn("w-6 h-6 mb-1", w.color)} />
                  <span className="text-[10px] text-slate-300 font-medium">{w.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

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

          {watchCommuteType === 'commuted' && (
            <div className="space-y-6 pt-5 mt-2 border-t border-slate-800">
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
          )}
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
              <img src={sleepImageBase64} alt="Sleep Preview" className="w-full h-40 object-cover opacity-90" />
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
    </div>
  );
}
