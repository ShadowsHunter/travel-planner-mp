# travel-planner-mp — 旅行规划微信小程序

uni-app **Vue3 + TypeScript + Pinia**，编译目标为微信小程序。

- 后端生产地址：`https://qinzilv.cn/api`（NestJS，源码见 `/home/hunter/projects/travel-planner`）
- 页面：`login` / `register` / `trips`（含 detail、create）/ `discover` / `mine`
- 本机环境：Ubuntu，Node v24.16.0，pnpm 9.15.9

## 环境准备

```bash
# Node + pnpm（已装可跳过）
node -v    # v24.x
pnpm -v    # 9.x

# 微信开发者工具：Linux 无官方版，本机用解压版 AppImage
# 位于 /home/hunter/squashfs-root/，入口：
cd /home/hunter/squashfs-root && ./hermes-desktop
```

若 `squashfs-root` 不存在，需要先拿到 Linux 版安装包解压（见文末常见问题）。

## 首次跑通

### 1. 安装依赖并编译

```bash
cd /home/hunter/projects/travel-planner-mp
pnpm install
pnpm build:mp-weixin
```

产物在 `dist/build/mp-weixin/`。

### 2. 导入微信开发者工具

1. 启动开发者工具（`./hermes-desktop`）
2. 导入项目 → 目录选 **`/home/hunter/projects/travel-planner-mp/dist/build/mp-weixin`**（注意：是 dist 产物目录，不是仓库根目录）
3. AppID 一栏：`src/manifest.json` 里 appid 为空，选 **测试号（touristappid）**，或填入真实 AppID
4. 编译即可看到登录页

### 3. 调试验证

在工具里走一遍全链路（生产 API 已验证可用）：

注册 → 登录 → 建行程 → 行程列表 → 删除，每步应正常返回。

## 日常开发流程

```bash
# 改完 src/ 下代码后，重新编译：
pnpm build:mp-weixin
```

然后在开发者工具里点「编译」刷新（工具监听 dist 目录变化，一般会自动刷新；没刷就手动点一下）。

也支持 watch 模式：

```bash
pnpm dev:mp-weixin   # 改代码自动增量编译到 dist/dev/mp-weixin
```

注意：`dev` 和 `build` 的产物目录不同（`dist/dev/` vs `dist/build/`），导入哪个目录就盯哪个。

**铁律：改完必须 `pnpm build:mp-weixin` 编译 + 工具/真机验证，不接受只写不测。**

## 联调后端

后端地址在 `src/api/request.ts` 的 `BASE_URL`：

```ts
// 生产（默认）：
const BASE_URL = 'https://qinzilv.cn/api'
// 本地联调：
const BASE_URL = 'http://localhost:3000/api'
```

### 本地后端

后端仓库在 `/home/hunter/projects/travel-planner`（NestJS，PG 端口 5433，Redis 6379）。

```bash
# 改 BASE_URL 为 http://localhost:3000/api 后，重新编译前端：
pnpm build:mp-weixin
```

### 切回生产

把 `BASE_URL` 改回 `https://qinzilv.cn/api`，再编译。提交前确认别把 localhost 带上去。

## 真机预览

**前置（必须做）：** 登录 [mp.weixin.qq.com](https://mp.weixin.qq.com) 小程序后台 →「开发」→「开发管理」→「开发设置」→ 服务器域名 → **request 合法域名** 里加入 `https://qinzilv.cn`，否则真机请求全部被拦。

然后在开发者工具里点「预览」，扫码即可。真机调试（可看 console）点「真机调试」。

注意：测试号（touristappid）没有后台配置域名的权限，真机联调需要真实 AppID 的小程序后台来配域名。

## 常见问题

**Q: 导入后报 appid 为空 / 无法编译？**
A: manifest 里 appid 是空的。导入时选测试号（touristappid），或申请正式 AppID 填进 `src/manifest.json` 的 `mp-weixin.appid` 后重新编译。

**Q: 真机预览请求全部失败，工具里却正常？**
A: request 合法域名没配。去小程序后台把 `https://qinzilv.cn` 加进 request 合法域名（https 必须，端口 443）。本地 `http://localhost:3000` 无法配白名单，只在开发者工具里调试（工具设置里勾选「不校验合法域名」可绕过，`urlCheck: false` 已在 manifest 中关闭）。

**Q: Linux 开发者工具打不开 / 闪退？**
A: 本机用的是解压版 AppImage（`/home/hunter/squashfs-root/`，入口 `./hermes-desktop`）。若目录不存在，从 [微信官方 Linux 下载页](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) 拿 Linux 版安装包重新解压。工具是社区维护的 Linux 移植版，偶有 quirks：登录扫码偶尔失灵就重启工具；模拟器渲染异常时点「编译」刷新。

**Q: 改了代码工具里没变化？**
A: 确认跑过 `pnpm build:mp-weixin`（或开着 `pnpm dev:mp-weixin`），且工具导入的目录和你编译产物目录一致（`dist/build/` vs `dist/dev/`）。

**Q: 401 一直跳登录页？**
A: token 过期，`request.ts` 会自动清登录态并 reLaunch 到登录页，重新登录即可。
