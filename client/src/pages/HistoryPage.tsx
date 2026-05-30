import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { dateTime, lak } from "../lib/format";
import { statusClass, statusLabel } from "../lib/orderStatus";
import type { Order, OrderStatus } from "../types";

type Filter = "ALL" | "PAID" | "CANCELLED";

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    api
      .listOrders()
      .then(setOrders)
      .catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດປະຫວັດອໍເດີ້ບໍ່ສຳເລັດ"));
  }, []);

  const history = useMemo(() => {
    const doneStatuses: OrderStatus[] = ["PAID", "CANCELLED"];
    const q = search.trim().toLowerCase();

    return orders
      .filter((o) => doneStatuses.includes(o.status))
      .filter((o) => filter === "ALL" || o.status === filter)
      .filter((o) => {
        if (!q) return true;
        return o.code.toLowerCase().includes(q) || (o.customerLabel ?? "").toLowerCase().includes(q);
      });
  }, [orders, filter, search]);

  return (
    <>
      <PageHeader title="ປະຫວັດອໍເດີ້" subtitle="ເບິ່ງບິນທີ່ຈ່າຍແລ້ວ ແລະ ບິນທີ່ຍົກເລິກ" />
      {err ? <Alert message={err} /> : null}

      <section className="card">
        <div className="history-toolbar">
          <div className="segmented" aria-label="ກອງປະຫວັດ">
            <button type="button" className={filter === "ALL" ? "active" : ""} onClick={() => setFilter("ALL")}>
              ທັງໝົດ
            </button>
            <button type="button" className={filter === "PAID" ? "active" : ""} onClick={() => setFilter("PAID")}>
              ຈ່າຍແລ້ວ
            </button>
            <button
              type="button"
              className={filter === "CANCELLED" ? "active" : ""}
              onClick={() => setFilter("CANCELLED")}
            >
              ຍົກເລິກ
            </button>
          </div>

          <label className="label history-search">
            ຄົ້ນຫາ
            <input
              type="text"
              placeholder="ເລກບິນ ຫຼື ຊື່/ໂຕະ"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        <div className="table-wrap history-table">
          <table>
            <thead>
              <tr>
                <th>ເວລາ</th>
                <th>ອໍເດີ້</th>
                <th>ສະຖານະ</th>
                <th>ລາຍການ</th>
                <th>ລວມ</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    ຍັງບໍ່ມີປະຫວັດອໍເດີ້
                  </td>
                </tr>
              ) : (
                history.map((order) => (
                  <tr key={order.id}>
                    <td>{dateTime(order.paidAt ?? order.updatedAt ?? order.createdAt)}</td>
                    <td>
                      <strong>{order.code}</strong>
                      {order.customerLabel ? <div className="muted">{order.customerLabel}</div> : null}
                    </td>
                    <td>
                      <span className={statusClass(order.status)}>{statusLabel[order.status]}</span>
                    </td>
                    <td>
                      {(order.lines ?? []).length === 0
                        ? "-"
                        : (order.lines ?? [])
                            .map((line) => `${line.menuItem?.name ?? `#${line.menuItemId}`} x${line.qty}`)
                            .join(", ")}
                    </td>
                    <td>
                      <strong>{lak(order.grandTotal ?? 0)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
