import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePicture?: string;
  status: string;
  lastSeen: Date;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthStore extends AuthState {
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => {
      console.log('🏪 Initializing auth store...');
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        
        setUser: (user: User) => set({ 
          user, 
          isAuthenticated: true 
        }),
        
        setToken: (token: string) => set({ 
          token,
          isAuthenticated: true 
        }),
        
        logout: () => set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        }),
        
        setLoading: (isLoading: boolean) => set({ isLoading }),
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);