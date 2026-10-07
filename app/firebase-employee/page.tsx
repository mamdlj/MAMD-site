"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { firebaseAuth, firestore } from "@/lib/firebase";

type Profile = {
  name?: string;
  email?: string;
  role?: string;
  active?: boolean;
  restaurantId?: string;
};

type Product = {
  id: string;
  name?: string;
  price?: number | string;
  available?: boolean;
};

type Order = {
  id: string;
  number?: number;
  customerName?: string;
  total?: number | string;
  status?: string;
  paymentStatus?: string;
};

type Inventory = {
  id: string;
  name?: string;
  quantity?: number | string;
  unit?: string;
  minimumStock?: number | string;
};

const orderStatuses = ["PLACED", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "CANCELLED"];

function numeric(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function FirebaseEmployeePage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selected = useMemo(
    () => products.find((item) => item.id === selectedProduct),
    [products, selectedProduct]
  );

  useEffect(() => {
    let unsubscribeData: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      unsubscribeData?.();
      unsubscribeData = undefined;

      if (!user) {
        setAuthUser(null);
        setProfile(null);
        router.replace("/firebase-login");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const profileSnap = await getDoc(doc(firestore, "users", user.uid));
        const data = profileSnap.data() as Profile | undefined;

        if (
          !profileSnap.exists() ||
          data?.role !== "EMPLOYEE" ||
          data.active !== true ||
          !data.restaurantId
        ) {
          await signOut(firebaseAuth);
          router.replace("/firebase-login");
          return;
        }

        setAuthUser(user);
        setProfile(data);
        const restaurantId = data.restaurantId;

        const unsubProducts = onSnapshot(
          query(collection(firestore, "products"), where("restaurantId", "==", restaurantId), limit(100)),
          (snapshot) => {
            setProducts(snapshot.docs.map((item) => ({
              id: item.id,
              ...(item.data() as Omit<Product, "id">),
            })));
          },
          (snapshotError) => setError(snapshotError.message)
        );

        const unsubOrders = onSnapshot(
          query(collection(firestore, "orders"), where("restaurantId", "==", restaurantId), limit(100)),
          (snapshot) => {
            setOrders(snapshot.docs.map((item) => ({
              id: item.id,
              ...(item.data() as Omit<Order, "id">),
            })));
          },
          (snapshotError) => setError(snapshotError.message)
        );

        const unsubInventory = onSnapshot(
          query(collection(firestore, "inventory"), where("restaurantId", "==", restaurantId), limit(100)),
          (snapshot) => {
            setInventory(snapshot.docs.map((item) => ({
              id: item.id,
              ...(item.data() as Omit<Inventory, "id">),
            })));
          },
          (snapshotError) => setError(snapshotError.message)
        );

        unsubscribeData = () => {
          unsubProducts();
          unsubOrders();
          unsubInventory();
        };

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "دریافت اطلاعات ناموفق بود.");
        setLoading(false);
      }
    });

    return () => {
      unsubscribeData?.();
      unsubscribeAuth();
    };
  }, [router]);

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authUser || !profile?.restaurantId || !selected || quantity < 1) return;

    setError("");
    setNotice("");
    setCreatingOrder(true);

    try {
      const unitPrice = numeric(selected.price);
      await addDoc(collection(firestore, "orders"), {
        restaurantId: profile.restaurantId,
        createdBy: authUser.uid,
        type: "TAKEAWAY",
        status: "PLACED",
        customerName: customerName.trim() || null,
        customerPhone: customerPhone.trim() || null,
        subtotal: unitPrice * quantity,
        discount: 0,
        tax: 0,
        serviceFee: 0,
        total: unitPrice * quantity,
        paymentStatus: "PENDING",
        items: [{
          productId: selected.id,
          productName: selected.name || "محصول",
          quantity,
          unitPrice,
          total: unitPrice * quantity,
        }],
        createdAt: serverTimestamp(),
      });

      setCustomerName("");
      setCustomerPhone("");
      setQuantity(1);
      setNotice("سفارش با موفقیت ثبت شد.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت سفارش ناموفق بود.");
    } finally {
      setCreatingOrder(false);
    }
  }

  async function changeStatus(orderId: string, status: string) {
    setError("");
    try {
      await updateDoc(doc(firestore, "orders", orderId), { status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر وضعیت سفارش ناموفق بود.");
    }
  }

  async function logout() {
    await signOut(firebaseAuth);
    router.replace("/firebase-login");
  }

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
          <button className="btn" onClick={logout}>خروج</button>
        </div>
      </div>

      {error && <div className="card" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</div>}
      {notice && <div className="card" style={{ color: "var(--primary)", marginBottom: 16 }}>{notice}</div>}

      <div className="grid cards">
        <div className="card"><b>محصولات</b><h2>{products.length}</h2></div>
        <div className="card"><b>سفارش‌ها</b><h2>{orders.length}</h2></div>
        <div className="card"><b>اقلام انبار</b><h2>{inventory.length}</h2></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>ثبت سفارش</h2>
        <form onSubmit={createOrder} className="grid">
          <select className="input" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} required>
            <option value="">محصول را انتخاب کنید</option>
            {products.filter((item) => item.available !== false).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name || "بدون نام"} — {numeric(item.price).toLocaleString("fa-IR")}
              </option>
            ))}
          </select>
          <input className="input" type="number" min={1} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} required />
          <input className="input" placeholder="نام مشتری (اختیاری)" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
          <input className="input" placeholder="شماره مشتری (اختیاری)" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} />
          <button className="btn" disabled={creatingOrder || !selectedProduct}>
            {creatingOrder ? "در حال ثبت..." : "ثبت سفارش"}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>سفارش‌ها</h2>
        {orders.length === 0 ? <p>سفارشی ثبت نشده است.</p> : (
          <div className="grid">
            {orders.map((order) => (
              <div key={order.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <b>{order.customerName || "مشتری حضوری"}</b>
                    <div>{numeric(order.total).toLocaleString("fa-IR")} تومان</div>
                  </div>
                  <select className="input" style={{ width: 170 }} value={order.status || "PLACED"} onChange={(event) => changeStatus(order.id, event.target.value)}>
                    {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>موجودی انبار</h2>
        {inventory.length === 0 ? <p>موردی ثبت نشده است.</p> : (
          <div className="grid">
            {inventory.map((item) => {
              const low = numeric(item.quantity) <= numeric(item.minimumStock);
              return (
                <div key={item.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
                  <b>{item.name || "بدون نام"}</b>
                  <div style={{ color: low ? "var(--danger)" : "inherit" }}>
                    {numeric(item.quantity).toLocaleString("fa-IR")} {item.unit || ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
