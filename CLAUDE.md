# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目

uni-app（Vue 3 + TS + Pinia）编译微信小程序（仅 mp-weixin 目标）。生产后端 NestJS：https://qinzilv.cn/api。
需求/设计/接口以 docs/REQUIREMENTS.md、docs/DESIGN.md、docs/API.md 为准；改 src/api 或 stores 前必读 docs/API.md。

## 命令

- `pnpm dev:mp-weixin` — 增量编译到 dist/dev/mp-weixin
- `pnpm build:mp-weixin` — 生产编译到 dist/build/mp-weixin（DevTools 导入哪个目录就盯哪个）
- `pnpm lint` / `pnpm format` / `pnpm typecheck`

## 铁律

改完必须编译 + 真实调用验证，不接受"写完不测"。用 `/verify`（编译 + 对当前 BASE_URL 冒烟测试：注册→登录→行程 CRUD）。

## BASE_URL 与后端切换

- BASE_URL 硬编码在 src/api/request.ts（生产 https://qinzilv.cn/api ↔ 本地 http://localhost:3000/api），切换后需重新编译。
- 绝不提交指向 localhost 的 BASE_URL（pre-commit 钩子会拦截）。

## 后端契约陷阱（详见 docs/API.md）

- 请求体多余字段直接 400（whitelist + forbidNonWhitelisted），只发接口文档里有的字段。
- 响应里 lat/lng 是 7 位小数字符串，地图标记需 Number() 转换。
- PUT /trips 改日期范围：增补缺失日期的天、删新范围外的空白天；**含条目的天保留**（2026-10-01 实测修正，详见 docs/API.md §2.4）。
- 行程软删除，item 硬删除。
- 401 由 request.ts 统一拦截：清 travel_token/travel_user 并 uni.reLaunch 到 /pages/login/index。

## 小程序规则

- 页面跳转必须用 pages.json 注册的完整路径（如 pages/trips/detail/index）；已知坑：create.vue 用短路径 pages/trips/detail，真机失效。
- tabBar 页面只能 uni.switchTab 跳转，不能 navigateTo。
- manifest appid 为空：DevTools 用 touristappid；真机预览需 https://qinzilv.cn 加入 request 合法域名。
- 样式用 rpx + App.vue 里的 CSS 变量（token 见 docs/DESIGN.md）；不引入 UI 组件库 / axios / vue-router。

## 提交与风格

- 提交信息：中文 + 类型前缀（feat:/fix:/docs:/chore:…），与既有历史一致。
- 格式由 Prettier/ESLint 强制（单引号、分号、尾逗号、2 空格）；注释用中文。
