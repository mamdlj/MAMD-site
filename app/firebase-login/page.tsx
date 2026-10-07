"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { firebaseAuth, firestore } from "@/lib/firebase";

function firebaseErrorMessage(code: string) {
  const messages: Record<string, string> = {
    "auth/invalid-credential": "ایمیل یا رمز عبور صحیح نیست.",
    "auth/invalid-email": "فرمت ایمیل صحیح نیست.",
    "auth/user-disabled": "این حساب غیرفعال شده است.",
    "auth/too-many-requests": "تعداد تلاش‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.",
    "auth/network-request-failed": "ارتباط با Firebase برقرار نشد.",
  };
  return messages[code] || "ورود ناموفق بود.";
}

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
        setError("پروفایل کاربر در Firestore ساخته نشده است.");
        return;
      }

      const profile = snapshot.data();
      if (
        profile.role !== "EMPLOYEE" ||
        profile.active !== true ||
        typeof profile.restaurantId !== "string" ||
        !profile.restaurantId
      ) {
        await firebaseAuth.signOut();
        setError("این حساب دسترسی کارمند فعال را ندارد.");
        return;
      }

      router.replace("/firebase-employee");
    } catch (err) {
      const code =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        typeof err.code === "string"
          ? err.code
          : "";

      setError(code ? firebaseErrorMessage(code) : "ورود ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 480 }}>
      <div className="card">
        <h1>ورود کارمند</h1>
        <p style={{ color: "#6b7280" }}>ورود امن با Firebase Authentication</p>

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
