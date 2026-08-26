import React, { useEffect, useState } from 'react';

interface TerminalBootScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  { text: '[0.0001] INITIALIZING AEGIS v2.1 ZERO-TRUST DEFENSE ARCHITECTURE...', color: 'text-[#4ADE80]' },
  { text: '[0.0240] VERIFYING KERNEL DUAL-BRIDGE ENCLAVES (proxy_net / auth_net)... [OK]', color: 'text-[#38BDF8]' },
  { text: '[0.0680] PROBING FORWARD-AUTH & CONTINUOUS 2FA (Authelia v4.39.20)... [ACTIVE]', color: 'text-[#4ADE80]' },
  { text: '[0.1140] ATTACHING INLINE CORAZA WAF & SURICATA IDS (52,256 RULES)... [LOADED]', color: 'text-[#4ADE80]' },
  { text: '[0.1580] SYNCING ZEEK 5-NODE NTA CLUSTER (br_proxy, ens34, ens33)... [RUNNING]', color: 'text-[#38BDF8]' },
  { text: '[0.2040] ESTABLISHING SECURE mTLS CHANNEL TO ZONE 4 SOC (10.16.64.155-157)... [CONNECTED]', color: 'text-[#A855F7]' },
  { text: '[0.2600] INITIALIZING MAHORAGA v2.1 DETERMINISTIC SOAR ENGINE... [READY]', color: 'text-[#F59E0B]' },
  { text: '[0.3000] ACCESS GRANTED. LAUNCHING AEGIS v2.1 OPERATIONAL DASHBOARD...', color: 'text-[#4ADE80]' },
];

export const TerminalBootScreen: React.FC<TerminalBootScreenProps> = ({ onComplete }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Quick interval for each line (total ~1.8s)
    const interval = setInterval(() => {
      setCurrentLineIndex((prev) => {
        if (prev < BOOT_LOGS.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(onComplete, 400);
          }, 350);
          return prev;
        }
      });
    }, 220);

    const handleSkip = () => {
      clearInterval(interval);
      setIsFadingOut(true);
      setTimeout(onComplete, 200);
    };

    window.addEventListener('keydown', handleSkip);
    window.addEventListener('click', handleSkip);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleSkip);
      window.removeEventListener('click', handleSkip);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0A0E17] flex flex-col justify-between p-6 md:p-12 font-mono transition-opacity duration-400 select-none cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-center justify-between border-b border-[#334155] pb-3 text-xs text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
          <span className="text-[#38BDF8] font-bold">AEGIS_OS v2.1 // SOVEREIGN ZERO-TRUST TERMINAL</span>
        </div>
        <div className="text-[10px] text-[#94A3B8] hidden sm:block">
          ARCH: x86_64 // TARGET: 4-ZONE DEFENSE GRID
        </div>
      </div>

      {/* Terminal Boot Log Content */}
      <div className="my-auto space-y-2 text-xs md:text-sm max-w-4xl">
        <div className="text-[#94A3B8] text-[11px] mb-4">
          {'=========================================================================='}
          <br />
          {'   AEGIS v2.1 ARCHITECTURAL SYSTEM BOOTSTRAP — PFE DEFENSE 2026'}
          <br />
          {'=========================================================================='}
        </div>

        {BOOT_LOGS.slice(0, currentLineIndex + 1).map((log, idx) => (
          <div key={idx} className={`${log.color} flex items-start gap-2 leading-relaxed`}>
            <span className="text-[#94A3B8] select-none">&gt;</span>
            <span>{log.text}</span>
          </div>
        ))}

        {currentLineIndex < BOOT_LOGS.length && (
          <div className="flex items-center gap-1 text-[#4ADE80] mt-3">
            <span className="text-[#94A3B8]">&gt;</span>
            <span className="terminal-cursor text-base">▊</span>
          </div>
        )}
      </div>

      {/* Bottom helper prompt */}
      <div className="border-t border-[#334155] pt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded bg-[#334155] text-white text-[10px]">SPACE / CLICK</span>
          <span>Press any key or click anywhere to SKIP boot sequence</span>
        </div>
        <div className="text-[#4ADE80] font-bold">
          [SYSTEM_BOOT]
        </div>
      </div>
    </div>
  );
};
