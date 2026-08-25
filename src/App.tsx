import React, { useState } from 'react';
import { ChecklistItem } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ExecutiveSummaryView } from './components/ExecutiveSummaryView';
import { MasterTopologyView } from './components/MasterTopologyView';
import { SubTopologiesView } from './components/SubTopologiesView';
import { ChecklistsView } from './components/ChecklistsView';
import { RoadmapView } from './components/RoadmapView';
import { SecurityDebtView } from './components/SecurityDebtView';
import { TryHackMeView } from './components/TryHackMeView';
import { JuryDemoView } from './components/JuryDemoView';
import { FileStructureView } from './components/FileStructureView';

import {
  SECTIONS,
  INITIAL_CHECKLIST_DONE,
  INITIAL_CHECKLIST_LEFT,
} from './data/reportData';

export default function App() {
  const [activeSectionId, setActiveSectionId] = useState<string>('sec-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [doneItems, setDoneItems] = useState(INITIAL_CHECKLIST_DONE);
  const [leftItems, setLeftItems] = useState(INITIAL_CHECKLIST_LEFT);

  const handleToggleChecklist = (id: string, isDoneList: boolean) => {
    if (isDoneList) {
      setDoneItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
      );
    } else {
      setLeftItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
      );
    }
  };

  const handleAddItem = (newItemData: Omit<ChecklistItem, 'id'>, isDoneList: boolean) => {
    const newItem: ChecklistItem = {
      ...newItemData,
      id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    };
    if (isDoneList) {
      setDoneItems((prev) => [newItem, ...prev]);
    } else {
      setLeftItems((prev) => [newItem, ...prev]);
    }
  };

  const handleModifyItem = (updatedItem: ChecklistItem, isDoneList: boolean) => {
    if (isDoneList) {
      setDoneItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    } else {
      setLeftItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
    }
  };

  const handleRemoveItem = (id: string, isDoneList: boolean) => {
    if (isDoneList) {
      setDoneItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setLeftItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleMoveItem = (id: string, fromDoneList: boolean) => {
    if (fromDoneList) {
      const itemToMove = doneItems.find((i) => i.id === id);
      if (itemToMove) {
        setDoneItems((prev) => prev.filter((i) => i.id !== id));
        setLeftItems((prev) => [{ ...itemToMove, completed: false }, ...prev]);
      }
    } else {
      const itemToMove = leftItems.find((i) => i.id === id);
      if (itemToMove) {
        setLeftItems((prev) => prev.filter((i) => i.id !== id));
        setDoneItems((prev) => [{ ...itemToMove, completed: true }, ...prev]);
      }
    }
  };

  const handleExportMarkdown = () => {
    // Read or trigger download of AEGIS_v2.1_Report_and_Blueprint.md content
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/markdown;charset=utf-8,' +
        encodeURIComponent(`# AEGIS v2.1: Project Report & Master Architecture Blueprint\n\nFull master document available at /AEGIS_v2.1_Report_and_Blueprint.md in the project root.`)
    );
    element.setAttribute('download', 'AEGIS_v2.1_Project_Report_and_Blueprint.md');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const completedDoneCount = doneItems.filter((i) => i.completed).length;
  const completedLeftCount = leftItems.filter((i) => i.completed).length;

  const filteredSections = SECTIONS.filter((sec) => {
    if (!searchQuery) return true;
    return (
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.shortTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const renderActiveSection = () => {
    switch (activeSectionId) {
      case 'sec-1':
        return <ExecutiveSummaryView />;
      case 'sec-2':
        return <MasterTopologyView />;
      case 'sec-3':
        return <SubTopologiesView />;
      case 'sec-4':
        return (
          <ChecklistsView
            doneItems={doneItems}
            leftItems={leftItems}
            onToggleItem={handleToggleChecklist}
            onAddItem={handleAddItem}
            onModifyItem={handleModifyItem}
            onRemoveItem={handleRemoveItem}
            onMoveItem={handleMoveItem}
            sectionNumber={4}
          />
        );
      case 'sec-5':
        return (
          <ChecklistsView
            doneItems={doneItems}
            leftItems={leftItems}
            onToggleItem={handleToggleChecklist}
            onAddItem={handleAddItem}
            onModifyItem={handleModifyItem}
            onRemoveItem={handleRemoveItem}
            onMoveItem={handleMoveItem}
            sectionNumber={5}
          />
        );
      case 'sec-6':
        return <RoadmapView />;
      case 'sec-7':
        return <SecurityDebtView />;
      case 'sec-8':
        return <TryHackMeView />;
      case 'sec-9':
        return <JuryDemoView />;
      case 'sec-10':
        return <FileStructureView />;
      default:
        return <ExecutiveSummaryView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      <Header
        activeTab={activeSectionId}
        onTabChange={setActiveSectionId}
        onExportMarkdown={handleExportMarkdown}
      />

      <div className="flex-1 flex flex-col lg:flex-row max-w-[1720px] w-full mx-auto">
        <Navigation
          sections={filteredSections}
          activeSection={activeSectionId}
          onSelectSection={setActiveSectionId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          completedDoneCount={completedDoneCount}
          totalDoneCount={doneItems.length}
          completedLeftCount={completedLeftCount}
          totalLeftCount={leftItems.length}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {renderActiveSection()}
        </main>
      </div>

      <footer className="bg-[#1E293B] border-t border-[#334155] py-3 text-center text-[11px] text-[#94A3B8] font-mono">
        AEGIS v2.1 Master Report & Blueprint · TAIBI MOHAMED ANIS (Ezio) · PFE 2026
      </footer>
    </div>
  );
}
