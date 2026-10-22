import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PlusCircle,
  LayoutDashboard,
  Bot,
  ShoppingCart,
  Briefcase,
  PieChart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Swords,
  Trash2,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { isToday, isYesterday, differenceInDays, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useNegotiations, useUpdateNegotiation, useDeleteNegotiation } from '@/hooks/useNegotiations';
import { cn } from '@/lib/utils';
import type { NegotiationSummary } from '@/types';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar, sidebarOpen, closeMobileSidebar } = useUIStore();

  const { data: negotiations = [] } = useNegotiations();
  const updateMutation = useUpdateNegotiation();
  const deleteMutation = useDeleteNegotiation();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSignOut = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const handleStartRename = (e: React.MouseEvent, item: NegotiationSummary) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.title);
  };

  const handleSaveRename = async (e: React.MouseEvent | React.KeyboardEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ id, data: { title: editTitle.trim() } });
      toast.success('Renamed negotiation');
      setEditingId(null);
    } catch {
      toast.error('Failed to rename negotiation');
    }
  };

  const handleCancelRename = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Negotiation deleted');
        if (location.pathname.includes(`/negotiations/${id}`)) {
          navigate('/app/dashboard');
        }
      } catch {
        toast.error('Failed to delete negotiation');
      }
    }
  };

  // Group negotiations by date
  const now = new Date();
  const groups: { [key: string]: NegotiationSummary[] } = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  negotiations.forEach((item) => {
    try {
      const date = parseISO(item.created_at);
      if (isToday(date)) {
        groups.Today.push(item);
      } else if (isYesterday(date)) {
        groups.Yesterday.push(item);
      } else if (differenceInDays(now, date) <= 7) {
        groups['Previous 7 Days'].push(item);
      } else {
        groups.Older.push(item);
      }
    } catch {
      groups.Older.push(item);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-400';
      case 'active':
        return 'bg-blue-400 animate-pulse';
      case 'deadlocked':
        return 'bg-rose-400';
      case 'paused':
      case 'pending':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

  const mainLinks = [
    { to: '/app/new', label: 'New Negotiation', icon: PlusCircle, highlight: true },
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/assistant', label: 'AI Assistant', icon: Bot },
  ];

  const simulationLinks = [
    {
      to: '/app/new?scenario=vendor_pricing',
      label: 'Vendor Pricing',
      icon: ShoppingCart,
      color: 'text-amber-400',
    },
    {
      to: '/app/new?scenario=job_offer',
      label: 'Job Offer',
      icon: Briefcase,
      color: 'text-sky-400',
    },
    {
      to: '/app/new?scenario=project_budget',
      label: 'Project Budget',
      icon: PieChart,
      color: 'text-emerald-400',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#080b14] border-r border-white/10 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        <NavLink
          to="/app/dashboard"
          className="flex items-center gap-3 overflow-hidden group focus-ring rounded-lg p-1"
          onClick={closeMobileSidebar}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform duration-150">
            <Swords className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Negotiation Arena
              </span>
              <span className="text-[10px] text-brand-300 font-mono tracking-wider uppercase">
                Multi-Agent AI
              </span>
            </div>
          )}
        </NavLink>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={closeMobileSidebar}
          aria-label="Close mobile sidebar"
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-ring"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Navigation Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main Actions */}
        <div className="space-y-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileSidebar}
                title={sidebarCollapsed ? link.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-ring',
                  link.highlight && !isActive
                    ? 'bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 border border-brand-500/20'
                    : isActive
                    ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-slate-300')} />
                {!sidebarCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Prebuilt Simulations */}
        <div className="space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Scenarios
            </div>
          )}
          {simulationLinks.map((sim) => {
            const Icon = sim.icon;
            const isMatch = location.search.includes(sim.to.split('?')[1]);
            return (
              <NavLink
                key={sim.to}
                to={sim.to}
                onClick={closeMobileSidebar}
                title={sidebarCollapsed ? sim.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 focus-ring',
                  isMatch
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', sim.color)} />
                {!sidebarCollapsed && <span className="truncate">{sim.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Recent Negotiations */}
        {!sidebarCollapsed && (
          <div className="space-y-3 pt-2">
            <div className="px-3 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
              Recent Negotiations
            </div>

            {negotiations.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400 italic">
                No negotiations yet
              </div>
            ) : (
              Object.entries(groups).map(([groupTitle, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={groupTitle} className="space-y-0.5">
                    <div className="px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
                      {groupTitle}
                    </div>
                    {items.map((item) => {
                      const isActive = location.pathname === `/app/negotiations/${item.id}`;
                      const isEditing = editingId === item.id;

                      if (isEditing) {
                        return (
                          <div
                            key={item.id}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-white/10 rounded-lg text-xs"
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(e, item.id);
                                if (e.key === 'Escape') handleCancelRename(e);
                              }}
                              autoFocus
                              className="w-full bg-[#111827] text-white px-2 py-1 rounded text-xs border border-brand-500 focus:outline-none"
                            />
                            <button
                              onClick={(e) => handleSaveRename(e, item.id)}
                              className="p-1 hover:text-emerald-400 text-slate-300"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelRename}
                              className="p-1 hover:text-rose-400 text-slate-300"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'group relative flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors duration-150',
                            isActive
                              ? 'bg-white/10 text-white font-medium'
                              : 'text-slate-300 hover:bg-white/5 hover:text-slate-100'
                          )}
                          onDoubleClick={(e) => handleStartRename(e, item)}
                        >
                          <NavLink
                            to={`/app/negotiations/${item.id}`}
                            onClick={closeMobileSidebar}
                            className="flex items-center gap-2.5 truncate flex-1 pr-2"
                            title={item.title}
                          >
                            <span
                              className={cn(
                                'w-2 h-2 rounded-full shrink-0',
                                getStatusColor(item.status)
                              )}
                            />
                            <span className="truncate">{item.title}</span>
                          </NavLink>

                          {/* Hover action icons */}
                          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleStartRename(e, item)}
                              title="Rename"
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(e, item.id, item.title)}
                              title="Delete"
                              className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav / User Row */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <NavLink
          to="/app/settings"
          onClick={closeMobileSidebar}
          title={sidebarCollapsed ? 'Settings' : undefined}
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors focus-ring',
            location.pathname === '/app/settings' && 'bg-white/10 text-white font-semibold'
          )}
        >
          <Settings className="w-4 h-4 shrink-0 text-slate-400" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>

        <div
          className={cn(
            'flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5',
            sidebarCollapsed ? 'justify-center p-1.5' : 'gap-2'
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover border border-white/10 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-200 shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NA'}
              </div>
            )}
            {!sidebarCollapsed && (
              <div className="truncate flex flex-col">
                <span className="text-xs font-medium text-slate-200 truncate">
                  {user?.name || 'User'}
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  {user?.email || ''}
                </span>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors focus-ring"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:block shrink-0 transition-all duration-200 ease-out z-30 h-screen sticky top-0',
          sidebarCollapsed ? 'w-16' : 'w-[260px]'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 w-[280px] max-w-[85vw] z-50 md:hidden transform transition-transform duration-200 ease-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
