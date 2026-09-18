import React, { useState } from 'react';
import { Menu, Sparkles, Volume2, Globe, Video, ShieldCheck, X, HelpCircle, Film, Share2, Copy, Check, ExternalLink, Zap } from 'lucide-react';

interface HeaderProps {
  language: 'my' | 'en';
  onToggleLanguage: () => void;
  onOpenMenu: () => void;
  isMenuOpen: boolean;
  onCloseMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onToggleLanguage,
  onOpenMenu,
  isMenuOpen,
  onCloseMenu,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Direct app links (Cloud Run Singapore Server)
  const devUrl = 'https://ais-dev-g7zh6itb7vll7isnb2noe2-870382846024.asia-southeast1.run.app';
  const sharedUrl = 'https://ais-pre-g7zh6itb7vll7isnb2noe2-870382846024.asia-southeast1.run.app';
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : devUrl;
  const directLink = currentOrigin && !currentOrigin.includes('localhost') ? currentOrigin : devUrl;

  const handleCopyLink = (urlToCopy: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(urlToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-purple-900/40 bg-[#090A17]/90 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name with Dynamic Glowing Gradient Effect */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl sakura-logo-animated sakura-glow-animated shadow-lg shadow-purple-950/60 p-0.5">
              <div className="w-full h-full rounded-[10px] bg-[#0c0d1e]/85 backdrop-blur-sm flex items-center justify-center">
                <span className="text-xl select-none filter drop-shadow">🌸</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl tracking-tight sakura-text-gradient-animated select-none">
                  🌸 Sakura Recap
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-purple-950/90 to-fuchsia-950/90 text-fuchsia-200 border border-fuchsia-500/30 shadow-sm shadow-fuchsia-950/50">
                  AI Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xs:block">
                {language === 'my' ? 'မြန်မာ Movie Recap ဗီဒီယို & စာတန်းထိုး ဖန်တီးစနစ်' : 'Myanmar Movie Recap & Subtitle Creator'}
              </p>
            </div>
          </div>

          {/* Right Header Actions: Free Badge, Direct Link (No VPN), Language Toggle, Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Myanmar No-VPN Direct Link & Share Button */}
            <button
              id="share-link-btn"
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-pink-600/30 via-fuchsia-600/30 to-purple-600/30 hover:from-pink-600/40 hover:to-purple-600/40 border border-fuchsia-400/50 text-fuchsia-100 transition active:scale-95 shadow-md shadow-fuchsia-950/40"
              title="Sakura Movie Recap ကို သူငယ်ချင်းများထံ Share ရန်"
            >
              <Share2 className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden xs:inline">🌸 Sakura ကို Share မည်</span>
              <span className="xs:hidden">Share</span>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'my' ? 'အခမဲ့' : 'Free'}</span>
            </div>

            {/* Language Switch Button */}
            <button
              id="lang-toggle-btn"
              onClick={onToggleLanguage}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/50 text-purple-200 transition active:scale-95"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-pink-400" />
              <span>{language === 'my' ? 'မြန်မာ' : 'EN'}</span>
            </button>

            {/* Menu Hamburger Button */}
            <button
              id="menu-btn"
              onClick={onOpenMenu}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900/80 hover:bg-purple-950/80 border border-purple-900/40 transition active:scale-95"
              aria-label="Toggle Menu"
            >
              <Menu className="w-5 h-5 text-purple-300" />
            </button>
          </div>
        </div>
      </header>

      {/* Myanmar Direct Access & Link Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0e0f26] border border-purple-500/40 shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-lg">
                  🇲🇲
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                    မြန်မာနိုင်ငံမှ VPN မလိုဘဲ သုံးနိုင်သော Link
                  </h3>
                  <p className="text-[11px] text-emerald-300 font-medium">
                    Google Cloud Run (Singapore Server) ဖြင့် တိုက်ရိုက်ချိတ်ဆက်ထားပါသည်
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/40 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300">
              {/* Primary Active Link */}
              <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
                <span className="text-[11px] text-emerald-300 font-semibold block">
                  🌟 အဓိက သုံးနိုင်သော Link (Primary Live URL):
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-purple-900/50">
                  <input
                    type="text"
                    readOnly
                    value={devUrl}
                    className="w-full bg-transparent text-fuchsia-300 text-xs sm:text-sm font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(devUrl)}
                    className="px-3 py-1.5 rounded-md bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>ကူးပြီးပြီ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Link ကူးရန်</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Shared Link Option */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium block">
                  အရန် Link (Alternative Shared URL):
                </span>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-black/60 border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={sharedUrl}
                    className="w-full bg-transparent text-slate-300 text-xs font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(sharedUrl)}
                    className="px-3 py-1.5 rounded-md bg-purple-900 hover:bg-purple-800 text-purple-200 font-medium text-xs flex items-center gap-1.5 transition active:scale-95 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>ကူးရန်</span>
                  </button>
                </div>
              </div>

              {/* Quick Social Share Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-pink-300 font-semibold block">
                  🌸 သူငယ်ချင်းများထံ တိုက်ရိုက် Share ရန် (Share with Friends):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(devUrl)}&text=${encodeURIComponent('🌸 Sakura Movie Recap - မြန်မာဘာသာဖြင့် AI ဇာတ်ကားပြန်ပြောပြချက်၊ အသံ ၁၀ မျိုးနှင့် မြန်မာစာတန်းထိုး အခမဲ့ဖန်တီးနိုင်သော Web App (VPN မလိုပါ)')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#229ED9]/20 hover:bg-[#229ED9]/30 border border-[#229ED9]/40 text-[#68cdfe] text-xs font-medium transition active:scale-95"
                  >
                    <span>Telegram</span>
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(devUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#1877F2]/20 hover:bg-[#1877F2]/30 border border-[#1877F2]/40 text-[#70b2ff] text-xs font-medium transition active:scale-95"
                  >
                    <span>Facebook</span>
                  </a>
                  <a
                    href={`viber://forward?text=${encodeURIComponent('🌸 Sakura Movie Recap (VPN မလိုပါ) ' + devUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#7360F2]/20 hover:bg-[#7360F2]/30 border border-[#7360F2]/40 text-[#c5bcff] text-xs font-medium transition active:scale-95"
                  >
                    <span>Viber</span>
                  </a>
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-purple-200">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Myanmar Direct Access အချက်အလက်များ:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li>MPT, Atom, Ooredoo, MyTel နှင့် အိမ်သုံး Fiber Wi-Fi များတွင် <strong className="text-emerald-300">VPN ဖွင့်စရာမလိုဘဲ</strong> တိုက်ရိုက်ဖွင့်နိုင်ပါသည်။</li>
                  <li>Xiaomi Browser တွင် `Page not found` ပြပါက Google Chrome သို့မဟုတ် Safari တွင် အထက်ပါ Link ကို Paste လုပ်၍ ဖွင့်ပါ။</li>
                  <li>အသံ ၁၀ မျိုး၊ Auto Subtitles နှင့် Full Movie Recap များကို အခမဲ့ အကန့်အသတ်မရှိ အသုံးပြုနိုင်ပါသည်။</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <a
                  href={devUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-purple-950/60"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tab အသစ်ဖြင့် ချက်ချင်းဖွင့်ရန်</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Drawer / Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#0e0f22] border-l border-purple-900/50 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-purple-900/40">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌸</span>
                    <h2 className="text-lg font-bold text-purple-100">Sakura Movie Recap Guide</h2>
                  </div>
                  <button
                    onClick={onCloseMenu}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-purple-900/40 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6 space-y-5 text-sm text-slate-300">
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-purple-200">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                      <span>{language === 'my' ? 'အသုံးပြုနည်း အဆင့်ဆင့်' : 'How It Works'}</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
                      <li>{language === 'my' ? 'ဇာတ်ကားအမည် ရိုက်ထည့်ပါ (သို့မဟုတ်) ဗီဒီယို/စာသားဖိုင် တင်ပါ' : 'Enter Movie Name or Upload Video/Text'}</li>
                      <li>{language === 'my' ? 'Recap စတိုင် (Hook, Full, Quick) ရွေးချယ်ပါ' : 'Select Recap Style'}</li>
                      <li>{language === 'my' ? 'အသံ ၁၀ မျိုးထဲမှ ကြိုက်နှစ်သက်ရာ AI Voice ကို ရွေးချယ်ပါ' : 'Choose from 10 AI Myanmar Voice Profiles'}</li>
                      <li>{language === 'my' ? 'မူရင်းစာသားဖျောက်ခြင်းနှင့် မြန်မာစာတန်းထိုး စတိုင်များ ချိန်ညှိပါ' : 'Toggle Watermark Removal & Subtitle Styler'}</li>
                      <li>{language === 'my' ? 'ခရမ်းရောင် ခလုတ်ကြီးကို နှိပ်ပြီး ဇာတ်ညွှန်းနှင့် စာတန်းထိုး ဗီဒီယို ထုတ်ယူပါ' : 'Click Generate & export SRT/VTT/Script'}</li>
                    </ol>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-pink-300">
                      <Volume2 className="w-4 h-4 text-pink-400" />
                      <span>{language === 'my' ? 'AI အသံစနစ်များ (10 Profiles)' : '10 AI Voice Profiles'}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      ကျားအသံ (သီဟ၊ မင်းသန့်၊ ကျော်စွာ၊ နေလင်း၊ အာကာ) နှင့် မအသံ (နီလာ၊ နှင်းဝတ်ရည်၊ သဇင်၊ စုမွန်၊ မေမြတ်) စုစုပေါင်း ၁၀ မျိုးလုံးကို Web Speech နှင့် Audio Synthesizer ဖြင့် စမ်းသပ်နားဆင်နိုင်ပါသည်။
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-indigo-300">
                      <Film className="w-4 h-4 text-indigo-400" />
                      <span>{language === 'my' ? 'TikTok / Reels / Shorts Format' : '9:16 Vertical Video'}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Social Media ဗီဒီယိုတိုများအတွက် အကောင်းဆုံး 9:16 Aspect Ratio နှင့် Safe Zone ဖြင့် မြန်မာယူနီကုဒ်စာတန်းများကို မပျက်မကွက် ပြသပေးပါသည်။
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-purple-900/40 text-center text-xs text-slate-400">
                Sakura Movie Recap · အခမဲ့ အသုံးပြုနိုင်သော ဗားရှင်း
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
