import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Map Supabase user to our App User type
        const appUser: User = {
          id: session.user.id,
          name: session.user.user_metadata.name || 'User',
          phone: session.user.phone || '',
          storeName: session.user.user_metadata.storeName || 'My Store',
          email: session.user.email,
          createdAt: session.user.created_at
        };
        setUser(appUser);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const appUser: User = {
          id: session.user.id,
          name: session.user.user_metadata.name || 'User',
          phone: session.user.phone || '',
          storeName: session.user.user_metadata.storeName || 'My Store',
          email: session.user.email,
          createdAt: session.user.created_at
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">جاري الاتصال بالسيرفر...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};