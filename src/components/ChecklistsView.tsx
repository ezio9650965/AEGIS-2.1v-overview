import React, { useState } from 'react';
import { ChecklistItem } from '../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  User,
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  ArrowRightLeft,
  X,
  Check,
  Search,
} from 'lucide-react';

interface ChecklistsViewProps {
  doneItems: ChecklistItem[];
  leftItems: ChecklistItem[];
  onToggleItem: (id: string, isDoneList: boolean) => void;
  onAddItem: (newItem: Omit<ChecklistItem, 'id'>, isDoneList: boolean) => void;
  onModifyItem: (updatedItem: ChecklistItem, isDoneList: boolean) => void;
  onRemoveItem: (id: string, isDoneList: boolean) => void;
  onMoveItem: (id: string, fromDoneList: boolean) => void;
  sectionNumber: 4 | 5;
}

export const ChecklistsView: React.FC<ChecklistsViewProps> = ({
  doneItems,
  leftItems,
  onToggleItem,
  onAddItem,
  onModifyItem,
  onRemoveItem,
  onMoveItem,
  sectionNumber,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterWho, setFilterWho] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal / Form States
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<'critical' | 'high' | 'medium' | 'jury'>('high');
  const [formWho, setFormWho] = useState<'eagle' | 'ezio' | 'both'>('both');
  const [formCompleted, setFormCompleted] = useState<boolean>(sectionNumber === 4);

  const isDoneList = sectionNumber === 4;
  const items = isDoneList ? doneItems : leftItems;

  const filteredItems = items.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (filterWho !== 'all' && item.who && item.who !== filterWho && item.who !== 'both') return false;
    if (
      searchQuery &&
      !item.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const openAddModal = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('high');
    setFormWho('both');
    setFormCompleted(isDoneList);
    setEditingItem(null);
    setIsAdding(true);
  };

  const openEditModal = (item: ChecklistItem) => {
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormCategory(item.category);
    setFormWho(item.who || 'both');
    setFormCompleted(item.completed);
    setEditingItem(item);
    setIsAdding(false);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    onAddItem(
      {
        title: formTitle.trim(),
        description: formDescription.trim() || 'No detailed description provided.',
        category: formCategory,
        completed: formCompleted,
        who: formWho,
      },
      isDoneList
    );

    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formTitle.trim()) return;

    onModifyItem(
      {
        id: editingItem.id,
        title: formTitle.trim(),
        description: formDescription.trim() || 'No detailed description provided.',
        category: formCategory,
        completed: formCompleted,
        who: formWho,
      },
      isDoneList
    );

    setEditingItem(null);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-400 border border-red-500/40">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/40">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40">Medium</span>;
      case 'jury':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40">Jury Readiness</span>;
      default:
        return null;
    }
  };

  const getWhoBadge = (who?: string) => {
    if (!who) return null;
    if (who === 'eagle') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 flex items-center gap-1"><User className="w-3 h-3" /> Eagle (Z3)</span>;
    }
    if (who === 'ezio') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Ezio (Z4)</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30 flex items-center gap-1">Both</span>;
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="pro-title flex items-center gap-2 glitch-header">
              {sectionNumber === 4 ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />
                  <span>Section 4: Current State Checklist — "What Is Done"</span>
                  <span className="terminal-cursor text-sm">▊</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-[#FBBF24]" />
                  <span>Section 5: Remaining Work Checklist — "What Is Left"</span>
                  <span className="terminal-cursor-cyan text-sm">▊</span>
                </>
              )}
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              {sectionNumber === 4
                ? 'Everything already built, verified, and hardened in the AEGIS v2.1 codebase.'
                : 'Actionable remaining items prioritized by criticality and operational ownership.'}
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="px-3.5 py-2 rounded bg-[#38BDF8] hover:bg-[#0284C7] text-[#0F172A] font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer font-mono glow-cyan-hover"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Checklist Item</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F172A] p-3 rounded-lg border border-[#334155] mb-6 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search checklist..."
                className="pl-8 pr-2.5 py-1 bg-[#1E293B] border border-[#334155] text-xs text-[#F1F5F9] rounded focus:outline-none focus:border-[#38BDF8] w-48"
              />
            </div>

            <div className="flex items-center gap-1 text-[#94A3B8]">
              <Filter className="w-3.5 h-3.5" />
              <span>Priority:</span>
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] text-xs text-[#F1F5F9] rounded px-2.5 py-1 focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="jury">Jury Demo</option>
            </select>

            <select
              value={filterWho}
              onChange={(e) => setFilterWho(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] text-xs text-[#F1F5F9] rounded px-2.5 py-1 focus:outline-none focus:border-[#38BDF8]"
            >
              <option value="all">All Assignees</option>
              <option value="eagle">Eagle (Zone 3)</option>
              <option value="ezio">Ezio (Zone 4)</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="text-[11px] text-[#94A3B8]">
            Showing <strong className="text-[#38BDF8]">{filteredItems.length}</strong> of{' '}
            <strong className="text-white">{items.length}</strong> items
          </div>
        </div>

        {/* Item Cards List */}
        <div className="space-y-3 font-mono">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border transition-all flex items-start gap-3 ${
                item.completed
                  ? 'bg-[#0F172A]/70 border-[#4ADE80]/30 hover:border-[#4ADE80]/50'
                  : 'bg-[#0F172A] border-[#334155] hover:border-[#38BDF8]/50'
              }`}
            >
              <button
                onClick={() => onToggleItem(item.id, isDoneList)}
                className="mt-0.5 shrink-0 focus:outline-none cursor-pointer"
                title="Toggle Completion Status"
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-[#4ADE80]" />
                ) : (
                  <Circle className="w-5 h-5 text-[#94A3B8] hover:text-[#F1F5F9]" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <h4
                    onClick={() => onToggleItem(item.id, isDoneList)}
                    className={`text-xs font-bold font-mono cursor-pointer ${
                      item.completed ? 'text-[#94A3B8] line-through' : 'text-[#F1F5F9]'
                    }`}
                  >
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    {getWhoBadge(item.who)}
                    {getCategoryBadge(item.category)}
                  </div>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed font-mono">{item.description}</p>

                {/* Control Actions Row */}
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[#334155]/60 text-[10px] text-[#94A3B8]">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 hover:text-[#38BDF8] cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => onMoveItem(item.id, isDoneList)}
                    className="flex items-center gap-1 hover:text-purple-300 cursor-pointer"
                    title={isDoneList ? 'Move to Remaining Checklist' : 'Move to Current State Checklist'}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Move to {isDoneList ? 'Remaining' : 'Completed'}</span>
                  </button>

                  <button
                    onClick={() => onRemoveItem(item.id, isDoneList)}
                    className="flex items-center gap-1 hover:text-red-400 cursor-pointer text-red-400/80 ml-auto"
                    title="Delete item"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-10 text-[#94A3B8] text-xs italic font-mono bg-[#0F172A] rounded border border-[#334155]">
              No checklist items match the current query. Click "+ Add Checklist Item" above to create one!
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal Overlay */}
      {(isAdding || editingItem) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
          <div className="bg-[#1E293B] border border-[#334155] rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#334155]">
              <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                {isAdding ? <Plus className="w-4 h-4 text-[#38BDF8]" /> : <Edit3 className="w-4 h-4 text-[#38BDF8]" />}
                <span>{isAdding ? 'Add New Checklist Item' : 'Modify Checklist Item'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingItem(null);
                }}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={isAdding ? handleSaveAdd : handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Item Title *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Deploy Suricata Custom Log4j IDS Rules"
                  className="w-full bg-[#0F172A] border border-[#334155] text-white rounded p-2 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide technical context, commands, or component scope..."
                  className="w-full bg-[#0F172A] border border-[#334155] text-white rounded p-2 focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Priority Level</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded p-2 focus:outline-none focus:border-[#38BDF8]"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="jury">Jury Demo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-[#94A3B8] uppercase font-bold mb-1">Assignee Ownership</label>
                  <select
                    value={formWho}
                    onChange={(e) => setFormWho(e.target.value as any)}
                    className="w-full bg-[#0F172A] border border-[#334155] text-white rounded p-2 focus:outline-none focus:border-[#38BDF8]"
                  >
                    <option value="both">Both (Eagle & Ezio)</option>
                    <option value="eagle">Eagle (Zone 3 Gateway)</option>
                    <option value="ezio">Ezio (Zone 4 SOC)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formCompleted"
                  checked={formCompleted}
                  onChange={(e) => setFormCompleted(e.target.checked)}
                  className="rounded border-[#334155] bg-[#0F172A] text-[#38BDF8] focus:ring-0"
                />
                <label htmlFor="formCompleted" className="text-xs text-[#F1F5F9] cursor-pointer">
                  Mark as completed item
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-[#38BDF8] hover:bg-[#0284C7] text-[#0F172A] font-bold cursor-pointer"
                >
                  {isAdding ? 'Create Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
