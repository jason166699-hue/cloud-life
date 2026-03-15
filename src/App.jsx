import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Cloud, Sun, CloudRain, Wind, Calendar as CalendarIcon, 
  Newspaper, Users, Heart, MessageCircle, Share2, 
  Search, MapPin, Bell, Menu, PlusCircle, Thermometer,
  CloudLightning, Droplets, Sunrise, Sunset, Loader2,
  Zap, TrendingUp, Radio, Target, Sparkles, ChevronRight,
  Smile, Coffee, Star, Candy, Navigation2, Globe, RefreshCw,
  Gift, Moon, Info, Activity
} from 'lucide-react';

/**
 * 云端生活 (CloudLife) - 高频自动更新赛博卡通终极版
 * 已修复 import.meta 兼容性问题
 */
const apiKey = ""; // 执行环境将在运行时自动提供

const GLOBAL_CITIES = [
  { name: "北京", en: "Beijing", icon: "🏮" },
  { name: "东京", en: "Tokyo", icon: "🗼" },
  { name: "伦敦", en: "London", icon: "🎡" },
  { name: "纽约", en: "New York", icon: "🗽" },
  { name: "巴黎", en: "Paris", icon: "🥐" }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('weather');
  const [currentCity, setCurrentCity] = useState(GLOBAL_CITIES[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [news, setNews] = useState([]);
  const [quote, setQuote] = useState("正在为您建立全球数据实时链接...");
  const [weatherData, setWeatherData] = useState({ temp: "--", cond: "同步中" });
  const [lastUpdated, setLastUpdated] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [heading, setHeading] = useState(0);
  const [nextUpdateIn, setNextUpdateIn] = useState(60); 
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // 安全解析 JSON，防止 AI 返回 Markdown 代码块
  const safeParseJSON = (text) => {
    try {
      if (!text) return null;
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON Parse Error:", e);
      return null;
    }
  };

  // 实现指数退避的 API 请求封装
  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
      }
      throw err;
    }
  };

  // 核心：联网搜索并更新
  const fetchSmartContent = useCallback(async (city = currentCity.name) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const systemPrompt = `你是一个卡通风格全球气象员。请搜索关于 ${city} 的【最新】天气和资讯。
      必须严格返回 JSON 格式：
      {
        "news": [{"title": "标题", "summary": "摘要", "hot": 98}],
        "quote": "一句关于此时此刻的治愈语录",
        "weather": {"temp": "数字", "cond": "状况，如：晴、多云"}
      }`;
      const userQuery = `获取 ${city} 此时此刻最准确的天气和头条新闻。现在是 ${new Date().toLocaleString()}`;

      const result = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ "google_search": {} }],
            generationConfig: { 
              responseMimeType: "application/json"
            }
          })
        }
      );

      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const content = safeParseJSON(rawText);
      if (content) {
        setNews(content.news || []);
        setQuote(content.quote || "生活明朗，万物可爱。");
        setWeatherData(content.weather || { temp: "--", cond: "" });
        setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setNextUpdateIn(60); 
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentCity.name, isLoading]);

  // 自动刷新计时器
  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdateIn(prev => {
        if (prev <= 1) {
          fetchSmartContent();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchSmartContent]);

  useEffect(() => {
    fetchSmartContent();
  }, [currentCity.name]);

  // 指南针方向监听
  useEffect(() => {
    const handleOrientation = (e) => {
      const h = e.webkitCompassHeading || (e.alpha ? 360 - e.alpha : 0);
      setHeading(h);
    };
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  const handleCitySearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentCity({ name: searchQuery, en: "Custom", icon: "🌍" });
      setSearchQuery("");
    }
  };

  // --- 1. 天气视图 ---
  const WeatherView = () => (
    <div className="space-y-6 animate-in fade-in zoom-in duration-500 pb-24">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 shadow-sm">
          <div className="w-2 h-2 bg-sky-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Live Syncing</span>
        </div>
        <span className="text-[10px] font-bold text-slate-300">自动刷新: {nextUpdateIn}s</span>
      </div>

      <form onSubmit={handleCitySearch} className="relative group scale-95 hover:scale-100 transition-transform">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜城市，获取实时全网数据..." 
          className="w-full bg-white border-4 border-slate-100 rounded-[24px] py-4 px-6 pl-14 text-sm font-bold focus:outline-none focus:border-sky-300 shadow-sm"
        />
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-400" size={20} />
      </form>

      <div className={`rounded-[40px] p-8 text-center border-4 border-white relative overflow-hidden min-h-[300px] flex flex-col justify-center transition-all duration-700
        ${isLoading ? 'bg-slate-50' : 'bg-gradient-to-b from-sky-400 to-blue-200 shadow-[0_20px_0_0_#bae6fd]'}`}>
        
        {isLoading && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-20 flex items-center justify-center">
            <RefreshCw className="animate-spin text-white" size={40} />
          </div>
        )}

        <div className="absolute top-4 right-4 animate-spin-slow opacity-10"><Globe size={80} className="text-white" /></div>
        <div className="flex justify-center mb-4">
          <div className="bg-white/90 p-6 rounded-full shadow-lg scale-110">
            <Sun size={64} className="text-yellow-400" fill="currentColor" />
          </div>
        </div>
        <h1 className="text-7xl font-black text-sky-900 flex items-start justify-center drop-shadow-sm">
          {weatherData.temp}<span className="text-2xl mt-4">°C</span>
        </h1>
        <p className="text-xl font-bold text-sky-800 mt-2 bg-white/60 backdrop-blur-sm inline-block px-5 py-1.5 rounded-full">
          {currentCity.name} · {weatherData.cond}
        </p>
        <p className="mt-4 text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">{lastUpdated}</p>
      </div>

      {/* 指南针 */}
      <div className="bg-white rounded-[32px] p-6 border-4 border-rose-100 shadow-[0_10px_0_0_#fff1f2] flex flex-col items-center">
        <h4 className="text-sm font-black text-rose-500 mb-6 flex items-center gap-2 self-start tracking-tighter">
          <Navigation2 size={18} fill="currentColor" /> 实时传感器在线
        </h4>
        <div className="relative w-44 h-44 flex items-center justify-center bg-rose-50/30 rounded-full">
          <div className="absolute inset-0 border-[10px] border-white rounded-full shadow-inner" />
          <div className="relative w-2 h-36 flex flex-col transition-transform duration-300 ease-out" style={{ transform: `rotate(${heading}deg)` }}>
            <div className="flex-1 bg-rose-500 rounded-t-full shadow-lg relative">
               <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[8px] text-white font-black">N</div>
            </div>
            <div className="flex-1 bg-slate-200 rounded-b-full shadow-inner" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white border-4 border-rose-500 rounded-full z-10" />
          </div>
        </div>
        <p className="mt-4 text-[10px] font-bold text-slate-400 tracking-widest uppercase">{Math.round(heading)}° | 传感器正常</p>
      </div>
    </div>
  );

  // --- 2. 快报视图 ---
  const NewsView = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-24">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-black text-pink-500 flex items-center gap-2 tracking-tighter italic">
          <Activity className="text-pink-400 animate-pulse" /> 实时快报
        </h2>
        <button onClick={() => fetchSmartContent()} className="p-2 bg-pink-100 border-2 border-pink-200 rounded-2xl">
          <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="space-y-4">
        {news.length > 0 ? news.map((item, i) => (
          <div key={`news-${i}`} className="bg-white border-4 border-slate-100 rounded-[32px] p-6 shadow-[0_12px_0_0_#f1f5f9] relative">
            <div className="absolute -right-2 -top-2 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center border-4 border-white text-[10px] font-black text-pink-500 shadow-sm">
              #{i+1}
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight pr-4">{item.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.summary}</p>
          </div>
        )) : (
          <div className="p-10 text-center text-slate-400 font-bold italic">
            正在全网搜索热点新闻...
          </div>
        )}
      </div>
    </div>
  );

  // --- 3. 日历视图 (万年历) ---
  const CalendarView = () => {
    const today = new Date();
    return (
      <div className="space-y-6 animate-in zoom-in duration-500 pb-24">
        <div className="bg-white border-4 border-emerald-100 rounded-[40px] p-6 shadow-[0_15px_0_0_#f0fdf4]">
          <h2 className="text-3xl font-black text-emerald-600 italic mb-6">{today.getFullYear()}.{today.getMonth()+1}</h2>
          <div className="grid grid-cols-7 gap-1 text-center font-black">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
              <div key={`weekday-${idx}`} className="text-[10px] text-emerald-200 py-2">{day}</div>
            ))}
            {Array.from({length: 31}, (_, i) => i + 1).map(d => (
              <button 
                key={`day-${d}`} 
                onClick={() => setSelectedDay(d)}
                className={`aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all
                  ${selectedDay === d ? 'bg-emerald-500 text-white shadow-lg scale-110 -rotate-3' : 'text-emerald-800 hover:bg-emerald-50'}`}
              >
                <span className="text-sm font-black">{d}</span>
                {d === today.getDate() && <div className="absolute -bottom-1 w-1.5 h-1.5 bg-pink-400 rounded-full" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border-4 border-yellow-100 rounded-[40px] p-6 shadow-[0_15px_0_0_#fef9c3] relative overflow-hidden">
          <div className="flex justify-between items-start mb-6 border-b-2 border-dashed border-yellow-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Moon className="text-yellow-500" size={16} fill="currentColor" />
                <span className="text-lg font-black text-yellow-800">万年历详情</span>
              </div>
              <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">农历 二月廿七 · 辛卯月</p>
            </div>
            <div className="text-right text-3xl font-black text-yellow-900 leading-none">{today.getDate()}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-emerald-50 p-4 rounded-3xl border-2 border-emerald-100">
              <span className="text-[10px] font-black text-emerald-500 block mb-1">宜 AUSPICIOUS</span>
              <span className="text-sm font-black text-emerald-800">心情愉快 / 学习</span>
            </div>
            <div className="bg-rose-50 p-4 rounded-3xl border-2 border-rose-100">
              <span className="text-[10px] font-black text-rose-500 block mb-1">忌 INAUSPICIOUS</span>
              <span className="text-sm font-black text-rose-800">过度焦虑 / 熬夜</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- 4. 圈子视图 ---
  const CommunityView = () => (
    <div className="space-y-6 pb-20 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-br from-purple-400 to-pink-400 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
        <Sparkles size={40} className="absolute -right-4 -bottom-4 opacity-10" />
        <p className="text-2xl font-black italic leading-tight">“{quote}”</p>
        <p className="mt-4 text-[9px] font-bold text-white/40 uppercase tracking-widest">AI 全球共鸣同步中...</p>
      </div>
      <div className="bg-white border-4 border-slate-50 rounded-[32px] p-6 shadow-sm flex items-center gap-4">
         <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center text-3xl shadow-md border-4 border-white">🐨</div>
         <div>
            <h5 className="text-slate-800 font-black text-base">全球搜索官</h5>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Live from {currentCity.name}</p>
         </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#fcfaff] text-slate-800 font-sans relative overflow-x-hidden selection:bg-pink-100">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-[18px] shadow-sm border-2 border-slate-100 hover:rotate-6 transition-transform">
            <Smile className="text-yellow-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-300 uppercase leading-none mb-1 tracking-tighter tracking-widest">Global Neural Link</p>
            <h2 className="text-2xl font-black text-slate-800 italic leading-none">{currentCity.name}</h2>
          </div>
        </div>
        <div className="w-10 h-10 bg-white rounded-2xl border-2 border-slate-100 flex items-center justify-center shadow-sm">
           <Activity size={18} className="text-pink-400 animate-pulse" />
        </div>
      </header>

      <main className="px-6 py-4 relative z-10 h-[calc(100vh-180px)] overflow-y-auto no-scrollbar">
        {activeTab === 'weather' && <WeatherView />}
        {activeTab === 'news' && <NewsView />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'community' && <CommunityView />}
      </main>

      <div className="fixed bottom-6 left-0 right-0 px-6 z-50">
        <nav className="max-w-sm mx-auto h-20 bg-white/95 backdrop-blur-xl border-4 border-white rounded-[32px] flex items-center justify-around px-2 shadow-[0_25px_50px_rgba(0,0,0,0.1)]">
          <NavButton active={activeTab === 'weather'} onClick={() => setActiveTab('weather')} label="天气" color="text-sky-500" activeBg="shadow-sky-100" />
          <NavButton active={activeTab === 'news'} onClick={() => setActiveTab('news')} label="快报" color="text-pink-500" activeBg="shadow-pink-100" />
          <div className="relative -top-10 scale-110">
            <button className="w-16 h-16 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-[24px] flex items-center justify-center text-white shadow-xl border-4 border-white rotate-12 hover:rotate-0 transition-all active:scale-90 shadow-orange-200">
              <PlusCircle size={32} />
            </button>
          </div>
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} label="日历" color="text-emerald-500" activeBg="shadow-emerald-100" />
          <NavButton active={activeTab === 'community'} onClick={() => setActiveTab('community')} label="圈子" color="text-purple-500" activeBg="shadow-purple-100" />
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        body { font-family: 'Arial Rounded MT Bold', 'Helvetica', sans-serif; -webkit-tap-highlight-color: transparent; }
      `}} />
    </div>
  );
};

const NavButton = ({ active, onClick, label, color, activeBg }) => (
  <button 
    onClick={onClick} 
    className={`w-14 h-14 flex flex-col items-center justify-center rounded-2xl transition-all duration-300
      ${active ? `${color} bg-white scale-110 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] ${activeBg}` : 'text-slate-300'}`}
  >
    <span className={`text-lg font-black tracking-tighter ${active ? color : 'text-slate-300'}`}>
      {label}
    </span>
    {active && <div className={`w-1 h-1 rounded-full mt-1 ${color.replace('text-', 'bg-')}`} />}
  </button>
);

export default App;
