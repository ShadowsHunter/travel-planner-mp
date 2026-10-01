---
name: new-page
description: 新增小程序页面的标准流程：pages.json 全路径注册、跳转方式选择（switchTab/navigateTo/reLaunch）、tabBar 约束、DESIGN.md 样式 token。用户要求"加一个页面/新增页面/新 tab"时使用。
---

# new-page — 新增页面流程

## 决策

1. 是 tabBar 页面吗？需要底部入口 → 改 pages.json 的 `tabBar.list`，并准备 2 张图标 PNG（普通+选中）放 `src/static/tabbar/`；普通页面**不要动 tabBar**。
2. 页面路径约定：`src/pages/<模块>/<名称>/index.vue`（模块首页可直接 `<模块>/index.vue`）。

## 创建步骤

1. 新建 .vue：`<script setup lang="ts">` 在前 `<style>` 在后；样式用 rpx + App.vue 里的 CSS 变量（`--color-primary: #FF385C` 等，完整 token 表见 docs/DESIGN.md）。
2. 在 pages.json 的 `pages` 数组按**完整路径**注册，如 `"pages/trips/detail/index"`——不带前导斜杠，必须与目录完全一致。已知坑：短路径 `pages/trips/detail` 真机跳转失败。
3. 导航栏标题等窗口配置写在 pages.json 该页的 `style` 里（如 `navigationBarTitleText`）。

## 跳转规则（易错）

- 跳 tabBar 页面只能 `uni.switchTab`——**navigateTo 跳 tabBar 页会失败**。
- 普通页面用 `uni.navigateTo`；需清空页面栈用 `uni.reLaunch`。
- url 以 `/` 开头 + pages.json 注册的完整路径。
- 401/登录态失效由 request.ts 统一拦截并 reLaunch 登录页，页面代码不用自己处理。

## 验证（铁律）

`pnpm build:mp-weixin` 通过后，运行 /verify 做接口冒烟，并在微信开发者工具点开新页面确认导航与渲染正常。
