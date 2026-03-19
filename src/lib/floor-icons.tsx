import { Crown, ClipboardList, ShieldAlert, Code, Film, TrendingUp, Server, Users, Coins, Cloud } from 'lucide-react';
import { ReactNode } from 'react';

const FLOOR_ICON_MAP: Record<string, (className?: string) => ReactNode> = {
  'crown': (c) => <Crown className={c || 'w-5 h-5'} />,
  'clipboard-list': (c) => <ClipboardList className={c || 'w-5 h-5'} />,
  'shield-alert': (c) => <ShieldAlert className={c || 'w-5 h-5'} />,
  'code': (c) => <Code className={c || 'w-5 h-5'} />,
  'film': (c) => <Film className={c || 'w-5 h-5'} />,
  'trending-up': (c) => <TrendingUp className={c || 'w-5 h-5'} />,
  'server': (c) => <Server className={c || 'w-5 h-5'} />,
  'users': (c) => <Users className={c || 'w-5 h-5'} />,
  'coins': (c) => <Coins className={c || 'w-5 h-5'} />,
  'cloud': (c) => <Cloud className={c || 'w-5 h-5'} />,
};

export function FloorIcon({ name, className }: { name: string; className?: string }) {
  const render = FLOOR_ICON_MAP[name];
  if (render) return <>{render(className)}</>;
  return null;
}
