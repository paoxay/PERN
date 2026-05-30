import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import HistoryPage from "./pages/HistoryPage";
import InventoryPage from "./pages/InventoryPage";
import MenuPage from "./pages/MenuPage";
import PosPage from "./pages/PosPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? " active" : ""}`;

export default function App() {
  return (
    <div className="appShell">
      <aside className="sidebar no-print">
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            <span className="sidebar__icon" aria-hidden>
              🌶️
            </span>
            <div>
              <div className="sidebar__title">ຮ້ານຕຳ &amp; ອາຫານ</div>
              <p className="sidebar__tagline">ລະບົບຂາຍໜ້າຮ້ານ</p>
            </div>
          </div>
        </div>

        <NavLink end to="/" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>🧾</span>
          ຂາຍ / ບິນ
        </NavLink>
        <NavLink to="/history" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>🕘</span>
          ປະຫວັດອໍເດີ້
        </NavLink>
        <NavLink to="/inventory" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>📦</span>
          ສະຕ໋ອກ
        </NavLink>
        <NavLink to="/menu" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>📋</span>
          ເມນູອາຫານ
        </NavLink>
        <NavLink to="/reports" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>📊</span>
          ລາຍງານ
        </NavLink>
        <NavLink to="/settings" className={navClass}>
          <span className="nav-link__emoji" aria-hidden>⚙️</span>
          ຕັ້ງຄ່າ
        </NavLink>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/" element={<PosPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
