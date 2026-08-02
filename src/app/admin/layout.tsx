"use client";

import AdminLayout from "@/components/layout/AdminLayout";
import { PageTransition } from "@/components/ui/PageTransition";

export default function AdminAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayout>
      <PageTransition>
        {children}
      </PageTransition>
    </AdminLayout>
  );
}
