import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
}

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  setSession: (accessToken: string, user: AuthUser) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      status: 'idle',
      setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
      clear: () => set({ accessToken: null, user: null, status: 'unauthenticated' }),
    }),
    {
      name: 'nexus-auth',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.status === 'idle') {
          state.status = state.accessToken ? 'authenticated' : 'unauthenticated';
        }
      },
    },
  ),
);
