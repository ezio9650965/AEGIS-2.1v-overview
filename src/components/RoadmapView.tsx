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
      title: 'Week 1: Zone 3 ZTA Gateway Hardening & Sensor Operationalization',
      theme: 'Perimeter Enforcement & Edge Sensors',
      zone: 'Zone 3 (ZTA Gateway - 192.168.19.173)',
      deliverable: 'Hardened Traefik/Coraza/Authelia/Keycloak/Suricata/Zeek Edge Gateway Enclave',
      criteria: 'Dual bridge networks (proxy_net / auth_net internal: true) isolated; Coraza WAF & Suricata IDS active; live-audit confirmed Argon2id 64MB, 72h session TTL, Keycloak prod mode, unique hashes, keypairs regenerated.',
      status: 'completed',
      milestones: [
        { id: 'w1-1', label: 'Configure Traefik TLS termination & Authelia forward-auth with MFA', completed: true },
        { id: 'w1-2', label: 'Deploy Coraza WAF (Caddy + OWASP CRS) & Suricata IDS containers on proxy_net', completed: true },
        { id: 'w1-3', label: 'Bind Authelia, Keycloak (start plain prod), Postgres, & Redis to auth_net (internal: true)', completed: true },
        { id: 'w1-4', label: 'Terminal-confirmed live re-hardening (Argon2id 64MB, 72h sessions, orphan .env deleted, unique eagle hash)', completed: true },
      ],
    },
    {
      week: 2,
      title: 'Week 2: Zone 4 SOC Pipeline & Automation Completion',
      theme: 'Detection Engineering & SOAR Pipeline',
      zone: 'Zone 4 (minisoc1, minisoc2, minisoc3 - 10.16.64.0/24)',
      deliverable: 'Shuffle SOAR "Mahoraga v2.1" Workflow, MITRE-Mapped Wazuh Rules & OpenLDAP Pipeline',
      criteria: 'minisoc3 Docker stack (Shuffle, Logstash, MISP) operational; Filebeat forwarding Traefik/Zeek logs to ES; Shuffle webhook triggering Wazuh Active Response; OpenLDAP identity sync configured.',
      status: 'in-progress',
      milestones: [
        { id: 'w2-1', label: 'Deploy minisoc3 automation stack (Shuffle SOAR, Logstash, MISP split)', completed: true },
        { id: 'w2-2', label: 'Build Shuffle SOAR webhook listener -> MISP lookup -> Wazuh Active Response', completed: false },
        { id: 'w2-3', label: 'Deploy custom local_rules.xml on minisoc2 tagged with MITRE ATT&CK IDs', completed: false },
        { id: 'w2-4', label: 'Configure Gateway Filebeat shipping Traefik, Zeek, and Suricata logs to minisoc1:9200', completed: false },
        { id: 'w2-5', label: 'Establish OpenLDAP pipeline for directory and user attribute synchronization', completed: false },
      ],
    },
    {
      week: 3,
      title: 'Week 3: Zone 2 Enterprise Grid Deployment',
      theme: 'Corporate Domain & Endpoint Instrumentation (External Contributor)',
      zone: 'Zone 2 (Enterprise Grid - 192.168.20.0/24)',
      deliverable: '3-Node Active Directory Corporate Network (CORP-DC01, CORP-PC01, CORP-DB01)',
      criteria: 'External contributor provisioning CORP-DC01 (Win Server 2022 AD DS), joined CORP-PC01 ("Patient Zero" Win10 with Sysmon v15), and deployed CORP-DB01 (Ubuntu PostgreSQL with customer PII); Wazuh Agents registered.',
      status: 'in-progress',
      milestones: [
        { id: 'w3-1', label: 'Promote CORP-DC01 to Active Directory Domain Controller for aegis.corp', completed: false },
        { id: 'w3-2', label: 'Join CORP-PC01 Windows 10 workstation to domain with Sysmon v15 (SwiftOnSecurity config)', completed: false },
        { id: 'w3-3', label: 'Deploy CORP-DB01 Ubuntu 22.04 PostgreSQL server hosting customer PII table', completed: false },
        { id: 'w3-4', label: 'Install & register Wazuh Agents v4.7 across all 3 Zone 2 virtual machines to minisoc2', completed: false },
      ],
    },
    {
      week: 4,
      title: 'Week 4: Zone 1 Threatscape & Red Team Emulation + Jury Validation',
      theme: 'Adversary Simulation & Jury Defense Readiness',
      zone: 'Zone 1 (Threatscape) → All Enclaves',
      deliverable: 'Scripted Attack Framework (Sliver C2, sqlmap, mimikatz), Live 5-Act Jury Demo Rehearsals',
      criteria: 'Sliver C2 mTLS beacon, sqlmap SQLi, and mimikatz LSASS dumps reliably trigger Coraza block and SOAR network isolation within 47s; 5 full dry runs completed.',
      status: 'pending',
      milestones: [
        { id: 'w4-1', label: 'Script automated Red Team attacks: sqlmap SQLi against Juice Shop, mimikatz dump, Sliver C2 beacons', completed: false },
        { id: 'w4-2', label: 'Verify end-to-end detection and response timing (MTTD < 15s, MTTR < 45s)', completed: false },
        { id: 'w4-3', label: 'Execute 5 full dry-run rehearsals of the 15-minute 5-Act Jury Demo Script', completed: false },
        { id: 'w4-4', label: 'Finalize technical documentation, jury presentation slides, and formal architecture sign-off', completed: false },
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
