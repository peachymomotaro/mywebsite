import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";

  const password = formData.get("password");

  if (password !== process.env.QB_PASSWORD) {
    redirect("/qb-login?error=1");
  }

  const cookieStore = await cookies();

  cookieStore.set("qb_auth", String(password), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/qb");
}

export default function QBLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main style={{ padding: 48, fontFamily: "Arial, sans-serif" }}>
      <h1>QB Login</h1>

      {searchParams.error && (
        <p style={{ color: "red" }}>Wrong password.</p>
      )}

      <form action={login}>
        <input
          name="password"
          type="password"
          placeholder="Password"
          style={{ padding: 12, fontSize: 18 }}
        />

        <button
          type="submit"
          style={{ padding: 12, fontSize: 18, marginLeft: 8 }}
        >
          Enter
        </button>
      </form>
    </main>
  );
}