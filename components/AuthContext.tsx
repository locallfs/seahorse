"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { medusa } from "@/lib/medusa";

interface CustomerAddress {
  id: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  addresses?: CustomerAddress[];
}

export interface RegisterProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  address1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
}

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile: RegisterProfile
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
      const { customer } = await medusa.store.customer.retrieve({
        fields: "id,email,first_name,last_name,phone,*addresses",
      });
      setCustomer(customer as Customer);
    } catch {
      setCustomer(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("medusa_auth_token");
      }
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
    async (email: string, password: string, profile: RegisterProfile) => {
      let needsLogin = false;
      try {
        await medusa.auth.register("customer", "emailpass", {
          email,
          password,
        });
      } catch {
        needsLogin = true;
      }

      if (needsLogin) {
        const loginResponse = await medusa.auth.login("customer", "emailpass", {
          email,
          password,
        });
        if (typeof loginResponse !== "string") {
          throw new Error("Authentication requires additional steps");
        }
      }

      await medusa.store.customer.create({
        first_name: profile.firstName,
        last_name: profile.lastName,
        email,
        phone: profile.phone,
      });

      const hasAddress =
        profile.address1 &&
        profile.city &&
        profile.province &&
        profile.postalCode;

      if (hasAddress) {
        try {
          await medusa.store.customer.createAddress({
            first_name: profile.firstName,
            last_name: profile.lastName,
            phone: profile.phone,
            address_1: profile.address1,
            city: profile.city,
            province: profile.province,
            postal_code: profile.postalCode,
            country_code: (profile.countryCode || "us").toLowerCase(),
            is_default_shipping: true,
            is_default_billing: true,
          });
        } catch {
          // Address save is best-effort; account is already created.
        }
      }

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
