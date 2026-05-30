import { useState, type CSSProperties } from "react";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { defaultReceiptSettings, useReceiptSettings, type ReceiptSettings, type ReceiptWidth } from "../lib/receiptSettings";

export default function SettingsPage() {
  const [settings, setSettings] = useReceiptSettings();
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) {
    setSaved(false);
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function readQr(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("qrImage", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <>
      <PageHeader title="ຕັ້ງຄ່າບິນ" subtitle="ຕັ້ງຊື່ຮ້ານ, ຂະໜາດບິນ, QR ໂຄດ ແລະຕົບແຕ່ງບິນ" />
      {saved ? <Alert message="ບັນທຶກການຕັ້ງຄ່າແລ້ວ" /> : null}

      <div className="settings-grid">
        <section className="card">
          <h2 className="card__title">ຂໍ້ມູນຮ້ານ</h2>
          <div className="settings-form">
            <label className="label">
              ຊື່ຮ້ານ
              <input value={settings.shopName} onChange={(e) => update("shopName", e.target.value)} />
            </label>
            <label className="label">
              ຂໍ້ຄວາມໃຕ້ຊື່ຮ້ານ
              <input value={settings.shopSubtitle} onChange={(e) => update("shopSubtitle", e.target.value)} />
            </label>
            <label className="label">
              ຂໍ້ຄວາມທ້າຍບິນ
              <textarea rows={3} value={settings.footerText} onChange={(e) => update("footerText", e.target.value)} />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">ຮູບແບບບິນ</h2>
          <div className="settings-form">
            <label className="label">
              ຂະໜາດບິນ
              <select value={settings.receiptWidth} onChange={(e) => update("receiptWidth", e.target.value as ReceiptWidth)}>
                <option value="58mm">58mm</option>
                <option value="80mm">80mm</option>
                <option value="a5">A5</option>
              </select>
            </label>
            <label className="label">
              ສີຫົວບິນ
              <input type="color" value={settings.accentColor} onChange={(e) => update("accentColor", e.target.value)} />
            </label>
            <label className="label">
              ຮູບ QR ໂຄດ
              <input type="file" accept="image/*" onChange={(e) => readQr(e.target.files?.[0])} />
            </label>
            {settings.qrImage ? (
              <div className="qr-preview">
                <img src={settings.qrImage} alt="QR code preview" />
                <button type="button" className="btn btn--danger btn--sm" onClick={() => update("qrImage", null)}>
                  ລຶບ QR
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">ຕົວຢ່າງບິນ</h2>
          <ReceiptPreview settings={settings} />
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="button" className="btn btn--primary" onClick={() => setSaved(true)}>
              ບັນທຶກ
            </button>
            <button type="button" className="btn" onClick={() => setSettings(defaultReceiptSettings)}>
              ກັບຄ່າເລີ່ມຕົ້ນ
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

function ReceiptPreview({ settings }: { settings: ReceiptSettings }) {
  return (
    <div className={`receipt-paper receipt-paper--${settings.receiptWidth}`} style={{ "--receipt-accent": settings.accentColor } as CSSProperties}>
      <div className="receipt-header">
        <h2>{settings.shopName}</h2>
        <p>{settings.shopSubtitle}</p>
      </div>
      <div className="receipt-meta">
        <span>ORD-0001</span>
        <span>ໂຕະ 5</span>
      </div>
      <div className="receipt-lines">
        <div><span>ຕຳລາວ x1</span><strong>35,000 ກີບ</strong></div>
        <div><span>ນ້ຳດື່ມ x2</span><strong>10,000 ກີບ</strong></div>
      </div>
      <div className="receipt-total"><span>ລວມ</span><strong>45,000 ກີບ</strong></div>
      {settings.qrImage ? <img className="receipt-qr" src={settings.qrImage} alt="QR code" /> : null}
      <p className="receipt-footer">{settings.footerText}</p>
    </div>
  );
}
