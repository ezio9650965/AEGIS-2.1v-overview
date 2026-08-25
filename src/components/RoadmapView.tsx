import React, { useState } from 'react';
import { Calendar, CheckCircle, Clock, CheckCircle2, ChevronRight, Zap, Target, ShieldCheck } from 'lucide-react';

interface Milestone {
  id: string;
  label: string;
  completed: boolean;
}

interface WeekPlan {
  week: number;
  title: string;
  theme: string;
  zone: string;
  deliverable: string;
  criteria: string;
  status: 'completed' | 'in-progress' | 'pending';
  milestones: Milestone[];
}

export const RoadmapView: React.FC = () => {
  const [selectedWeek, setSelectedWeek] = useState<number | 'all'>('all');

  const [weeks, setWeeks] = useState<WeekPlan[]>([
    {
      week: 1,
      title: 'Week 1: Core Enclaves & Zero-Trust Access Gateway',
      theme: 'Core Infrastructure & ZTA Edge',
      zone: 'Zone 2 (Grid) & Zone 3 (Gateway)',
      deliverable: '3-Node Windows/Linux AD Grid + Hardened Traefik/Coraza/Authelia/Zeek Edge Enclave',
      criteria: 'CORP-DC01 promoted to AD DS aegis.corp; PC01 joined; Dual bridge networks (proxy_net/auth_net internal: true) isolated; 100% security debt resolved.',
      status: 'completed',
      milestones: [
        { id: 'w1-1', label: 'Promote CORP-DC01 Win Server 2022 AD DS domain (aegis.corp)', completed: true },
        { id: 'w1-2', label: 'Configure Traefik HTTPS TLS termination & Authelia forward-auth', completed: true },
        { id: 'w1-3', label: 'Deploy Coraza WAF & Suricata IDS containers on proxy_net', completed: true },
        { id: 'w1-4', label: 'Bind PostgreSQL & Redis exclusively to isolated auth_net bridge', completed: true },
      ],
    },
    {
      week: 2,
      title: 'Week 2: Distributed MSSP SOC Cluster & Unified Ingestion',
      theme: 'SOC Architecture & Log Pipeline',
      zone: 'Zone 4 (minisoc1, minisoc2, minisoc3)',
      deliverable: '3-Node AlmaLinux SOC Cluster (ES 8.19, Wazuh 4.7, Kibana, Logstash) & Unified Log Shipping',
      criteria: 'minisoc1/2/3 linked over 10.16.64.0/24 enclave; Filebeat shipping Traefik, Zeek, Suricata, & Sysmon v15 logs to ES.',
      status: 'completed',
      milestones: [
        { id: 'w2-1', label: 'Provision minisoc1 (ES 8.19), minisoc2 (Wazuh/Kibana), minisoc3 (SOAR/MISP)', completed: true },
        { id: 'w2-2', label: 'Deploy Sysmon v15 + Wazuh agent on CORP-PC01 patient zero workstation', completed: true },
        { id: 'w2-3', label: 'Configure Filebeat JSON access log shipping from Traefik and Zeek to ES', completed: true },
        { id: 'w2-4', label: 'Verify log pipeline indexing rate in Kibana Discover', completed: true },
      ],
    },
    {
      week: 3,
      title: 'Week 3: Threat Intelligence, Detection Engineering & SOAR',
      theme: 'Threat Intel Sync & SOAR Workflows',
      zone: 'Zone 4 (minisoc3 & minisoc2)',
      deliverable: 'MISP Threat Intel Engine + Abuse.ch Feeds, MITRE-Tagged Wazuh Rule Suite, & Shuffle SOAR ("Mahoraga v2.1")',
      criteria: 'MISP auto-ingesting URLhaus/Feodo feeds; Local Wazuh rules mapped to MITRE ATT&CK IDs; Shuffle workflow executing active host isolation.',
      status: 'in-progress',
      milestones: [
        { id: 'w3-1', label: 'Configure MISP Abuse.ch auto-ingestion (URLhaus, MalwareBazaar, Feodo Tracker)', completed: true },
        { id: 'w3-2', label: 'Write local_rules.xml in Wazuh Manager mapped with mitre.id tags', completed: true },
        { id: 'w3-3', label: 'Build Shuffle SOAR webhook listener -> MISP lookup -> Wazuh Active Response', completed: true },
        { id: 'w3-4', label: 'Draft 3 L1 SOC Playbooks (Brute-Force, Malware, Exfiltration) in Markdown', completed: false },
      ],
    },
    {
      week: 4,
      title: 'Week 4: Red Team Validation, Jury Script & Rehearsals',
      theme: 'Attack Validation & Jury Readiness',
      zone: 'Zone 1 (Threatscape) → All Enclaves',
      deliverable: 'Scripted Attack Execution (Sliver C2, sqlmap, mimikatz), Full System Rehearsal, & Jury Demo Acceptance',
      criteria: 'Sliver C2 beacons & LSASS dumps trigger instant SOAR alert & network isolation within 47s; 5 full dry-run rehearsals executed.',
      status: 'in-progress',
      milestones: [
        { id: 'w4-1', label: 'Script reproducible Red Team attacks: sqlmap SQLi, mimikatz dump, Sliver C2', completed: true },
        { id: 'w4-2', label: 'Validate end-to-end response timing (MTTD < 15s, MTTR < 45s)', completed: true },
        { id: 'w4-3', label: 'Complete 15-minute 5-Act Jury Demo Script rehearsals (5 dry runs)', completed: false },
        { id: 'w4-4', label: 'Finalize AEGIS v2.1 master architecture documentation & presentation deck', completed: false },
      ],
    },
  ]);

  const toggleMilestone = (weekNum: number, milestoneId: string) => {
    setWeeks((prevWeeks) =>
      prevWeeks.map((w) => {
        if (w.week !== weekNum) return w;
        const updatedMilestones = w.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const allCompleted = updatedMilestones.every((m) => m.completed);
        const someCompleted = updatedMilestones.some((m) => m.completed);
        const status: 'completed' | 'in-progress' | 'pending' = allCompleted
          ? 'completed'
          : someCompleted
          ? 'in-progress'
          : 'pending';
        return { ...w, milestones: updatedMilestones, status };
      })
    );
  };

  const filteredWeeks = weeks.filter((w) => selectedWeek === 'all' || w.week === selectedWeek);

  const totalMilestones = weeks.reduce((sum, w) => sum + w.milestones.length, 0);
  const completedMilestones = weeks.reduce(
    (sum, w) => sum + w.milestones.filter((m) => m.completed).length,
    0
  );
  const progressPercent = Math.round((completedMilestones / totalMilestones) * 100);

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="pro-title flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#38BDF8]" />
              <span>Section 6: 4-Week Fast-Track Execution Roadmap</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Structured 4-week Gantt-style deployment timeline for AEGIS v2.1, mapping infrastructure enclaves to weekly operational milestones.
            </p>
          </div>

          {/* Week Filter Buttons */}
          <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded border border-[#334155] font-mono text-xs">
            <button
              onClick={() => setSelectedWeek('all')}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                selectedWeek === 'all'
                  ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              All 4 Weeks
            </button>
            {[1, 2, 3, 4].map((wNum) => (
              <button
                key={wNum}
                onClick={() => setSelectedWeek(wNum)}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                  selectedWeek === wNum
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 font-bold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                Week {wNum}
              </button>
            ))}
          </div>
        </div>

        {/* Global Roadmap Progress Bar */}
        <div className="bg-[#0F172A] p-4 rounded-lg border border-[#334155] mb-6 font-mono">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#F1F5F9] font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
              <span>4-Week Deployment Completion Rate</span>
            </span>
            <span className="text-[#38BDF8] font-bold">{completedMilestones} / {totalMilestones} Milestones ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-[#1E293B] h-2.5 rounded-full overflow-hidden border border-[#334155]">
            <div
              className="bg-gradient-to-r from-[#38BDF8] to-[#4ADE80] h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* 4 Weeks Cards */}
        <div className="space-y-4 font-mono">
          {filteredWeeks.map((w) => (
            <div
              key={w.week}
              className={`p-5 rounded-lg border transition-all ${
                w.status === 'completed'
                  ? 'bg-[#0F172A]/80 border-[#4ADE80]/40'
                  : w.status === 'in-progress'
                  ? 'bg-[#0F172A] border-[#38BDF8]/40 shadow-md shadow-[#38BDF8]/5'
                  : 'bg-[#0F172A]/40 border-[#334155]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      w.status === 'completed'
                        ? 'bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40'
                        : w.status === 'in-progress'
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 animate-pulse'
                        : 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
                    }`}
                  >
                    W{w.week}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#F1F5F9] uppercase font-mono">{w.title}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-[#38BDF8] font-mono mt-0.5">
                      <span>{w.theme}</span>
                      <span>•</span>
                      <span className="text-purple-300">{w.zone}</span>
                    </div>
                  </div>
                </div>

                <div>
                  {w.status === 'completed' && (
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 flex items-center gap-1 font-mono">
                      <CheckCircle className="w-3.5 h-3.5" /> Week Complete
                    </span>
                  )}
                  {w.status === 'in-progress' && (
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40 flex items-center gap-1 font-mono">
                      <Clock className="w-3.5 h-3.5 animate-spin" /> Active Execution Week
                    </span>
                  )}
                  {w.status === 'pending' && (
                    <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-[#1E293B] text-[#94A3B8] border border-[#334155] font-mono">
                      Scheduled Phase
                    </span>
                  )}
                </div>
              </div>

              {/* Deliverable & Criteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#1E293B]/60 p-3 rounded border border-[#334155]/60 mb-3">
                <div>
                  <span className="text-[#38BDF8] text-[10px] block uppercase font-bold font-mono">Primary Deliverable</span>
                  <span className="text-[#F1F5F9] font-medium font-mono">{w.deliverable}</span>
                </div>
                <div>
                  <span className="text-[#4ADE80] text-[10px] block uppercase font-bold font-mono">Acceptance Criteria</span>
                  <span className="text-[#94A3B8] font-mono">{w.criteria}</span>
                </div>
              </div>

              {/* Interactive Milestones Checklist */}
              <div className="space-y-1.5 pt-2 border-t border-[#334155]">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase block mb-1">
                  Weekly Sub-Milestones (Click to toggle completion):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {w.milestones.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => toggleMilestone(w.week, m.id)}
                      className={`p-2 rounded border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                        m.completed
                          ? 'bg-[#0F172A]/90 border-[#4ADE80]/30 text-[#94A3B8]'
                          : 'bg-[#1E293B] border-[#334155] text-[#F1F5F9] hover:border-[#38BDF8]/50'
                      }`}
                    >
                      <button className="shrink-0 focus:outline-none">
                        {m.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#94A3B8]"></div>
                        )}
                      </button>
                      <span className={m.completed ? 'line-through text-[#94A3B8]' : 'text-[#F1F5F9]'}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
