import React from 'react';

export interface AegisNodeCardProps {
  id?: string;
  icon: React.ReactNode;
  name: string;
  categoryColor: 'rd' | 'cy' | 'pu' | 'am' | 'gn';
  ipOrHost?: string;
  ipAddress?: string;
  ports?: Array<{ port: string; isExposed?: boolean; note?: string }>;
  portBadges?: Array<{ port: string; isExposed?: boolean; note?: string }>;
  status?: {
    label: string;
    variant: 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  };
  statusBadge?: {
    label: string;
    isHealthy?: boolean;
    variant?: 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  };
  technicalFacts?: string[];
  facts?: string[];
  isActiveInTrace?: boolean;
  isDimmedInTrace?: boolean;
  isDimmed?: boolean;
  onClick?: () => void;
}

export const AegisNodeCard: React.FC<AegisNodeCardProps> = ({
  id,
  icon,
  name,
  categoryColor,
  ipOrHost,
  ipAddress,
  ports,
  portBadges,
  status,
  statusBadge,
  technicalFacts,
  facts,
  isActiveInTrace = false,
  isDimmedInTrace = false,
  isDimmed = false,
  onClick,
}) => {
  const resolvedIp = ipAddress || ipOrHost;
  const resolvedPorts = portBadges || ports || [];
  const resolvedFacts = facts || technicalFacts || [];
  const resolvedDimmed = isDimmed || isDimmedInTrace;

  const resolvedStatusVariant: 'green' | 'red' | 'amber' | 'purple' | 'cyan' =
    status?.variant ||
    statusBadge?.variant ||
    (statusBadge?.isHealthy !== undefined
      ? statusBadge.isHealthy
        ? 'green'
        : 'red'
      : 'green');

  const resolvedStatusLabel = status?.label || statusBadge?.label || 'ONLINE';

  // Category accent colors mapping
  const colorMap = {
    rd: {
      text: 'text-[#ff3366]',
      border: 'border-[#ff3366]',
      bgAlpha: 'bg-[rgba(255,51,102,0.13)]',
      glow: 'shadow-[0_0_12px_rgba(255,51,102,0.25)]',
    },
    cy: {
      text: 'text-[#00d4ff]',
      border: 'border-[#00d4ff]',
      bgAlpha: 'bg-[rgba(0,212,255,0.13)]',
      glow: 'shadow-[0_0_12px_rgba(0,212,255,0.25)]',
    },
    pu: {
      text: 'text-[#bd93f9]',
      border: 'border-[#bd93f9]',
      bgAlpha: 'bg-[rgba(189,147,249,0.13)]',
      glow: 'shadow-[0_0_12px_rgba(189,147,249,0.25)]',
    },
    am: {
      text: 'text-[#ffb700]',
      border: 'border-[#ffb700]',
      bgAlpha: 'bg-[rgba(255,183,0,0.13)]',
      glow: 'shadow-[0_0_12px_rgba(255,183,0,0.25)]',
    },
    gn: {
      text: 'text-[#00ff41]',
      border: 'border-[#00ff41]',
      bgAlpha: 'bg-[rgba(0,255,65,0.13)]',
      glow: 'shadow-[0_0_12px_rgba(0,255,65,0.25)]',
    },
  };

  const accent = colorMap[categoryColor] || colorMap.cy;

  // Status indicator styling
  const statusStyles = {
    green: {
      dot: 'bg-[#00ff41] pulse-indicator-gn',
      badge: 'bg-[rgba(0,255,65,0.13)] border-[rgba(0,255,65,0.35)] text-[#00ff41]',
    },
    red: {
      dot: 'bg-[#ff3366] pulse-indicator-rd',
      badge: 'bg-[rgba(255,51,102,0.13)] border-[rgba(255,51,102,0.35)] text-[#ff3366]',
    },
    amber: {
      dot: 'bg-[#ffb700] pulse-indicator-am',
      badge: 'bg-[rgba(255,183,0,0.13)] border-[rgba(255,183,0,0.35)] text-[#ffb700]',
    },
    purple: {
      dot: 'bg-[#bd93f9] pulse-indicator-pu',
      badge: 'bg-[rgba(189,147,249,0.13)] border-[rgba(189,147,249,0.35)] text-[#bd93f9]',
    },
    cyan: {
      dot: 'bg-[#00d4ff] pulse-indicator-cy',
      badge: 'bg-[rgba(0,212,255,0.13)] border-[rgba(0,212,255,0.35)] text-[#00d4ff]',
    },
  };

  const currentStatus = statusStyles[resolvedStatusVariant] || statusStyles.green;

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative rounded-md border transition-all duration-300 font-mono text-[11px] select-none ${
        resolvedDimmed ? 'opacity-20' : 'opacity-100'
      } ${
        isActiveInTrace
          ? `bg-[#21262d] ${accent.border} border-2 ${accent.glow} scale-[1.01]`
          : 'bg-[#161b22] border-[#30363d] hover:border-[#444c56]'
      } p-3 flex flex-col justify-between space-y-2.5`}
    >
      {/* Node Header: Icon, Color-Coded Name, Host */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded border border-[#30363d] bg-[#21262d] flex items-center justify-center shrink-0 ${accent.text}`}
          >
            {icon}
          </div>
          <div className="truncate">
            <h4 className={`text-xs font-bold truncate ${accent.text}`}>{name}</h4>
            {resolvedIp && (
              <span className="text-[10px] text-[#8b949e] font-mono block truncate">
                {resolvedIp}
              </span>
            )}
          </div>
        </div>

        {/* Status indicator badge */}
        <div
          className={`shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider uppercase ${currentStatus.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentStatus.dot}`} />
          <span>{resolvedStatusLabel}</span>
        </div>
      </div>

      {/* Port Numbers & Status Badges */}
      {resolvedPorts && resolvedPorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#30363d]/60">
          <span className="text-[9px] text-[#8b949e] uppercase font-bold mr-1">Ports:</span>
          {resolvedPorts.map((p, idx) => (
            <span
              key={idx}
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                p.isExposed === false
                  ? 'bg-[rgba(255,51,102,0.08)] border-[rgba(255,51,102,0.3)] text-[#ff3366]'
                  : p.isExposed === true
                  ? 'bg-[rgba(0,255,65,0.08)] border-[rgba(0,255,65,0.3)] text-[#00ff41]'
                  : 'bg-[#21262d] border-[#30363d] text-[#c9d1d9]'
              }`}
              title={p.note || (p.isExposed ? 'Port Exposed / Bound' : 'Blocked / Internal Only')}
            >
              {p.port}
            </span>
          ))}
        </div>
      )}

      {/* Technical Details Block */}
      {resolvedFacts && resolvedFacts.length > 0 && (
        <div className="space-y-1 text-[10px] text-[#8b949e] pt-1.5 border-t border-[#30363d]/60">
          {resolvedFacts.map((fact, fIdx) => (
            <div key={fIdx} className="truncate leading-tight">
              <span className="text-[#c9d1d9]">• </span>
              <span>{fact}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
