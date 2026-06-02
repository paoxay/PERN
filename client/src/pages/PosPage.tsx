import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { lak } from "../lib/format";
import { statusClass, statusLabel } from "../lib/orderStatus";
import { useReceiptSettings, type ReceiptSettings } from "../lib/receiptSettings";
import type { InventoryItem, MenuItem, Order } from "../types";

export default function PosPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<Order | null>(null);
  const [customer, setCustomer] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [receiptSettings] = useReceiptSettings();
  const printRef = useRef<HTMLDivElement>(null);

  const openOrders = useMemo(
    () => orders.filter((o) => o.status !== "PAID" && o.status !== "CANCELLED"),
    [orders],
  );

  const activeMenu = useMemo(() => menu.filter((m) => m.isActive), [menu]);

  async function loadOrders() {
    const all = await api.listOrders();
    setOrders(all);
    return all;
  }

  async function refresh() {
    setErr(null);
    const [m, stockRows, all] = await Promise.all([api.listMenu(), api.listInventory(), api.listOrders()]);
    setMenu(m);
    setStock(stockRows);
    setOrders(all);
    if (active) {
      const found = all.find((o) => o.id === active.id);
      if (found) setActive(found);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດຂໍ້ມູນບໍ່ສຳເລັດ"));
  }, []);

  function printTicket(kind: "kitchen" | "receipt") {
    document.body.dataset.printKind = kind;
    window.print();
    delete document.body.dataset.printKind;
  }

  return (
    <>
      <PageHeader title="ຂາຍ / ບິນ" subtitle="ຂັ້ນຕອນ: ລົງຄິວ → ກຳລັງເຮັດອາຫານ → ສຳເລັດ" />
      {err ? <Alert message={err} /> : null}

      <div className="quick-steps no-print" aria-label="ຂັ້ນຕອນອໍເດີ້">
        <div className="quick-step">
          <span>1</span>
          <strong>ລົງຄິວ</strong>
          <small>ໃສ່ຊື່/ໂຕະ ແລ້ວເພີ່ມເມນູ</small>
        </div>
        <div className="quick-step">
          <span>2</span>
          <strong>ກຳລັງເຮັດອາຫານ</strong>
          <small>ກົດເລີ່ມເຮັດ ເມື່ອສົ່ງໃຫ້ຄົວ</small>
        </div>
        <div className="quick-step">
          <span>3</span>
          <strong>ສຳເລັດ</strong>
          <small>ເລືອກພິມບິນ ຫຼື ບໍ່ພິມກໍໄດ້</small>
        </div>
      </div>

      <div className="pos-grid no-print">
        <section className="card">
          <h2 className="card__title">ຄິວທີ່ເປີດຢູ່</h2>
          <button
            className="btn btn--primary btn--block"
            type="button"
            style={{ marginBottom: "1rem" }}
            onClick={() => {
              api
                .createOrder(customer.trim() || undefined)
                .then((o) => {
                  setCustomer("");
                  setActive(o);
                  return loadOrders();
                })
                .catch((e) => setErr(e instanceof Error ? e.message : "ລົງຄິວບໍ່ສຳເລັດ"));
            }}
          >
            + ເພີ່ມລົງຄິວ
          </button>
          <label className="label" style={{ marginBottom: "1rem", display: "block" }}>
            ຊື່ / ໂຕະ
            <input
              type="text"
              placeholder="ຕົວຢ່າງ: ໂຕະ 5"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <ul className="order-list">
            {openOrders.length === 0 ? (
              <li className="muted" style={{ padding: "0.5rem" }}>
                ຍັງບໍ່ມີຄິວ
              </li>
            ) : (
              openOrders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    className={`order-card${active?.id === o.id ? " order-card--active" : ""}`}
                    onClick={() => setActive(o)}
                  >
                    <div className="order-card__code">
                      {o.code}
                      {o.customerLabel ? (
                        <span className="muted" style={{ fontWeight: 400 }}>
                          {" "}
                          · {o.customerLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="order-card__meta">
                      <span className={statusClass(o.status)}>{statusLabel[o.status]}</span>
                      <span className="order-card__total">{lak(o.grandTotal ?? 0)}</span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="card">
          {!active ? (
            <div className="empty-state">
              <div className="empty-state__icon">🧾</div>
              <p>ເລືອກຄິວຈາກລາຍການ ຫຼື ກົດ “ເພີ່ມລົງຄິວ”</p>
            </div>
          ) : (
            <OrderPanel
              order={active}
              menu={activeMenu}
              stock={stock}
              onError={setErr}
              onUpdated={(o) => {
                setActive(o);
                loadOrders();
              }}
              onCancelled={() => {
                setActive(null);
                loadOrders();
              }}
              onPrint={printTicket}
            />
          )}
        </section>
      </div>

      <div ref={printRef} className="print-only">
        {active ? <PrintBlock order={active} settings={receiptSettings} /> : null}
      </div>
    </>
  );
}

function OrderPanel({
  order,
  menu,
  stock,
  onError,
  onUpdated,
  onCancelled,
  onPrint,
}: {
  order: Order;
  menu: MenuItem[];
  stock: InventoryItem[];
  onError: (m: string) => void;
  onUpdated: (o: Order) => void;
  onCancelled: () => void;
  onPrint: (k: "kitchen" | "receipt") => void;
}) {
  const total = order.grandTotal ?? "0.00";
  const lines = order.lines ?? [];
  const editable = order.status === "DRAFT";
  const cancellable = order.status !== "PAID" && order.status !== "CANCELLED";

  const tum = menu.filter((m) => m.category === "TUM");
  const general = menu.filter((m) => m.category === "GENERAL");
  const sellableStock = stock.filter((item) => item.costPerUnit && Number(item.costPerUnit) > 0);

  function completeOrder(printReceipt: boolean) {
    api
      .awaitingPayment(order.id)
      .then((o) => {
        onUpdated(o);
        if (printReceipt) onPrint("receipt");
      })
      .catch((e) => onError(e instanceof Error ? e.message : "ກົດສຳເລັດບໍ່ໄດ້"));
  }

  function payFull(method: "CASH" | "TRANSFER") {
    api
      .pay(order.id, [{ method, amount: Number(total).toFixed(2) }])
      .then((o) => {
        onUpdated(o);
        onPrint("receipt");
      })
      .catch((e) => onError(e instanceof Error ? e.message : "ຈ່າຍເງິນບໍ່ສຳເລັດ"));
  }

  return (
    <>
      <div className="order-panel__head">
        <div>
          <h2 className="card__title" style={{ margin: 0 }}>
            {order.code}
          </h2>
          <div style={{ marginTop: "0.35rem" }}>
            <span className={statusClass(order.status)}>{statusLabel[order.status]}</span>
            {order.customerLabel ? (
              <span className="muted" style={{ marginLeft: "0.5rem" }}>
                {order.customerLabel}
              </span>
            ) : null}
          </div>
        </div>
        <div className="order-panel__summary">
          <div className="order-panel__total">{lak(total)}</div>
          {cancellable ? (
            <button
              type="button"
              className="btn btn--danger btn--sm no-print"
              onClick={() => {
                if (!window.confirm("ຢືນຢັນຍົກເລີກຄິວນີ້?")) return;
                api
                  .cancelOrder(order.id)
                  .then(() => onCancelled())
                  .catch((e) => onError(e instanceof Error ? e.message : "ຍົກເລີກຄິວບໍ່ສຳເລັດ"));
              }}
            >
              ຍົກເລີກຄິວ
            </button>
          ) : null}
        </div>
      </div>

      {editable && (menu.length > 0 || sellableStock.length > 0) ? (
        <>
          {tum.length > 0 ? (
            <>
              <p className="muted" style={{ margin: "0 0 0.35rem", fontWeight: 600 }}>
                ຕຳ
              </p>
              <div className="menu-grid no-print">
                {tum.map((m) => (
                  <MenuChip key={m.id} item={m} orderId={order.id} onUpdated={onUpdated} onError={onError} />
                ))}
              </div>
            </>
          ) : null}
          {general.length > 0 ? (
            <>
              <p className="muted" style={{ margin: "1rem 0 0.35rem", fontWeight: 600 }}>
                ອາຫານທົ່ວໄປ
              </p>
              <div className="menu-grid no-print">
                {general.map((m) => (
                  <MenuChip key={m.id} item={m} orderId={order.id} onUpdated={onUpdated} onError={onError} />
                ))}
              </div>
            </>
          ) : null}
          {sellableStock.length > 0 ? (
            <>
              <p className="muted" style={{ margin: "1rem 0 0.35rem", fontWeight: 600 }}>
                ສິນຄ້າສະຕ໋ອກ
              </p>
              <div className="menu-grid no-print">
                {sellableStock.map((item) => (
                  <StockChip key={item.id} item={item} orderId={order.id} onUpdated={onUpdated} onError={onError} />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : null}

      <div className="table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr>
              <th>ລາຍການ</th>
              <th>ຈຳນວນ</th>
              <th>ລາຄາ</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  ຍັງບໍ່ມີລາຍການ
                </td>
              </tr>
            ) : (
              lines.map((l) => (
                <tr key={l.id}>
                  <td>{l.menuItem?.name ?? l.inventoryItem?.name ?? `#${l.menuItemId ?? l.inventoryItemId}`}</td>
                  <td>{l.qty}</td>
                  <td>{lak(Number(l.unitPrice) * l.qty)}</td>
                  <td>
                    {editable ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--sm no-print"
                        onClick={() =>
                          api
                            .deleteLine(order.id, l.id)
                            .then(onUpdated)
                            .catch((e) => onError(e instanceof Error ? e.message : "ລຶບລາຍການບໍ່ສຳເລັດ"))
                        }
                      >
                        ລຶບ
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="actions-bar no-print">
        {order.status === "DRAFT" ? (
          <button
            className="btn btn--primary"
            type="button"
            onClick={() =>
              api
                .sendKitchen(order.id)
                .then(onUpdated)
                .catch((e) => onError(e instanceof Error ? e.message : "ເລີ່ມເຮັດອາຫານບໍ່ໄດ້"))
            }
          >
            ເລີ່ມເຮັດອາຫານ
          </button>
        ) : null}

        {order.status === "IN_KITCHEN" ? (
          <>
            <button className="btn btn--primary" type="button" onClick={() => completeOrder(false)}>
              ສຳເລັດ ບໍ່ພິມບິນ
            </button>
            <button className="btn" type="button" onClick={() => completeOrder(true)}>
              ສຳເລັດ + ພິມບິນ
            </button>
          </>
        ) : null}

        {order.status === "AWAITING_PAYMENT" ? (
          <>
            <button type="button" className="btn" onClick={() => onPrint("receipt")}>
              ພິມບິນ
            </button>
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => payFull("CASH")}
            >
              ຈ່າຍເງິນສົດ {lak(total)}
            </button>
            <button className="btn btn--primary" type="button" onClick={() => payFull("TRANSFER")}>
              ຈ່າຍໂອນ {lak(total)}
            </button>
          </>
        ) : null}

        {order.status === "PAID" ? (
          <button type="button" className="btn" onClick={() => onPrint("receipt")}>
            ພິມບິນອີກຄັ້ງ
          </button>
        ) : null}
      </div>
    </>
  );
}

function MenuChip({
  item,
  orderId,
  onUpdated,
  onError,
}: {
  item: MenuItem;
  orderId: number;
  onUpdated: (o: Order) => void;
  onError: (m: string) => void;
}) {
  return (
    <button
      type="button"
      className="menu-chip"
      onClick={() =>
        api
          .addLine(orderId, { menuItemId: item.id, qty: 1 })
          .then(onUpdated)
          .catch((e) => onError(e instanceof Error ? e.message : "ເພີ່ມລາຍການບໍ່ສຳເລັດ"))
      }
    >
      <span className="menu-chip__name">{item.name}</span>
      <span className="menu-chip__price">{lak(item.price)}</span>
    </button>
  );
}

function StockChip({
  item,
  orderId,
  onUpdated,
  onError,
}: {
  item: InventoryItem;
  orderId: number;
  onUpdated: (o: Order) => void;
  onError: (m: string) => void;
}) {
  const remaining = item.quantity === null ? "ບໍ່ລະບຸ" : `${item.quantity} ${item.unit}`;
  const disabled = item.quantity !== null && Number(item.quantity) <= 0;

  return (
    <button
      type="button"
      className="menu-chip"
      disabled={disabled}
      onClick={() =>
        api
          .addLine(orderId, { inventoryItemId: item.id, qty: 1 })
          .then(onUpdated)
          .catch((e) => onError(e instanceof Error ? e.message : "ເພີ່ມສິນຄ້າສະຕ໋ອກບໍ່ສຳເລັດ"))
      }
    >
      <span className="menu-chip__name">{item.name}</span>
      <span className="menu-chip__price">{lak(item.costPerUnit ?? 0)}</span>
      <span className="menu-chip__stock">ເຫຼືອ {remaining}</span>
    </button>
  );
}

function PrintBlock({ order, settings }: { order: Order; settings: ReceiptSettings }) {
  const lines = order.lines ?? [];
  const printedAt = new Date().toLocaleString("lo-LA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`receipt-paper receipt-paper--${settings.receiptWidth}`}
      style={{ "--receipt-accent": settings.accentColor } as CSSProperties}
    >
      <div className="receipt-header receipt-only">
        <h2>{settings.shopName}</h2>
        {settings.shopSubtitle ? <p>{settings.shopSubtitle}</p> : null}
      </div>
      <div className="receipt-header kitchen-title">
        <h2>ໃບຄົວ</h2>
        <p>{settings.shopName}</p>
      </div>
      <div className="receipt-meta">
        <span>{order.code}</span>
        <span>{printedAt}</span>
      </div>
      {order.customerLabel ? <div className="receipt-customer">ລູກຄ້າ: {order.customerLabel}</div> : null}
      <div className="receipt-lines">
        {lines.map((l) => (
          <div key={l.id}>
            <span>
              {l.menuItem?.name ?? l.inventoryItem?.name} x{l.qty}
            </span>
            <strong className="receipt-only">{lak(Number(l.unitPrice) * l.qty)}</strong>
          </div>
        ))}
      </div>
      <div className="receipt-total receipt-only">
        <span>ລວມ</span>
        <strong>{lak(order.grandTotal ?? 0)}</strong>
      </div>
      {settings.qrImage ? <img className="receipt-qr receipt-only" src={settings.qrImage} alt="QR code" /> : null}
      {settings.footerText ? <p className="receipt-footer receipt-only">{settings.footerText}</p> : null}
    </div>
  );
}
