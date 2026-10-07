"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) router.push("/dashboard");
    else setError((await r.json()).error || "خطا");
  }

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>ورود مدیریت</h1>
        <form onSubmit={submit} className="grid">
          <input className="input" type="email" placeholder="ایمیل" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="رمز عبور" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="btn">ورود</button>
          {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <p style={{ marginTop: 0 }}>کارمند هستید؟</p>
          <Link className="btn" href="/firebase-login">ورود کارمند با Firebase</Link>
        </div>
      </div>
    </main>
  );
}
