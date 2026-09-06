import React, { useState } from 'react';
import {
  Workflow,
  Globe,
  Briefcase,
  ShieldCheck,
  Lock,
  Server,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Key,
} from 'lucide-react';

export const CustomerVsEmployeeFlow: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<'both' | 'customer' | 'employee'>('both');

  const showCustomer = selectedPath === 'both' || selectedPath === 'customer';
  const showEmployee = selectedPath === 'both' || selectedPath === 'employee';

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Path Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0B1120] border border-[#334155] rounded-lg">
        <div className="flex items-center gap-2 font-mono">
          <Workflow className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-xs">Interactive Path Explorer:</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <button
            onClick={() => setSelectedPath('both')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedPath === 'both'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            Show Full Dual-Path
          </button>
          <button
            onClick={() => setSelectedPath('customer')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedPath === 'customer'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            🟢 Customer Path (Bypass)
          </button>
          <button
            onClick={() => setSelectedPath('employee')}
            className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
              selectedPath === 'employee'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'bg-[#1E293B] text-[#94A3B8] hover:text-white border border-[#334155]'
            }`}
          >
            🔵 Employee Path (2FA Gate)
          </button>
        </div>
      </div>

      {/* Main Flow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Stage 1: Inbound Traffic & Ingress (Col 1-4) */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>1. Inbound Ingress & Identity Context</span>
          </div>

          {/* Customer Node */}
          {showCustomer && (
            <div
              onClick={() => setSelectedPath('customer')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedPath === 'customer'
                  ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-500/10'
                  : 'bg-[#0F172A] border-emerald-500/30 hover:border-emerald-500/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-mono">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400 text-xs">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Public Consumer / Customer</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  Anonymous Web
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                External browser visiting <code className="text-white font-mono">shop.zerotrust.lan</code> to browse products and checkout.
              </p>
            </div>
          )}

          {/* Employee Node */}
          {showEmployee && (
            <div
              onClick={() => setSelectedPath('employee')}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                selectedPath === 'employee'
                  ? 'bg-sky-950/40 border-sky-400 shadow-lg shadow-sky-500/10'
                  : 'bg-[#0F172A] border-sky-500/30 hover:border-sky-500/60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-mono">
                <span className="flex items-center gap-1.5 font-bold text-sky-400 text-xs">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Internal Employee / Administrator</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                  aegis.corp Principal
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Domain user attempting access to <code className="text-white font-mono">*.zerotrust.lan</code> or <code className="text-white font-mono">shop.zerotrust.lan/admin</code>.
              </p>
            </div>
          )}

          {/* Traefik Router Node */}
          <div className="p-3.5 rounded-lg bg-[#1E293B] border border-[#334155] shadow-md">
            <div className="flex items-center justify-between mb-1 font-mono">
              <span className="flex items-center gap-1.5 font-bold text-white text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Traefik v3 Edge Gateway Router</span>
              </span>
              <span className="text-[9px] text-cyan-300 font-mono">:443 TLS</span>
            </div>
            <div className="text-[11px] text-[#94A3B8] mb-2 font-mono">
              Evaluates Host (`shop.zerotrust.lan` vs `*.zerotrust.lan`) and Path (`/admin.*`)
            </div>
            <div className="text-[10px] text-cyan-200 bg-[#0F172A] p-2 rounded border border-[#334155] font-mono">
              Traefik dynamic forward-auth middleware routes requests based on configuration.yml rules.
            </div>
          </div>
        </div>

        {/* Stage 2 & 3: Enforcement & Path Separation (Col 5-12) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Top Branch: Customer Bypass Path */}
          {showCustomer && (
            <div className="p-4 rounded-lg bg-[#0F172A] border-2 border-emerald-500/40 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Branch A: Customer Authentication Path (policy: bypass)</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  Zero Corporate 2FA Required
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded bg-[#1E293B] border border-[#334155]">
                  <div className="font-bold text-white text-xs mb-1 font-mono">1. Authelia Bypass Rule</div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Traefik matches domain <code className="text-white font-mono">shop.zerotrust.lan</code>. Authelia returns HTTP 200 immediately without redirecting to login portal.
                  </p>
                </div>

                <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30">
                  <div className="font-bold text-emerald-300 text-xs mb-1 font-mono flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>2. Direct Storefront Access</span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Customer reaches Juice Shop natively. Authentication uses application's local user table. Conversion and shopping cart UX remain fast and friction-free.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Branch: Employee 2FA Gate */}
          {showEmployee && (
            <div className="p-4 rounded-lg bg-[#0F172A] border-2 border-sky-500/40 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span>Branch B: Employee / Admin Authentication Path (policy: two_factor)</span>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold">
                  Strict AD Group RBAC + TOTP MFA
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Step 1: Forward-Auth & Session Check */}
                <div className="p-3 rounded bg-[#1E293B] border border-[#334155]">
                  <div className="font-bold text-sky-300 text-xs mb-1 font-mono">1. Session & Token Check</div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Authelia inspects Redis session cache and Keycloak OIDC tokens. If invalid or missing, redirects user to Keycloak login.
                  </p>
                </div>

                {/* Step 2: AD Group & Step-Up MFA */}
                <div className="p-3 rounded bg-[#1E293B] border border-[#334155]">
                  <div className="font-bold text-amber-300 text-xs mb-1 font-mono">2. AD Check & Step-Up 2FA</div>
                  <p className="text-[11px] text-[#94A3B8]">
                    Validates AD group in <code className="text-white font-mono">aegis.corp</code>. Requires TOTP or hardware key verification before granting sensitive access.
                  </p>
                </div>

                {/* Step 3: Authorization Result */}
                <div className="p-3 rounded bg-[#1E293B] border border-[#334155]">
                  <div className="font-bold text-white text-xs mb-1 font-mono">3. Access Enforcement</div>
                  <div className="text-[10px] space-y-1 font-mono mt-1">
                    <div className="text-emerald-400 font-semibold">✔ Match: HTTP 200 to App</div>
                    <div className="text-rose-400 font-semibold">✕ Mismatch: HTTP 403 Denied</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
