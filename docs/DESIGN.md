# 小程序设计文档（DESIGN）

> 仓库: travel-planner-mp
> 配套文档: [REQUIREMENTS.md](./REQUIREMENTS.md)（需求范围）、[API.md](./API.md)（接口契约）
> UI 完整规范: 主项目 `/home/hunter/projects/travel-planner/docs/MINI-PROGRAM-UI-SPEC.md`（本文只保留开发必需的核心规范，其余以源文件为准）

---

## 1. 技术选型及理由

| 选择 | 版本/目标 | 理由 |
|---|---|---|
| uni-app | @dcloudio/* 3.0.0-4060620250520001 | 一套 Vue 语法编译到微信小程序；团队 Web 端已是 Vue 技术栈，复用心智与代码（utils/stores 近乎零改动拷贝） |
| Vue 3 + `<script setup>` | ^3.5.39 | 与 Web 端一致；组合式 API 写页面逻辑 |
| TypeScript | ~5.9.2 | 前后端同语言，接口类型与后端实体对齐（camelCase） |
| Pinia | 2.3.1 | 与 Web 端 store 代码直接复用（`stores/trip.ts` 从 Web 拷贝零改动） |
| 编译目标 | `mp-weixin`（pnpm build:mp-weixin） | PRD Phase 2 明确微信小程序优先 |
| 包管理 | pnpm | 与主项目一致，pnpm-lock.yaml 已入库 |

不引入的东西（ponytail 原则，与主项目一致）: 不用 axios（用 `uni.request` 封装）、不引 UI 组件库（原生 view/text 自绘）、不引 vue-router（uni-app pages.json 路由）。

## 2. 架构

### 2.1 页面结构图（文字版）

```
App.vue (onLaunch: 检查 token → 有效 checkAuth / 无效或无 token → reLaunch 登录页)
│
tabBar（3 Tab，见 pages.json）
├─ pages/trips/index        行程列表（首页，下拉刷新，左滑删除）
│    ├─ tap 卡片 → navigateTo pages/trips/detail/index?id=xxx
│    ├─ FAB「+」→ 页内创建弹窗（简表单：标题/目的地/起止日期）
│    └─ （完整表单入口）navigateTo pages/trips/create
├─ pages/discover/index     发现（占位）
└─ pages/mine/index         我的（统计/菜单/退出登录）

非 tabBar 页：
├─ pages/trips/create           创建行程（完整表单，成功后 redirectTo 详情页）
├─ pages/trips/detail/index     行程详情（日期Tab + 列表/地图双视图 + 条目增删改排序）
├─ pages/login/index            登录（navigationStyle: custom）
└─ pages/register/index         注册（navigationStyle: custom）
```

### 2.2 目录结构

```
src/
├── api/                  # 网络层
│   ├── request.ts        #   uni.request 封装（BASE_URL、token、401 拦截）
│   ├── auth.ts           #   register/login/getMe + User 类型
│   ├── trip.ts           #   行程 CRUD + Trip/TripDay 类型
│   ├── tripItem.ts       #   条目增删改/reorder + TripItem 类型
│   └── map.ts            #   searchPOI + PoiResult 类型
├── stores/
│   ├── auth.ts           #   token/user 状态 + 持久化 + checkAuth
│   └── trip.ts           #   trips/current 状态 + 全部业务动作（含乐观更新）
├── utils/
│   ├── trip.ts           #   parseLocalDate/tripDays/formatDateRange/coverGradient
│   └── itemType.ts       #   ITEM_TYPE_META（类型→中文标签/颜色）
├── pages/                # 页面（同 2.1）
├── static/tabbar/        # tabBar 图标
├── App.vue               # 全局样式变量 + 启动鉴权
├── main.ts               # createSSRApp + Pinia
├── pages.json            # 路由 + tabBar + 页面样式
└── manifest.json         # appid、权限（scope.userLocation）
```

### 2.3 路由设计

- **tabBar 页**用 `uni.switchTab` 跳转（登录成功后 `switchTab('/pages/trips/index')`、我的页「我的行程」）。
- **普通页**用 `uni.navigateTo`（带参：详情页 `?id=xxx`）。
- **重置入口**用 `uni.reLaunch`：401 时跳登录页（清空页面栈）、退出登录。
- 返回：详情/创建页用系统返回或 `uni.navigateBack()`。

tabBar 配置（pages.json）: 行程 / 发现 / 我的 三 Tab，选中色 #F27649，非选中 #7A7A7A。

## 3. 状态管理

### 3.1 auth store（`src/stores/auth.ts`）

| 状态 | 说明 |
|---|---|
| `token: string` | JWT，初始值从 storage 同步读取 |
| `user: User \| null` | 当前用户（含 id/phone/nickname/avatar） |
| `isLoggedIn` | computed，`!!token` |

| 动作 | 行为 |
|---|---|
| `login(phone, pwd)` | 调 API → setToken + user 持久化 |
| `register(phone, pwd, nickname)` | 同上（后端注册即返回 token） |
| `logout()` | 清 token/user（storage 同步清除）→ reLaunch 登录页 |
| `checkAuth()` | 有 token 时调 `getMe` 验活；失败则清空返回 false |

**token 持久化**: `uni.setStorageSync('travel_token', ...)` / `travel_user`（JSON 序列化）。key 常量由 `api/request.ts` 导出（`TOKEN_KEY`/`USER_KEY`），store 与 request 层共用，避免两处硬编码。

**401 处理（两层）**:
1. request 层拦截：任意请求返回 401 → 清 storage 两个 key → `reLaunch('/pages/login/index')` → reject。用 reLaunch 清空页面栈，避免返回键回到需鉴权页面。
2. App 启动层：`App.vue` onLaunch 检查 token；无 token 或 `checkAuth()` 失败且当前不在登录/注册页时 reLaunch 登录页。

## 4. 网络层设计（`src/api/request.ts`）

- **BASE_URL 切换**: 常量 `BASE_URL`，生产 `https://qinzilv.cn/api`；本地调试改回 `http://localhost:3000/api`（源码注释已标明）。切换点只有这一处。
- **请求头**: 默认 `Content-Type: application/json`；storage 有 token 则附加 `Authorization: Bearer <token>`。
- **查询参数**: `params` 对象经 `buildUrl` 过滤 undefined/空串并 urlencode 拼接。
- **响应处理**: 2xx resolve 原始 body；401 走统一登出（见上）；其他非 2xx reject `Error("请求失败 (status)")`。
- **对外 API**: `request.get/post/put/delete/patch`，泛型返回类型与后端响应对齐。
- **错误信息透传**: 后端统一错误体是 `{ statusCode, message, error }`（见 [API.md](./API.md)），当前 request 层 reject 的是通用 Error；页面级 catch 中 toast 文案为固定中文（如「删除失败」）。

**设计决策**: 不做响应拦截器式的全局 toast——错误展示策略（toast/行内文字）交页面决定，request 层只负责状态码分流。

## 5. UI 设计（核心规范提炼）

完整页面级规范（逐 px 标注、ASCII 布局图、全部交互态）见主项目 `docs/MINI-PROGRAM-UI-SPEC.md`。开发必需的核心约定:

### 5.1 配色体系（Rausch 主题）

| Token | 色值 | 用途 |
|---|---|---|
| primary | #FF385C | 主 CTA、选中态、强调 |
| primary-active | #E00B41 | 按下态 |
| ink | #222222 | 标题、正文 |
| muted | #6A6A6A | 副标题、辅助 |
| hairline | #DDDDDD | 分割线、卡片边框 |
| canvas | #FFFFFF | 页面背景 |
| surface-strong | #F2F2F2 | 标签/分段控件底 |
| primary-tint | #FFF1F2 | 选中浅底 |
| danger | #E53935 | 错误文字、删除 |

条目类型色（`utils/itemType.ts` 单一来源）: 景点 #3B82F6 / 餐饮 #F59E0B / 住宿 #8B5CF6 / 交通 #6366F1 / 其他 #64748B。

> 注: tabBar 选中色与行程默认封面色用 #F27649（后端 Trip.coverColor 默认值），与 primary #FF385C 并存——前者沿用了 Web 端早期色值，属已知的历史一致性问题，改动需同步后端默认值。

### 5.2 组件风格与尺寸

- 尺寸单位 rpx（750rpx = 屏宽），1px ≈ 2rpx，设计基准宽 375px。
- 卡片: 白底 + 1rpx #DDDDDD 边框 + 圆角 20rpx；卡片间距 24rpx。
- 主按钮: #FF385C 填充、白字、高 88rpx、圆角 16rpx；禁用/加载态置灰或文字变化。
- 输入框: 高 88rpx、圆角 16rpx、1.5rpx #DDDDDD 边框，聚焦态边框 #FF385C。
- 文字: 页面标题 36rpx/600、正文 28rpx、辅助 24rpx。
- 空状态: 圆形浅底图标 + 主文案 + 引导副文案（+ CTA 按钮，视页面）。

### 5.3 交互模式

- **表单弹层**: 添加/编辑条目用底部弹出的 Bottom Sheet（遮罩 + 面板，`@tap.self` 关闭），不用新页面（控制页面栈深度）。
- **危险操作**: 删除行程/条目/退出登录一律 `uni.showModal` 二次确认（删除行程文案注明不可恢复）。
- **左滑删除**: 行程列表自实现 touch 事件滑动露出删除区（无第三方组件），纵向滑动优先让位给页面滚动。
- **排序**: 排序模式 + ↑/↓ 按钮方案（每次点击即时调 reorder API，乐观更新；失败自动重拉详情回滚）。
- **选择器**: 日期 `<picker mode="date">`、时间 `<picker mode="time">`、出行方式 `<picker mode="selector">`。
- **轻提示**: `uni.showToast({ icon: 'none' })` 用于校验/失败提示；成功用 icon: 'success'。
- **下拉刷新**: 仅行程列表页开启（pages.json `enablePullDownRefresh`）。

## 6. 关键设计决策记录

| # | 决策 | 为什么 |
|---|---|---|
| D1 | Web 端 utils/stores 直接拷贝复用，api/*.ts 类型定义与后端实体对齐 | 这些模块是纯 TS 无 DOM 依赖；保证双端数据模型完全一致，双端数据互通（F12）从类型层就不错位 |
| D2 | request.ts 用 `uni.request` Promise 封装而非引 axios | 小程序环境无 XHR，axios 需 adapter；封装仅 ~70 行，可控性最高 |
| D3 | 401 在 request 层统一登出 + reLaunch | 所有页面无感知获得会话过期处理；reLaunch 清栈防止返回到鉴权页 |
| D4 | 排序用 ↑/↓ 按钮而非长按拖拽 | 小程序 movable-area 手感差实现复杂（UI-SPEC §3.3.5 决策）；乐观更新保证流畅 |
| D5 | 添加条目用 Bottom Sheet 而非新页面 | 减少页面栈层级；表单+搜索一屏可容纳（UI-SPEC §3.3.7 决策） |
| D6 | 创建行程用独立页面（create.vue）而非弹窗 | 字段多（7 项）+ date picker 弹出，整屏滚动体验更好（UI-SPEC §6.1 决策）；列表页 FAB 保留了一个只含必填项的快速创建弹窗 |
| D7 | 地图为切换视图而非常驻 | 375px 宽度下列表与地图不能同时有意义展示（UI-SPEC §3.1 决策）；原生 `<map>` 组件 + markers + 虚线 polyline 表达当日顺序 |
| D8 | 登录/注册页 `navigationStyle: custom` | 品牌区需要占据顶部（深色 #1A1A1A 品牌头），系统导航栏无法融入 |
| D9 | 行程删除为软删除（后端行为），条目删除为硬删除 | 与后端一致（Trip/TripDay 有 deleted_at，TripItem 无）；前端统一二次确认 |
| D10 | 每次 onShow 拉取列表 | 多端互通最简单的同步策略：回到小程序/回到页面即刷新，无需推送 |
| D11 | POI 搜索走后端代理而非前端直调高德 | 高德 Key 只存服务端（AMAP_API_KEY），前端不暴露；后端还提供限流(30次/10min)与缓存(1h) |
| D12 | manifest 保留 `urlCheck: false` | 开发者工具调试便利；真机/上线必须配置 qinzilv.cn 域名白名单（见 REQUIREMENTS §6） |

## 7. 构建与验证

- 构建: `pnpm build:mp-weixin`，产物 `dist/build/mp-weixin`，用微信开发者工具导入预览。
- 本地调试: BASE_URL 切 `http://localhost:3000/api`（见 §4），开发者工具勾选「不校验合法域名」。
- 铁律（AGENTS.md）: 改完必须编译 + 真实调用验证，不接受「写完不测」。
