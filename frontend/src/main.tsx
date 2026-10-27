import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useId,
} from "react";
import { createRoot } from "react-dom/client";
import {
  Leaf,
  LayoutDashboard,
  Users,
  CalendarDays,
  Sparkles,
  Package,
  ClipboardList,
  ShoppingBag,
  Receipt,
  UserCog,
  LogOut,
  Search,
  Plus,
  X,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Check,
  Menu,
  Printer,
  RefreshCw,
  Flower2,
  Heart,
  Copy,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { api, Row, money, dateTime, today } from "./api";
import "./style.css";

const AppContext = createContext<{
  user: Row;
  notify: (text: string) => void;
  refresh: () => void;
}>({ user: {}, notify: () => {}, refresh: () => {} });
const ctx = () => useContext(AppContext);
const labels: Row = {
  BOOKED: "Đã đặt",
  CONFIRMED: "Đã xác nhận",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  PENDING: "Chờ thực hiện",
  PLANNED: "Chưa đặt lịch",
  ACTIVE: "Đang hoạt động",
  EXPIRED: "Hết hạn",
  EXHAUSTED: "Hết lượt",
  DRAFT: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  ADMIN: "Quản lý",
  RECEPTIONIST: "Lễ tân",
  TECHNICIAN: "Kỹ thuật viên",
  CASH: "Tiền mặt",
  TRANSFER: "Chuyển khoản",
};
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase()}>
      {labels[value] || value}
    </span>
  );
}
function Empty({ text = "Chưa có dữ liệu phù hợp" }: { text?: string }) {
  return (
    <div className="empty">
      <Flower2 size={32} />
      <p>{text}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, { id })
        : children}
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overlay" onClick={close}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon" aria-label="Đóng" onClick={close}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function useLoad(path: string) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setData(null);
    api(path)
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
function Loading({ error }: { error?: string }) {
  return error ? (
    <div role="alert" className="error">
      {error}
    </div>
  ) : (
    <div className="loading">Đang tải dữ liệu…</div>
  );
}
function Submit({
  busy,
  label = "Lưu thông tin",
}: {
  busy: boolean;
  label?: string;
}) {
  return (
    <button className="primary" disabled={busy} type="submit">
      {busy ? "Đang xử lý…" : label}
      <Check size={16} />
    </button>
  );
}
function Section({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <p className="eyebrow">KHÔNG GIAN CHĂM SÓC</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function Login({ onLogin }: { onLogin: (u: Row) => void }) {
  const [username, setUsername] = useState("admin"),
    [password, setPassword] = useState("SpaDemo@123"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await api("/auth/login", "POST", { username, password });
      sessionStorage.setItem("token", r.access_token);
      onLogin(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <div className="login-story">
        <div className="brand">
          <Leaf /> AN NHIÊN<span>SPA & WELLNESS</span>
        </div>
        <div>
          <p className="eyebrow">CHĂM SÓC TỪ NHỮNG ĐIỀU NHỎ NHẤT</p>
          <h1>
            Mỗi cuộc hẹn,
            <br />
            một chút an nhiên.
          </h1>
          <p>
            Quản lý nhẹ nhàng. Kết nối chu đáo.
            <br />
            Để mỗi khách hàng luôn được quan tâm.
          </p>
          <div className="flower-art">
            <Flower2 size={180} strokeWidth={0.7} />
          </div>
        </div>
        <small>HỆ THỐNG DEMO · NHÓM 22</small>
      </div>
      <div className="login-form">
        <form onSubmit={submit}>
          <span className="mini-logo">
            <Leaf />
          </span>
          <h2>Chào mừng trở lại</h2>
          <p className="muted">Đăng nhập để bắt đầu một ngày chăm sóc.</p>
          <Field label="Tên đăng nhập">
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </Field>
          <Field label="Mật khẩu">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <Submit busy={busy} label="Đăng nhập" />
          <div className="demo-note">
            <b>Tài khoản demo</b>
            <p>admin · letan · ktv1</p>
            <p>Mật khẩu chung: SpaDemo@123</p>
            <small>Dữ liệu trong hệ thống hoàn toàn hư cấu.</small>
          </div>
        </form>
      </div>
    </div>
  );
}

const nav = [
  ["dashboard", "Tổng quan", LayoutDashboard],
  ["customers", "Khách hàng", Users],
  ["appointments", "Lịch hẹn", CalendarDays],
  ["services", "Dịch vụ", Sparkles],
  ["packages", "Gói chăm sóc", Package],
  ["plans", "Liệu trình", ClipboardList],
  ["products", "Sản phẩm", ShoppingBag],
  ["invoices", "Hóa đơn", Receipt],
  ["users", "Nhân viên", UserCog],
] as const;
function App() {
  const [user, setUser] = useState<Row | null>(null),
    [checking, setChecking] = useState(true),
    [page, setPage] = useState("dashboard"),
    [toast, setToast] = useState(""),
    [version, setVersion] = useState(0),
    [mobile, setMobile] = useState(false);
  const health = useLoad("/health");
  useEffect(() => {
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    if (sessionStorage.getItem("token"))
      api("/auth/me")
        .then((u) => {
          setUser(u);
          setPage(u.role === "ADMIN" ? "dashboard" : "appointments");
        })
        .catch(() => setUser(null))
        .finally(() => setChecking(false));
    else setChecking(false);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  if (checking) return <Loading />;
  if (!user)
    return (
      <Login
        onLogin={(u) => {
          setUser(u);
          setPage(u.role === "ADMIN" ? "dashboard" : "appointments");
        }}
      />
    );
  const visible = nav.filter(
    ([key]) =>
      user.role === "ADMIN" ||
      (user.role === "TECHNICIAN"
        ? key === "appointments"
        : !["dashboard", "users"].includes(key)),
  );
  return (
    <AppContext.Provider
      value={{
        user,
        notify: setToast,
        refresh: () => setVersion((x) => x + 1),
      }}
    >
      <div className="shell">
        <aside className={mobile ? "open" : ""}>
          <div className="brand">
            <Leaf /> AN NHIÊN<span>SPA & WELLNESS</span>
          </div>
          <p className="nav-caption">QUẢN LÝ SPA</p>
          <nav>
            {visible.map(([key, title, Icon]) => (
              <button
                key={key}
                className={page === key ? "active" : ""}
                onClick={() => {
                  setPage(key);
                  setMobile(false);
                }}
              >
                <Icon size={19} />
                {user.role === "TECHNICIAN" && key === "appointments"
                  ? "Lịch của tôi"
                  : title}
                {page === key && <ChevronRight size={15} />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="care-note">
              <Heart size={20} />
              <b>Một ngày thật dịu dàng</b>
              <p>Chăm sóc tốt bắt đầu từ sự thấu hiểu.</p>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem("token");
                setUser(null);
              }}
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </aside>
        <div className="main">
          <header>
            <button
              className="icon mobile-menu"
              onClick={() => setMobile(!mobile)}
              aria-label="Mở menu"
            >
              <Menu />
            </button>
            <div className="breadcrumb">
              An Nhiên Spa <ChevronRight size={13} />
              <b>{visible.find((x) => x[0] === page)?.[1]}</b>
            </div>
            <div className="header-right">
              <span
                className={
                  "ai-mode " +
                  (health.data?.ai_provider === "mock" ? "mock" : "")
                }
              >
                {health.data?.ai_provider === "mock"
                  ? "AI giả lập"
                  : "AI " + (health.data?.ai_provider || "…")}
              </span>
              <div className="avatar">
                {user.full_name.split(" ").slice(-1)[0][0]}
              </div>
              <div>
                <b>{user.full_name}</b>
                <small>{labels[user.role]}</small>
              </div>
            </div>
          </header>
          <main key={version}>
            {page === "dashboard" ? (
              <Dashboard />
            ) : page === "customers" ? (
              <Customers />
            ) : page === "appointments" ? (
              <Appointments />
            ) : page === "plans" ? (
              <Plans />
            ) : page === "invoices" ? (
              <Invoices />
            ) : (
              <Catalog key={page} kind={page} />
            )}
          </main>
          <footer>
            An Nhiên Spa · Hệ thống quản lý & chăm sóc khách hàng{" "}
            <span>Demo học tập · Nhóm 22</span>
          </footer>
        </div>
        {toast && (
          <div role="status" className="toast">
            <Check size={18} />
            {toast}
            <button aria-label="Đóng thông báo" onClick={() => setToast("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

function Dashboard() {
  const [from, setFrom] = useState(today().slice(0, 8) + "01"),
    [to, setTo] = useState(today());
  const { data, error } = useLoad(`/reports?date_from=${from}&date_to=${to}`);
  const apps = useLoad(
    "/appointments?date_from=" + today() + "&date_to=" + today(),
  );
  return (
    <>
      <Section
        title="Một ngày an nhiên"
        subtitle="Theo dõi hoạt động spa và dành sự quan tâm đúng lúc."
        action={
          <div className="date-filter">
            <input
              aria-label="Từ ngày"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <span>—</span>
            <input
              aria-label="Đến ngày"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        }
      />
      <div className="welcome">
        <div>
          <span className="eyebrow">CHĂM SÓC TẬN TÂM, MỖI NGÀY</span>
          <h2>
            Không gian thư thái.
            <br />
            Vận hành thảnh thơi.
          </h2>
          <p>Mọi cuộc hẹn và hành trình chăm sóc, trong một nơi.</p>
        </div>
        <Flower2 size={140} strokeWidth={0.7} />
      </div>
      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <div className="stats">
            {[
              ["Doanh thu", money(data.revenue), Receipt],
              ["Lượt đặt lịch", data.appointments, CalendarDays],
              ["Khách hàng", data.customers, Users],
              ["Hóa đơn đã thanh toán", data.paid_invoices, ShoppingBag],
            ].map(([title, value, Icon]: any) => (
              <article className="stat" key={title}>
                <div>
                  <span>{title}</span>
                  <Icon size={19} />
                </div>
                <strong>{value}</strong>
                <small>
                  {title === "Khách hàng"
                    ? "Tổng hồ sơ trong hệ thống"
                    : "Trong khoảng thời gian đã chọn"}
                </small>
              </article>
            ))}
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-title">
                <h3>Nhịp doanh thu</h3>
                <span className="muted">Theo ngày · VND</span>
              </div>
              <div className="chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <defs>
                      <linearGradient id="sage" x1="0" y1="0" x2="0" y2="1">
                        <stop stopColor="#6f9e85" stopOpacity={0.4} />
                        <stop
                          offset="1"
                          stopColor="#6f9e85"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#edf0eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.slice(8)}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        v >= 1000000 ? v / 1000000 + "tr" : v / 1000 + "k"
                      }
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <Tooltip
                      formatter={(v: any) => money(Number(v))}
                      labelFormatter={(v) => "Ngày " + v}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Doanh thu"
                      stroke="#5a8b70"
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      fill="url(#sage)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="panel">
              <div className="panel-title">
                <h3>Dịch vụ được yêu thích</h3>
                <Sparkles size={18} />
              </div>
              {!data.popular.length ? (
                <Empty />
              ) : (
                data.popular.map((p: Row, i: number) => (
                  <div className="popular" key={p.name}>
                    <span className="rank">0{i + 1}</span>
                    <div>
                      <b>{p.name}</b>
                      <div className="progress">
                        <i
                          style={{
                            width:
                              (p.count / data.popular[0].count) * 100 + "%",
                          }}
                        />
                      </div>
                    </div>
                    <small>{p.count} lượt</small>
                  </div>
                ))
              )}
            </section>
          </div>
          <section className="panel">
            <div className="panel-title">
              <h3>Lịch hẹn hôm nay</h3>
              <span className="muted">{today()}</span>
            </div>
            {!apps.data ? (
              <Loading error={apps.error} />
            ) : !apps.data.length ? (
              <Empty text="Hôm nay chưa có lịch hẹn" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Khách hàng</th>
                      <th>Dịch vụ</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...apps.data].reverse().map((a: Row) => (
                      <tr key={a.id}>
                        <td>
                          <b>{a.customer_name}</b>
                        </td>
                        <td>
                          {a.items.map((x: Row) => x.service_name).join(", ")}
                        </td>
                        <td>{dateTime(a.start_time)}</td>
                        <td>
                          <Badge value={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Customers() {
  const { notify } = ctx();
  const [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [edit, setEdit] = useState<Row | null>(null),
    [detail, setDetail] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error, reload } = useLoad(
    `/customers?q=${encodeURIComponent(query)}&page=${page}`,
  );
  return (
    <>
      <Section
        title="Khách hàng"
        subtitle="Ghi nhớ từng nhu cầu, chăm sóc từng hành trình."
        action={
          <button className="primary" onClick={() => setEdit({})}>
            <Plus size={18} />
            Thêm khách hàng
          </button>
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Tìm tên hoặc số điện thoại…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span className="muted">{data?.total || 0} hồ sơ khách hàng</span>
        </div>
        {!data ? (
          <Loading error={error} />
        ) : !data.items.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Liên hệ</th>
                  <th>Ghi chú</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c: Row) => (
                  <tr key={c.id}>
                    <td>
                      <div className="person">
                        <span className="avatar light">
                          {c.full_name.split(" ").slice(-1)[0][0]}
                        </span>
                        <div>
                          <b>{c.full_name}</b>
                          <small>KH{String(c.id).padStart(3, "0")}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {c.phone || "—"}
                      <small>{c.email}</small>
                    </td>
                    <td className="truncate">{c.note || "—"}</td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setDetail(c.id)}
                      >
                        Hồ sơ <ArrowUpRight size={14} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setEdit(c)}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </button>
          <span>Trang {page}</span>
          <button
            disabled={!data || page * 10 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Tiếp
          </button>
        </div>
      </section>
      {edit && (
        <RecordForm
          kind="customers"
          initial={edit}
          close={() => setEdit(null)}
          saved={() => {
            setEdit(null);
            reload();
            notify("Đã lưu hồ sơ khách hàng");
          }}
        />
      )}
      {detail && <CustomerDetail id={detail} close={() => setDetail(null)} />}
    </>
  );
}

const fields: Record<string, [string, string, string][]> = {
  customers: [
    ["full_name", "Họ và tên *", "text"],
    ["phone", "Số điện thoại", "tel"],
    ["email", "Email", "email"],
    ["date_of_birth", "Ngày sinh", "date"],
    ["note", "Ghi chú", "textarea"],
  ],
  services: [
    ["name", "Tên dịch vụ *", "text"],
    ["description", "Mô tả", "textarea"],
    ["duration", "Thời lượng (phút) *", "number"],
    ["price", "Giá (VND) *", "number"],
  ],
  products: [
    ["name", "Tên sản phẩm *", "text"],
    ["code", "Mã sản phẩm *", "text"],
    ["price", "Giá (VND) *", "number"],
    ["stock", "Tồn kho *", "number"],
  ],
  users: [
    ["full_name", "Họ tên *", "text"],
    ["username", "Tên đăng nhập *", "text"],
    ["password", "Mật khẩu (ít nhất 8 ký tự khi đặt mới)", "password"],
  ],
};
function RecordForm({
  kind,
  initial,
  close,
  saved,
}: {
  kind: string;
  initial: Row;
  close: () => void;
  saved: () => void;
}) {
  const [form, setForm] = useState<Row>({
    ...Object.fromEntries(
      fields[kind].map(([k, , t]) => [
        k,
        initial[k] ?? (t === "number" ? 0 : ""),
      ]),
    ),
    ...(kind === "customers" ? {} : { active: initial.active ?? true }),
    ...(kind === "users" ? { role: initial.role || "TECHNICIAN" } : {}),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "/" + kind + (initial.id ? "/" + initial.id : ""),
        initial.id ? "PUT" : "POST",
        form,
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial.id ? "Cập nhật thông tin" : "Thêm thông tin"}
      close={close}
    >
      <form onSubmit={submit}>
        {fields[kind].map(([k, label, type]) => (
          <Field key={k} label={label}>
            {type === "textarea" ? (
              <textarea
                value={form[k]}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            ) : (
              <input
                type={type}
                value={form[k]}
                required={
                  label.includes("*") ||
                  k === "username" ||
                  (k === "password" && !initial.id)
                }
                min={type === "number" ? (k === "duration" ? 1 : 0) : undefined}
                step={type === "number" ? 1 : undefined}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [k]:
                      type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
              />
            )}
          </Field>
        ))}
        {kind === "users" && (
          <Field label="Vai trò">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {["ADMIN", "RECEPTIONIST", "TECHNICIAN"].map((x) => (
                <option key={x} value={x}>
                  {labels[x]}
                </option>
              ))}
            </select>
          </Field>
        )}
        {kind !== "customers" && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Đang hoạt động
          </label>
        )}
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <button type="button" onClick={close}>
            Hủy
          </button>
          <Submit busy={busy} />
        </div>
      </form>
    </Modal>
  );
}

function Catalog({ kind }: { kind: string }) {
  const { user, notify } = ctx();
  const { data, error, reload } = useLoad("/" + kind);
  const [edit, setEdit] = useState<Row | null>(null),
    [q, setQ] = useState("");
  const title: Row = {
    services: "Dịch vụ",
    packages: "Gói chăm sóc",
    products: "Sản phẩm",
    users: "Nhân viên",
  };
  const filtered = data?.filter((x: Row) =>
    (x.name || x.full_name).toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Section
        title={title[kind]}
        subtitle="Danh mục được tổ chức rõ ràng, thao tác thật nhẹ nhàng."
        action={
          user.role === "ADMIN" && (
            <button className="primary" onClick={() => setEdit({})}>
              <Plus size={18} />
              Thêm {title[kind].toLowerCase()}
            </button>
          )
        }
      />
      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Tìm kiếm…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <span className="muted">{filtered?.length || 0} mục</span>
        </div>
        {!data ? (
          <Loading error={error} />
        ) : !filtered.length ? (
          <Empty />
        ) : kind === "packages" ? (
          <div className="package-grid">
            {filtered.map((p: Row) => (
              <article className="package-card" key={p.id}>
                <Package size={26} />
                <h3>{p.name}</h3>
                <strong>{money(p.price)}</strong>
                <p className="muted">Hiệu lực {p.valid_days} ngày từ khi mua</p>
                <ul>
                  {p.items.map((x: Row) => (
                    <li key={x.service_id}>
                      {x.service_name}
                      <b>×{x.quantity}</b>
                    </li>
                  ))}
                </ul>
                <div className="card-foot">
                  <Badge value={p.active ? "ACTIVE" : "CANCELLED"} />
                  {user.role === "ADMIN" && (
                    <button onClick={() => setEdit(p)}>Chỉnh sửa</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{kind === "users" ? "Nhân viên" : "Tên"}</th>
                  <th>
                    {kind === "users"
                      ? "Tài khoản"
                      : kind === "services"
                        ? "Thời lượng"
                        : "Mã sản phẩm"}
                  </th>
                  <th>{kind === "users" ? "Vai trò" : "Giá bán"}</th>
                  {kind === "products" && <th>Tồn kho</th>}
                  <th>Trạng thái</th>
                  {user.role === "ADMIN" && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((x: Row) => (
                  <tr key={x.id}>
                    <td>
                      <b>{x.name || x.full_name}</b>
                      {x.description && <small>{x.description}</small>}
                    </td>
                    <td>{x.username || x.code || x.duration + " phút"}</td>
                    <td>
                      {kind === "users" ? labels[x.role] : money(x.price)}
                    </td>
                    {kind === "products" && <td>{x.stock}</td>}
                    <td>
                      <Badge value={x.active ? "ACTIVE" : "CANCELLED"} />
                    </td>
                    {user.role === "ADMIN" && (
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setEdit(x)}
                        >
                          Chỉnh sửa
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {edit &&
        (kind === "packages" ? (
          <PackageForm
            initial={edit}
            close={() => setEdit(null)}
            saved={() => {
              setEdit(null);
              reload();
              notify("Đã lưu gói chăm sóc");
            }}
          />
        ) : (
          <RecordForm
            kind={kind}
            initial={edit}
            close={() => setEdit(null)}
            saved={() => {
              setEdit(null);
              reload();
              notify("Đã lưu thông tin");
            }}
          />
        ))}
    </>
  );
}

function PackageForm({
  initial,
  close,
  saved,
}: {
  initial: Row;
  close: () => void;
  saved: () => void;
}) {
  const { data } = useLoad("/services");
  const [form, setForm] = useState<Row>({
    name: initial.name || "",
    price: initial.price || 0,
    valid_days: initial.valid_days || 90,
    active: initial.active ?? true,
    items:
      initial.items?.map((x: Row) => ({
        service_id: x.service_id,
        quantity: x.quantity,
      })) || [],
  });
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "/packages" + (initial.id ? "/" + initial.id : ""),
        initial.id ? "PUT" : "POST",
        form,
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Gói chăm sóc" close={close}>
      <form onSubmit={submit}>
        <Field label="Tên gói *">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="form-grid">
          <Field label="Giá bán (VND)">
            <input
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Hiệu lực (ngày)">
            <input
              type="number"
              min="1"
              required
              value={form.valid_days}
              onChange={(e) =>
                setForm({ ...form, valid_days: Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <h4>Dịch vụ trong gói</h4>
        {data
          ?.filter(
            (s: Row) =>
              s.active || form.items.some((i: Row) => i.service_id === s.id),
          )
          .map((s: Row) => {
            const item = form.items.find((x: Row) => x.service_id === s.id);
            return (
              <div className="package-pick" key={s.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={!!item}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        items: e.target.checked
                          ? [...form.items, { service_id: s.id, quantity: 1 }]
                          : form.items.filter(
                              (x: Row) => x.service_id !== s.id,
                            ),
                      })
                    }
                  />
                  {s.name}
                </label>
                {item && (
                  <input
                    aria-label={"Số lượt " + s.name}
                    type="number"
                    min="1"
                    max="100"
                    value={item.quantity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        items: form.items.map((x: Row) =>
                          x.service_id === s.id
                            ? { ...x, quantity: Number(e.target.value) }
                            : x,
                        ),
                      })
                    }
                  />
                )}
              </div>
            );
          })}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
          Đang hoạt động
        </label>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <Submit busy={busy} />
        </div>
      </form>
    </Modal>
  );
}

function CustomerDetail({ id, close }: { id: number; close: () => void }) {
  const { user } = ctx();
  const { data, error } = useLoad("/customers/" + id);
  const [tab, setTab] = useState("history");
  return (
    <Modal title={data?.full_name || "Hồ sơ khách hàng"} close={close}>
      {!data ? (
        <Loading error={error} />
      ) : (
        <>
          <div className="profile-strip">
            <span className="avatar large">
              {data.full_name.split(" ").slice(-1)[0][0]}
            </span>
            <div>
              <b>{data.full_name}</b>
              <p>
                {data.phone} · {data.email}
              </p>
              <small>{data.note}</small>
            </div>
          </div>
          <div className="tabs">
            {[
              ["history", "Lịch sử"],
              ...(user.role !== "TECHNICIAN"
                ? [
                    ["packages", "Gói đã mua"],
                    ["invoices", "Hóa đơn"],
                  ]
                : []),
              ["ai", "Trợ lý AI"],
            ].map(([k, t]) => (
              <button
                className={tab === k ? "active" : ""}
                onClick={() => setTab(k)}
                key={k}
              >
                {t}
              </button>
            ))}
          </div>
          {tab === "history" ? (
            data.history.length ? (
              data.history.map((s: Row) => (
                <div className="history-item" key={s.id}>
                  <span className="history-dot" />
                  <div>
                    <b>{s.service_name}</b>
                    <p>
                      {dateTime(s.start_time)} · {s.technician_name}
                    </p>
                    <small>{s.care_note || "Chưa có ghi chú"}</small>
                  </div>
                </div>
              ))
            ) : (
              <Empty text="Chưa có dịch vụ hoàn thành" />
            )
          ) : tab === "packages" ? (
            <OwnedPackages id={id} />
          ) : tab === "invoices" ? (
            <CustomerInvoices id={id} />
          ) : (
            <AIPanel customerId={id} />
          )}
        </>
      )}
    </Modal>
  );
}
function OwnedPackages({ id }: { id: number }) {
  const { data, error } = useLoad(`/customers/${id}/packages`);
  return !data ? (
    <Loading error={error} />
  ) : !data.length ? (
    <Empty text="Khách hàng chưa mua gói chăm sóc" />
  ) : (
    <>
      {data.map((p: Row) => (
        <div className="owned-package" key={p.id}>
          <div className="panel-title">
            <h3>{p.name}</h3>
            <Badge value={p.status} />
          </div>
          <p className="muted">Hết hạn: {dateTime(p.expires_at)}</p>
          {p.items.map((i: Row) => (
            <div key={i.id}>
              <b>{i.service_name}</b>
              <p>
                Đã dùng {i.used}/{i.total_quantity} · Đang dành {i.reserved} ·
                Có thể đặt {i.available}
              </p>
              <div className="progress">
                <i style={{ width: (i.used / i.total_quantity) * 100 + "%" }} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
function CustomerInvoices({ id }: { id: number }) {
  const { data, error } = useLoad("/invoices?customer_id=" + id);
  return !data ? (
    <Loading error={error} />
  ) : !data.length ? (
    <Empty />
  ) : (
    <>
      {data.map((i: Row) => (
        <div className="history-item" key={i.id}>
          <Receipt />
          <div>
            <b>
              Hóa đơn #{i.id} · {money(i.total)}
            </b>
            <p>{dateTime(i.created_at)}</p>
            <Badge value={i.status} />
          </div>
        </div>
      ))}
    </>
  );
}

function AIPanel({
  customerId,
  appointmentId,
  initialKind,
}: {
  customerId: number;
  appointmentId?: number;
  initialKind?: string;
}) {
  const { user, notify } = ctx();
  const [kind, setKind] = useState(initialKind || "summary"),
    [need, setNeed] = useState(""),
    [result, setResult] = useState<Row | null>(null),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const services = useLoad("/services");
  async function generate() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await api("/ai/generate", "POST", {
        customer_id: customerId,
        kind,
        need,
        ...(appointmentId ? { appointment_id: appointmentId } : {}),
      });
      setResult(r);
      setText(r.result.text || r.result.message || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ai-panel">
      <div className="ai-heading">
        <Sparkles size={22} />
        <div>
          <h3>Trợ lý chăm sóc</h3>
          <small>Thêm thấu hiểu, bớt thao tác</small>
        </div>
      </div>
      <div className="warning">
        Nội dung do AI hỗ trợ tạo, chỉ dùng tham khảo. Không thay thế tư vấn y
        khoa và không cam kết hiệu quả điều trị. Nhân viên cần kiểm tra trước
        khi sử dụng.
      </div>
      <Field label="Chức năng">
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setResult(null);
          }}
        >
          {!appointmentId ? (
            <>
              <option value="summary">Tóm tắt hồ sơ</option>
              {user.role !== "TECHNICIAN" && (
                <option value="recommend">Gợi ý dịch vụ</option>
              )}
            </>
          ) : (
            <>
              <option value="reminder">Tin nhắn nhắc lịch</option>
              <option value="aftercare">Chăm sóc sau dịch vụ</option>
            </>
          )}
        </select>
      </Field>
      {kind === "recommend" && (
        <Field label="Nhu cầu khách hàng">
          <textarea
            maxLength={1500}
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            placeholder="Ví dụ: muốn thư giãn cổ vai gáy, có khoảng 45 phút…"
          />
        </Field>
      )}
      <button className="primary" disabled={busy} onClick={generate}>
        <Sparkles size={16} />
        {busy ? "Đang tạo nội dung…" : "Tạo nội dung"}
      </button>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="ai-result">
          <span className="ai-mode">
            {result.simulated
              ? "Dữ liệu giả lập · không phải mô hình AI"
              : "AI Gemini"}
          </span>
          {result.result.recommendations?.map((r: Row) => (
            <article key={r.service_id}>
              <b>
                {services.data?.find((s: Row) => s.id === r.service_id)?.name ||
                  "Dịch vụ #" + r.service_id}
              </b>
              <p>{r.reason}</p>
            </article>
          ))}
          <Field label="Nội dung xem trước · có thể chỉnh sửa">
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                notify("Đã sao chép nội dung");
              } catch {
                setError(
                  "Không thể sao chép tự động. Bạn có thể chọn và sao chép nội dung trong ô.",
                );
              }
            }}
          >
            <Copy size={15} />
            Sao chép
          </button>
          <small className="muted">
            Nội dung chưa được gửi đến khách hàng.
          </small>
        </div>
      )}
    </div>
  );
}

function Appointments() {
  const { user, notify } = ctx();
  const [day, setDay] = useState(""),
    [status, setStatus] = useState(""),
    [q, setQ] = useState(""),
    [edit, setEdit] = useState<Row | null>(null),
    [ai, setAi] = useState<Row | null>(null),
    [profile, setProfile] = useState<number | null>(null);
  const { data, error, reload } = useLoad(
    `/appointments?date_from=${day}&date_to=${day}&status=${status}&q=${encodeURIComponent(q)}`,
  );
  async function change(a: Row, s: string) {
    if (
      s === "CANCELLED" &&
      !confirm("Hủy lịch hẹn này? Lượt gói đã dành sẽ được giải phóng.")
    )
      return;
    try {
      await api(`/appointments/${a.id}/status`, "POST", { status: s });
      reload();
      notify("Đã cập nhật lịch hẹn");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function complete(s: Row) {
    const note = prompt(
      "Ghi chú sau thực hiện (không chẩn đoán y khoa):",
      "Khách đã hoàn thành buổi chăm sóc.",
    );
    if (note === null) return;
    try {
      await api(`/appointment-services/${s.id}/complete`, "POST", {
        care_note: note,
      });
      reload();
      notify("Đã hoàn thành và cập nhật tiến độ");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  return (
    <>
      <Section
        title={
          user.role === "TECHNICIAN" ? "Lịch làm việc của tôi" : "Lịch hẹn"
        }
        subtitle="Sắp xếp thời gian chu đáo cho mỗi khách hàng."
        action={
          user.role !== "TECHNICIAN" && (
            <button className="primary" onClick={() => setEdit({})}>
              <Plus size={18} />
              Đặt lịch hẹn
            </button>
          )
        }
      />
      <section className="panel">
        <div className="toolbar wrap">
          <div className="search">
            <Search size={18} />
            <input
              placeholder="Tìm khách hàng…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <input
            aria-label="Lọc ngày hẹn"
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
          <select
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {["BOOKED", "CONFIRMED", "COMPLETED", "CANCELLED"].map((s) => (
              <option value={s} key={s}>
                {labels[s]}
              </option>
            ))}
          </select>
          <button onClick={() => setDay(today())}>Hôm nay</button>
          <button className="icon" aria-label="Tải lại" onClick={reload}>
            <RefreshCw size={17} />
          </button>
        </div>
        {!data ? (
          <Loading error={error} />
        ) : !data.length ? (
          <Empty text="Chưa có lịch hẹn phù hợp" />
        ) : (
          <div className="appointment-list">
            {data.map((a: Row) => (
              <article className="appointment-card" key={a.id}>
                <div className="appointment-top">
                  <div>
                    <small>LỊCH HẸN #{a.id}</small>
                    <h3>
                      <button
                        className="text-button"
                        onClick={() => setProfile(a.customer_id)}
                      >
                        {a.customer_name}
                        <ArrowUpRight size={15} />
                      </button>
                    </h3>
                    <p>
                      <Clock size={14} />
                      {dateTime(a.start_time)} → {dateTime(a.end_time)}
                    </p>
                  </div>
                  <Badge value={a.status} />
                </div>
                {a.items.map((s: Row) => (
                  <div className="appointment-service" key={s.id}>
                    <span className="service-icon">
                      <Flower2 size={18} />
                    </span>
                    <div>
                      <b>{s.service_name}</b>
                      <small>
                        {s.technician_name} · {s.duration} phút{" "}
                        {s.customer_package_item_id ? "· Sử dụng gói" : ""}
                      </small>
                    </div>
                    <Badge value={s.status} />
                    {["ADMIN", "TECHNICIAN"].includes(user.role) &&
                      s.status === "PENDING" &&
                      a.status !== "CANCELLED" && (
                        <button onClick={() => complete(s)}>Hoàn thành</button>
                      )}
                  </div>
                ))}
                {a.note && <p className="muted">{a.note}</p>}
                {user.role !== "TECHNICIAN" && (
                  <div className="card-foot">
                    {["BOOKED", "CONFIRMED"].includes(a.status) && (
                      <>
                        <button onClick={() => setEdit(a)}>
                          Đổi lịch / Phân công
                        </button>
                        {a.status === "BOOKED" && (
                          <button onClick={() => change(a, "CONFIRMED")}>
                            Xác nhận
                          </button>
                        )}
                        <button
                          className="danger-text"
                          onClick={() => change(a, "CANCELLED")}
                        >
                          Hủy lịch
                        </button>
                      </>
                    )}
                    <button className="ai-button" onClick={() => setAi(a)}>
                      <Sparkles size={15} />
                      Soạn tin nhắn
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {edit && (
        <BookingForm
          initial={edit}
          close={() => setEdit(null)}
          saved={() => {
            setEdit(null);
            reload();
            notify("Đã lưu lịch hẹn");
          }}
        />
      )}
      {ai && (
        <Modal
          title={"Soạn tin · " + ai.customer_name}
          close={() => setAi(null)}
        >
          <AIPanel
            customerId={ai.customer_id}
            appointmentId={ai.id}
            initialKind={ai.status === "COMPLETED" ? "aftercare" : "reminder"}
          />
        </Modal>
      )}
      {profile && (
        <CustomerDetail id={profile} close={() => setProfile(null)} />
      )}
    </>
  );
}

function CustomerSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const { data } = useLoad("/customers?size=100&q=" + encodeURIComponent(q));
  const chosen = useLoad(value ? "/customers/" + value : "/health");
  return (
    <div>
      <input
        aria-label="Tìm khách để chọn"
        placeholder="Tìm tên hoặc số điện thoại…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Field label="Khách hàng *">
        <select
          required
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="">Chọn khách hàng</option>
          {value &&
            chosen.data?.id &&
            !data?.items.some((c: Row) => c.id === value) && (
              <option value={value}>{chosen.data.full_name}</option>
            )}
          {data?.items.map((c: Row) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {c.phone}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
function localInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 16);
}
function BookingForm({
  initial,
  close,
  saved,
}: {
  initial: Row;
  close: () => void;
  saved: () => void;
}) {
  const services = useLoad("/services"),
    users = useLoad("/users");
  const [cid, setCid] = useState(initial.customer_id || 0),
    [start, setStart] = useState(
      initial.start_time
        ? localInput(initial.start_time)
        : localInput(new Date(Date.now() + 86400000).toISOString()),
    ),
    [note, setNote] = useState(initial.note || ""),
    [lines, setLines] = useState<Row[]>(
      initial.items?.map((x: Row) => ({
        service_id: x.service_id,
        technician_id: x.technician_id,
        treatment_session_id: x.treatment_session_id,
        customer_package_item_id: x.customer_package_item_id,
      })) || [
        {
          service_id: 0,
          technician_id: 0,
          treatment_session_id: null,
          customer_package_item_id: null,
        },
      ],
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plans = useLoad(cid ? "/plans?customer_id=" + cid : "/health"),
    owned = useLoad(cid ? `/customers/${cid}/packages` : "/health");
  function patch(i: number, k: string, v: any) {
    setLines(
      lines.map((x, n) =>
        n === i
          ? {
              ...x,
              [k]: v,
              ...(k === "service_id"
                ? { treatment_session_id: null, customer_package_item_id: null }
                : {}),
            }
          : x,
      ),
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        "/appointments" + (initial.id ? "/" + initial.id : ""),
        initial.id ? "PUT" : "POST",
        {
          customer_id: cid,
          start_time: start + ":00+07:00",
          note,
          items: lines,
        },
      );
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const duration = lines.reduce(
    (sum, l) =>
      sum +
      (services.data?.find((s: Row) => s.id === l.service_id)?.duration || 0),
    0,
  );
  return (
    <Modal
      title={initial.id ? "Đổi lịch và phân công" : "Đặt lịch hẹn"}
      close={close}
    >
      <form onSubmit={submit}>
        <CustomerSelect
          value={cid}
          onChange={(id) => {
            setCid(id);
            setLines(
              lines.map((x) => ({
                ...x,
                treatment_session_id: null,
                customer_package_item_id: null,
              })),
            );
          }}
        />
        <Field label="Bắt đầu (giờ Việt Nam) *">
          <input
            required
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        {lines.map((l, i) => (
          <div className="booking-line" key={i}>
            <div className="panel-title">
              <b>Dịch vụ {i + 1}</b>
              {lines.length > 1 && (
                <button
                  type="button"
                  className="icon"
                  aria-label="Bỏ dịch vụ"
                  onClick={() => setLines(lines.filter((_, n) => n !== i))}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="form-grid">
              <Field label="Dịch vụ *">
                <select
                  required
                  value={l.service_id || ""}
                  onChange={(e) =>
                    patch(i, "service_id", Number(e.target.value))
                  }
                >
                  <option value="">Chọn dịch vụ</option>
                  {services.data
                    ?.filter((s: Row) => s.active)
                    .map((s: Row) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.duration} phút
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Kỹ thuật viên *">
                <select
                  required
                  value={l.technician_id || ""}
                  onChange={(e) =>
                    patch(i, "technician_id", Number(e.target.value))
                  }
                >
                  <option value="">Chọn nhân viên</option>
                  {users.data
                    ?.filter((u: Row) => u.role === "TECHNICIAN" && u.active)
                    .map((u: Row) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                </select>
              </Field>
            </div>
            {cid > 0 && (
              <>
                <Field label="Liên kết buổi liệu trình (tùy chọn)">
                  <select
                    value={l.treatment_session_id || ""}
                    onChange={(e) =>
                      patch(
                        i,
                        "treatment_session_id",
                        Number(e.target.value) || null,
                      )
                    }
                  >
                    <option value="">Không thuộc liệu trình</option>
                    {Array.isArray(plans.data) &&
                      plans.data.flatMap((p: Row) =>
                        p.sessions
                          .filter(
                            (s: Row) =>
                              s.service_id === l.service_id &&
                              (s.status === "PLANNED" ||
                                s.id === l.treatment_session_id),
                          )
                          .map((s: Row) => (
                            <option key={s.id} value={s.id}>
                              {p.name} · Buổi {s.number}
                            </option>
                          )),
                      )}
                  </select>
                </Field>
                <Field label="Thanh toán bằng lượt gói (tùy chọn)">
                  <select
                    value={l.customer_package_item_id || ""}
                    onChange={(e) =>
                      patch(
                        i,
                        "customer_package_item_id",
                        Number(e.target.value) || null,
                      )
                    }
                  >
                    <option value="">Trả tiền dịch vụ</option>
                    {Array.isArray(owned.data) &&
                      owned.data
                        .filter((p: Row) => p.status === "ACTIVE")
                        .flatMap((p: Row) =>
                          p.items
                            .filter(
                              (x: Row) =>
                                x.service_id === l.service_id &&
                                (x.available > 0 ||
                                  x.id === l.customer_package_item_id),
                            )
                            .map((x: Row) => (
                              <option key={x.id} value={x.id}>
                                {p.name} · Còn có thể đặt {x.available} lượt
                              </option>
                            )),
                        )}
                  </select>
                </Field>
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setLines([
              ...lines,
              {
                service_id: 0,
                technician_id: 0,
                treatment_session_id: null,
                customer_package_item_id: null,
              },
            ])
          }
        >
          <Plus size={15} />
          Thêm dịch vụ
        </button>
        <p className="summary">
          Tổng {duration} phút · Kết thúc dự kiến:{" "}
          {start &&
            dateTime(
              new Date(
                new Date(start + ":00+07:00").getTime() + duration * 60000,
              ).toISOString(),
            )}
        </p>
        <Field label="Ghi chú">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </Field>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="form-actions">
          <Submit busy={busy} label="Lưu lịch hẹn" />
        </div>
      </form>
    </Modal>
  );
}

function Plans() {
  const { notify } = ctx();
  const { data, error, reload } = useLoad("/plans");
  const [create, setCreate] = useState(false),
    [book, setBook] = useState<Row | null>(null);
  return (
    <>
      <Section
        title="Liệu trình chăm sóc"
        subtitle="Theo dõi tiến độ, đồng hành qua từng buổi."
        action={
          <button className="primary" onClick={() => setCreate(true)}>
            <Plus size={18} />
            Tạo liệu trình
          </button>
        }
      />
      {!data ? (
        <Loading error={error} />
      ) : !data.length ? (
        <Empty />
      ) : (
        <div className="plan-grid">
          {data.map((p: Row) => (
            <section className="panel" key={p.id}>
              <div className="panel-title">
                <div>
                  <h3>{p.name}</h3>
                  <p className="muted">{p.customer_name}</p>
                </div>
                <Badge value={p.status} />
              </div>
              <div className="plan-progress">
                <b>
                  {p.completed}/{p.total} buổi
                </b>
                <span className="muted">đã hoàn thành</span>
              </div>
              <div className="progress">
                <i style={{ width: (p.completed / p.total) * 100 + "%" }} />
              </div>
              {p.sessions.map((s: Row) => (
                <div className="session" key={s.id}>
                  <span
                    className={
                      "session-number " +
                      (s.status === "COMPLETED" ? "done" : "")
                    }
                  >
                    {s.status === "COMPLETED" ? <Check size={15} /> : s.number}
                  </span>
                  <div>
                    <b>{s.service_name}</b>
                    <small>{s.care_note || labels[s.status]}</small>
                  </div>
                  {s.status === "PLANNED" && (
                    <button
                      onClick={() =>
                        setBook({
                          customer_id: p.customer_id,
                          items: [
                            {
                              service_id: s.service_id,
                              technician_id: 0,
                              treatment_session_id: s.id,
                              customer_package_item_id: null,
                            },
                          ],
                        })
                      }
                    >
                      Đặt lịch
                    </button>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {create && (
        <PlanForm
          close={() => setCreate(false)}
          saved={() => {
            setCreate(false);
            reload();
            notify("Đã tạo liệu trình");
          }}
        />
      )}
      {book && (
        <BookingForm
          initial={book}
          close={() => setBook(null)}
          saved={() => {
            setBook(null);
            reload();
            notify("Đã đặt lịch cho buổi liệu trình");
          }}
        />
      )}
    </>
  );
}
function PlanForm({ close, saved }: { close: () => void; saved: () => void }) {
  const [cid, setCid] = useState(0),
    [name, setName] = useState(""),
    [start, setStart] = useState(today()),
    [sid, setSid] = useState(0),
    [count, setCount] = useState(4),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const services = useLoad("/services");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/plans", "POST", {
        customer_id: cid,
        name,
        start_date: start,
        note,
        service_ids: Array(count).fill(sid),
      });
      saved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Tạo liệu trình khách hàng" close={close}>
      <form onSubmit={submit}>
        <CustomerSelect value={cid} onChange={setCid} />
        <Field label="Tên liệu trình *">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Dịch vụ cho các buổi *">
          <select
            required
            value={sid || ""}
            onChange={(e) => setSid(Number(e.target.value))}
          >
            <option value="">Chọn dịch vụ</option>
            {services.data
              ?.filter((s: Row) => s.active)
              .map((s: Row) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Số buổi *">
            <input
              type="number"
              required
              min="1"
              max="50"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          <Field label="Ngày bắt đầu">
            <input
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Ghi chú">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <Submit busy={busy} />
        </div>
      </form>
    </Modal>
  );
}

function Invoices() {
  const { notify } = ctx();
  const { data, error, reload } = useLoad("/invoices");
  const [create, setCreate] = useState(false),
    [detail, setDetail] = useState<Row | null>(null),
    [method, setMethod] = useState("CASH"),
    [busy, setBusy] = useState(false);
  async function pay() {
    if (!detail) return;
    setBusy(true);
    try {
      const inv = await api(`/invoices/${detail.id}/pay`, "POST", { method });
      setDetail(inv);
      reload();
      notify("Đã thanh toán, cập nhật tồn kho và quyền sử dụng gói");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Section
        title="Hóa đơn & thanh toán"
        subtitle="Minh bạch từng khoản, trọn vẹn mỗi trải nghiệm."
        action={
          <button className="primary" onClick={() => setCreate(true)}>
            <Plus size={18} />
            Lập hóa đơn
          </button>
        }
      />
      <section className="panel">
        {!data ? (
          <Loading error={error} />
        ) : !data.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hóa đơn</th>
                  <th>Khách hàng</th>
                  <th>Ngày lập</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((i: Row) => (
                  <tr key={i.id}>
                    <td>
                      <b>HD{String(i.id).padStart(4, "0")}</b>
                    </td>
                    <td>{i.customer_name}</td>
                    <td>{dateTime(i.created_at)}</td>
                    <td>
                      <b>{money(i.total)}</b>
                    </td>
                    <td>
                      <Badge value={i.status} />
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setDetail(i)}
                      >
                        Chi tiết <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {create && (
        <InvoiceForm
          close={() => setCreate(false)}
          saved={(inv) => {
            setCreate(false);
            reload();
            setDetail(inv);
            notify("Đã tạo hóa đơn nháp");
          }}
        />
      )}
      {detail && (
        <Modal title={"Hóa đơn #" + detail.id} close={() => setDetail(null)}>
          <div className="invoice-print">
            <div className="invoice-brand">
              <Leaf />
              <h2>An Nhiên Spa</h2>
              <p>HÓA ĐƠN #{detail.id}</p>
            </div>
            <p>
              Khách hàng: <b>{detail.customer_name}</b>
            </p>
            <p>Ngày lập: {dateTime(detail.created_at)}</p>
            <Badge value={detail.status} />
            <table>
              <thead>
                <tr>
                  <th>Khoản mục</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((x: Row) => (
                  <tr key={x.id}>
                    <td>{x.name}</td>
                    <td>{x.quantity}</td>
                    <td>{money(x.quantity * x.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invoice-total">
              <p>
                Tạm tính <b>{money(detail.subtotal)}</b>
              </p>
              <p>
                Giảm giá <b>{money(detail.discount)}</b>
              </p>
              <h3>
                Thanh toán <strong>{money(detail.total)}</strong>
              </h3>
            </div>
            {detail.paid_at && (
              <p>
                Đã thanh toán {dateTime(detail.paid_at)} ·{" "}
                {labels[detail.payment_method]}
              </p>
            )}
            <small>Chứng từ demo học tập · Không phải hóa đơn thuế</small>
          </div>
          {detail.status === "DRAFT" && (
            <div className="payment-actions">
              <Field label="Phương thức thanh toán">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="CASH">Tiền mặt</option>
                  <option value="TRANSFER">
                    Chuyển khoản · xác nhận thủ công
                  </option>
                </select>
              </Field>
              <p className="muted">
                Nhân viên chỉ xác nhận sau khi đã nhận tiền. Hệ thống không tự
                kiểm tra giao dịch ngân hàng.
              </p>
              <button className="primary" disabled={busy} onClick={pay}>
                {busy ? "Đang xử lý…" : "Xác nhận đã nhận tiền"}
              </button>
            </div>
          )}
          <div className="form-actions">
            <button onClick={() => window.print()}>
              <Printer size={16} />
              In hóa đơn
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function InvoiceForm({
  close,
  saved,
}: {
  close: () => void;
  saved: (inv: Row) => void;
}) {
  const [cid, setCid] = useState(0),
    [lines, setLines] = useState<Row[]>([]),
    [discount, setDiscount] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const products = useLoad("/products"),
    packages = useLoad("/packages"),
    billable = useLoad(cid ? `/customers/${cid}/billable` : "/health");
  function add(kind: string, s: Row) {
    const id = s.id;
    if (lines.some((x) => x.kind === kind && x.reference_id === id)) return;
    setLines([
      ...lines,
      {
        kind,
        reference_id: id,
        quantity: 1,
        name: s.name || s.service_name,
        price: s.price,
      },
    ]);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const inv = await api("/invoices", "POST", {
        customer_id: cid,
        discount,
        items: lines.map(({ kind, reference_id, quantity }) => ({
          kind,
          reference_id,
          quantity,
        })),
      });
      saved(inv);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.quantity, 0);
  return (
    <Modal title="Lập hóa đơn" close={close}>
      <form onSubmit={submit}>
        <CustomerSelect
          value={cid}
          onChange={(id) => {
            setCid(id);
            setLines([]);
          }}
        />
        <div className="form-grid">
          <Field label="Dịch vụ đã hoàn thành, chưa lập hóa đơn">
            <select
              value=""
              onChange={(e) => {
                const s = billable.data?.find(
                  (x: Row) => x.id === Number(e.target.value),
                );
                if (s) add("SERVICE", s);
              }}
            >
              <option value="">Chọn dịch vụ</option>
              {Array.isArray(billable.data) &&
                billable.data.map((s: Row) => (
                  <option key={s.id} value={s.id}>
                    {s.service_name} · {dateTime(s.start_time)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Sản phẩm bán kèm">
            <select
              value=""
              onChange={(e) => {
                const p = products.data?.find(
                  (x: Row) => x.id === Number(e.target.value),
                );
                if (p) add("PRODUCT", p);
              }}
            >
              <option value="">Chọn sản phẩm</option>
              {products.data
                ?.filter((p: Row) => p.active)
                .map((p: Row) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · tồn {p.stock}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Bán gói chăm sóc">
          <select
            value=""
            onChange={(e) => {
              const p = packages.data?.find(
                (x: Row) => x.id === Number(e.target.value),
              );
              if (p) add("PACKAGE", p);
            }}
          >
            <option value="">Chọn gói</option>
            {packages.data
              ?.filter((p: Row) => p.active)
              .map((p: Row) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {money(p.price)}
                </option>
              ))}
          </select>
        </Field>
        {lines.map((l, i) => (
          <div className="invoice-line" key={l.kind + l.reference_id}>
            <div>
              <b>{l.name}</b>
              <small>{money(l.price)}</small>
            </div>
            <input
              aria-label={"Số lượng " + l.name}
              type="number"
              min="1"
              max={l.kind === "PRODUCT" ? 100 : 1}
              value={l.quantity}
              onChange={(e) =>
                setLines(
                  lines.map((x, n) =>
                    n === i ? { ...x, quantity: Number(e.target.value) } : x,
                  ),
                )
              }
            />
            <button
              type="button"
              className="icon"
              aria-label="Bỏ khoản mục"
              onClick={() => setLines(lines.filter((_, n) => n !== i))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
        {!lines.length && (
          <Empty text="Chọn dịch vụ, sản phẩm hoặc gói để lập hóa đơn" />
        )}
        <Field label="Giảm giá (VND)">
          <input
            type="number"
            min="0"
            max={subtotal}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </Field>
        <div className="summary">
          Tổng dự kiến: <b>{money(subtotal - discount)}</b>
        </div>
        <small className="muted">
          Gói chỉ được kích hoạt và sản phẩm chỉ trừ kho sau khi xác nhận thanh
          toán.
        </small>
        {error && <div className="error">{error}</div>}
        <div className="form-actions">
          <Submit busy={busy} label="Tạo hóa đơn nháp" />
        </div>
      </form>
    </Modal>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
