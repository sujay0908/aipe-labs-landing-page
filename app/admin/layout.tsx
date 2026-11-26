import { Topbar } from "@/components/Topbar";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Admin", robots: { index: false } };

// Team only. Everyone else, logged in or not, gets a 404 (see requireAdmin).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <>
      <Topbar email={email} admin />
      {children}
    </>
  );
}
