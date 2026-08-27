import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getAdminAccess } from "@/lib/permissions";

export default async function AdminLoginPage() {
  const requestHeaders = await headers();
  const access = await getAdminAccess(new Request("http://localhost/admin/login", { headers: requestHeaders }));
  if (access) redirect("/admin");

  return <AdminLoginForm />;
}
