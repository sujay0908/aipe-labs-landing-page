import Link from "next/link";

export function Topbar({ email, admin }: { email?: string | null; admin?: boolean }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={email ? "/learn" : "/"} className="logo">
          <span className="accent">AIPE</span> Labs
        </Link>
        <nav>
          {email && <Link href="/learn">Courses</Link>}
          {admin && <Link href="/admin/applications">Admin</Link>}
          {email ? (
            <form action="/logout" method="post">
              <button className="linkbtn" type="submit">Log out</button>
            </form>
          ) : (
            <Link href="/login">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
