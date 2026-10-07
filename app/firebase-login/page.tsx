"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { firebaseAuth, firestore } from "@/lib/firebase";

export default function FirebaseLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim().toLowerCase(),
        password
      );

      const snapshot = await getDoc(doc(firestore, "users", credential.user.uid));
      if (!snapshot.exists()) {
        await firebaseAuth.signOut();
        throw new Error("حساب کاربری در Firestore پیدا نشد.");
      }

      const profile = snapshot.data();
      if (profile.role !== "EMPLOYEE" || profile.active !== true) {
        await firebaseAuth.signOut();
        throw new Error("این حساب دسترسی کارمند فعال را ندارد.");
      }

      router.replace("/firebase-employee");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>ورود کارمند</h1>
        <p style={{ color: "#6b7280" }}>
          ورود با Firebase Authentication
        </p>

        <form onSubmit={submit} className="grid">
          <input
            className="input"
            type="email"
            placeholder="ایمیل"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="رمز عبور"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="btn" disabled={loading}>
            {loading ? "در حال ورود..." : "ورود"}
          </button>
          {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
