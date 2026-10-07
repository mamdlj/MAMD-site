"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { firebaseAuth, firestore } from "@/lib/firebase";

type Profile = {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  restaurantId?: string;
};

type Row = Record<string, unknown> & { id: string };

export default function FirebaseEmployeePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [inventory, setInventory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        router.replace("/firebase-login");
        return;
      }

      try {
        const profileSnap = await getDoc(doc(firestore, "users", user.uid));
        const data = profileSnap.data() as Profile | undefined;

        if (!profileSnap.exists() || data?.role !== "EMPLOYEE" || data.active !== true || !data.restaurantId) {
          await signOut(firebaseAuth);
          router.replace("/firebase-login");
          return;
        }

        setAuthUser(user);
        setProfile(data);

        const restaurantId = data.restaurantId;
        const [productSnap, orderSnap, inventorySnap] = await Promise.all([
          getDocs(query(collection(firestore, "products"), where("restaurantId", "==", restaurantId), limit(50))),
          getDocs(query(collection(firestore, "orders"), where("restaurantId", "==", restaurantId), limit(50))),
          getDocs(query(collection(firestore, "inventory"), where("restaurantId", "==", restaurantId), limit(50))),
        ]);

        setProducts(productSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setOrders(orderSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setInventory(inventorySnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  if (loading) {
    return <main className="container"><div className="card">در حال بارگذاری پنل...</div></main>;
  }

  return (
    <main className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>پنل کارمند</h1>
            <div>{profile?.name || authUser?.email}</div>
            <small style={{ color: "#6b7280" }}>{profile?.role} · {profile?.restaurantId}</small>
          </div>
          <button className="btn" onClick={() => signOut(firebaseAuth).then(() => router.replace("/firebase-login"))}>
            خروج
          </button>
        </div>
      </div>

      {error && <div className="card" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</div>}

      <div className="grid cards">
        <div className="card"><b>محصولات</b><h2>{products.length}</h2></div>
        <div className="card"><b>سفارش‌ها</b><h2>{orders.length}</h2></div>
        <div className="card"><b>اقلام انبار</b><h2>{inventory.length}</h2></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>محصولات قابل مشاهده</h2>
        {products.length === 0 ? <p>محصولی ثبت نشده است.</p> : (
          <div className="grid">
            {products.map((item) => (
              <div key={item.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <b>{String(item.name ?? "بدون نام")}</b>
                <div>{item.price != null ? String(item.price) : "بدون قیمت"}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
