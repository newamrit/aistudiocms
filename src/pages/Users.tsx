import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { 
  Shield, UserCheck, Mail, Phone, Plus, Edit, Trash2, X, 
  Search, Key, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, 
  Copy, Sparkles, RefreshCw, Check, ShieldAlert, ShieldCheck
} from 'lucide-react';
import { sounds } from '../utils/sounds';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UsersPage() {
  const { usersList, addUser, updateUser, deleteUser, setUserPassword, user: currentUser } = useAuth();
  
  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showSetPasswordModal, setShowSetPasswordModal] = useState<User | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // User form data (Create & Edit)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SALES' as UserRole,
    isActive: true,
    password: '',
    confirmPassword: '',
    changePassword: false, // In edit mode, toggle if password should be updated
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Quick Set Password Form State
  const [setPasswordForm, setSetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [setPasswordErrors, setSetPasswordErrors] = useState<Record<string, string>>({});
  const [showSetPasswordVis, setShowSetPasswordVis] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300';
      case 'SALES': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300';
      case 'OPERATIONS': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'TOUR_OPERATOR': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return <Shield size={14} className="text-purple-600 dark:text-purple-400" />;
      case 'SALES': return <UserCheck size={14} className="text-blue-600 dark:text-blue-400" />;
      case 'OPERATIONS': return <UserCheck size={14} className="text-emerald-600 dark:text-emerald-400" />;
      case 'TOUR_OPERATOR': return <UserCheck size={14} className="text-orange-600 dark:text-orange-400" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<UserRole, string> = {
      SUPER_ADMIN: 'Super Admin',
      SALES: 'Sales / Front Office',
      OPERATIONS: 'Operations Manager',
      TOUR_OPERATOR: 'Tour Leader',
    };
    return labels[role];
  };

  const isSoleAdmin = (targetUser: User | null | undefined): boolean => {
    if (!targetUser) return false;
    const activeAdmins = usersList.filter(u => u.role === 'SUPER_ADMIN' && u.isActive);
    return targetUser.role === 'SUPER_ADMIN' && activeAdmins.length <= 1;
  };

  const isCurrentLoggedInUser = (targetUser: User | null | undefined): boolean => {
    if (!targetUser || !currentUser) return false;
    return targetUser.id === currentUser.id;
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'Paila#';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res += '26';
    return res;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'SALES',
      isActive: true,
      password: '',
      confirmPassword: '',
      changePassword: false,
    });
    setFormErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (targetUser: User) => {
    setFormData({
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      role: targetUser.role,
      isActive: targetUser.isActive,
      password: '',
      confirmPassword: '',
      changePassword: false,
    });
    setFormErrors({});
    setEditingUser(targetUser);
    setModalMode('edit');
    setShowModal(true);
  };

  const openSetPasswordModal = (targetUser: User) => {
    setSetPasswordForm({
      password: '',
      confirmPassword: '',
    });
    setSetPasswordErrors({});
    setShowSetPasswordVis(false);
    setShowSetPasswordModal(targetUser);
  };

  const validateUserForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Full name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address (e.g., user@pailanepal.com)';
    } else {
      // Check for duplicate email across other users
      const duplicate = usersList.find(
        u => u.email.toLowerCase() === formData.email.trim().toLowerCase() && 
        (!editingUser || u.id !== editingUser.id)
      );
      if (duplicate) {
        errors.email = 'This email address is already registered to another user';
      }
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }

    // Password validation for create mode or if changePassword checkbox is checked in edit mode
    if (modalMode === 'create' || (modalMode === 'edit' && formData.changePassword)) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUserForm()) {
      sounds.warning();
      return;
    }

    if (modalMode === 'create') {
      const newId = Math.max(...usersList.map(u => u.id), 0) + 1;
      const newUser: User = {
        id: newId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password || 'password',
        phone: formData.phone.trim(),
        role: formData.role,
        isActive: formData.isActive,
      };
      addUser(newUser);
      sounds.success();
      showToast(`User "${newUser.name}" created successfully!`);
    } else if (modalMode === 'edit' && editingUser) {
      const soleAdmin = isSoleAdmin(editingUser);
      // Safeguard: do not allow de-admining the only administrator in the platform
      const targetRole = (soleAdmin && formData.role !== 'SUPER_ADMIN') ? 'SUPER_ADMIN' : formData.role;
      const targetActive = soleAdmin ? true : formData.isActive;

      const updatedUser: User = {
        ...editingUser,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: targetRole,
        isActive: targetActive,
        ...(formData.changePassword && formData.password ? { password: formData.password } : {}),
      };

      updateUser(updatedUser);
      sounds.success();
      showToast(`User profile for "${updatedUser.name}" updated successfully!`);
    }

    setShowModal(false);
    resetForm();
    setEditingUser(null);
  };

  const handleSaveSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSetPasswordModal) return;

    const errors: Record<string, string> = {};
    if (!setPasswordForm.password) {
      errors.password = 'Password is required';
    } else if (setPasswordForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (setPasswordForm.password !== setPasswordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setSetPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      sounds.warning();
      return;
    }

    setUserPassword(showSetPasswordModal.id, setPasswordForm.password);
    sounds.success();
    showToast(`Password updated successfully for ${showSetPasswordModal.name}!`);
    setShowSetPasswordModal(null);
  };

  const handleDelete = (id: number) => {
    const targetUser = usersList.find(u => u.id === id);
    if (isSoleAdmin(targetUser)) {
      sounds.warning();
      alert('The last remaining Super Admin cannot be deleted. Promote another admin first.');
      setShowDeleteConfirm(null);
      return;
    }
    deleteUser(id);
    sounds.delete();
    showToast(`User "${targetUser?.name}" deleted.`);
    setShowDeleteConfirm(null);
  };

  const toggleUserStatus = (id: number) => {
    const targetUser = usersList.find(u => u.id === id);
    if (!targetUser) return;
    if (isSoleAdmin(targetUser) && targetUser.isActive) {
      sounds.warning();
      alert('The sole remaining Super Admin cannot be deactivated.');
      return;
    }
    if (targetUser.isActive) {
      sounds.toggleOff();
    } else {
      sounds.toggleOn();
    }
    updateUser({ ...targetUser, isActive: !targetUser.isActive });
    showToast(`User ${targetUser.name} is now ${!targetUser.isActive ? 'Active' : 'Inactive'}.`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    sounds.click();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  // Filter users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phone.includes(searchQuery);
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 animate-fade-in max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage system accounts, edit user profiles & emails, configure passwords and role privileges
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 bg-paila-blue hover:bg-paila-blue-light text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={18} />
          Add New User
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(['SUPER_ADMIN', 'SALES', 'OPERATIONS', 'TOUR_OPERATOR'] as UserRole[]).map(role => (
          <button
            key={role}
            onClick={() => setFilterRole(filterRole === role ? 'ALL' : role)}
            className={`p-3.5 rounded-2xl border text-left transition-all ${
              filterRole === role
                ? 'border-paila-blue bg-blue-50/70 dark:bg-blue-950/40 shadow-sm ring-1 ring-paila-blue'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleColor(role)}`}>
                {getRoleIcon(role)}
                {getRoleLabel(role)}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{usersList.filter(u => u.role === role).length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">active user(s)</p>
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none transition-all"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'ALL')}
            className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none transition-all"
          >
            <option value="ALL">All Roles ({usersList.length})</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SALES">Sales / Front Office</option>
            <option value="OPERATIONS">Operations Manager</option>
            <option value="TOUR_OPERATOR">Tour Leader</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">User Profile</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email & Contact</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Security & Password</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredUsers.map(userItem => {
                const soleAdmin = isSoleAdmin(userItem);
                const isCurrent = isCurrentLoggedInUser(userItem);

                return (
                  <tr key={userItem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-paila-blue to-paila-blue-light text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-xs">
                          {userItem.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {userItem.name}
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">You</span>
                            )}
                            {userItem.role === 'SUPER_ADMIN' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center gap-0.5" title="Admin Account">
                                <Shield size={10} /> Admin
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">UID: #{userItem.id.toString().padStart(4, '0')}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getRoleColor(userItem.role)}`}>
                        {getRoleIcon(userItem.role)}
                        {getRoleLabel(userItem.role)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span className="font-mono text-xs font-semibold">{userItem.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        {userItem.phone}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 tracking-wider">••••••••</span>
                        <button
                          type="button"
                          onClick={() => openSetPasswordModal(userItem)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-paila-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors cursor-pointer"
                          title="Set or reset password for this user"
                        >
                          <Key size={12} />
                          Set Password
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleUserStatus(userItem.id)}
                          disabled={soleAdmin}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            soleAdmin 
                              ? 'cursor-not-allowed opacity-75 ring-2 ring-purple-400/30' 
                              : 'cursor-pointer'
                          } ${userItem.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                          title={soleAdmin ? 'Sole Admin cannot be deactivated' : userItem.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                              userItem.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <span className={`text-xs font-bold ${userItem.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {userItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(userItem)}
                          className="p-2 text-slate-500 hover:text-paila-blue hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition-colors cursor-pointer"
                          title="Edit User Profile & Role"
                        >
                          <Edit size={16} />
                        </button>
                        
                        {!soleAdmin ? (
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(userItem.id)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span className="p-2 text-slate-300 dark:text-slate-700 cursor-not-allowed" title="Sole Super Admin cannot be deleted">
                            <Lock size={15} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCheck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-700 dark:text-slate-300 font-bold text-sm">No matching users found</p>
            <p className="text-slate-400 text-xs mt-1">Try adjusting your search filters or add a new user</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ADD / EDIT USER MODAL (Admin can edit Name & Email; Password protected)   */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-scale-up my-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-paila-blue/10 dark:bg-blue-950 flex items-center justify-center text-paila-blue dark:text-blue-400">
                  {modalMode === 'create' ? <Plus size={18} /> : <Edit size={18} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {modalMode === 'create' 
                      ? 'Create New System User' 
                      : 'Edit User Profile & Role'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {modalMode === 'create' 
                      ? 'Add user credentials, assign role and set password' 
                      : 'Update name, login email, phone, role and security credentials'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setShowModal(false); resetForm(); setEditingUser(null); }} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sole Admin Notice Banner */}
            {modalMode === 'edit' && editingUser && isSoleAdmin(editingUser) && (
              <div className="mb-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-start gap-2.5 text-xs text-purple-800 dark:text-purple-300">
                <ShieldCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sole Super Administrator Account</p>
                  <p className="text-[11px] mt-0.5 text-purple-700 dark:text-purple-300">
                    You can update <strong>Full Name</strong>, <strong>Email</strong>, <strong>Phone</strong>, and <strong>Password</strong>. Role and Active status are protected because this is currently the only active Super Admin account.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveUser} noValidate className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="e.g., Rajesh Shrestha"
                  className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                    formErrors.name 
                      ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30' 
                      : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle size={12} /> {formErrors.name}
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address (Login Username) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Used for system login</span>
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => {
                      setFormData({ ...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    placeholder="e.g., admin@pailanepal.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                      formErrors.email 
                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle size={12} /> {formErrors.email}
                  </p>
                )}
              </div>

              {/* Phone & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="+977-98XXXXXXXX"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all ${
                      formErrors.phone 
                        ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30' 
                        : 'border-slate-200 dark:border-slate-800 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle size={12} /> {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    disabled={isSoleAdmin(editingUser)}
                    className={`w-full px-3.5 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue bg-slate-50 dark:bg-slate-950 focus:bg-white outline-none transition-all ${
                      isSoleAdmin(editingUser) ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <option value="SUPER_ADMIN">👑 Super Admin</option>
                    <option value="SALES">💼 Sales / Front Office</option>
                    <option value="OPERATIONS">⚙️ Operations Manager</option>
                    <option value="TOUR_OPERATOR">🧭 Tour Leader</option>
                  </select>
                </div>
              </div>

              {/* Password Section */}
              {modalMode === 'create' ? (
                <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <Lock size={14} className="text-paila-blue dark:text-blue-400" />
                      Set Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPwd = generateRandomPassword();
                        setFormData(prev => ({ ...prev, password: randomPwd, confirmPassword: randomPwd }));
                        setShowPassword(true);
                        sounds.click();
                      }}
                      className="text-[11px] font-bold text-paila-blue dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} /> Auto-Generate
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={e => {
                            setFormData({ ...formData, password: e.target.value });
                            if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                          }}
                          placeholder="Password (min 6 chars)"
                          className={`w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-medium focus:ring-2 outline-none ${
                            formErrors.password ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {formErrors.password && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.password}</p>
                      )}
                    </div>

                    <div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={e => {
                            setFormData({ ...formData, confirmPassword: e.target.value });
                            if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
                          }}
                          placeholder="Confirm Password"
                          className={`w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-medium focus:ring-2 outline-none ${
                            formErrors.confirmPassword ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {formErrors.confirmPassword && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode Password Option */
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.changePassword}
                        onChange={e => setFormData({ ...formData, changePassword: e.target.checked })}
                        className="w-4 h-4 rounded text-paila-blue focus:ring-paila-blue cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Key size={13} className="text-paila-blue dark:text-blue-400" />
                        Update Password for this User
                      </span>
                    </label>

                    {formData.changePassword && (
                      <button
                        type="button"
                        onClick={() => {
                          const randomPwd = generateRandomPassword();
                          setFormData(prev => ({ ...prev, password: randomPwd, confirmPassword: randomPwd }));
                          setShowPassword(true);
                          sounds.click();
                        }}
                        className="text-[11px] font-bold text-paila-blue dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles size={12} /> Auto-Generate
                      </button>
                    )}
                  </div>

                  {formData.changePassword && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 animate-fade-in">
                      <div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={e => {
                              setFormData({ ...formData, password: e.target.value });
                              if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                            }}
                            placeholder="New password (min 6 chars)"
                            className={`w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-medium focus:ring-2 outline-none ${
                              formErrors.password ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {formErrors.password && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.password}</p>
                        )}
                      </div>

                      <div>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={formData.confirmPassword}
                            onChange={e => {
                              setFormData({ ...formData, confirmPassword: e.target.value });
                              if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
                            }}
                            placeholder="Confirm new password"
                            className={`w-full pr-9 pl-3 py-2 bg-white dark:bg-slate-900 border rounded-xl text-xs font-mono font-medium focus:ring-2 outline-none ${
                              formErrors.confirmPassword ? 'border-rose-400' : 'border-slate-200 dark:border-slate-700'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {formErrors.confirmPassword && (
                          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 font-semibold">{formErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Active Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access Status</p>
                  <p className="text-[11px] text-slate-400">
                    {isSoleAdmin(editingUser) 
                      ? 'Sole admin account must remain active' 
                      : 'Inactive users cannot log into the platform'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isSoleAdmin(editingUser)) {
                      sounds.warning();
                      alert('The sole remaining Super Admin cannot be deactivated.');
                      return;
                    }
                    setFormData({ ...formData, isActive: !formData.isActive });
                  }}
                  disabled={isSoleAdmin(editingUser)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isSoleAdmin(editingUser)
                      ? 'bg-emerald-500 opacity-75 cursor-not-allowed'
                      : formData.isActive ? 'bg-emerald-500 cursor-pointer' : 'bg-slate-300 dark:bg-slate-700 cursor-pointer'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      (isSoleAdmin(editingUser) || formData.isActive) ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); setEditingUser(null); }}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Check size={16} />
                  {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK "SET PASSWORD" MODAL (For Staff Users Only)                         */}
      {/* ========================================================================= */}
      {showSetPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Set User Password</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Assign a new password for immediate sign-in</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSetPasswordModal(null)} 
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target User Info Header */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-paila-blue text-white flex items-center justify-center font-bold text-xs">
                {showSetPasswordModal.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{showSetPasswordModal.name}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{showSetPasswordModal.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleColor(showSetPasswordModal.role)}`}>
                {getRoleLabel(showSetPasswordModal.role)}
              </span>
            </div>

            <form onSubmit={handleSaveSetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = generateRandomPassword();
                      setSetPasswordForm({ password: rand, confirmPassword: rand });
                      setShowSetPasswordVis(true);
                      sounds.click();
                    }}
                    className="text-[11px] font-bold text-paila-blue dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={12} /> Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showSetPasswordVis ? 'text' : 'password'}
                    value={setPasswordForm.password}
                    onChange={e => {
                      setSetPasswordForm({ ...setPasswordForm, password: e.target.value });
                      if (setPasswordErrors.password) setSetPasswordErrors({ ...setPasswordErrors, password: '' });
                    }}
                    placeholder="Enter new password (min 6 characters)"
                    className={`w-full pl-3 pr-9 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs font-mono font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-2 outline-none ${
                      setPasswordErrors.password ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-paila-blue'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetPasswordVis(!showSetPasswordVis)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSetPasswordVis ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {setPasswordErrors.password && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {setPasswordErrors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showSetPasswordVis ? 'text' : 'password'}
                  value={setPasswordForm.confirmPassword}
                  onChange={e => {
                    setSetPasswordForm({ ...setPasswordForm, confirmPassword: e.target.value });
                    if (setPasswordErrors.confirmPassword) setSetPasswordErrors({ ...setPasswordErrors, confirmPassword: '' });
                  }}
                  placeholder="Repeat new password"
                  className={`w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs font-mono font-bold focus:bg-white dark:focus:bg-slate-900 focus:ring-2 outline-none ${
                    setPasswordErrors.confirmPassword ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-paila-blue'
                  }`}
                />
                {setPasswordErrors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle size={12} /> {setPasswordErrors.confirmPassword}
                  </p>
                )}
              </div>

              {setPasswordForm.password && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
                  <span className="text-blue-900 dark:text-blue-300 font-medium">Copy password for user notification</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(setPasswordForm.password)}
                    className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 text-paila-blue dark:text-blue-400 rounded-lg font-bold border border-blue-200 dark:border-blue-800 shadow-2xs text-[11px] hover:bg-blue-50"
                  >
                    {copiedNotification ? (
                      <>
                        <Check size={12} className="text-emerald-500" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={12} /> Copy
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSetPasswordModal(null)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 bg-paila-blue hover:bg-paila-blue-light text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Lock size={14} />
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {showDeleteConfirm && (() => {
        const userToDelete = usersList.find(u => u.id === showDeleteConfirm);
        const soleAdmin = isSoleAdmin(userToDelete);
        
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  soleAdmin ? 'bg-amber-100 dark:bg-amber-950/50' : 'bg-rose-100 dark:bg-rose-950/50'
                }`}>
                  <Trash2 size={22} className={soleAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {soleAdmin ? 'Cannot Delete Sole Super Admin' : 'Delete User Account'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {soleAdmin ? 'Protected Root Admin Role' : 'Irreversible security action'}
                  </p>
                </div>
              </div>
              
              {soleAdmin ? (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 mb-6">
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    This is currently the <span className="font-bold">only active Super Admin</span> account in the system.
                    To delete this account, please promote another active user to Super Admin first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Are you sure you want to permanently delete <span className="font-bold text-slate-900 dark:text-white">{userToDelete?.name}</span> ({userToDelete?.email})?
                  </p>
                  <p className="text-xs text-slate-400">
                    This user will immediately lose access to all modules and ongoing tour assignments.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {soleAdmin ? 'Understood' : 'Cancel'}
                </button>
                {!soleAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Confirm Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
