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

export interface DemoAct {
  act: string;
  title: string;
  duration: string;
  objective: string;
  commands: { cmd: string; output?: string; note?: string }[];
  narrative: string;
}
