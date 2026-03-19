'use client';

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Lang, t } from '@/data/i18n';
import { ActivityLogEntry } from '@/engine/simulation';
import { getRandomActivity } from '@/data/activities';

interface Props {
  activities: ActivityLogEntry[];
  onClose: () => void;
  lang: Lang;
}

interface FeedItem {
  id: string;
  agentName: string;
  activity: string;
  time: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function ActivityFeed({ activities, onClose, lang }: Props) {
  const text = t[lang];
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    // Convert simulation activities
    const items: FeedItem[] = activities.map((a, i) => ({
      id: `${a.timestamp}-${i}`,
      agentName: a.agentName,
      activity: `${a.agentName}가 ${a.activity}`,
      time: formatTime(a.timestamp),
    }));

    // Add some random template activities for variety
    for (let i = 0; i < 5; i++) {
      const rnd = getRandomActivity();
      items.push({
        id: `random-${i}`,
        agentName: rnd.agentName,
        activity: rnd.activity,
        time: formatTime(Date.now() - Math.random() * 1800000),
      });
    }

    // Sort by time descending (most recent first)
    items.sort((a, b) => b.time.localeCompare(a.time));
    setFeedItems(items.slice(0, 25));
  }, [activities]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel - bottom sheet on mobile, side panel on desktop */}
      <div className="fixed bottom-0 left-0 right-0 md:bottom-auto md:right-0 md:top-0 md:left-auto md:w-[360px] md:h-full bg-[#0a0f1a] z-50 rounded-t-2xl md:rounded-none border-t md:border-l border-white/10 flex flex-col max-h-[70vh] md:max-h-full animate-slideUp md:animate-slideIn">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> {text.activityFeed}
            <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[9px] font-bold">
              {text.live}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition text-xs"
          >
            
          </button>
        </div>

        {/* Feed items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition"
            >
              <span className="text-[10px] text-gray-500 mt-0.5 shrink-0 w-10">
                {item.time}
              </span>
              <p className="text-xs text-gray-300 leading-relaxed">
                {item.activity}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
