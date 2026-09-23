import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, UserRole } from '../types';
import { apiClient, DB_KEYS } from '../api/apiClient';

interface AuthContextType {
  user: User | null;
  usersList: User[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  refreshUsers: () => Promise<void>;
  addUser: (newUser: User) => Promise<User>;
  updateUser: (updatedUser: User) => Promise<void>;
  deleteUser: (userId: number) => Promise<void>;
  setUserPassword: (userId: number, newPassword: string) => Promise<void>;
  setAllUsers: (newUsers: User[]) => void;
}

const USERS_STORAGE_KEY = 'paila_cms_users';
const AUTH_USER_KEY = 'paila_cms_auth_user';

const defaultSeedUsers: User[] = [
  { id: 1, name: 'Rajesh Shrestha', email: 'admin@pailanepal.com', password: 'password', role: 'SUPER_ADMIN', phone: '+977-9841234567', isActive: true },
  { id: 2, name: 'Sita Maharjan', email: 'sales@pailanepal.com', password: 'password', role: 'SALES', phone: '+977-9851234567', isActive: true },
  { id: 3, name: 'Bikash Tamang', email: 'ops@pailanepal.com', password: 'password', role: 'OPERATIONS', phone: '+977-9861234567', isActive: true },
  { id: 4, name: 'Prakash Gurung', email: 'tour@pailanepal.com', password: 'password', role: 'TOUR_OPERATOR', phone: '+977-9871234567', isActive: true },
  { id: 5, name: 'Anita Rai', email: 'anita@pailanepal.com', password: 'password', role: 'SALES', phone: '+977-9881234567', isActive: true },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usersList, setUsersList] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return defaultSeedUsers;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_USER_KEY);
      if (storedAuth) {
        return JSON.parse(storedAuth);
      }
    } catch {
      // Fallback
    }
    return null;
  });

  // Keep localStorage continuously in sync with usersList
  useEffect(() => {
    try {
      if (usersList && usersList.length > 0) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(usersList));
      }
    } catch {
      // Ignore
    }
  }, [usersList]);

  // Keep localStorage in sync with active user session
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {
      // Ignore
    }
  }, [user]);

  // Real-time synchronization across browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USERS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsersList(parsed);
          }
        } catch {
          // ignore
        }
      }
      if (e.key === AUTH_USER_KEY && e.newValue) {
        try {
          setUser(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync users from backend API or database
  const refreshUsers = useCallback(async () => {
    try {
      const list = await apiClient.users.list();
      if (Array.isArray(list) && list.length > 0) {
        setUsersList(list);
      }
    } catch (err) {
      console.warn('Users refresh fallback to cached state:', err);
    }
  }, []);

  const login = async (email: string, passwordInput: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Authenticate with live Database API (/api/auth/login) if available
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password: passwordInput,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.user) {
          const authenticatedUser: User = {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            phone: result.user.phone || '',
            isActive: Boolean(result.user.is_active),
          };
          if (result.token) {
            try {
              localStorage.setItem('paila_auth_token', result.token);
            } catch {
              // Ignore
            }
          }
          setUser(authenticatedUser);
          setUsersList(prev => {
            const exists = prev.some(u => u.id === authenticatedUser.id);
            const next = exists 
              ? prev.map(u => u.id === authenticatedUser.id ? authenticatedUser : u) 
              : [authenticatedUser, ...prev];
            try {
              localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          return { success: true };
        }
      } else {
        const errJson = await response.json().catch(() => null);
        if (errJson?.error) {
          return {
            success: false,
            error: errJson.error
          };
        }
      }
    } catch {
      // Local database fallback
    }

    // Fallback: Authenticate against local usersList database
    const found = usersList.find(u => u.email.toLowerCase() === trimmedEmail && u.isActive);
    if (found) {
      const correctPassword = found.password || 'password';
      if (passwordInput === correctPassword) {
        setUser(found);
        try {
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(found));
        } catch {}
        return { success: true };
      }
    }
    return { success: false, error: 'Invalid email or password.' };
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem('paila_auth_token');
    } catch {
      // Ignore
    }
  };

  const addUser = async (newUser: User): Promise<User> => {
    let createdUser = newUser;
    try {
      const created = await apiClient.users.create({
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        password: newUser.password,
        isActive: newUser.isActive
      });
      if (created && created.id) {
        createdUser = created;
      }
    } catch (err) {
      console.warn('Backend user create failed, updating local state:', err);
    }

    setUsersList(prev => {
      const next = [createdUser, ...prev.filter(u => u.id !== createdUser.id)];
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    return createdUser;
  };

  const updateUser = async (updatedUser: User): Promise<void> => {
    // 1. Immediately update local state & localStorage
    setUsersList(prev => {
      const next = prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. If updating current logged-in user, immediately update session
    if (user && user.id === updatedUser.id) {
      const mergedCurrentUser: User = { ...user, ...updatedUser };
      setUser(mergedCurrentUser);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(mergedCurrentUser));
      } catch {}
    }

    // 3. Persist to API client & database
    try {
      await apiClient.users.update(updatedUser.id, updatedUser);
    } catch (err) {
      console.warn('Backend user update failed:', err);
    }
  };

  const deleteUser = async (userId: number): Promise<void> => {
    setUsersList(prev => {
      const next = prev.filter(u => u.id !== userId);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (user && user.id === userId) {
      logout();
    }

    try {
      await apiClient.users.delete(userId);
    } catch (err) {
      console.warn('Backend user delete failed:', err);
    }
  };

  const setUserPassword = async (userId: number, newPassword: string): Promise<void> => {
    setUsersList(prev => {
      const next = prev.map(u => {
        if (u.id === userId) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (user && user.id === userId) {
      const updatedUser: User = { ...user, password: newPassword };
      setUser(updatedUser);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
      } catch {}
    }

    try {
      await apiClient.users.setPassword(userId, newPassword);
    } catch (err) {
      console.warn('Backend set password failed:', err);
    }
  };

  const setAllUsers = (newUsers: User[]) => {
    setUsersList(newUsers);
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usersList,
        login,
        logout,
        isAuthenticated: !!user,
        refreshUsers,
        addUser,
        updateUser,
        deleteUser,
        setUserPassword,
        setAllUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function hasAccess(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}

