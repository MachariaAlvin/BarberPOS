
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Staff, Role, AppSettings } from '../types';
import { apiService } from '../services/api';

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_REPORTS: 'view_reports',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_STAFF: 'manage_staff',
  MANAGE_INVENTORY: 'manage_inventory',
  MANAGE_SERVICES: 'manage_services',
  MANAGE_CUSTOMERS: 'manage_customers',
  VIEW_STAFF: 'view_staff',
  VIEW_INVENTORY: 'view_inventory',
  VIEW_SERVICES: 'view_services',
  VIEW_CUSTOMERS: 'view_customers',
  PROCESS_SALE: 'process_sale',
  PROCESS_REFUND: 'process_refund',
  VIEW_ALL_APPOINTMENTS: 'view_all_appointments',
  VIEW_OWN_APPOINTMENTS: 'view_own_appointments',
  CREATE_APPOINTMENT: 'create_appointment',
  VIEW_ALL_COMMISSIONS: 'view_all_commissions',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

interface AuthContextType {
  user: Staff | null;
  businessId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Fix: Added mfaRequired and verifyMFA to satisfy the interface expected by Login.tsx
  mfaRequired: boolean;
  login: (businessSlug: string, username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  can: (action: string) => boolean;
  verifyMFA: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Staff | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({} as any);
  const [isLoading, setIsLoading] = useState(true);
  // Fix: Added state for MFA tracking
  const [mfaRequired, setMfaRequired] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const bid = localStorage.getItem('businessId');
      const storedUser = localStorage.getItem('userObject');
      
      if (token && storedUser && bid) {
        setUser(JSON.parse(storedUser));
        setBusinessId(bid);
        
        // Load actual tenant permissions from server
        try {
          const settings: AppSettings = await apiService.getSettings();
          if (settings && settings.rolePermissions) {
            setPermissions(settings.rolePermissions);
          }
        } catch (e) {
          console.warn("Could not load fresh permissions", e);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (businessSlug: string, username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiService.login(businessSlug, username, password);
      
      // Fix: Check for MFA requirement in the login response
      if (response && response.requiresMfa) {
        setMfaRequired(true);
        return true;
      }

      if (response && response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('businessId', response.user.businessId);
        localStorage.setItem('userObject', JSON.stringify(response.user));
        setUser(response.user);
        setBusinessId(response.user.businessId);
        
        // Fetch permissions for the role
        const settings: AppSettings = await apiService.getSettings();
        setPermissions(settings.rolePermissions);
        
        window.dispatchEvent(new Event('auth-change'));
        return true;
      }
    } catch (e) { throw e; }
    return false;
  };

  // Fix: Implemented verifyMFA stub to handle two-factor authentication
  const verifyMFA = async (code: string): Promise<boolean> => {
    // Basic verification logic for simulation
    if (code.length === 6) {
      setMfaRequired(false);
      // In a real flow, you would verify against the backend and finalize the login session
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setBusinessId(null);
    setPermissions({} as any);
    window.dispatchEvent(new Event('auth-change'));
  };

  const can = (action: string): boolean => {
    if (!user) return false;
    if (user.role === 'Owner') return true;
    
    const rolePermissions = permissions[user.role] || [];
    return rolePermissions.includes(action);
  };

  return (
    <AuthContext.Provider value={{ 
      user, businessId, isAuthenticated: !!user, isLoading, login, logout, can,
      mfaRequired, verifyMFA 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
