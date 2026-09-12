import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const AuthContext = createContext(null);

export const SmartAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Map supabase user to match old clerk user format slightly for compatibility
  const mappedUser = user ? {
    id: user.id,
    firstName: user.user_metadata?.first_name || user.email.split('@')[0],
    primaryEmailAddress: { emailAddress: user.email }
  } : null;

  // Supabase equivalent for getToken (mostly just gets current session JWT if needed, or null)
  const getToken = async () => {
    if (!session) return null;
    return session.access_token;
  };

  return (
    <AuthContext.Provider value={{ user: mappedUser, session, getToken, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useSmartAuth = () => useContext(AuthContext);
