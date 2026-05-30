import { useEffect, useState } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { lak } from "../lib/format";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const [dayDate, setDayDate] = useState(todayKey());
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [day, setDay] = useState<Awaited<ReturnType<typeof api.dayReport>> | null>(null);
  const [mon, setMon] = useState<Awaited<ReturnType<typeof api.monthReport>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    api
      .dayReport(dayDate)
      .then(setDay)
      .catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດລາຍງານວັນລົ້ມເຫລວ"));
  }, [dayDate]);

  useEffect(() => {
    setErr(null);
    api
      .monthReport(Number(year), Number(month))
      .then(setMon)
      .catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດລາຍງານເດືອນລົ້ມເຫລວ"));
  }, [year, month]);

  return (
    <>
      <PageHeader title="ລາຍງານລາຍຮັບ" subtitle="ແຍກເງິນສົດ ແລະ ໂອນ — ວັນ ແລະ ເດືອນ" />
      {err ? <Alert message={err} /> : null}

      <div className="reports-grid">
        <section className="card">
          <h2 className="card__title">ລາຍຮັບຕາມວັນ</h2>
          <label className="label">
            ວັນທີ
            <input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} />
          </label>
          {day ? (
            <ReportSummary
              period={day.period}
              cash={day.cash}
              transfer={day.transfer}
              total={day.total}
              orders={day.paidOrdersCount}
            />
          ) : (
            <p className="muted" style={{ marginTop: "1rem" }}>
              ກຳລັງໂຫຼດ...
            </p>
          )}
        </section>

        <section className="card">
          <h2 className="card__title">ລາຍຮັບຕາມເດືອນ</h2>
          <div className="row">
            <label className="label">
              ປີ
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
            <label className="label">
              ເດືອນ
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          </div>
          {mon ? (
            <ReportSummary
              period={mon.period}
              cash={mon.cash}
              transfer={mon.transfer}
              total={mon.total}
              orders={mon.paidOrdersCount}
            />
          ) : (
            <p className="muted" style={{ marginTop: "1rem" }}>
              ກຳລັງໂຫຼດ...
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function ReportSummary({
  period,
  cash,
  transfer,
  total,
  orders,
}: {
  period: string;
  cash: string;
  transfer: string;
  total: string;
  orders: number;
}) {
  return (
    <div>
      <p className="report-meta">
        <strong>ຊ່ວງ:</strong> {period} · <strong>ບິນຈ່າຍແລ້ວ:</strong> {orders} ບິນ
      </p>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-card__label">ເງິນສົດ</div>
          <div className="stat-card__value">{lak(cash)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">ໂອນ</div>
          <div className="stat-card__value">{lak(transfer)}</div>
        </div>
        <div className="stat-card stat-card--total">
          <div className="stat-card__label">ລວມທັງໝົດ</div>
          <div className="stat-card__value">{lak(total)}</div>
        </div>
      </div>
    </div>
  );
}
