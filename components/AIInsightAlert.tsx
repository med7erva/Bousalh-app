
import React, { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';

interface AIInsightAlertProps {
  title: string;
  insight: string | string[];
  icon: React.ElementType;
  baseColor: 'blue' | 'indigo' | 'amber' | 'rose' | 'emerald';
}

const AIInsightAlert: React.FC<AIInsightAlertProps> = ({ title, insight, icon: Icon, baseColor }) => {
  const [isOpen, setIsOpen] = useState(false);

  // If no insight, don't render anything
  if (!insight || (Array.isArray(insight) && insight.length === 0)) return null;

  // Map colors to Tailwind classes
  const colorMap = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-800', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-800', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-800', iconBg: 'bg-rose-100', iconText: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-800', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  };

  const theme = colorMap[baseColor];

  return (
    <div className={`border rounded-xl transition-all duration-300 overflow-hidden ${isOpen ? theme.bg + ' ' + theme.border : 'bg-white border-gray-100 shadow-sm'}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 focus:outline-none group"
      >
        <div className="flex items-center gap-3">
            {/* Icon Box */}
            <div className={`p-2 rounded-lg ${theme.iconBg} ${theme.iconText} relative transition-transform group-hover:scale-105`}>
                <Icon size={20} />
                {/* Red Dot Alert (Only when closed) */}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                )}
            </div>
            
            <div className="text-right">
                <h4 className={`font-bold text-sm ${isOpen ? theme.text : 'text-gray-700'}`}>
                    {title}
                </h4>
                {!isOpen && (
                    <p className="text-xs text-gray-400 mt-0.5">اضغط لعرض توصية الذكاء الاصطناعي...</p>
                )}
            </div>
        </div>
        
        <div className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={20} />
        </div>
      </button>

      {/* Content Area */}
      {isOpen && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
            <div className={`text-sm leading-relaxed ${theme.text} pr-[3.25rem]`}>
                {Array.isArray(insight) ? (
                    <ul className="space-y-2">
                        {insight.map((tip, i) => (
                            <li key={i} className="flex gap-2">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${theme.iconText} opacity-50 shrink-0`}></span>
                                {tip.replace(/^- /, '')}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>{insight}</p>
                )}
                
                <div className="mt-3 flex gap-2">
                    <div className="text-[10px] opacity-60 flex items-center gap-1">
                        <Sparkles size={10} />
                        تم التحليل بواسطة Gemini AI
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AIInsightAlert;
