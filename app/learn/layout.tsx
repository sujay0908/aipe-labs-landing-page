import { Topbar } from "@/components/Topbar";
import { requireMember } from "@/lib/auth";
import { isAdmin } from "@/lib/env";

// Every page under /learn needs a paid seat (or a team login). See lib/auth.ts.
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  return (
    <>
      <Topbar email={member.email} admin={isAdmin(member.email)} />
      {children}
    </>
  );
}
