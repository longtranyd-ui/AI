import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function login(page: Page, username = "admin") {
  await page.goto("/");
  await page.getByLabel("Tên đăng nhập").fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("SpaDemo@123");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("aside")).toBeVisible();
}

test("dashboard, danh mục và ảnh bàn giao", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Một ngày an nhiên" }),
  ).toBeVisible();
  await expect(page.getByText("Đang tải dữ liệu…")).toHaveCount(0);
  await expect(
    page.getByText("Doanh thu", { exact: true }).first(),
  ).toBeVisible();
  fs.mkdirSync(path.resolve("../docs/images"), { recursive: true });
  await page.screenshot({
    path: "../docs/images/dashboard.png",
    fullPage: true,
  });
  for (const name of [
    "Dịch vụ",
    "Gói chăm sóc",
    "Liệu trình",
    "Sản phẩm",
    "Nhân viên",
    "Hóa đơn",
  ]) {
    await page
      .locator("nav")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.getByText("Đang tải dữ liệu…")).toHaveCount(0);
    await expect(page.locator("main .error")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test("tạo khách, đặt lịch, hoàn thành, AI và thanh toán", async ({ page }) => {
  await login(page);
  const name = "Khách UI " + Date.now();
  await page
    .locator("nav")
    .getByRole("button", { name: "Khách hàng", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm khách hàng", exact: true })
    .click();
  let modal = page.getByRole("dialog");
  await modal.getByLabel("Họ và tên").fill(name);
  await modal.getByLabel("Số điện thoại").fill("0901234567");
  await modal.getByRole("button", { name: "Lưu thông tin" }).click();
  await expect(modal).toHaveCount(0);
  await page.getByPlaceholder("Tìm tên hoặc số điện thoại…").fill(name);
  await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(1);
  await page
    .getByRole("row")
    .filter({ hasText: name })
    .getByRole("button", { name: "Hồ sơ" })
    .click();
  await page.getByRole("button", { name: "Trợ lý AI", exact: true }).click();
  await page.getByLabel("Chức năng").selectOption("recommend");
  await page.getByLabel("Nhu cầu khách hàng").fill("thư giãn cổ vai gáy");
  await page.getByRole("button", { name: "Tạo nội dung", exact: true }).click();
  await expect(
    page.getByText("Dữ liệu giả lập · không phải mô hình AI"),
  ).toBeVisible();
  await modal.getByRole("button", { name: "Đóng", exact: true }).click();
  await page
    .locator("nav")
    .getByRole("button", { name: "Lịch hẹn", exact: true })
    .click();
  await page.getByRole("button", { name: "Đặt lịch hẹn", exact: true }).click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Khách hàng *", { exact: true })
    .selectOption({ label: name + " · 0901234567" });
  const d = new Date(Date.now() + 7 * 86400000);
  const start = d.toISOString().slice(0, 10) + "T15:00";
  await modal.getByLabel("Bắt đầu (giờ Việt Nam)").fill(start);
  await modal.getByLabel("Dịch vụ *", { exact: true }).selectOption("1");
  await modal.getByLabel("Kỹ thuật viên *", { exact: true }).selectOption("4");
  await modal.getByRole("button", { name: "Lưu lịch hẹn" }).click();
  await expect(modal).toHaveCount(0);
  await page.getByPlaceholder("Tìm khách hàng…").fill(name);
  const card = page.locator(".appointment-card").filter({ hasText: name });
  await expect(card).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept("Ghi chú kiểm thử UI"));
  await card.getByRole("button", { name: "Hoàn thành", exact: true }).click();
  await expect(card.locator(".appointment-top .badge")).toHaveText(
    "Hoàn thành",
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Hóa đơn", exact: true })
    .click();
  await page.getByRole("button", { name: "Lập hóa đơn", exact: true }).click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Khách hàng *", { exact: true })
    .selectOption({ label: name + " · 0901234567" });
  await expect(
    modal
      .getByLabel("Dịch vụ đã hoàn thành, chưa lập hóa đơn")
      .locator("option"),
  ).toHaveCount(2);
  await modal
    .getByLabel("Dịch vụ đã hoàn thành, chưa lập hóa đơn")
    .selectOption({ index: 1 });
  await modal.getByRole("button", { name: "Tạo hóa đơn nháp" }).click();
  await expect(
    modal.getByText("Chờ thanh toán", { exact: true }),
  ).toBeVisible();
  await modal.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click();
  await expect(modal.getByText("Đã thanh toán", { exact: true })).toBeVisible();
});

test("lễ tân và kỹ thuật viên chỉ thấy menu đúng quyền", async ({ page }) => {
  await login(page, "letan");
  await expect(
    page.locator("nav").getByRole("button", { name: "Nhân viên", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator("nav").getByRole("button", { name: "Tổng quan", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await login(page, "ktv1");
  await expect(page.locator("nav").getByRole("button")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Lịch làm việc của tôi" }),
  ).toBeVisible();
});

test("giao diện điện thoại không tràn trang", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Một ngày an nhiên" }),
  ).toBeVisible();
  await expect(page.getByText("Đang tải dữ liệu…")).toHaveCount(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: "../docs/images/mobile.png", fullPage: true });
});
