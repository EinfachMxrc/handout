import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { AUTH_SESSION_COOKIE } from "@/lib/authSession";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    redirect("/auth/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
