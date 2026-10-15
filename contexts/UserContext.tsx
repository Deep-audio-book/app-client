import axios from '@/axios.config';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

type User = {
  id: number;
  name: string;
  avatar?: string | null;
  email?: string;
};

type UserContextValue = {
  user: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  refetch: async () => {},
});

// Wrap your app's root layout with this ONCE. Every screen that calls
// useUser() below will then share the same fetched user — no per-screen
// axios calls, no duplicated "getInitials" logic.
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);

      const { data } = await axios.post('/', {
        method: 'getProfile', // adjust to your actual backend method name
      });

      if (data.statusCode === 200) {
        setUser(data.data);
      }
    } catch (err) {
      console.log('getProfile error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, refetch: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

// Use this in ANY screen/component to read the logged-in user.
export function useUser() {
  return useContext(UserContext);
}

// Shared initials helper — same logic every screen used to duplicate.
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return initials || '?';
}
