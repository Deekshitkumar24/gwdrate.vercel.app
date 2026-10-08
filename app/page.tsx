import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("gwd_session");

  if (sessionCookie?.value) {
    const payload = verifyToken(sessionCookie.value);
    if (payload?.role === "team") {
      redirect("/dashboard");
    } else if (payload?.role === "admin") {
      redirect("/admin");
    }
  }

  redirect("/login");
}
