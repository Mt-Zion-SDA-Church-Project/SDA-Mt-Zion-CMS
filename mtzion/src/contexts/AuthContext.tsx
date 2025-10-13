import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isMember = user?.role === 'member';

  useEffect(() => {
    console.log('AuthProvider: Starting auth initialization');
    
    // Check for existing session first
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { session, error });
        
        if (session?.user) {
          console.log('Found existing session, fetching user profile...');
          await fetchUserProfile(session.user.id);
        } else {
          console.log('No existing session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
        setLoading(false);
      }
    };

    // Initialize auth state
    initializeAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', { event, session });
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('=== FETCH USER PROFILE START ===');
    console.log('Fetching user profile for:', userId);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 30000)       
    );

    try {
      console.log('About to query system_users table...');

      // First try to get system user (admin) with timeout
      const systemUserPromise = supabase
        .from('system_users')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const { data: systemUser, error: systemError } = await Promise.race([
        systemUserPromise,
        timeoutPromise
      ]) as any;

      console.log('System user query result:', { systemUser, systemError });
      
      // Log detailed error information
      if (systemError) {
        console.error('System user query error details:', {
          message: systemError.message,
          details: systemError.details,
          hint: systemError.hint,
          code: systemError.code
        });
      }

      if (systemUser && !systemError) {
        if (systemUser.is_active === false) {
          console.warn('System user is inactive; signing out');
          try {
            await supabase.auth.signOut();
          } catch (e) {
            console.error('Error signing out inactive user:', e);
          }
          setUser(null);
          return;
        }
        setUser({
          id: userId,
          email: systemUser.email,
          role: systemUser.role,
          full_name: systemUser.full_name,
        });
        console.log('Set user as system user:', systemUser);
      } else {
        console.log('No system user found, trying members table...');
        
        // Try to get member with timeout
        const memberPromise = supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        const { data: member, error: memberError } = await Promise.race([
          memberPromise,
          timeoutPromise
        ]) as any;

        console.log('Member query result:', { member, memberError });

        if (member && !memberError) {
          setUser({
            id: userId,
            email: member.email || '',
            role: 'member',
            full_name: `${member.first_name} ${member.last_name}`,
          });
          console.log('Set user as member:', member);
        } else {
          console.log('No user profile found in either table');
          // Don't set a fallback user - let them stay logged out
          console.log('No user profile found - user will remain logged out');
        }
      }
    } catch (error) {
      console.error('CRITICAL ERROR in fetchUserProfile:', error);
      console.error('Error details:', error.message);
      
      // Don't set a fallback user - let them stay logged out
      console.log('Database error - user will remain logged out');
    } finally {
      console.log('=== FETCH USER PROFILE END - Setting loading to false ===');
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in with:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('Sign in result:', { data, error });

    if (error) {
      console.error('Sign in error:', error.message);
      throw error;
    }
    
    console.log('Sign in successful, user:', data.user?.id);
  };

  const signOut = async () => {
    console.log('Starting sign out process...');
    try {
      // Sign out from Supabase first
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        // Continue with local cleanup even if Supabase signOut fails
      }
      
      // Clear all local storage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
      
      console.log('Sign out successful');
      
      // Clear local state - this will trigger the auth state change listener
      setUser(null);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still try to clear local state
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        isAdmin,
        isMember,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}