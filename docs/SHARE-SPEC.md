# 分享功能 Spec（行程海报 + 只读分享卡片）

> 后端**已上线**（2026-10-12 生产验证）。本 spec 只覆盖小程序端开发。
> 参考实现：主仓库 [travel-planner](https://github.com/ShadowsHunter/travel-planner) commit `e60f8f9` 的 `apps/mp/` 目录（可对照，勿直接抄目录结构——本仓库根目录即 `src/`）。

## 1. 后端契约（已完成，勿改）

| 接口 | 说明 |
|---|---|
| `POST /trips/:id/share` | 需登录。返回 `{ token: uuid }`。幂等：已有 token 则复用 |
| `GET /trips/shared/:token` | **免登录**。404 = 分享不存在或已失效 |

`GET /trips/shared/:token` 响应（白名单字段，无 userId/nickname/phone）：

```json
{
  "id": "uuid", "title": "海南度假", "destination": "三亚",
  "days": [{ "dayNumber": 1, "date": "2026-08-01",
    "items": [{ "type": "sight", "name": "蜈支洲岛", "address": "海棠湾", "time": "09:00", "notes": null, "sortOrder": 0 }] }]
}
```

## 2. 前端改动清单

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/api/trip.ts` | 增量 | `shareTrip(id)` / `getSharedTrip(token)` + `SharedTrip` 类型 |
| `src/pages.json` | 增量 | 注册 `pages/trip-view/index`，标题"行程分享" |
| `src/pages/trip-view/index.vue` | 新建 | 只读分享页 |
| `src/pages/trips/detail/index.vue` | 修改 | 工具栏加「海报」「分享」按钮 + 海报 canvas + onShareAppMessage |
| `src/utils/poster.ts` | 新建 | 海报布局纯函数（不依赖 uni，可单测） |
| `src/utils/__tests__/poster.spec.ts` | 新建 | 海报单测 |
| `src/api/__tests__/trip.spec.ts` | 新建 | 分享 API 单测 |
| `package.json` + `vitest.config.ts` | 增量 | `test: vitest run`，devDeps 加 vitest |

## 3. 行为规格

### 3.1 只读页 trip-view
- `onLoad(options)`：无 `token` → 显示"分享链接无效"；请求 404 → "分享不存在或已失效"
- 渲染：标题 + 📍目的地 + 📅日期范围 → 按 day 分节（`Day N · M/D`）→ 条目卡片
- 条目图标映射：sight📍 food🍜 hotel🏨 transport🚌 other📌
- 空天显示"暂无安排"；底部"— 旅行规划 · 分享行程 —"
- **红线：无任何编辑/删除入口，无互动组件**

### 3.2 detail 页
- 工具栏右侧加两个按钮：「海报」（tap → generatePoster）、「分享」（`<button open-type="share">`，绿色系 #E8F5E9/#2E7D32；海报按钮 #FFF3EE/#F27649）
- `loadTrip` 成功后异步预取 `shareToken`（静默失败，不阻塞页面）
- `onShareAppMessage()`：`{ title: trip.title, path: shareToken ? '/pages/trip-view/index?token=' + shareToken : '/pages/trips/index' }`（无 token 降级到列表页）
- 海报：隐藏 canvas（`type="2d"`，`position:fixed; left:-9999px`）→ `buildPosterLayout` → `uni.createCanvasContext('posterCanvas', getCurrentInstance()?.proxy)` → `ctx.draw` → 300ms 后 `canvasToTempFilePath` → `saveImageToPhotosAlbum`，toast 结果

### 3.3 poster.ts（纯函数）
- `textWidth(str)`：中文/全角=2，半角=1
- `wrapText(str, maxWidth)`：按半角宽折行
- `buildPosterLayout(input)`：固定宽 750；高度 = 头部 + Σ(每天：日期条 + 每条目一行×折行系数 + 空天占位)；输出 `{ width, height, ops[] }`（fillRect/text 绘制指令序列），`coverColor` 用于头部底色
- 空天输出"暂无安排"文本指令

## 4. 验收标准

- [ ] `pnpm test` 全绿（poster: wrapText 折行/textWidth/buildPosterLayout 高度增长+空天+coverColor；trip API: 断言 POST/GET 端点）
- [ ] `pnpm build:mp-weixin` 编译通过
- [ ] 真机：详情页「分享」→ 好友点卡片 → 打开只读页正常展示
- [ ] 真机：「海报」→ 保存到相册成功
- [ ] 抓包确认：只读页请求响应**不含** userId/nickname/phone
- [ ] pages.json 无多余页面注册

## 5. 合规红线（个人主体）

- 只读分享，不做点赞/评论/关注等任何社交互动
- 经营描述（工具-日历）暂不改；后续如平台问询，分享属于"用户主动展示个人内容给指定好友"，非公开访问
