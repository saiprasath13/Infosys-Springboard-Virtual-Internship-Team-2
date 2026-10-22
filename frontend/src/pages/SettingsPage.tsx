import React, { useState } from 'react';
import {
  User,
  Shield,
  Info,
  Save,
  KeyRound,
  Swords,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuthStore } from '@/store/authStore';
import { usersApi, getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'about'>('profile');

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await usersApi.updateMe({
        name: name.trim(),
        avatar_url: avatarUrl.trim() || undefined,
      });
      updateUser(res.data);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please fill all password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setPasswordSaving(true);
      await usersApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPasswordSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'about', label: 'Platform Architecture', icon: Info },
  ];

  return (
    <div className="min-h-full px-4 sm:px-8 py-8 max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal details, credentials, and inspect system telemetry.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all duration-150',
                isActive
                  ? 'border-brand-500 text-white font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card variant="glass" className="space-y-6">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="flex items-center gap-4 pb-2">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
                    {name ? name.slice(0, 2).toUpperCase() : 'NA'}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-white">Profile Avatar</h4>
                  <p className="text-xs text-slate-400">
                    Enter an image URL below to update your public avatar
                  </p>
                </div>
              </div>

              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                required
              />

              <Input
                label="Email Address"
                value={user?.email || ''}
                disabled
                helperText="Email cannot be changed directly"
              />

              <Input
                label="Avatar URL (Optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={profileSaving}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card variant="glass" className="space-y-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText="Minimum 6 characters"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={passwordSaving}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* About Tab */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-brand-400" />
                <span>Negotiation Arena Platform</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Negotiation Arena is an autonomous multi-agent game-theoretic platform designed to simulate, benchmark, and train real-world strategic dealmaking. Built using FastAPI on the backend and modern React with Tailwind CSS v4 on the frontend.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Cpu className="w-4 h-4 text-brand-400" />
                    <span>Frontend Core</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    React 18 • TypeScript • Tailwind v4 • Zustand • TanStack Query
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Engine v1.0.0</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    FastAPI • SQLAlchemy • Pydantic • Multi-Agent LLM Game Theory
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Agent Archetypes</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Aggressive • Collaborative • Risk-Averse
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
