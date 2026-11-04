# Mone — 项目开发规划

> Lightweight Uptime Monitoring

Mone 是一个轻量级、可自托管的服务可用性监控平台。用户无需在被监控服务器上安装任何 Agent，即可通过公网对 HTTP 和 TCP 服务进行定时探测，并通过 Web Dashboard 管理监控项、查看可用性数据和接收故障通知。

## 1. 项目目标

### 1.1 核心目标

Mone 的设计目标是提供一个轻量、简单、低成本的外部服务监控系统。

核心原则：

- **External Monitoring**：从外部探测目标服务，不需要在目标服务器上安装 Agent。
- **Lightweight**：尽量减少基础设施依赖，不引入复杂的后端服务。
- **Web Dashboard**：通过 Web 界面管理监控项、查看运行状态和历史记录。
- **Self-hostable**：支持部署到用户自己的平台和账号中。
- **Low Cost**：优先利用免费托管服务，控制运行和存储成本。

### 1.2 技术栈

| 模块 | 技术方案 | 说明 |
|---|---|---|
| 前端框架 | Cormi | 使用自研的 Cormi 全栈前端框架 |
| UI 框架 | Vue 3 | 使用 Cormi 的 Vue 集成 |
| 开发语言 | TypeScript | 前后端共享类型定义 |
| 样式方案 | Tailwind CSS | 自定义组件与页面样式 |
| 数据库 | Supabase PostgreSQL | 保存监控配置、探测记录和故障事件 |
| 身份认证 | Supabase Auth | 管理后台用户认证 |
| 后端执行 | Supabase Edge Functions | 执行监控探测和通知任务 |
| 定时调度 | Supabase Cron | 定时触发监控任务 |
| 前端部署 | Vercel | 托管静态前端 |
| 通知渠道 | Telegram / Discord | 发送故障和恢复通知 |

### 1.3 部署架构

项目尽量使用托管服务，避免自行维护服务器。

```text
                         ┌──────────────────────┐
                         │      User Browser    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Vercel Hosting    │
                         │   Cormi + Vue SPA    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Supabase Auth     │
                         │    PostgreSQL        │
                         └──────────┬───────────┘
                                    │
                                    │ Supabase Cron
                                    ▼
                         ┌──────────────────────┐
                         │  Edge Function       │
                         │  run-due-checks      │
                         └──────────┬───────────┘
                                    │
                        ┌───────────┼───────────┐
                        ▼           ▼           ▼
                     HTTP(S)         TCP
                        │           │           │
                        └───────────┼───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  PostgreSQL          │
                         │  Check Results       │
                         │  Incidents           │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Notification Service │
                         │ Telegram / Discord   │
                         └──────────────────────┘
```

前端只负责用户交互和数据展示。监控任务由 Supabase 后端定时执行，探测结果写入 PostgreSQL，前端通过 Supabase SDK 读取数据。

不需要启动独立的 Node.js 服务，也不依赖 Vercel Functions 或 Vercel Cron。

## 2. 功能规划

### 2.1 监控类型

Mone 第一阶段支持三种监控类型。

#### HTTP / HTTPS Monitoring

通过 HTTP 请求检测目标服务是否正常响应。

配置项：

| 配置项 | 说明 |
|---|---|
| Name | 监控名称 |
| URL | 目标 URL |
| Method | GET、POST、HEAD 等 |
| Headers | 自定义请求头 |
| Request Body | 请求体，可选 |
| Expected Status | 预期 HTTP 状态码或状态码范围 |
| Timeout | 请求超时时间 |
| Interval | 检查间隔 |
| Retry Count | 连续失败阈值 |

后续可以扩展：

- 响应正文关键字匹配。
- JSON 响应字段断言。
- 自定义健康检查规则。
- HTTP 重定向检查策略。

HTTP 检查不仅应该判断是否返回 200，还应允许用户验证业务健康状态。例如通过 `/health` 接口检查应用依赖是否正常。

#### TCP Monitoring

通过 TCP 连接检测目标主机和端口是否可连接。

配置项：

| 配置项 | 说明 |
|---|---|
| Name | 监控名称 |
| Host | 目标主机名或 IP |
| Port | 目标端口 |
| Timeout | 连接超时时间 |
| Interval | 检查间隔 |

需要明确：TCP 检查成功仅代表 TCP 连接建立，不代表目标应用的业务逻辑正常。

#### SSL / TLS Monitoring（已移除）

> 2026-11-04 决策：SSL 证书监控不再实现，Mone 的监控类型收敛为 HTTP 与 TCP。

原因：Supabase Edge Functions 的运行时读不到证书有效期。实测结论——

- `node:tls` 可用且 TLS 握手成功，但 `getPeerCertificate()` 只返回 `subject` 与 `subjectaltname`，
  没有 `validTo` / `validFrom`，也没有 `raw` DER 可供自行解析；`getX509Certificate` 与
  `getPeerX509Certificate` 都不存在。
- `Deno.startTls` 握手成功，但 `handshake().peerCertificate` 是空对象。

到期告警是 SSL Monitor 的核心价值。缺少有效期后它退化成一次 TCP 连通性检查，与已有的
TCP Monitor 重复，因此整体下线，而不是保留一个残缺版本。

如果将来需要证书监控，应把探测执行层换到能完整读取 X.509 的运行环境（例如自建 Deno/Node
worker），而不是继续在 Edge Functions 里尝试。

### 2.2 Dashboard

Dashboard 是用户登录后的首页。

主要内容：

**Overview**

展示当前监控系统整体状态：

- Total Monitors：监控总数。
- Operational：正常运行数量。
- Down：故障数量。
- Paused：已暂停数量。
- Overall Uptime：整体可用性。

**Monitor List**

展示所有监控项：

| 字段 | 说明 |
|---|---|
| Name | 监控名称 |
| Type | HTTP / TCP |
| Status | 当前状态 |
| Response Time | 最近响应时间 |
| Uptime | 最近一段时间的可用率 |
| Last Check | 上次检查时间 |

支持：

- 新建监控。
- 编辑监控。
- 删除监控。
- 暂停和恢复监控。
- 按状态、类型筛选。

**Recent Incidents**

展示近期故障事件：

- 故障发生时间。
- 故障恢复时间。
- 故障持续时间。
- 故障原因。
- 关联监控项。

### 2.3 Monitor Detail

每个监控项拥有独立的详情页面。

主要内容：

**Current Status**

显示当前状态、最近一次检查时间和响应时间。

**Uptime Statistics**

提供不同时间范围的可用率：

- Last 24 Hours
- Last 7 Days
- Last 30 Days
- Last 90 Days（后续扩展）

**Response Time**

通过折线图展示响应时间变化趋势。

**Heartbeat History**

通过时间轴展示每一次检查结果，使用不同状态区分成功和失败。

**Incidents**

展示关联的故障历史。

（原 SSL Monitor 的证书信息区块已随监控类型一起移除。）

### 2.4 Monitor Management

提供统一的监控管理功能。

基础操作：

- Create Monitor
- Edit Monitor
- Delete Monitor
- Pause Monitor
- Resume Monitor
- Test Monitor

新增监控时，根据监控类型动态展示不同配置表单。

### 2.5 Notification

MVP 阶段先支持 Telegram 和 Discord。

通知场景：

- 监控连续失败，进入故障状态。
- 服务恢复正常。


通知配置：

| 配置项 | 说明 |
|---|---|
| Channel Type | Telegram / Discord |
| Name | 通知渠道名称 |
| Configuration | Bot Token、Chat ID 或 Webhook URL |
| Enabled | 是否启用 |

需要提供 Test Notification 功能，供用户确认通知渠道配置正确。

通知策略应避免单次短暂失败就触发告警。可以通过连续失败阈值、恢复确认和事件状态控制通知频率。

### 2.6 Status Page（后续功能）

MVP 完成后，可以增加公开状态页。

支持：

- 创建公开状态页。
- 选择需要展示的监控项。
- 展示当前服务状态。
- 展示历史可用率。
- 展示最近故障事件。

状态页不需要登录即可访问。

## 3. 数据库设计

数据库使用 Supabase PostgreSQL。

第一阶段主要涉及以下表：

```text
monitors
check_results
incidents
notification_channels
notification_deliveries
```

### 3.1 monitors

保存监控项配置。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | TEXT | 监控名称 |
| type | TEXT | http / tcp |
| config | JSONB | 不同类型的监控配置 |
| status | TEXT | active / paused |
| current_state | TEXT | up / down / pending |
| interval_seconds | INTEGER | 检查间隔 |
| failure_threshold | INTEGER | 连续失败阈值 |
| success_threshold | INTEGER | 恢复确认阈值 |
| next_check_at | TIMESTAMPTZ | 下一次检查时间 |
| last_check_at | TIMESTAMPTZ | 最近检查时间 |
| lease_until | TIMESTAMPTZ | 任务租约过期时间 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

`config` 根据监控类型存储不同配置。例如：

HTTP：

```json
{
  "url": "https://example.com/health",
  "method": "GET",
  "headers": {},
  "timeout_ms": 10000,
  "expected_status_codes": [200]
}
```

TCP：

```json
{
  "host": "example.com",
  "port": 443,
  "timeout_ms": 5000
}
```

敏感配置不能直接以明文形式暴露给前端。后续如果需要保存认证头、请求体密钥或其他秘密信息，应独立设计加密存储和受控读取机制。

### 3.2 check_results

保存每次监控检查的结果。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | BIGINT | 主键 |
| monitor_id | UUID | 关联监控项 |
| status | TEXT | up / down |
| response_time_ms | INTEGER | 响应时间 |
| status_code | INTEGER | HTTP 状态码，可为空 |
| error_message | TEXT | 失败原因 |
| checked_at | TIMESTAMPTZ | 检查时间 |
| metadata | JSONB | 响应字节数等扩展信息 |

注意：

- 不保存完整 HTTP 响应正文。
- `metadata` 仅保存必要的检查信息。
- 高频写入的数据需要进行保留周期管理。

### 3.3 incidents

保存服务故障事件。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| monitor_id | UUID | 关联监控项 |
| status | TEXT | ongoing / resolved |
| cause | TEXT | 故障原因 |
| started_at | TIMESTAMPTZ | 故障发生时间 |
| resolved_at | TIMESTAMPTZ | 恢复时间 |
| duration_seconds | BIGINT | 故障持续时间 |

当监控连续失败达到阈值时创建 Incident；连续成功达到恢复阈值后将 Incident 标记为 resolved。

需要通过数据库事务或原子操作避免并发任务重复创建同一监控项的故障事件。

### 3.4 notification_channels

保存通知渠道配置。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| name | TEXT | 渠道名称 |
| type | TEXT | telegram / discord |
| config | JSONB | 渠道配置 |
| enabled | BOOLEAN | 是否启用 |
| created_at | TIMESTAMPTZ | 创建时间 |

敏感字段应采用安全存储方案，不能通过普通查询直接返回给客户端。

### 3.5 notification_deliveries

记录通知发送情况，便于失败重试和排查。

| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| incident_id | UUID | 关联故障事件 |
| channel_id | UUID | 关联通知渠道 |
| event_type | TEXT | down / recovered |
| status | TEXT | pending / sent / failed |
| attempts | INTEGER | 尝试次数 |
| last_error | TEXT | 最近一次失败原因 |
| sent_at | TIMESTAMPTZ | 发送成功时间 |
| created_at | TIMESTAMPTZ | 创建时间 |

## 4. 后端任务设计

### 4.1 定时任务

使用 Supabase Cron 每分钟触发一次统一的任务入口：

```text
run-due-checks
```

不为每个监控项单独创建 Cron 任务。

每次执行时：

1. 查询已经到达 `next_check_at` 的监控项。
2. 领取一批到期任务。
3. 执行对应的 HTTP 或 TCP 检查。
4. 保存检查结果。
5. 更新监控项状态和下一次检查时间。
6. 根据状态变化创建或恢复 Incident。
7. 将待发送通知写入通知队列。

需要通过数据库事务、行锁或 `FOR UPDATE SKIP LOCKED` 实现并发任务领取，并使用 `lease_until` 处理执行超时后遗留的任务。

任务领取和状态更新应尽量保持原子性，避免多个 Edge Function 实例重复探测同一个监控项。

### 4.2 批量执行

不能为每个监控项分别调用一次 Edge Function。

推荐采用批量调度：

```text
Supabase Cron
     │
     ▼
run-due-checks
     │
     ▼
Claim Due Monitors
     │
     ▼
Run Checks (bounded concurrency)
     │
     ▼
Save Results
     │
     ▼
Update Monitor States
```

通过限制单次领取数量和并发探测数量，避免一次任务运行时间过长。

### 4.3 检查结果处理

每次检查得到的结果主要包括：

```typescript
interface CheckResult {
  status: 'up' | 'down'
  responseTimeMs: number | null
  statusCode?: number
  errorMessage?: string
  checkedAt: string
  metadata?: Record<string, unknown>
}
```

状态判断应基于连续失败和连续成功次数，而不是简单地将每一次失败都立即认定为服务故障。

### 4.4 通知任务

通知与探测任务应解耦。

探测任务负责产生通知事件，通知任务负责发送消息：

```text
Monitor Check
     │
     ▼
Incident State Changed
     │
     ▼
Create Notification Delivery
     │
     ▼
send-notifications
     │
     ├── Telegram
     │
     └── Discord
```

通知失败时保留失败记录，并根据重试策略重新发送。

## 5. 前端项目结构

前端使用 Cormi + Vue 3 + TypeScript。

推荐目录结构：

```text
mone/
├── cormi.yml
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── tsconfig.json
│
├── src/
│   ├── app.ts
│   │
│   ├── pages/
│   │   ├── index.vue
│   │   ├── login.vue
│   │   ├── monitors/
│   │   │   ├── index.vue
│   │   │   ├── create.vue
│   │   │   └── [id].vue
│   │   ├── incidents.vue
│   │   └── settings/
│   │       ├── index.vue
│   │       └── notifications.vue
│   │
│   ├── layouts/
│   │   └── index.vue
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── dashboard/
│   │   ├── monitors/
│   │   ├── incidents/
│   │   └── charts/
│   │
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useMonitors.ts
│   │   ├── useIncidents.ts
│   │   └── useNotifications.ts
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── monitors.ts
│   │   ├── incidents.ts
│   │   └── notifications.ts
│   │
│   ├── types/
│   │   ├── monitor.ts
│   │   ├── incident.ts
│   │   └── notification.ts
│   │
│   └── styles/
│       └── main.css
│
└── supabase/
    ├── config.toml
    ├── migrations/
    └── functions/
        ├── run-due-checks/
        ├── send-notifications/
        └── _shared/
            ├── monitor-engine/
            │   ├── http.ts
            │   ├── tcp.ts
            └── notifications/
                ├── telegram.ts
                └── discord.ts
```

目录结构可以根据项目实际开发情况调整，不必在第一阶段提前拆分过多抽象层。

### 5.1 Cormi 配置

项目使用 Cormi 的 Vue 集成，构建为纯客户端 SPA。

`cormi.yml` 可以采用如下配置方向：

```yaml
- name: '@cormijs/preset'
  config:
    title: Mone
    ssr: false
    history: browser

- name: '@cormijs/vite'

- name: '@cormijs/vue'

- name: '@cormijs/plugin-tailwindcss'
```

具体配置以当前安装版本的 Cormi 文档和示例为准。

注意：

- 不启用 SSR。
- 不使用 Cormi API Routes 处理业务请求。
- 不依赖服务端 Loader。
- 前端通过 `@supabase/supabase-js` 访问 Supabase。
- 自行实现 Vue composables 和数据访问层。

Cormi 当前版本处于 RC 阶段，建议锁定依赖版本并提交 lockfile，避免框架升级导致构建行为变化。

## 6. 安全设计

虽然 Mone 初期主要用于个人监控，但依然需要处理一些基础安全问题。

### 6.1 SSRF 防护

这是监控系统最重要的安全边界之一。

用户能够配置目标 URL、Hostname 和 Port，因此监控服务可能被利用访问内部网络。

必须阻止：

- localhost。
- RFC1918 私有 IPv4 地址。
- IPv6 本地和链路本地地址。
- 云平台 Metadata 地址。
- 其他非公网、特殊用途地址。

还需要处理：

- DNS 解析结果校验。
- DNS Rebinding 防护。
- HTTP Redirect 每一跳重新校验。
- 限制可访问协议。
- 合理限制端口范围。
- 请求超时和响应体大小限制。

不能只在用户提交监控配置时检查一次 URL。实际执行探测时仍必须进行目标地址校验。

### 6.2 Supabase 权限

- 使用 Supabase Auth 管理后台用户。
- 对涉及用户数据的表启用 RLS。
- 普通客户端只能访问授权范围内的数据。
- `service_role` Key 只能存在于受控后端环境。
- Edge Function 的内部任务入口必须进行身份认证。
- 通知渠道中的敏感信息不应直接暴露给前端。

初期如果仅由一个用户使用，也建议从一开始就保留 `user_id` 字段，减少未来扩展多用户时的迁移成本。

### 6.3 API 与资源限制

- 限制单次探测超时时间。
- 限制同时执行的探测数量。
- 限制 HTTP 响应体读取大小。
- 避免无限制重试。
- 对通知发送增加重试上限。
- 避免保存不必要的响应正文和敏感请求信息。

## 7. 存储与数据保留策略

监控数据属于高频写入数据，需要提前考虑 PostgreSQL 存储容量。

例如，20 个监控项每分钟检查一次：

```text
20 × 60 × 24 × 30 = 864,000
```

每月约产生 86.4 万条检查记录。

因此不建议无限期保存每一次原始探测记录。

初期策略：

| 数据类型 | 保留策略 |
|---|---|
| 原始 Check Results | 保留 7～14 天 |
| Incident | 长期保留 |
| Monitor 配置 | 长期保留 |
| Notification Logs | 保留有限期限 |
| 聚合统计数据 | 长期保留 |

后续可以增加小时级和日级统计表，将历史检查数据聚合后删除原始记录。

这样可以在保留长期可用率趋势的同时控制数据库容量。

## 8. 开发阶段规划

采用分阶段迭代方式，优先验证基础设施的可行性，然后逐步完成 UI、监控引擎和通知系统。

### Phase 0：技术验证

目标：确认核心技术路线可行，避免在错误的架构上投入大量开发时间。

任务：

- 初始化 Cormi + Vue 项目。
- 验证 Vercel 静态部署。
- 创建 Supabase 项目。
- 验证 Supabase Auth。
- 验证前端读写 PostgreSQL。
- 编写最小版 HTTP 探测函数。
- 验证 Supabase Edge Function 的出站网络行为。
- 验证 TCP 连接能力。

**特别注意 TCP 的技术风险。**

Supabase Edge Functions 基于 Deno Runtime，不能仅凭本地 Node.js 测试成功就认定托管环境也支持原始 TCP/TLS 操作。

需要单独进行集成验证：

- `Deno.connect()` 是否能连接公网目标端口。
- TLS 握手是否能够正常完成。
- 运行环境是否对出站网络或端口有额外限制。

若 TCP 无法在 Supabase Edge Functions 中可靠运行，应在正式开发前调整探测执行层，而不是将不确定性留到项目后期。

实测结果（2026-11-04）：`Deno.connect()` 可连接公网端口，`node:tls` 与 `Deno.startTls` 都能完成 TLS 握手；但两者都读不到证书有效期，因此 SSL 证书监控被移除（见 2.1）。

阶段验收：

- Cormi 项目可以正常构建。
- 前端能够部署到 Vercel。
- Supabase Auth 和数据库访问正常。
- HTTP 探测运行成功。
- TCP 是否可行已经得到实际验证，或明确替代执行方案。

### Phase 1：基础 UI

目标：完成 Dashboard 的主要页面和交互。

任务：

- 创建应用整体布局。
- 完成侧边栏导航。
- 完成 Dashboard 页面。
- 完成 Monitor List。
- 完成 Monitor Detail。
- 完成 Create / Edit Monitor 表单。
- 完成 Incident 页面。
- 完成 Settings 页面。
- 接入 Mock 数据。

这一阶段优先完成 UI 结构和交互，不急于接入真实监控任务。

阶段验收：

- 页面路由完整。
- Dashboard 能够展示监控概览。
- 能够通过表单创建、编辑和删除模拟监控项。
- 详情页能够展示统计图表和检查历史。
- 整体布局和基础交互稳定。

### Phase 2：监控管理与数据库

目标：从 Mock 数据切换到 Supabase 真实数据。

任务：

- 创建 PostgreSQL Schema。
- 编写数据库 Migration。
- 配置 RLS。
- 接入 Supabase Auth。
- 实现 Monitor CRUD。
- 实现 Monitor Pause / Resume。
- 实现不同类型的监控配置表单。
- 完成用户数据隔离。

阶段验收：

- 用户可以登录管理后台。
- 可以创建、编辑和删除监控项。
- 刷新页面后数据依然存在。
- 不同用户之间的数据互相隔离。

### Phase 3：监控引擎

目标：完成真实的 HTTP 与 TCP 检查。

任务：

- 实现 HTTP Probe。
- 实现 TCP Probe。

- 实现统一的 Monitor Engine 接口。
- 实现超时控制。
- 实现错误处理。
- 实现批量任务领取。
- 实现定时调度。
- 实现结果写入。
- 实现 Monitor State 更新。
- 实现 Incident 创建和恢复。

建议统一探测接口：

```typescript
interface MonitorEngine {
  check(monitor: Monitor): Promise<CheckResult>
}
```

不同类型的探测器实现独立逻辑：

```text
Monitor Engine
    │
    ├── HTTP Probe
    │
    ├── TCP Probe
    │

```

阶段验收：

- 能够按照配置间隔自动执行检查。
- 能够正确保存检查结果。
- 能够识别服务故障。
- 能够识别服务恢复。
- 不会因为并发调度重复执行同一批任务。
- 能够处理任务超时和异常中断。

### Phase 4：统计与通知

目标：让监控结果真正具备可用性分析和故障通知能力。

任务：

- 计算 24 小时可用率。
- 计算 7 天、30 天可用率。
- 统计平均响应时间。
- 实现响应时间趋势图。
- 实现 Heartbeat History。
- 实现 Incident History。
- 实现 Telegram 通知。
- 实现 Discord 通知。
- 实现通知渠道测试。
- 实现通知失败重试。

阶段验收：

- Dashboard 能展示真实监控统计。
- 监控故障能够触发通知。
- 服务恢复能够触发通知。
- 通知失败可以记录和重试。


### Phase 5：数据维护与发布

目标：完善生产环境运行能力。

任务：

- 实现原始检查记录清理任务。
- 实现历史数据聚合。
- 实现任务失败恢复。
- 完成数据库索引优化。
- 完成部署环境变量配置。
- 配置 Vercel 部署。
- 配置 Supabase Cron。
- 完成生产环境测试。
- 编写项目部署文档。

阶段验收：

- 项目可以从全新环境完成部署。
- 定时监控能够持续运行。
- 历史数据不会无限增长。
- 任务失败后能够恢复。
- 用户可以独立完成基础配置和监控管理。

### Phase 6：扩展功能（可选）

MVP 稳定后再考虑：

- Public Status Page。
- 多监控分组。
- 多通知渠道。
- 更多通知服务。
- 自定义 HTTP 断言。
- 更多时间范围的可用率统计。
- 多地区探测。
- 多用户和团队管理。
- 导入和导出监控配置。

## 9. 部署方案

### 9.1 Frontend

使用 Vercel 托管前端静态资源。

构建产物：

```text
dist/
```

使用 Vercel 默认域名：

```text
https://mone.vercel.app
```

不要求绑定自定义域名，也不需要迁移 DNS 或修改 NS 记录。

由于前端使用 Browser History，需要配置 SPA fallback，将未知页面路径重写到 `index.html`。具体重写规则根据最终构建产物和 Vercel 配置验证。

### 9.2 Backend

使用 Supabase 提供：

- PostgreSQL。
- Auth。
- Edge Functions。
- Cron。

不单独部署传统后端服务器。

Cron 每分钟触发统一监控入口，具体批量大小和并发度应根据实际执行时间和平台限制调整。

### 9.3 Environment Variables

前端：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

后端：

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

其他通知配置按安全存储方案维护。

注意：`service_role` Key 不允许使用 `VITE_` 前缀，也不能进入前端构建产物。

## 10. 关键风险与注意事项

| 风险 | 说明 | 处理方式 |
|---|---|---|
| TCP 出站限制 | Edge Runtime 可能限制原始 TCP 连接 | Phase 0 优先验证 |
| SSL 证书读取 | 运行时读不到证书有效期 | 已实测确认不可行，SSL 监控移除 |
| SSRF | 用户可能配置内网或特殊 IP 作为目标 | DNS、IP、Redirect 多层校验 |
| 数据库容量 | 高频检查会产生大量记录 | 原始数据清理和历史聚合 |
| Cron 并发 | 上一次任务未结束时下一次任务可能启动 | 锁、租约和批量领取 |
| 通知重复 | 状态变化和通知重试可能导致重复消息 | Incident 状态机和通知记录 |
| Cormi 版本变化 | 当前框架版本可能处于 RC 阶段 | 锁定依赖版本并进行构建验证 |

### 10.1 监控平台自身的可用性

Mone 的监控能力依赖其自身部署平台。如果 Supabase 或相关服务发生故障，Mone 也可能无法及时执行探测或发送通知。

因此不能将 Mone 自身作为唯一的监控保障。实际使用时，可以额外配置一个独立的外部服务，对 Mone 的任务执行状态或 Dashboard 进行监控。

## 11. MVP 验收标准

第一版正式发布前，至少需要满足以下条件：

- [ ] 用户能够登录 Dashboard。
- [ ] 用户能够创建 HTTP 监控。
- [ ] 用户能够创建 TCP 监控。

- [ ] 用户能够编辑、删除和暂停监控。
- [ ] 监控任务能够按照配置的间隔自动执行。
- [ ] 检查结果能够持久化保存。
- [ ] Dashboard 能够展示当前运行状态。
- [ ] 能够查看响应时间和历史可用率。
- [ ] 能够记录故障事件。
- [ ] 服务恢复后能够更新故障事件状态。
- [ ] Telegram 通知能够正常工作。
- [ ] Discord 通知能够正常工作。

- [ ] 具备基础的 SSRF 防护。
- [ ] 具备数据库访问权限控制。
- [ ] 具备检查记录清理机制。
- [ ] 能够部署到 Vercel + Supabase。

## 12. 项目开发原则

Mone 第一阶段以个人使用和基础监控能力为核心，不需要过早引入复杂的功能和架构。

开发过程中遵循以下原则：

1. **优先完成核心闭环**：从创建监控项，到定时探测、保存结果、展示状态和发送通知，先打通完整流程。
2. **保持架构轻量**：优先使用 Supabase 提供的托管能力，不引入不必要的独立服务。
3. **提前验证技术风险**：尤其是 TCP 与 TLS 探测，必须先验证运行环境能力。
4. **做好数据生命周期管理**：监控数据会持续增长，不能忽略数据库容量。
5. **保证安全边界**：监控系统天然具有访问用户指定目标的能力，必须重视 SSRF 和凭据保护。
6. **避免过度设计**：单用户 MVP 不需要一开始就实现团队权限、复杂告警策略和多地区监控。

最终目标是交付一个可以长期稳定运行、部署简单、维护成本低的轻量级外部监控平台。

---

**Mone — Lightweight Uptime Monitoring**

Monitor your services externally with HTTP and TCP checks. Track availability, detect incidents, and receive notifications without installing agents on your servers.
