import React, { useState } from 'react';
import { TRYHACKME_MAP } from '../data/reportData';
import { GraduationCap, Search, MapPin } from 'lucide-react';

export const TryHackMeView: React.FC = () => {
  const [filterZone, setFilterZone] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredTopics = TRYHACKME_MAP.filter((item) => {
    if (filterZone !== 'all' && item.zone !== filterZone) return false;
    if (
      searchQuery &&
      !item.topic.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.implementation.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="pro-title flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#38BDF8]" />
              <span>Section 8: TryHackMe Learning Path Integration Map</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 font-sans">
              Direct mapping of all 19 TryHackMe blue team rooms and SOC topics into explicit AEGIS v2.1 codebase components and artifacts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-8 pr-2 py-1 bg-[#0F172A] border border-[#334155] text-xs text-[#F1F5F9] rounded focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="bg-[#0F172A] border border-[#334155] text-xs text-[#F1F5F9] rounded px-2.5 py-1 focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="all">All Zones</option>
              <option value="Zone 1">Zone 1 (Threatscape)</option>
              <option value="Zone 2">Zone 2 (Enterprise)</option>
              <option value="Zone 3">Zone 3 (Gateway)</option>
              <option value="Zone 4">Zone 4 (MSSP SOC)</option>
              <option value="Docs">Docs</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto font-mono">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-[#38BDF8] border-b border-[#334155]">
                <th className="p-3">TryHackMe Topic Room</th>
                <th className="p-3">AEGIS v2.1 Implementation</th>
                <th className="p-3">Zone Location</th>
                <th className="p-3">Artifact / Code Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] text-[#F1F5F9]/80">
              {filteredTopics.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#0F172A]/50 transition-colors">
                  <td className="p-3 font-bold text-[#F1F5F9]">{item.topic}</td>
                  <td className="p-3 text-[#F1F5F9]/90">{item.implementation}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center gap-1 w-fit">
                      <MapPin className="w-3 h-3" /> {item.zone}
                    </span>
                  </td>
                  <td className="p-3 text-[#FBBF24] font-mono text-[11px]">{item.artifact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
