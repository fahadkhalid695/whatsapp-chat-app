import { create } from 'zustand';

interface User {
  id: string;
  phoneNumber: string;
  displayName: string;
  profilePicture?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSimpleAuthStore = create<AuthStore>((set) => ({
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
}));