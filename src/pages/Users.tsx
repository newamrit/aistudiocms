import { useState } from 'react';
import { users as initialUsers } from '../data/mockData';
import { User, UserRole } from '../types';
import { Shield, UserCheck, Mail, Phone, Plus, Edit, Trash2, X, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { sounds } from '../utils/sounds';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SALES' as UserRole,
    isActive: true
  });

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700';
      case 'SALES': return 'bg-blue-100 text-blue-700';
      case 'OPERATIONS': return 'bg-green-100 text-green-700';
      case 'TOUR_OPERATOR': return 'bg-orange-100 text-orange-700';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return <Shield size={14} />;
      case 'SALES': return <UserCheck size={14} />;
      case 'OPERATIONS': return <UserCheck size={14} />;
      case 'TOUR_OPERATOR': return <UserCheck size={14} />;
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

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'SALES',
      isActive: true
    });
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setModalMode('create');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive
    });
    setEditingUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Please fill in all required fields');
      return;
    }

    if (modalMode === 'create') {
      const newUser: User = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        isActive: formData.isActive
      };
      setUsers([...users, newUser]);
      sounds.success();
      alert('User created successfully!');
    } else if (modalMode === 'edit' && editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      sounds.success();
      alert('User updated successfully!');
    }

    setShowModal(false);
    resetForm();
    setEditingUser(null);
  };

  const handleDelete = (id: number) => {
    const user = users.find(u => u.id === id);
    if (user?.role === 'SUPER_ADMIN') {
      alert('Super Admin cannot be deleted. This is a protected role.');
      setShowDeleteConfirm(null);
      return;
    }
    setUsers(users.filter(u => u.id !== id));
    sounds.delete();
    setShowDeleteConfirm(null);
  };

  const toggleUserStatus = (id: number) => {
    const user = users.find(u => u.id === id);
    if (user?.role === 'SUPER_ADMIN') {
      alert('Super Admin status cannot be changed. This is a protected role.');
      return;
    }
    const userToUpdate = users.find(u => u.id === id);
    if (userToUpdate?.isActive) {
      sounds.toggleOff();
    } else {
      sounds.toggleOn();
    }
    setUsers(users.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.phone.includes(searchQuery);
    const matchesRole = filterRole === 'ALL' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system users and role-based access</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-paila-blue text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Role Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(['SUPER_ADMIN', 'SALES', 'OPERATIONS', 'TOUR_OPERATOR'] as UserRole[]).map(role => (
          <div key={role} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${getRoleColor(role)} mb-2`}>
              {getRoleIcon(role)}
              {getRoleLabel(role)}
            </div>
            <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.role === role).length}</p>
            <p className="text-xs text-slate-500">user(s)</p>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
            />
          </div>
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value as UserRole | 'ALL')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SALES">Sales</option>
            <option value="OPERATIONS">Operations</option>
            <option value="TOUR_OPERATOR">Tour Leader</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-paila-blue/10 rounded-full flex items-center justify-center text-xs font-bold text-paila-blue">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">ID: {user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${getRoleColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Mail size={12} className="text-slate-400" />
                    {user.email}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                    <Phone size={12} className="text-slate-400" />
                    {user.phone}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    {/* Toggle Switch */}
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      disabled={user.role === 'SUPER_ADMIN'}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                        user.role === 'SUPER_ADMIN' 
                          ? 'cursor-not-allowed opacity-60' 
                          : 'cursor-pointer'
                      } ${user.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                      title={user.role === 'SUPER_ADMIN' ? 'Super Admin cannot be deactivated' : user.isActive ? 'Deactivate user' : 'Activate user'}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                          user.isActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 text-paila-blue hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </button>
                      {user.role !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserCheck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No users found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                {modalMode === 'create' ? 'Add New User' : 'Edit User'}
              </h3>
              <button onClick={() => { setShowModal(false); resetForm(); setEditingUser(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ram Bahadur Thapa"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g., ram@pailanepal.com"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+977-98XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-paila-blue/20 focus:border-paila-blue outline-none"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="SALES">Sales / Front Office</option>
                  <option value="OPERATIONS">Operations Manager</option>
                  <option value="TOUR_OPERATOR">Tour Leader</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-700">Active Status</p>
                  <p className="text-xs text-slate-500">User can login and access the system</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); resetForm(); setEditingUser(null); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-paila-blue text-white rounded-lg text-sm font-medium hover:bg-paila-blue-light transition-colors"
              >
                {modalMode === 'create' ? 'Create User' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (() => {
        const userToDelete = users.find(u => u.id === showDeleteConfirm);
        const isSuperAdmin = userToDelete?.role === 'SUPER_ADMIN';
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isSuperAdmin ? 'bg-amber-100' : 'bg-red-100'
                }`}>
                  <Trash2 size={24} className={isSuperAdmin ? 'text-amber-600' : 'text-red-600'} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {isSuperAdmin ? 'Cannot Delete Super Admin' : 'Delete User'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isSuperAdmin ? 'Protected Role' : 'This action cannot be undone'}
                  </p>
                </div>
              </div>
              
              {isSuperAdmin ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">Super Admin</span> is a protected role and cannot be deleted.
                    This ensures the system always has at least one administrator with full access.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-600 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{userToDelete?.name}</span>?
                  This user will lose access to the system immediately.
                </p>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {isSuperAdmin ? 'Understood' : 'Cancel'}
                </button>
                {!isSuperAdmin && (
                  <button
                    onClick={() => handleDelete(showDeleteConfirm)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete User
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
