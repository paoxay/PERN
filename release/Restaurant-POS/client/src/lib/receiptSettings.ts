import { useEffect, useState } from "react";

export type ReceiptWidth = "58mm" | "80mm" | "a5";

export type ReceiptSettings = {
  shopName: string;
  shopSubtitle: string;
  receiptWidth: ReceiptWidth;
  accentColor: string;
  footerText: string;
  qrImage: string | null;
};

export const defaultReceiptSettings: ReceiptSettings = {
  shopName: "ຮ້ານຕຳ & ອາຫານ",
  shopSubtitle: "ຂອບໃຈທີ່ອຸດໜູນ",
  receiptWidth: "80mm",
  accentColor: "#ea580c",
  footerText: "ຂອບໃຈ ໂອກາດໜ້າເຊີນໃໝ່",
  qrImage: null,
};

const storageKey = "restaurant-pos.receipt-settings";

export function loadReceiptSettings(): ReceiptSettings {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultReceiptSettings;
    return { ...defaultReceiptSettings, ...(JSON.parse(raw) as Partial<ReceiptSettings>) };
  } catch {
    return defaultReceiptSettings;
  }
}

export function saveReceiptSettings(settings: ReceiptSettings) {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

export function useReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettings>(() => loadReceiptSettings());

  useEffect(() => {
    saveReceiptSettings(settings);
  }, [settings]);

  return [settings, setSettings] as const;
}
