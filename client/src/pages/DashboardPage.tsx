import { useEffect, useState } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { lak } from "../lib/format";
import type { DashboardSummary } from "../types";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setData(await api.dashboard());
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດ dashboard ບໍ່ສຳເລັດ"));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="ສະຫຼຸບຍອດຂາຍ ແລະ ສະຕ໋ອກຄົງເຫຼືອ" />
      {err ? <Alert message={err} /> : null}

      <section className="dashboard-stats">
        <div className="stat-card stat-card--total">
          <div className="stat-card__label">ຍອດຂາຍມື້ນີ້</div>
          <div className="stat-card__value">{lak(data?.total ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">ບິນທີ່ຈ່າຍແລ້ວ</div>
          <div className="stat-card__value">{data?.paidOrdersCount ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">ລາຍການສະຕ໋ອກ</div>
          <div className="stat-card__value">{data?.stockItemsCount ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">ໃກ້ໝົດ</div>
          <div className="stat-card__value">{data?.lowStockCount ?? 0}</div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <h2 className="card__title">ສິນຄ້າສະຕ໋ອກທີ່ຂາຍມື້ນີ້</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ສິນຄ້າ</th>
                  <th>ຈຳນວນຂາຍ</th>
                  <th>ຍອດຂາຍ</th>
                </tr>
              </thead>
              <tbody>
                {!data || data.stockSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      ຍັງບໍ່ມີການຂາຍສິນຄ້າສະຕ໋ອກມື້ນີ້
                    </td>
                  </tr>
                ) : (
                  data.stockSales.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                      </td>
                      <td>
                        {row.qtySold} {row.unit}
                      </td>
                      <td>{lak(row.sales)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">ສະຕ໋ອກຄົງເຫຼືອ</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ສິນຄ້າ</th>
                  <th>ຄົງເຫຼືອ</th>
                  <th>ລາຄາຂາຍ</th>
                </tr>
              </thead>
              <tbody>
                {!data || data.inventory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      ຍັງບໍ່ມີສະຕ໋ອກ
                    </td>
                  </tr>
                ) : (
                  data.inventory.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        {item.quantity ?? "ບໍ່ລະບຸ"} {item.unit}
                      </td>
                      <td>{item.costPerUnit ? lak(item.costPerUnit) : <span className="muted">ບໍ່ລະບຸ</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
