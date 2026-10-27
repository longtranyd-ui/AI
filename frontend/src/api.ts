export type Row = Record<string, any>;
export async function api(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<any> {
  const res = await fetch("/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionStorage.getItem("token")
        ? { Authorization: "Bearer " + sessionStorage.getItem("token") }
        : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    throw new Error("Không kết nối được máy chủ");
  }
  if (!res.ok) {
    if (res.status === 401 && path != "/auth/login") {
      sessionStorage.removeItem("token");
      window.dispatchEvent(new Event("session-expired"));
    }
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : Array.isArray(body.detail)
          ? body.detail.map((x: Row) => x.msg).join("; ")
          : "Thao tác không thành công",
    );
  }
  return body;
}
export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    n,
  );
export const dateTime = (v: string) =>
  v
    ? new Date(v).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
