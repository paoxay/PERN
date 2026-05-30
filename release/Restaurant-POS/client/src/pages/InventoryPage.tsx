import { useEffect, useState } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { lak } from "../lib/format";
import type { InventoryItem } from "../types";

type InventoryForm = {
  name: string;
  quantity: string;
  salePrice: string;
};

const defaultUnit = "ໜ່ວຍ";
const blankRow: InventoryForm = { name: "", quantity: "", salePrice: "" };

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newRow, setNewRow] = useState<InventoryForm>(blankRow);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<InventoryForm>(blankRow);

  async function refresh() {
    setErr(null);
    setRows(await api.listInventory());
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setEditRow({
      name: item.name,
      quantity: item.quantity ?? "",
      salePrice: item.costPerUnit ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRow(blankRow);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດສະຕ໋ອກບໍ່ສຳເລັດ"));
  }, []);

  return (
    <>
      <PageHeader title="ຈັດການສະຕ໋ອກ" subtitle="ຊື່ສິນຄ້າ, ຈຳນວນ ແລະ ລາຄາທີ່ຈະຂາຍ" />
      {err ? <Alert message={err} /> : null}

      <section className="card no-print">
        <h2 className="card__title">ເພີ່ມສະຕ໋ອກ</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newRow.name.trim();
            if (!name) return;
            api
              .createInventory({
                name,
                quantity: newRow.quantity,
                unit: defaultUnit,
                costPerUnit: newRow.salePrice,
              })
              .then(() => {
                setNewRow(blankRow);
                return refresh();
              })
              .catch((ex) => setErr(ex instanceof Error ? ex.message : "ບັນທຶກສະຕ໋ອກບໍ່ສຳເລັດ"));
          }}
        >
          <label className="label">
            ຊື່ສິນຄ້າ
            <input
              type="text"
              placeholder="ຕົວຢ່າງ: ນ້ຳດື່ມ"
              value={newRow.name}
              onChange={(e) => setNewRow((s) => ({ ...s, name: e.target.value }))}
            />
          </label>
          <label className="label">
            ຈຳນວນ
            <input
              type="number"
              placeholder="ໃສ່ຈຳນວນ"
              value={newRow.quantity}
              onChange={(e) => setNewRow((s) => ({ ...s, quantity: e.target.value }))}
            />
          </label>
          <label className="label">
            ລາຄາທີ່ຈະຂາຍ (ກີບ)
            <input
              type="number"
              placeholder="ຕົວຢ່າງ: 5000"
              value={newRow.salePrice}
              onChange={(e) => setNewRow((s) => ({ ...s, salePrice: e.target.value }))}
            />
          </label>
          <button className="btn btn--primary" type="submit">
            ບັນທຶກ
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card__title">ລາຍການສະຕ໋ອກ</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ຊື່ສິນຄ້າ</th>
                <th>ຈຳນວນ</th>
                <th>ລາຄາທີ່ຈະຂາຍ</th>
                <th className="actions-col">ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    ຍັງບໍ່ມີສະຕ໋ອກ
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const isEditing = editingId === item.id;

                  return (
                    <tr key={item.id}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editRow.name}
                            onChange={(e) => setEditRow((s) => ({ ...s, name: e.target.value }))}
                          />
                        ) : (
                          <strong>{item.name}</strong>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            placeholder="ໃສ່ຈຳນວນ"
                            value={editRow.quantity}
                            onChange={(e) => setEditRow((s) => ({ ...s, quantity: e.target.value }))}
                          />
                        ) : (
                          item.quantity ?? <span className="muted">ບໍ່ລະບຸ</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="number"
                            placeholder="ຕົວຢ່າງ: 5000"
                            value={editRow.salePrice}
                            onChange={(e) => setEditRow((s) => ({ ...s, salePrice: e.target.value }))}
                          />
                        ) : item.costPerUnit ? (
                          lak(item.costPerUnit)
                        ) : (
                          <span className="muted">ບໍ່ລະບຸ</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => {
                                  const name = editRow.name.trim();
                                  if (!name) return;
                                  api
                                    .patchInventory(item.id, {
                                      name,
                                      quantity: editRow.quantity,
                                      unit: defaultUnit,
                                      costPerUnit: editRow.salePrice,
                                    })
                                    .then(() => {
                                      cancelEdit();
                                      return refresh();
                                    })
                                    .catch((e) =>
                                      setErr(e instanceof Error ? e.message : "ແກ້ໄຂສະຕ໋ອກບໍ່ສຳເລັດ"),
                                    );
                                }}
                              >
                                ບັນທຶກ
                              </button>
                              <button type="button" className="btn btn--sm" onClick={cancelEdit}>
                                ຍົກເລີກ
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="btn btn--sm" onClick={() => startEdit(item)}>
                                ແກ້ໄຂ
                              </button>
                              <button
                                type="button"
                                className="btn btn--danger btn--sm"
                                onClick={() => {
                                  if (!window.confirm(`ຢືນຢັນລົບສະຕ໋ອກ "${item.name}"?`)) return;
                                  api
                                    .deleteInventory(item.id)
                                    .then(refresh)
                                    .catch((e) => setErr(e instanceof Error ? e.message : "ລົບສະຕ໋ອກບໍ່ສຳເລັດ"));
                                }}
                              >
                                ລົບ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
