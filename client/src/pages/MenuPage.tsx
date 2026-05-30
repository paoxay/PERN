import { useEffect, useState } from "react";
import { api } from "../api";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import { lak } from "../lib/format";
import type { MenuItem } from "../types";

type MenuCategory = "TUM" | "GENERAL";

type MenuForm = {
  name: string;
  price: string;
  category: MenuCategory;
};

const blankForm: MenuForm = {
  name: "",
  price: "",
  category: "GENERAL",
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<MenuForm>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MenuForm>(blankForm);

  async function refresh() {
    setErr(null);
    setItems(await api.listMenu());
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id);
    setEditForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(blankForm);
  }

  useEffect(() => {
    refresh().catch((e) => setErr(e instanceof Error ? e.message : "ໂຫຼດເມນູບໍ່ສຳເລັດ"));
  }, []);

  return (
    <>
      <PageHeader title="ເມນູອາຫານ & ຕຳ" subtitle="ເພີ່ມ, ແກ້ໄຂ, ເປີດ/ປິດ ເມນູທີ່ໃຊ້ໃນໜ້າຂາຍ" />
      {err ? <Alert message={err} /> : null}

      <section className="card no-print">
        <h2 className="card__title">ເພີ່ມເມນູ</h2>
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.name.trim() || !form.price.trim()) return;
            api
              .createMenuItem({
                name: form.name.trim(),
                price: form.price.trim(),
                category: form.category,
              })
              .then(() => {
                setForm(blankForm);
                return refresh();
              })
              .catch((ex) => setErr(ex instanceof Error ? ex.message : "ບັນທຶກເມນູບໍ່ສຳເລັດ"));
          }}
        >
          <label className="label">
            ຊື່
            <input
              type="text"
              placeholder="ຕົວຢ່າງ: ຕຳຫມາກຫຸ່ງ"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
          </label>
          <label className="label">
            ລາຄາ (ກີບ)
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            />
          </label>
          <label className="label">
            ປະເພດ
            <select
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  category: e.target.value === "TUM" ? "TUM" : "GENERAL",
                }))
              }
            >
              <option value="TUM">ຕຳ</option>
              <option value="GENERAL">ອາຫານທົ່ວໄປ</option>
            </select>
          </label>
          <button className="btn btn--primary" type="submit">
            ບັນທຶກ
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card__title">ລາຍການເມນູ</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ຊື່</th>
                <th>ປະເພດ</th>
                <th>ລາຄາ</th>
                <th>ສະຖານະ</th>
                <th className="actions-col">ຈັດການ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => {
                const isEditing = editingId === m.id;

                return (
                  <tr key={m.id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                        />
                      ) : (
                        <strong>{m.name}</strong>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          value={editForm.category}
                          onChange={(e) =>
                            setEditForm((s) => ({
                              ...s,
                              category: e.target.value === "TUM" ? "TUM" : "GENERAL",
                            }))
                          }
                        >
                          <option value="TUM">ຕຳ</option>
                          <option value="GENERAL">ອາຫານທົ່ວໄປ</option>
                        </select>
                      ) : (
                        <span className={m.category === "TUM" ? "badge badge--kitchen" : "badge badge--draft"}>
                          {m.category === "TUM" ? "ຕຳ" : "ອາຫານທົ່ວໄປ"}
                        </span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm((s) => ({ ...s, price: e.target.value }))}
                        />
                      ) : (
                        lak(m.price)
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`status-toggle ${m.isActive ? "status-toggle--open" : "status-toggle--closed"}`}
                        onClick={() =>
                          api
                            .patchMenuItem(m.id, { isActive: !m.isActive })
                            .then(refresh)
                            .catch((e) => setErr(e instanceof Error ? e.message : "ປ່ຽນສະຖານະບໍ່ສຳເລັດ"))
                        }
                      >
                        <span aria-hidden>{m.isActive ? "●" : "●"}</span>
                        {m.isActive ? "ເປີດຂາຍ" : "ປິດຂາຍ"}
                      </button>
                    </td>
                    <td>
                      <div className="row-actions">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() => {
                                if (!editForm.name.trim() || !editForm.price.trim()) return;
                                api
                                  .patchMenuItem(m.id, {
                                    name: editForm.name.trim(),
                                    price: editForm.price.trim(),
                                    category: editForm.category,
                                  })
                                  .then(() => {
                                    cancelEdit();
                                    return refresh();
                                  })
                                  .catch((e) => setErr(e instanceof Error ? e.message : "ແກ້ໄຂເມນູບໍ່ສຳເລັດ"));
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
                            <button type="button" className="btn btn--sm" onClick={() => startEdit(m)}>
                              ແກ້ໄຂ
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => {
                                if (!window.confirm(`ຢືນຢັນລົບເມນູ "${m.name}"?`)) return;
                                api
                                  .deleteMenuItem(m.id)
                                  .then(refresh)
                                  .catch((e) =>
                                    setErr(
                                      e instanceof Error
                                        ? e.message
                                        : "ລົບບໍ່ໄດ້ ຖ້າເມນູນີ້ເຄີຍຢູ່ໃນອໍເດີ້ ໃຫ້ກົດປິດຂາຍແທນ",
                                    ),
                                  );
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
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
