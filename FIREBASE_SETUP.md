# Firebase setup

این پروژه برای کارمندها از Firebase Authentication + Firestore استفاده می‌کند.

## 1. Firebase Authentication

در Firebase Console پروژه foodstock-manager-e33ed، در Authentication > Sign-in method، روش Email/Password را فعال کنید.

برای هر کارمند یک حساب Email/Password بسازید.

## 2. Firestore

Rules و indexes این پروژه در ریشه repo قرار دارند:
- firestore.rules
- firestore.indexes.json

## 3. نقش کارمند

سند roles/EMPLOYEE:

{
  "name": "EMPLOYEE",
  "label": "کارمند",
  "active": true
}

## 4. پروفایل کارمند

بعد از ساخت حساب Authentication، UID همان کاربر را بردارید و سند users/{UID} را بسازید:

{
  "name": "کارمند",
  "email": "employee@example.com",
  "role": "EMPLOYEE",
  "active": true,
  "restaurantId": "restaurant-1"
}

email باید با ایمیل حساب Firebase Authentication یکسان باشد.

ساخت و تغییر users از سمت کلاینت عمداً بسته است؛ role، active و restaurantId نباید توسط کارمند قابل ارتقا یا تغییر باشند.

## 5. محیط Next.js

مقادیر Web SDK را در .env.local قرار دهید. نمونه کامل در .env.firebase.example و .env.example وجود دارد.

Service Account private key را داخل GitHub یا محیط کلاینت قرار ندهید.

## 6. مسیرهای برنامه

- /login — ورود مدیریت با Prisma
- /firebase-login — ورود کارمند با Firebase Authentication
- /firebase-employee — پنل realtime کارمند

پنل کارمند می‌تواند محصولات، سفارش‌ها و موجودی همان رستوران را بخواند، سفارش ثبت کند و وضعیت سفارش را تغییر دهد.

## 7. امنیت Firestore

- کارمند فقط داده‌های restaurantId خودش را می‌بیند.
- کارمند نمی‌تواند محصول، موجودی یا کارکنان را ایجاد/ویرایش/حذف کند.
- کارمند می‌تواند سفارش ایجاد کند.
- کارمند فقط فیلدهای مجاز سفارش را تغییر می‌دهد.
- role، active و restaurantId برای کارمند قابل تغییر نیستند.
- تغییر tenant روی سفارش، محصول، انبار و کارکنان مسدود شده است.
- دسترسی پیش‌فرض برای اسناد ناشناخته deny است.