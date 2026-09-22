# 后端接口文档（API）

> BASE_URL: `https://qinzilv.cn/api`（本地调试: `http://localhost:3000/api`，改 `src/api/request.ts` 的 `BASE_URL`）
> 认证方式: `Authorization: Bearer <JWT>`（除 register/login 外全部需要）
> 配套文档: [REQUIREMENTS.md](./REQUIREMENTS.md)、[DESIGN.md](./DESIGN.md)
> 真相来源: 后端源码 `/home/hunter/projects/travel-planner/apps/api/src/modules/`（auth/trip/trip-item/map 四组 controller + DTO）。本文所有字段与其逐一核对；不确定处已标注。

---

## 0. 通用约定

- 所有响应体为 JSON，字段 **camelCase**（TypeORM 实体序列化后的形状）。
- 请求体校验: 后端 ValidationPipe `whitelist + forbidNonWhitelisted`——**传 DTO 之外的字段会直接 400**，不要多发字段。
- 写接口限流: 注册/登录/行程与条目写操作 20 次/分钟；POI 搜索 30 次/10 分钟（超限 429）。
- 内容过滤: register / trips 创建更新 / items 创建更新会过敏感词检测，命中返回 400「内容包含违规信息（类别：xx），请修改后重试」。

### 统一错误响应格式

```json
{
  "statusCode": 400,
  "message": "结束日期不能早于开始日期",
  "error": "Bad Request",
  "timestamp": "2026-09-22T08:00:00.000Z",
  "path": "/api/trips"
}
```

### 常见错误码含义

| 状态码 | 场景 | 前端处理 |
|---|---|---|
| 400 | 参数校验失败（message 为具体原因，多条以 `; ` 连接）/ 敏感词命中 | toast message |
| 401 | 无 token / token 无效或过期 / 手机号或密码错误 | request 层统一：清 token + reLaunch 登录页（登录接口本身 401 则展示 message） |
| 404 | 资源不存在**或不属于当前用户**（不泄露存在性） | 展示「不存在或无权限」 |
| 409 | 该手机号已注册（register） | 注册页行内展示 |
| 429 | 触发限流 | toast「稍后再试」 |
| 503 | 地图服务未配置/高德请求失败 | POI 搜索降级提示 |

---

## 1. 认证模块 `/auth`

### 1.1 注册 `POST /auth/register`（公开）

请求体（RegisterDto，全部必填）:

| 字段 | 类型 | 必填 | 校验 |
|---|---|---|---|
| phone | string | 是 | 正则 `^1\d{10}$`（11 位、1 开头） |
| password | string | 是 | 最少 6 位 |
| nickname | string | 是* | 1~50 字。*DTO 标必填；小程序注册页「选填」实际是前端用手机号兜底传入 |

成功 `201`:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "0b6dd8a2-...-uuid",
    "phone": "13812341234",
    "nickname": "小李",
    "avatar": null,
    "createdAt": "2026-09-22T08:00:00.000Z",
    "updatedAt": "2026-09-22T08:00:00.000Z"
  }
}
```

> user 不含 passwordHash（@Exclude 序列化剔除）；passwordHash/lastLoginIp/registerIp 也永不返回。
> 错误: 409 该手机号已注册；400 手机号格式不正确 / 密码至少 6 位 / 敏感词。

### 1.2 登录 `POST /auth/login`（公开）

请求体（LoginDto）:

| 字段 | 类型 | 必填 | 校验 |
|---|---|---|---|
| phone | string | 是 | `^1\d{10}$` |
| password | string | 是 | — |

成功 `201`: 响应结构同注册 `{ token, user }`。
错误: 401「手机号或密码错误」（手机号不存在与密码错误同文案，防枚举）。

### 1.3 当前用户 `GET /auth/me`（需认证）

成功 `200`:

```json
{
  "user": {
    "id": "0b6dd8a2-...",
    "phone": "13812341234",
    "nickname": "小李",
    "avatar": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

错误: 401（token 无效/过期/用户不存在）。

### 认证流程（文字版）

```
注册/登录（手机号+密码）
   │ 成功 ← { token, user }
   ▼
token 存 uni.setStorageSync('travel_token')；user JSON 存 'travel_user'
   ▼
后续所有请求 header 自动带 Authorization: Bearer <token>（request.ts）
   ▼
任意请求返回 401
   ├─ request.ts 拦截：清 travel_token / travel_user 两个 storage key
   ├─ uni.reLaunch('/pages/login/index')  ← 清空页面栈
   └─ reject，页面 catch 后提示
   ▼
App.vue onLaunch：有 token 则 GET /auth/me 验活；失败/无 token → reLaunch 登录页
```

---

## 2. 行程模块 `/trips`（全部需认证）

### 2.1 创建行程 `POST /trips`

请求体（CreateTripDto）:

| 字段 | 类型 | 必填 | 校验 | 说明 |
|---|---|---|---|---|
| title | string | 是 | ≤100 字 | 标题 |
| destination | string | 是 | ≤100 字 | 目的地 |
| startDate | string | 是 | ISO 日期 `YYYY-MM-DD` | 出发日期 |
| endDate | string | 是 | ISO 日期，须 ≥ startDate | 返回日期（服务端校验） |
| theme | string | 否 | ≤50 字 | 出行主题 |
| companions | number | 否 | 整数 ≥1 | 同行人数，缺省 1 |
| transport | string | 否 | ≤30 字 | 出行方式 |
| coverColor | string | 否 | ≤20 字 | 封面色，缺省 `#F27649` |

后端行为: 按日期区间**自动生成 TripDay**（每天一条，上限 365 天），事务包裹；返回完整详情（含 days）。

成功 `201`（Trip + days，days 数组新建时为空 items）:

```json
{
  "id": "3f2c...-uuid",
  "userId": "0b6dd8a2-...",
  "title": "东京 5 日自由行",
  "destination": "东京",
  "startDate": "2026-10-01",
  "endDate": "2026-10-05",
  "theme": "自由行",
  "companions": 2,
  "transport": "飞机",
  "coverColor": "#FF385C",
  "days": [
    { "id": "day-uuid-1", "tripId": "3f2c...", "dayNumber": 1, "date": "2026-10-01", "items": [] }
  ],
  "createdAt": "2026-09-22T08:00:00.000Z",
  "updatedAt": "2026-09-22T08:00:00.000Z"
}
```

错误: 400（日期非法/结束早于开始/跨度>365 天/字段超长/敏感词）。

### 2.2 行程列表 `GET /trips`

Query 参数（ListTripDto）:

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| sort | `date` \| `created` | 否 | `date`=按出发日期**升序**（默认，同日期再按创建时间倒序）；`created`=按创建时间倒序 |
| destination | string | 否 | 目的地模糊筛选（ILIKE %kw%，自动转义 % _） |

> 注意: PRD F08 写的是「默认按出发日期倒序」，**实际后端实现是升序**（最近的行程在前需前端自行处理或确认后端语义）。小程序端当前未传 sort，直接使用后端顺序。

成功 `200`: `Trip[]`（**不含 days**，列表接口无关联加载）。

```json
[
  {
    "id": "3f2c...",
    "userId": "0b6d...",
    "title": "东京 5 日自由行",
    "destination": "东京",
    "startDate": "2026-10-01",
    "endDate": "2026-10-05",
    "theme": "自由行",
    "companions": 2,
    "transport": "飞机",
    "coverColor": "#FF385C",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

> days 在列表响应中不返回（未加载关联时 TypeORM 序列化会省略该字段，TS 类型中标记为可选 `days?`）；天数由前端 `tripDays(startDate, endDate)` 计算。

### 2.3 行程详情 `GET /trips/:id`

成功 `200`: Trip，含 `days`（按 dayNumber 升序），每个 day 含 `items`（按 sortOrder 升序，服务端已排序兜底）:

```json
{
  "id": "3f2c...",
  "userId": "0b6d...",
  "title": "东京 5 日自由行",
  "destination": "东京",
  "startDate": "2026-10-01",
  "endDate": "2026-10-05",
  "theme": "自由行",
  "companions": 2,
  "transport": "飞机",
  "coverColor": "#FF385C",
  "days": [
    {
      "id": "day-uuid-1",
      "tripId": "3f2c...",
      "dayNumber": 1,
      "date": "2026-10-01",
      "items": [
        {
          "id": "item-uuid-1",
          "dayId": "day-uuid-1",
          "type": "sight",
          "name": "故宫博物院",
          "address": "北京市东城区景山前街4号",
          "time": "09:30",
          "notes": "提前网上购票",
          "sortOrder": 1,
          "lat": "39.9163450",
          "lng": "116.3971550",
          "poiId": "B000A8UIN8",
          "createdAt": "...",
          "updatedAt": "..."
        }
      ]
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

错误: 404 行程不存在或无访问权限（含 id 非 UUID）。

### 2.4 更新行程 `PUT /trips/:id`

请求体（UpdateTripDto，**全部字段可选**，字段约束同 2.1）: title / destination / startDate / endDate / theme / companions / transport / coverColor。

后端行为: 若 startDate+endDate 同时传入且区间变化，**事务内重建 TripDay**（旧 day 及其下条目被删，⚠️ 已排条目会丢失——前端接入编辑功能时须提示用户）。

成功 `200`: 返回更新后的完整详情（同 2.3 结构）。
错误: 400（日期非法等）/ 404。

### 2.5 删除行程 `DELETE /trips/:id`（软删除）

成功 `200`:

```json
{ "success": true }
```

后端行为: 事务内级联软删除所有 TripDay（deleted_at 标记；PRD 定义 30 天窗口期可恢复，恢复入口暂无）。列表/详情自动排除已删数据。
错误: 404。

---

## 3. 行程条目模块（全部需认证）

条目类型枚举: `sight` 景点 / `food` 餐饮 / `hotel` 住宿 / `transport` 交通 / `other` 其他。

### 3.1 添加条目 `POST /trips/:tripId/days/:dayId/items`

请求体（CreateTripItemDto）:

| 字段 | 类型 | 必填 | 校验 | 说明 |
|---|---|---|---|---|
| type | enum | 是 | 五种类型之一 | |
| name | string | 是 | ≤100 字 | 名称 |
| address | string | 否 | ≤200 字 | 地址 |
| time | string | 否 | ≤20 字 | 形如 `09:30` 或 `09:30-10:00`（自由文本，非强校验） |
| notes | string | 否 | ≤500 字 | 备注 |
| lat | number | 否 | 数值 | 纬度。DTO 收 number，**存储为 7 位小数字符串** |
| lng | number | 否 | 数值 | 经度，同上 |
| poiId | string | 否 | ≤64 字 | 高德 POI id |

后端行为: sortOrder 自动取当天最大值+1；校验 day 属于 trip、trip 属于当前用户。

成功 `201`（TripItem）:

```json
{
  "id": "item-uuid-1",
  "dayId": "day-uuid-1",
  "type": "sight",
  "name": "故宫博物院",
  "address": "北京市东城区景山前街4号",
  "time": "09:30",
  "notes": null,
  "sortOrder": 3,
  "lat": "39.9163450",
  "lng": "116.3971550",
  "poiId": "B000A8UIN8",
  "createdAt": "...",
  "updatedAt": "..."
}
```

> lat/lng 响应为**字符串**（decimal 列）；小程序 `TripItem` 接口同样定义为 `string | null`，地图渲染时需 `Number(item.lat)`。
> 错误: 404（trip 不存在/无权限/day 不属于 trip）/ 400。

### 3.2 更新条目 `PUT /items/:id`

请求体（UpdateTripItemDto，全部可选，字段同 3.1）。

成功 `200`: 更新后的 TripItem（同 3.1 结构）。
错误: 404 条目不存在或无访问权限 / 400。

### 3.3 删除条目 `DELETE /items/:id`（硬删除）

成功 `200`: `{ "success": true }`
错误: 404。

### 3.4 条目重排序 `PATCH /trips/:tripId/days/:dayId/items/reorder`

请求体（ReorderTripItemDto）:

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| orderedIds | string[] | 是 | 该天**全部**条目 id 的新顺序；sortOrder 按数组下标 0..N-1 重写 |

```json
{ "orderedIds": ["item-uuid-2", "item-uuid-1", "item-uuid-3"] }
```

成功 `200`: `void`（空响应体，前端不消费返回值）。
后端行为: 事务批量重写 sortOrder；空数组 no-op。
错误: 404（任何 id 不属于该天）/ 400。
注意: 路由中 `reorder` 声明在动态参数之前，避免被通配吞掉——若后端调整路由顺序需回归测试此处。

---

## 4. 地图模块 `/map`（需认证）

### 4.1 POI 搜索 `GET /map/search`

Query 参数（SearchDto）:

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| q | string | 是 | 关键词，≥1 字 |
| city | string | 否 | 城市名/城市编码，限定搜索范围（小程序传行程目的地） |

成功 `200`:

```json
{
  "pois": [
    {
      "id": "B000A8UIN8",
      "name": "故宫博物院",
      "address": "北京市东城区景山前街4号",
      "lat": "39.9163450",
      "lng": "116.3971550",
      "type": "风景名胜;国家级景点;世界文化遗产"
    }
  ]
}
```

- 后端代理高德 `/place/text`（每页 20 条），AMAP Key 仅在服务端。
- 限流: 每用户 30 次/10 分钟（429「地图搜索请求过于频繁」）；结果缓存 1 小时。
- 错误: 503 地图服务未配置/请求失败；500 地图服务返回错误。
- 缺 location 的高德结果已被后端过滤，前端无需再判空坐标。

---

## 5. 数据模型（与后端实体对齐，camelCase）

### User（users 表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string(uuid) | 主键 |
| phone | string | 唯一，≤20 |
| nickname | string \| null | ≤50 |
| avatar | string \| null | ≤500 |
| createdAt / updatedAt | string(ISO 时间) | |
| — passwordHash | — | 永不返回（@Exclude） |
| — lastLoginIp / registerIp | — | 永不返回 |

### Trip（trips 表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string(uuid) | |
| userId | string(uuid) | 归属用户 |
| title | string | ≤100 |
| destination | string | ≤100 |
| startDate / endDate | string(`YYYY-MM-DD`) | date 列 |
| theme | string \| null | ≤50 |
| companions | number | 默认 1 |
| transport | string \| null | ≤30 |
| coverColor | string | 默认 `#F27649`，≤20 |
| days | TripDay[] | 详情接口返回（按 dayNumber 升序）；列表接口不含此字段 |
| deletedAt | — | 软删除标记，不返回给前端 |
| createdAt / updatedAt | string(ISO) | |

### TripDay（trip_days 表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string(uuid) | |
| tripId | string(uuid) | |
| dayNumber | number | 从 1 递增 |
| date | string(`YYYY-MM-DD`) | |
| items | TripItem[] | 详情接口返回，按 sortOrder 升序 |

### TripItem（trip_items 表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | string(uuid) | |
| dayId | string(uuid) | |
| type | enum | sight/food/hotel/transport/other |
| name | string | ≤100 |
| address | string \| null | ≤200 |
| time | string \| null | ≤20 |
| notes | string \| null | ≤500 |
| sortOrder | number | 当天内顺序，从 1 开始 |
| lat / lng | string \| null | decimal(10,7)，**7 位小数字符串** |
| poiId | string \| null | ≤64 |
| createdAt / updatedAt | string(ISO) | |

---

## 6. 端点速查表

| 方法 | 路径 | 说明 | 认证 |
|---|---|---|---|
| POST | /auth/register | 注册（手机号+密码+昵称） | 否 |
| POST | /auth/login | 密码登录 | 否 |
| GET | /auth/me | 当前用户 | 是 |
| POST | /trips | 创建行程（自动生成 days） | 是 |
| GET | /trips | 行程列表（sort/destination 筛选） | 是 |
| GET | /trips/:id | 行程详情（含 days+items） | 是 |
| PUT | /trips/:id | 更新行程（日期变更会重建 days） | 是 |
| DELETE | /trips/:id | 软删除行程（级联 days） | 是 |
| POST | /trips/:tripId/days/:dayId/items | 添加条目 | 是 |
| PATCH | /trips/:tripId/days/:dayId/items/reorder | 条目重排序 | 是 |
| PUT | /items/:id | 更新条目 | 是 |
| DELETE | /items/:id | 硬删除条目 | 是 |
| GET | /map/search?q=&city= | POI 搜索（高德代理） | 是 |
