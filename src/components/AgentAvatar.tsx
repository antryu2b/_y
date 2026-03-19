'use client';

import Image from 'next/image';

interface AgentAvatarProps {
  agentId: string;
  name: string;
  size?: number;
  className?: string;
}

export function AgentAvatar({ agentId, name, size = 40, className = '' }: AgentAvatarProps) {
  return (
    <div
      className={`rounded-full overflow-hidden bg-gray-800 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/agents/${agentId}.png`}
        alt={name}
        width={size}
        height={size}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
}
