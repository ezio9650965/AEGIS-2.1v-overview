import { jsPDF } from 'jspdf';
import {
  INITIAL_CHECKLIST_DONE,
  INITIAL_CHECKLIST_LEFT,
  SECURITY_DEBT,
  DEMO_ACTS,
  TRYHACKME_MAP,
} from '../data/reportData';

export interface PdfExportOptions {
  mode?: 'full' | 'executive';
  theme?: 'print' | 'soc';
  includeJuryScript?: boolean;
  includeChecklists?: boolean;
  includeSecurityDebt?: boolean;
}

export async function exportAegisPdf(options: PdfExportOptions = {}): Promise<void> {
  const mode = options.mode || 'full';
  const theme = options.theme || 'print';
  const isPrint = theme === 'print';

  // Palette definition
  const colors = isPrint
    ? {
        bg: [255, 255, 255] as [number, number, number],
        panelBg: [248, 250, 252] as [number, number, number],
        panelBorder: [203, 213, 225] as [number, number, number],
        textPrimary: [15, 23, 42] as [number, number, number],
        textSecondary: [71, 85, 105] as [number, number, number],
        textMuted: [148, 163, 184] as [number, number, number],
        primary: [2, 132, 199] as [number, number, number], // Sky 600
        primaryDark: [3, 105, 161] as [number, number, number],
        accent: [14, 165, 233] as [number, number, number],
        success: [22, 163, 74] as [number, number, number],
        successBg: [240, 253, 244] as [number, number, number],
        warning: [217, 119, 6] as [number, number, number],
        warningBg: [254, 243, 199] as [number, number, number],
        danger: [220, 38, 38] as [number, number, number],
        dangerBg: [254, 242, 242] as [number, number, number],
        purple: [126, 34, 206] as [number, number, number],
        codeBg: [241, 245, 249] as [number, number, number],
        headerBar: [15, 23, 42] as [number, number, number],
        headerBarText: [255, 255, 255] as [number, number, number],
      }
    : {
        bg: [11, 17, 32] as [number, number, number],
        panelBg: [30, 41, 59] as [number, number, number],
        panelBorder: [51, 65, 85] as [number, number, number],
        textPrimary: [241, 245, 249] as [number, number, number],
        textSecondary: [148, 163, 184] as [number, number, number],
        textMuted: [100, 116, 139] as [number, number, number],
        primary: [56, 189, 248] as [number, number, number], // Sky 400
        primaryDark: [14, 165, 233] as [number, number, number],
        accent: [56, 189, 248] as [number, number, number],
        success: [74, 222, 128] as [number, number, number],
        successBg: [20, 83, 45] as [number, number, number],
        warning: [245, 158, 11] as [number, number, number],
        warningBg: [120, 53, 15] as [number, number, number],
        danger: [248, 113, 113] as [number, number, number],
        dangerBg: [127, 29, 29] as [number, number, number],
        purple: [192, 132, 252] as [number, number, number],
        codeBg: [15, 23, 42] as [number, number, number],
        headerBar: [15, 23, 42] as [number, number, number],
        headerBarText: [56, 189, 248] as [number, number, number],
      };

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 18;
  let cursorY = 16;

  // Background painter helper
  const paintPageBg = () => {
    if (!isPrint) {
      doc.setFillColor(...colors.bg);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  };

  // Initial background
  paintPageBg();

  // Page break checker
  const checkPageBreak = (neededHeight: number): void => {
    if (cursorY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      paintPageBg();
      cursorY = 20;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textMuted);
    doc.text('[AEGIS v2.1 // SOVEREIGN ZTA GATEWAY & MSSP SOC ARCHITECTURE]', marginX, 10);
    doc.setFont('helvetica', 'normal');
    doc.text('CLASSIFICATION: SOVEREIGN DEFENSE SPEC', pageWidth - marginX, 10, { align: 'right' });

    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.line(marginX, 12, pageWidth - marginX, 12);
  };

  // Section heading helper
  const drawSectionHeading = (num: string, title: string, subtitle?: string) => {
    checkPageBreak(subtitle ? 18 : 14);
    
    // Header accent pill
    doc.setFillColor(...colors.primary);
    doc.rect(marginX, cursorY, 3, 7.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colors.textPrimary);
    doc.text(`${num}. ${title.toUpperCase()}`, marginX + 5, cursorY + 5.5);

    cursorY += 9;

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...colors.textSecondary);
      const splitSub = doc.splitTextToSize(subtitle, contentWidth);
      doc.text(splitSub, marginX, cursorY);
      cursorY += splitSub.length * 3.8 + 2;
    }
  };

  // ==========================================
  // 1. COVER / DOCUMENT HEADER
  // ==========================================
  // Header top badge bar
  doc.setFillColor(...colors.headerBar);
  doc.roundedRect(marginX, cursorY, contentWidth, 24, 1.5, 1.5, 'F');
  
  // Left color accent bar
  doc.setFillColor(...colors.primary);
  doc.rect(marginX, cursorY, 2.5, 24, 'F');

  // Title text inside banner
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...colors.headerBarText);
  doc.text('PROJECT BLUEPRINT // SYNTHESIS & OPERATIONAL SPECIFICATION', marginX + 6, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('AEGIS v2.1: The Achievable Resilient SOC', marginX + 6, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('BeyondCorp-Style Zero-Trust Gateway + Multi-Node MSSP SOC Cluster · PFE 2026', marginX + 6, cursorY + 19);

  // Status badge on the right
  doc.setFillColor(...colors.success);
  doc.roundedRect(pageWidth - marginX - 32, cursorY + 5, 26, 6, 1, 1, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('[ONLINE: v2.1]', pageWidth - marginX - 19, cursorY + 9.2, { align: 'center' });

  cursorY += 28;

  // Metadata Grid Row
  const metaBoxW = (contentWidth - 6) / 3;
  const metaItems = [
    { label: 'LEAD ARCHITECT', val: 'TAIBI MOHAMED ANIS (Ezio)' },
    { label: 'PARADIGM', val: 'Never Trust / Always Verify (ZTA)' },
    { label: 'EXPORT TIMESTAMP', val: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0] },
  ];

  metaItems.forEach((m, i) => {
    const x = marginX + i * (metaBoxW + 3);
    doc.setFillColor(...colors.panelBg);
    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cursorY, metaBoxW, 11, 1, 1, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...colors.textMuted);
    doc.text(m.label, x + 3, cursorY + 4);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...colors.textPrimary);
    doc.text(m.val, x + 3, cursorY + 8.5);
  });

  cursorY += 15;

  // ==========================================
  // 2. EXECUTIVE SUMMARY
  // ==========================================
  drawSectionHeading('1', 'Executive Summary & Architectural Paradigm');

  const execSummaryText =
    'AEGIS is a sovereign, end-to-end cybersecurity architecture built on the fundamental "Never Trust / Always Verify" Zero-Trust Access (ZTA) paradigm. ' +
    'It bridges a local, hardened BeyondCorp-style Edge Gateway with a remote, multi-node Managed Security Service Provider (MSSP) Security Operations Center (SOC). ' +
    'Designed for enterprise resilience, AEGIS enforces strict identity verification, continuous behavioral telemetry, automated threat intelligence enrichment, and autonomous active response across a segmented four-zone hybrid topology.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colors.textPrimary);
  const splitExec = doc.splitTextToSize(execSummaryText, contentWidth);
  doc.text(splitExec, marginX, cursorY);
  cursorY += splitExec.length * 4.2 + 4;

  // 4 KPI Summary Cards
  const kpiCardW = (contentWidth - 9) / 4;
  const kpis = [
    { label: 'ARCHITECTURE STATE', val: '4 Zones Hybrid', sub: 'Local Gateway + Remote SOC', color: colors.primary },
    { label: 'ZONE 3 GATEWAY', val: 'Verified (9/9)', sub: 'Dual-Bridge ZTA Enclave', color: colors.success },
    { label: 'HARDENING REMEDIATION', val: '8/8 Resolved', sub: 'Argon2id, Certs, SQL, Sessions', color: colors.purple },
    { label: 'AUTONOMOUS RESPONSE', val: '47s Latency', sub: 'Shuffle SOAR + Wazuh Drop', color: colors.warning },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = marginX + idx * (kpiCardW + 3);
    doc.setFillColor(...colors.panelBg);
    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(kx, cursorY, kpiCardW, 17, 1, 1, 'FD');

    // Top indicator line
    doc.setFillColor(...kpi.color);
    doc.rect(kx, cursorY, kpiCardW, 1.2, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...colors.textMuted);
    doc.text(kpi.label, kx + 2.5, cursorY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.val, kx + 2.5, cursorY + 10.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textSecondary);
    doc.text(kpi.sub, kx + 2.5, cursorY + 14.5);
  });

  cursorY += 22;

  // ==========================================
  // 3. ARCHITECTURAL TRANSITIONS (v2.0 -> v2.1)
  // ==========================================
  drawSectionHeading('2', 'Tactical Architecture Transitions (v2.0 vs v2.1)');

  const transitions = [
    {
      deprecated: 'GNS3 Virtual Routing Engine: Nested hypervisor routing caused severe I/O contention under concurrent telemetry.',
      implemented: 'Linux Kernel Dual-Bridge: proxy_net (DMZ) and auth_net (internal: true) providing microsecond-level isolation.',
    },
    {
      deprecated: 'Theoretical Scikit-Learn ML: Unverified black box ML script on minisoc3 that failed validation.',
      implemented: 'Deterministic Shuffle SOAR ("Mahoraga v2.1"): Logstash + MISP Abuse.ch feeds + automated Wazuh Active Response.',
    },
    {
      deprecated: 'Single Flat Docker Network: Breached ZTA principles with internal databases exposed directly to host interfaces.',
      implemented: 'Enclave Segregation: Postgres, Redis & Keycloak completely inaccessible from host (zero exposed ports).',
    },
    {
      deprecated: 'Traefik Insecure API & Weak Secrets: Insecure port 8090 exposed, 1-year sessions, embedded RSA keys.',
      implemented: 'Production Hardening: api.insecure: false, Argon2id 64MB memory, 72h sessions, external oidc.key file.',
    },
  ];

  transitions.forEach((t) => {
    checkPageBreak(18);

    const boxW = (contentWidth - 4) / 2;
    // Deprecated side
    const depBg: [number, number, number] = isPrint ? colors.dangerBg : [35, 20, 25];
    doc.setFillColor(...depBg);
    doc.setDrawColor(...colors.danger);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, cursorY, boxW, 16, 1, 1, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.danger);
    doc.text('[DEPRECATED // v2.0 DEFECT]', marginX + 3, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textPrimary);
    const splitDep = doc.splitTextToSize(t.deprecated, boxW - 6);
    doc.text(splitDep, marginX + 3, cursorY + 8);

    // Implemented side
    const rightX = marginX + boxW + 4;
    const impBg: [number, number, number] = isPrint ? colors.successBg : [15, 35, 25];
    doc.setFillColor(...impBg);
    doc.setDrawColor(...colors.success);
    doc.roundedRect(rightX, cursorY, boxW, 16, 1, 1, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.success);
    doc.text('[IMPLEMENTED // v2.1 SPEC]', rightX + 3, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textPrimary);
    const splitImp = doc.splitTextToSize(t.implemented, boxW - 6);
    doc.text(splitImp, rightX + 3, cursorY + 8);

    cursorY += 18;
  });

  cursorY += 3;

  // ==========================================
  // 4. ZERO-TRUST TRAFFIC ROUTING & DEFENSE ENCLAVES
  // ==========================================
  checkPageBreak(40);
  drawSectionHeading('3', 'Zero-Trust Traffic Routing & Kernel Enclave Model');

  const enclaves = [
    {
      title: '1. Ingress & MFA Check',
      desc: 'All external traffic enters Traefik v3.6.1 on ports 80/443. Forward-Auth queries Authelia v4.39.20 (/api/authz/forward-auth) with Redis session cache before granting access.',
      code: 'Traefik :443 -> Forward-Auth -> Authelia -> Redis / Postgres',
    },
    {
      title: '2. Kernel Network Enclaves',
      desc: 'auth_net is configured with internal: true at the kernel namespace layer. PostgreSQL, Redis, and Keycloak have no route to host interfaces or external internet.',
      code: 'proxy_net (DMZ) | auth_net (internal: true Secure Vault)',
    },
    {
      title: '3. In-Line Web Defenses & IDS',
      desc: 'Coraza WAF (Caddy + OWASP CRS) provides inline Layer 7 inspection. Suricata IDS monitors proxy_net with ET ruleset (52,256 rules), and Zeek 5-node cluster sniffs br_proxy.',
      code: 'Coraza WAF (OWASP CRS) + Suricata IDS + Zeek 5-Node Cluster',
    },
    {
      title: '4. Telemetry Stream & SOAR',
      desc: 'Endpoint Wazuh agents communicate over mTLS TCP 1514 through Traefik pass-through. Zeek & Suricata logs ship via Filebeat to Elasticsearch. Shuffle triggers Wazuh Active Response.',
      code: 'Agents -> Traefik TCP 1514 -> Wazuh Manager -> ES -> SOAR',
    },
  ];

  enclaves.forEach((enc) => {
    checkPageBreak(17);
    doc.setFillColor(...colors.panelBg);
    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(marginX, cursorY, contentWidth, 15, 1, 1, 'FD');

    // Accent line
    doc.setFillColor(...colors.primary);
    doc.rect(marginX, cursorY, 2, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colors.textPrimary);
    doc.text(enc.title, marginX + 5, cursorY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textSecondary);
    const splitDesc = doc.splitTextToSize(enc.desc, contentWidth - 10);
    doc.text(splitDesc, marginX + 5, cursorY + 8.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.primaryDark);
    doc.text(`> ${enc.code}`, marginX + 5, cursorY + 13);

    cursorY += 17;
  });

  // ==========================================
  // 5. FOUR-ZONE HYBRID ARCHITECTURE SPECIFICATION
  // ==========================================
  checkPageBreak(50);
  drawSectionHeading('4', 'Four-Zone Hybrid Architecture Specification');

  const zoneTable = [
    { zone: 'Zone 1: Threatscape', ip: '192.168.1.0/24', role: 'Kali Linux (APT / Sliver C2 / sqlmap), REMnux Malware Sandbox', status: 'Ready' },
    { zone: 'Zone 2: Enterprise Grid', ip: '192.168.20.0/24', role: 'CORP-DC01 (Win Server AD DS), CORP-PC01 (Sysmon), CORP-DB01 (PII DB)', status: 'Pending' },
    { zone: 'Zone 3: ZTA Gateway', ip: '192.168.19.173', role: 'Traefik v3.6, Authelia, Keycloak, Postgres, Redis, Coraza WAF, Suricata, Zeek', status: 'Operational' },
    { zone: 'Zone 4: MSSP SOC', ip: '10.16.64.0/24', role: 'minisoc1 (ES 8.19), minisoc2 (Wazuh 4.7/Kibana), minisoc3 (Shuffle SOAR/MISP)', status: 'Verified' },
  ];

  // Table header
  doc.setFillColor(...colors.headerBar);
  doc.rect(marginX, cursorY, contentWidth, 6.5, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ZONE DESIGNATION', marginX + 3, cursorY + 4.5);
  doc.text('CIDR / IP SUBNET', marginX + 48, cursorY + 4.5);
  doc.text('DEPLOYED ROLES & CONTAINERS', marginX + 85, cursorY + 4.5);
  doc.text('STATUS', pageWidth - marginX - 16, cursorY + 4.5, { align: 'right' });
  cursorY += 6.5;

  zoneTable.forEach((zt) => {
    checkPageBreak(10);
    doc.setFillColor(...colors.panelBg);
    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.rect(marginX, cursorY, contentWidth, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...colors.textPrimary);
    doc.text(zt.zone, marginX + 3, cursorY + 5.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textSecondary);
    doc.text(zt.ip, marginX + 48, cursorY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textSecondary);
    const splitRole = doc.splitTextToSize(zt.role, 80);
    doc.text(splitRole[0], marginX + 85, cursorY + 5.5);

    const isDone = zt.status === 'Operational' || zt.status === 'Ready' || zt.status === 'Verified';
    doc.setFillColor(...(isDone ? colors.successBg : colors.warningBg));
    doc.roundedRect(pageWidth - marginX - 22, cursorY + 2, 19, 5, 0.8, 0.8, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(...(isDone ? colors.success : colors.warning));
    doc.text(`[${zt.status}]`, pageWidth - marginX - 12.5, cursorY + 5.5, { align: 'center' });

    cursorY += 9;
  });

  cursorY += 5;

  // ==========================================
  // 6. IMPLEMENTATION CHECKLIST (If mode == 'full')
  // ==========================================
  if (mode === 'full') {
    checkPageBreak(50);
    drawSectionHeading('5', 'Implementation Milestones & Remaining Tasks', 'Audit of 21 verified hardening items and remaining deployment objectives.');

    // Completed highlights
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.success);
    doc.text(`Completed Hardening Milestones (${INITIAL_CHECKLIST_DONE.length} Verified Items)`, marginX, cursorY);
    cursorY += 4.5;

    INITIAL_CHECKLIST_DONE.slice(0, 10).forEach((item) => {
      checkPageBreak(7);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.success);
      doc.text('[DONE]', marginX, cursorY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.textPrimary);
      doc.text(item.title, marginX + 13, cursorY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textSecondary);
      const splitDesc = doc.splitTextToSize(item.description, contentWidth - 15);
      doc.text(splitDesc[0], marginX + 13, cursorY + 6.8);

      cursorY += 8;
    });

    cursorY += 3;
    checkPageBreak(30);

    // Remaining items
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.warning);
    doc.text(`Actionable Remaining Objectives (${INITIAL_CHECKLIST_LEFT.length} Items)`, marginX, cursorY);
    cursorY += 4.5;

    INITIAL_CHECKLIST_LEFT.slice(0, 8).forEach((item) => {
      checkPageBreak(7);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.warning);
      doc.text('[TODO]', marginX, cursorY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.textPrimary);
      doc.text(item.title, marginX + 13, cursorY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textSecondary);
      const splitDesc = doc.splitTextToSize(item.description, contentWidth - 15);
      doc.text(splitDesc[0], marginX + 13, cursorY + 6.8);

      cursorY += 8;
    });

    cursorY += 4;
  }

  // ==========================================
  // 7. SECURITY DEBT REGISTER
  // ==========================================
  if (mode === 'full') {
    checkPageBreak(40);
    drawSectionHeading('6', 'Security Debt Remediation Register', 'Exhaustive log of security debt flaws remediated between v2.0 and v2.1.');

    // Table header
    doc.setFillColor(...colors.headerBar);
    doc.rect(marginX, cursorY, contentWidth, 6, 'F');
    doc.setFont('courier', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SECURITY FLAW / DEFECT', marginX + 3, cursorY + 4.2);
    doc.text('SEVERITY', marginX + 65, cursorY + 4.2);
    doc.text('REMEDIATION IMPLEMENTED (v2.1)', marginX + 85, cursorY + 4.2);
    cursorY += 6;

    SECURITY_DEBT.slice(0, 8).forEach((sd) => {
      checkPageBreak(8);
      doc.setFillColor(...colors.panelBg);
      doc.setDrawColor(...colors.panelBorder);
      doc.setLineWidth(0.2);
      doc.rect(marginX, cursorY, contentWidth, 7.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textPrimary);
      doc.text(sd.flaw.substring(0, 42), marginX + 3, cursorY + 4.8);

      const sevColor = sd.severity === 'Critical' ? colors.danger : sd.severity === 'High' ? colors.warning : colors.primary;
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...sevColor);
      doc.text(`[${sd.severity.toUpperCase()}]`, marginX + 65, cursorY + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textSecondary);
      doc.text(sd.fix.substring(0, 68), marginX + 85, cursorY + 4.8);

      cursorY += 7.5;
    });

    cursorY += 5;
  }

  // ==========================================
  // 8. 15-MINUTE JURY DEMONSTRATION SCRIPT
  // ==========================================
  if (mode === 'full') {
    checkPageBreak(40);
    drawSectionHeading('7', '15-Minute Jury Demonstration Script (Acts I - V)');

    DEMO_ACTS.forEach((act) => {
      checkPageBreak(16);
      doc.setFillColor(...colors.panelBg);
      doc.setDrawColor(...colors.panelBorder);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginX, cursorY, contentWidth, 14.5, 1, 1, 'FD');

      doc.setFillColor(...colors.primary);
      doc.rect(marginX, cursorY, 2, 14.5, 'F');

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...colors.primary);
      doc.text(`${act.act}: ${act.title.toUpperCase()} (${act.duration})`, marginX + 5, cursorY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(...colors.textPrimary);
      const splitObj = doc.splitTextToSize(act.objective, contentWidth - 10);
      doc.text(splitObj[0], marginX + 5, cursorY + 8.2);

      if (act.commands[0]) {
        doc.setFont('courier', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...colors.textMuted);
        doc.text(`$ ${act.commands[0].cmd}`, marginX + 5, cursorY + 12);
      }

      cursorY += 16;
    });

    cursorY += 4;
  }

  // ==========================================
  // 9. TRYHACKME INTEGRATION MATRIX
  // ==========================================
  if (mode === 'full') {
    checkPageBreak(35);
    drawSectionHeading('8', 'TryHackMe Competency & Topic Mapping (19 Topics)');

    const thmTopics = TRYHACKME_MAP.slice(0, 6);
    thmTopics.forEach((thm) => {
      checkPageBreak(7);
      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.primary);
      doc.text(`[${thm.zone}]`, marginX, cursorY + 3.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...colors.textPrimary);
      doc.text(thm.topic, marginX + 22, cursorY + 3.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(...colors.textSecondary);
      doc.text(thm.implementation.substring(0, 60), marginX + 65, cursorY + 3.5);

      doc.setFont('courier', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(...colors.textMuted);
      doc.text(thm.artifact.substring(0, 35), pageWidth - marginX, cursorY + 3.5, { align: 'right' });

      cursorY += 6;
    });

    cursorY += 6;
  }

  // ==========================================
  // 10. FORMAL SIGN-OFF & VERIFICATION SEAL
  // ==========================================
  checkPageBreak(25);
  doc.setFillColor(...colors.panelBg);
  doc.setDrawColor(...colors.panelBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cursorY, contentWidth, 20, 1.5, 1.5, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...colors.primary);
  doc.text('DOCUMENT ATTESTATION & ARCHITECTURAL SIGN-OFF', marginX + 4, cursorY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...colors.textSecondary);
  doc.text(
    'This document represents the formal architecture blueprint and operational evaluation for AEGIS v2.1. All Zero-Trust assertions, ' +
    'forward-auth integrations, and enclave isolations have been rigorously designed and validated for academic and enterprise defense evaluation.',
    marginX + 4,
    cursorY + 9.5,
    { maxWidth: contentWidth - 8 }
  );

  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...colors.textPrimary);
  doc.text('LEAD ARCHITECT: TAIBI MOHAMED ANIS (Ezio)', marginX + 4, cursorY + 17);
  doc.text('STATUS: SOVEREIGN DEFENSE SPEC APPROVED', pageWidth - marginX - 4, cursorY + 17, { align: 'right' });

  // ==========================================
  // FOOTER & PAGE NUMBERS (Post-processing)
  // ==========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running footer
    doc.setDrawColor(...colors.panelBorder);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);

    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.textMuted);
    doc.text('AEGIS v2.1 // SOVEREIGN ZERO-TRUST GATEWAY & MSSP SOC SPECIFICATION', marginX, pageHeight - 6.5);

    doc.setFont('courier', 'bold');
    doc.text(`PAGE ${p} OF ${totalPages}`, pageWidth - marginX, pageHeight - 6.5, { align: 'right' });
  }

  // Save the PDF
  const filename = mode === 'full' 
    ? `AEGIS_v2.1_Master_Architecture_Report_${theme}.pdf` 
    : `AEGIS_v2.1_Executive_Summary_${theme}.pdf`;

  doc.save(filename);
}
