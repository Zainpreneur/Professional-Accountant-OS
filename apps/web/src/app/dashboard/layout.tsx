"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="page">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="topnav">
        <Link href="/dashboard" className="brand">
          Professional Accountant OS
        </Link>
        <div className="row">
          <span className="muted" style={{ color: "#cfe0ee" }}>
            {user.firstName} {user.lastName}
          </span>
          <button className="secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
