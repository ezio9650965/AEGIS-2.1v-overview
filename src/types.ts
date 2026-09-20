export interface Section {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  icon: string;
  badge?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'critical' | 'high' | 'medium' | 'jury';
  completed: boolean;
  who?: 'eagle' | 'ezio' | 'both';
}

export interface SecurityDebtItem {
  flaw: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  fix: string;
  evidence: string;
}

export interface KnownIssue {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  impact: string;
  status: 'Open' | 'Unresolved' | 'Pending Rotation';
}

export interface DemoAct {
  act: string;
  title: string;
  duration: string;
  objective: string;
  commands: { cmd: string; output?: string; note?: string }[];
  narrative: string;
}

export interface BugChainItem {
  id: string;
  stage: 'Stage 1: OpenLDAP' | 'Stage 2: Authelia' | 'Stage 3: Keycloak OIDC Federation' | 'Post-Migration Cleanup';
  title: string;
  category: 'OIDC Protocol' | 'Quarkus / JVM' | 'Directory Schema' | 'Network Isolation' | 'Credential Hygiene';
  symptom: string;
  rootCause: string;
  remediation: string;
  inChainOrder?: number;
}

export interface LessonLearnedItem {
  id: string;
  domain: string;
  takeaway: string;
  architecturalContext: string;
  juryDefenseTalkingPoint: string;
}
