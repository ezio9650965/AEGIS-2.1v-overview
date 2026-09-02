import React from 'react';
import { Section } from '../types';
import {
  Shield,
  ShieldCheck,
  Network,
  Layers,
  CheckCircle2,
  ListTodo,
  Calendar,
  Bug,
  GraduationCap,
  Play,
  FolderTree,
  Search,
} from 'lucide-react';

interface NavigationProps {
  sections: Section[];
  activeSection: string;
  onSelectSection: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  completedDoneCount: number;
  totalDoneCount: number;
  completedLeftCount: number;
  totalLeftCount: number;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Shield,
  ShieldCheck,
  Network,
  Layers,
  CheckCircle2,
  ListTodo,
  Calendar,
  Bug,
  GraduationCap,
  Play,
  FolderTree,
};

export const Navigation: React.FC<NavigationProps> = ({
  sections,
  activeSection,
  onSelectSection,
  searchQuery,
  onSearchChange,
  completedDoneCount,
  totalDoneCount,
  completedLeftCount,
  totalLeftCount,
}) => {
  return (
    <aside className="w-full lg:w-72 shrink-0 bg-[#1E293B] border-r border-[#334155] p-4 flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search blueprint sections..."
          className="w-full pl-9 pr-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded text-xs font-mono text-[#F1F5F9] placeholder-[#94A3B8]/60 focus:outline-none focus:border-[#38BDF8] transition-colors"
        />
      </div>

      {/* Progress metrics */}
      <div className="bg-[#0F172A] border border-[#334155] rounded p-3 font-mono text-xs flex flex-col gap-2">
        <div className="flex justify-between items-center text-[#94A3B8]">
          <span>Current Done:</span>
          <span className="text-[#4ADE80] font-bold">{completedDoneCount}/{totalDoneCount} verified</span>
        </div>
        <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden border border-[#334155]">
          <div
            className="bg-[#4ADE80] h-full transition-all duration-300"
            style={{ width: `${(completedDoneCount / totalDoneCount) * 100}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center text-[#94A3B8] mt-1">
          <span>Remaining Tasks:</span>
          <span className="text-[#FBBF24] font-bold">{completedLeftCount}/{totalLeftCount} done</span>
        </div>
        <div className="w-full bg-[#1E293B] h-1.5 rounded-full overflow-hidden border border-[#334155]">
          <div
            className="bg-[#FBBF24] h-full transition-all duration-300"
            style={{ width: `${(completedLeftCount / totalLeftCount) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Section List */}
      <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        <div className="pro-title mb-2">
          Report Sections
        </div>
        {sections.map((sec) => {
          const IconComp = ICON_MAP[sec.icon] || Shield;
          const isActive = activeSection === sec.id;

          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`flex items-center justify-between px-3 py-2 rounded font-mono text-xs transition-all text-left group cursor-pointer ${
                isActive
                  ? 'bg-[#38BDF8]/15 border border-[#38BDF8]/50 text-[#38BDF8] font-semibold glow-cyan-active'
                  : 'hover:bg-[#0F172A] border border-transparent text-[#94A3B8] hover:text-[#F1F5F9] glow-cyan-hover'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isActive ? 'bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/40' : 'bg-[#0F172A] text-[#94A3B8] group-hover:text-[#F1F5F9]'
                  }`}
                >
                  {sec.number}
                </span>
                <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8] group-hover:text-[#F1F5F9]'}`} />
                <span className="truncate">{sec.shortTitle}</span>
              </div>
              {sec.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${
                    isActive
                      ? 'border-[#38BDF8]/40 bg-[#38BDF8]/20 text-[#38BDF8]'
                      : 'border-[#334155] bg-[#0F172A] text-[#94A3B8]'
                  }`}
                >
                  {sec.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
