---
name: verify
description: 铁律执行入口：编译小程序（pnpm build:mp-weixin）并对当前 BASE_URL 做真实接口冒烟测试（注册→登录→行程 CRUD→清理）。任何 src 改动后必须运行，改完必测。
---

# verify — 编译 + 真实调用验证

任何 src/ 改动后运行本技能（AGENTS.md 铁律：改完必须编译+真实调用验证，不接受"写完不测"）。

## 步骤

1. **确定目标后端**：读 src/api/request.ts 的 BASE_URL（生产 `https://qinzilv.cn/api` 或本地 `http://localhost:3000/api`）。本地后端未启动时先向用户确认目标，不要擅自切换 BASE_URL。
2. **编译**：`pnpm build:mp-weixin` 必须零错误。失败即止，修复后重跑。
3. **接口冒烟**（curl 按序执行；手机号用 `1` + 10 位随机数字，密码 `test123456`；写接口限流 20 次/分钟，一次冒烟远低于此）：
   - 注册 `POST $BASE/auth/register`，体 `{phone, password, nickname: "verify测试"}` → 期望 201 返回 `{token, user}`；409（已注册）则换随机手机号重试
   - 登录 `POST $BASE/auth/login`，体 `{phone, password}` → 期望 201 返回 `{token}`
   - 当前用户 `GET $BASE/auth/me`，头 `Authorization: Bearer <token>` → 期望 200
   - 建行程 `POST $BASE/trips`，体 `{title: "verify 冒烟测试", destination: "测试", startDate: <今天 YYYY-MM-DD>, endDate: <明天>}` → 期望 201，记录 `id`，断言 `days` 数组长度为 2
   - 列表 `GET $BASE/trips`（带 Bearer）→ 期望 200 且能找到新建 `id`
   - 删行程 `DELETE $BASE/trips/{id}` → 期望 2xx（软删除）
4. **报告**：逐条列出每步 HTTP 状态码与断言结果；任何一步失败，附完整错误响应体（后端统一错误格式 `{statusCode, message, error}`），不得谎报通过。
5. **提醒用户**：在微信开发者工具点「重新编译」，并把真机流程（注册→登录→列表→详情）走一遍。

## 注意

- 请求体只发 DTO 字段——多余字段会被后端 400（whitelist + forbidNonWhitelisted）。
- 建过的行程当场删除；注册产生的测试用户无删除接口，留存属预期。
