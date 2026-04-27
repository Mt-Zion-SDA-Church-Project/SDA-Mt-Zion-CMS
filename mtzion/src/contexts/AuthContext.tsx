import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { recordUserSessionStart, recordUserSessionEnd } from '../lib/userSessionLog';
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
  const queryClient = useQueryClient();
  const [sessionReady, setSessionReady] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    console.log('AuthProvider: Starting auth initialization');

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        console.log('Initial session check:', { session, error });
        setAuthUserId(session?.user?.id ?? null);
      } catch (error) {
        console.error('Error checking initial session:', error);
      } finally {
        setSessionReady(true);
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session });

      if (event === 'TOKEN_REFRESHED') {
        const uid = session?.user?.id;
        if (uid) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile(uid) });
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.user?.id) {
        void recordUserSessionStart(session.user.id);
      }

      const uid = session?.user?.id ?? null;
      setAuthUserId(uid);
      if (!uid) {
        queryClient.removeQueries({ queryKey: ['auth'] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const { data: user, isPending: profilePending } = useQuery({
    queryKey: queryKeys.auth.profile(authUserId ?? 'none'),
    enabled: sessionReady && !!authUserId,
    staleTime: 0,
    queryFn: async (): Promise<User | null> => {
      const userId = authUserId!;
      console.log('=== FETCH USER PROFILE START ===');
      console.log('Fetching user profile for:', userId);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 30000)
      );

      try {
        console.log('About to query system_users table...');

        // Must not filter by is_active here: inactive rows must be detected so we do not
        // fall through to members and incorrectly treat a deactivated portal user as logged in.
        const systemUserPromise = supabase
          .from('system_users')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const { data: systemUser, error: systemError } = (await Promise.race([
          systemUserPromise,
          timeoutPromise,
        ])) as Awaited<typeof systemUserPromise>;

        console.log('System user query result:', { systemUser, systemError });

        if (systemError) {
          console.error('System user query error details:', {
            message: systemError.message,
            details: systemError.details,
            hint: systemError.hint,
            code: systemError.code,
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
            return null;
          }
          console.log('Set user as system user:', systemUser);
          return {
            id: userId,
            email: systemUser.email,
            role: systemUser.role as User['role'],
            full_name: systemUser.full_name,
          };
        }

        console.log('No system user row, trying members table...');

        const memberPromise = supabase
          .from('members')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        const { data: member, error: memberError } = (await Promise.race([
          memberPromise,
          timeoutPromise,
        ])) as Awaited<typeof memberPromise>;

        console.log('Member query result:', { member, memberError });

        if (member && !memberError) {
          console.log('Set user as member:', member);
          return {
            id: userId,
            email: member.email || '',
            role: 'member',
            full_name: `${member.first_name} ${member.last_name}`,
          };
        }

        console.log('No user profile found in either table');
        return null;
      } catch (error: unknown) {
        const err = error as { message?: string };
        console.error('CRITICAL ERROR in fetchUserProfile:', error);
        console.error('Error details:', err?.message);
        return null;
      } finally {
        console.log('=== FETCH USER PROFILE END ===');
      }
    },
  });

  const resolvedUser = !authUserId ? null : (user ?? null);
  const loading = !sessionReady || (!!authUserId && profilePending);
  const isAdmin = resolvedUser?.role === 'admin' || resolvedUser?.role === 'super_admin';
  const isMember = resolvedUser?.role === 'member';

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
    const uid = authUserId;
    if (uid) {
      try {
        await recordUserSessionEnd(uid);
      } catch (e) {
        console.warn('recordUserSessionEnd:', e);
      }
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }

      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }

      queryClient.removeQueries({ queryKey: ['auth'] });
      setAuthUserId(null);
      console.log('Sign out successful');
    } catch (error) {
      console.error('Sign out failed:', error);
      setAuthUserId(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: resolvedUser,
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
