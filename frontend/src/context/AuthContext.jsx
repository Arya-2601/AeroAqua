import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { INDIA_REGIONS, getRegionMeta } from '../utils/regions';

const AuthContext = createContext(null);

export const AVAILABLE_REGIONS = INDIA_REGIONS;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    return localStorage.getItem('aeroaqua_token') || null;
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('aeroaqua_user');
    const savedToken = localStorage.getItem('aeroaqua_token');
    if (savedUser && savedToken) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [currentRegion, setCurrentRegion] = useState(() => {
    return localStorage.getItem('aeroaqua_region') || 'Delhi';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('aeroaqua_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('aeroaqua_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('aeroaqua_region', currentRegion);
  }, [currentRegion]);

  const login = async (username, password, role = null, region = null) => {
    try {
      const targetRole = role || (username.toLowerCase().includes('auth') || username.toLowerCase().includes('admin') ? 'authority' : 'citizen');
      const targetRegion = region || currentRegion;
      const data = await api.login(username, password, targetRole, targetRegion);
      localStorage.setItem('aeroaqua_token', data.token);
      setToken(data.token);
      const loggedInUser = {
        username: data.user.username,
        role: data.user.role,
        region: data.user.region || targetRegion,
      };
      setUser(loggedInUser);
      if (loggedInUser.region) {
        setCurrentRegion(loggedInUser.region);
      }
      return { success: true, user: loggedInUser };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.detail || 'Authentication failed. Please verify credentials.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('aeroaqua_token');
    localStorage.removeItem('aeroaqua_user');
    setToken(null);
    setUser(null);
  };

  const setRoleQuickToggle = (targetRole) => {
    if (targetRole === 'citizen') {
      login('citizen', 'citizen123', 'citizen', currentRegion);
    } else if (targetRole === 'authority') {
      login('authority', 'admin123', 'authority', currentRegion);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!token,
        role: user?.role || null,
        isAuthority: user?.role === 'authority',
        isCitizen: user?.role === 'citizen',
        currentRegion,
        setCurrentRegion,
        token,
        login,
        logout,
        setRoleQuickToggle,
        getRegionMeta,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
