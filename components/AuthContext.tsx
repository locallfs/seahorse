"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { medusa } from "@/lib/medusa";
import { FetchError } from "@medusajs/js-sdk";

interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCustomer = useCallback(async () => {
    try {
      const { customer } = await medusa.store.customer.retrieve();
      setCustomer(customer as Customer);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("medusa_auth_token");
    if (token) {
      fetchCustomer();
    } else {
      setLoading(false);
    }
  }, [fetchCustomer]);

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await medusa.auth.login("customer", "emailpass", {
        email,
        password,
      });
      if (typeof token !== "string") {
        throw new Error("Authentication requires additional steps");
      }
      await fetchCustomer();
    },
    [fetchCustomer]
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        await medusa.auth.register("customer", "emailpass", {
          email,
          password,
        });
      } catch (error) {
        const fetchError = error as FetchError;
        if (
          fetchError.statusText === "Unauthorized" &&
          fetchError.message === "Identity with email already exists"
        ) {
          const loginResponse = await medusa.auth.login("customer", "emailpass", {
            email,
            password,
          });
          if (typeof loginResponse !== "string") {
            throw new Error("Authentication requires additional steps");
          }
        } else {
          throw error;
        }
      }

      await medusa.store.customer.create({
        first_name: firstName,
        last_name: lastName,
        email,
      });

      await fetchCustomer();
    },
    [fetchCustomer]
  );

  const logout = useCallback(async () => {
    try {
      await medusa.auth.logout();
    } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("medusa_auth_token");
    }
    setCustomer(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ customer, loading, login, register, logout, refetch: fetchCustomer }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
