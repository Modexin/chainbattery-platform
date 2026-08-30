# 链池溯源 - 新能源汽车动力电池全生命周期可信溯源平台

## 项目简介

为每一块新能源汽车动力电池建立不可篡改的"数字履历"，实现从生产、装车、使用、维修，到梯次利用、报废回收的全生命周期可信追踪。

## 技术架构

### 五层架构

1. **用户应用层** - 企业后台 / 用户查询 / 监管大屏
2. **业务服务层** - Express REST API / 电池管理 / 查询 / 数据分析 / 异常检测 / 权限管理
3. **区块链服务层** - 智能合约 / DID / 数据存证 / 生命周期事件 / 权限控制
4. **数据存储层** - SQLite数据库 / IPFS / 文件存储
5. **数据采集层** - 企业系统 / 检测设备 / IoT

### 技术栈

| 层级 | 技术选型 |
|------|---------|
| 区块链 | Solidity + Hardhat |
| 智能合约交互 | ethers.js |
| 前端 | HTML + CSS + JavaScript + ECharts |
| 后端 | Node.js + Express |
| 数据库 | SQLite (better-sqlite3) |
| 文件存储 | IPFS / 本地文件存储 |

## 核心智能合约 (11个)

| 合约 | 功能 |
|------|------|
| BatteryRegistry | 电池身份登记 - 注册、查询、状态更新、车辆绑定 |
| LifecycleRecord | 生命周期记录 - 事件上链、Hash存证、数据验证 |
| RoleManager | 权限管理 - 企业注册、角色分配、权限验证 |
| BatteryTransfer | 责任转移 - 主体变更、转移记录、责任链追溯 |
| AnomalyDetector | 异常检测 - SOH异常波动、循环次数倒退、时间冲突自动检测 |
| HealthDataStore | 健康数据存储 - SOH/SOC/温度/电压记录、故障标志、衰减率计算 |
| RecycleTracker | 回收追踪 - 回收流程状态机、阶段记录、材料回收结果 |
| MaintenanceTracker | 维护保养追踪 - 维护记录上链、成本追踪、保养到期提醒 |
| CarbonCredit | 碳减排追踪 - 梯次利用/材料回收/维修延寿碳减排记录与统计 |
| CertificateRegistry | 证书登记 - 数字证书签发、验证、撤销、有效期管理 |
| CascadeManager | 梯次利用管理 - 退役评估、场景分配、状态机推进、终止管理 |

## 后端API

| 接口 | 方法 | 说明 |
|------|------|------|
| /api/stats | GET | 平台统计数据 |
| /api/stats/status-dist | GET | 电池状态分布 |
| /api/stats/type-dist | GET | 电池类型分布 |
| /api/stats/lifecycle-trend | GET | 生命周期事件趋势 |
| /api/stats/recycling-trend | GET | 回收完成率趋势 |
| /api/stats/enterprise-dist | GET | 企业类型分布 |
| /api/stats/region-dist | GET | 地区分布 |
| /api/batteries | GET | 获取所有电池 |
| /api/batteries/:id | GET | 获取电池详情 (含事件/SOH/转移记录) |
| /api/batteries | POST | 注册新电池 (写入数据库+模拟上链) |
| /api/batteries/:id/status | PUT | 更新电池状态 |
| /api/batteries/:id/soh | PUT | 更新SOH (同时写入SOH历史) |
| /api/events/:batteryId | GET | 获取生命周期事件 |
| /api/events | POST | 添加生命周期事件 (上链) |
| /api/events/verify | POST | 验证事件Hash |
| /api/anomalies | GET | 获取所有异常 |
| /api/anomalies | POST | 创建异常 |
| /api/anomalies/:id/status | PUT | 更新异常状态 |
| /api/recycling | GET | 获取回收任务 |
| /api/recycling | POST | 创建回收任务 |
| /api/recycling/:id/advance | PUT | 推进回收流程 |
| /api/enterprises | GET/POST | 企业列表/注册 |
| /api/enterprises/:id/verify | PUT | 认证企业 |
| /api/transactions | GET | 链上交易记录 |
| /api/contracts | GET | 合约信息 |
| /api/roles | GET | 角色定义 |
| /api/search | GET | 高级搜索电池 (关键词/状态/类型/SOH/日期) |
| /api/search/filters | GET | 获取筛选选项 |
| /api/batteries/:id/prediction | GET | 电池健康预测 (线性回归预测剩余寿命) |
| /api/maintenance | GET/POST | 维护记录列表/添加维护记录(上链) |
| /api/maintenance/:id | PUT | 更新维护记录 |
| /api/maintenance/upcoming | GET | 即将到期保养提醒 |
| /api/carbon | GET/POST | 碳减排记录列表/添加碳减排记录(上链) |
| /api/carbon/stats | GET | 碳减排统计 (总量/类型/趋势/等效植树) |
| /api/audit | GET/POST | 审计日志列表/手动添加 |
| /api/audit/stats | GET | 审计统计 (操作类型/人员/目标分布) |
| /api/certificates | GET/POST | 证书列表/签发证书(上链) |
| /api/certificates/:id/revoke | PUT | 撤销证书 |
| /api/certificates/verify/:certNumber | GET | 验证证书有效性 |
| /api/export/:type | GET | 数据导出 (支持csv/json, 8种数据类型) |
| /api/alerts | GET | 预警中心 - 聚合异常/保养到期/SOH/证书到期预警 |
| /api/alerts/summary | GET | 预警统计摘要 |
| /api/cascade | GET/POST | 梯次利用记录列表/创建(上链) |
| /api/cascade/stats | GET | 梯次利用统计 |
| /api/cascade/:id/advance | PUT | 推进梯次利用流程 |
| /api/cascade/:id | PUT | 更新梯次利用记录 |
| /api/reports/traceability/:batteryId | GET | 生成溯源报告 |
| /api/reports/health/:batteryId | GET | 生成健康报告 (含智能建议) |
| /api/reports/recycling/:batteryId | GET | 生成回收报告 |
| /api/reports/carbon | GET | 生成碳减排报告 |
| /api/import/batteries | POST | 批量导入电池数据(CSV/JSON) |
| /api/import/template | GET | 获取导入模板 |
| /api/import/logs | GET | 导入历史记录 |

## 数据库表结构

| 表名 | 说明 |
|------|------|
| batteries | 电池基础信息 |
| lifecycle_events | 生命周期事件 |
| soh_history | SOH健康历史 |
| transfer_records | 责任转移记录 |
| enterprises | 企业信息 |
| anomalies | 异常告警 |
| recycling_tasks | 回收任务 |
| transactions | 链上交易记录 |
| maintenance_records | 维护保养记录 (含成本、下次保养日期) |
| carbon_records | 碳减排记录 (梯次利用/回收/维修延寿) |
| audit_logs | 审计日志 (全链路操作追踪) |
| certificates | 数字证书 (合格证/维修证/回收证明等) |
| cascade_utilization | 梯次利用记录 (评估/安装/运行/完成全流程) |
| notifications | 系统通知 (预警/提醒/消息) |
| import_logs | 数据导入日志 (批量导入记录追踪) |

## 十六大功能模块

1. **电池数字身份** - 一电池一身份，永久数字ID
2. **生命周期事件上链** - 链上摘要 + 链下数据，防篡改
3. **电池健康数字档案** - SOH趋势、健康度追踪
4. **电池健康预测** - 基于线性回归的SOH衰减预测、退役时间估算
5. **高级搜索与筛选** - 多维度电池搜索 (关键词/状态/类型/SOH/日期/排序)
6. **维护保养管理** - 维护记录上链、成本追踪、保养到期提醒
7. **碳减排追踪** - 梯次利用/材料回收/维修延寿碳减排统计与可视化
8. **电池对比分析** - 多电池多维度对比 (SOH/SOC/循环/信任分/年限)
9. **数字证书管理** - 证书签发、验证、撤销、上链存证
10. **全链路审计日志** - 所有写操作自动记录、可视化分析
11. **数据导出** - 支持8种数据类型的CSV/JSON导出
12. **预警中心** - 聚合异常告警、保养到期、SOH预警、证书到期，按严重级别分类展示
13. **梯次利用管理** - 退役电池评估、梯次场景分配(储能/通信/低速车等)、状态机推进
14. **报告中心** - 生成溯源报告、健康报告(含智能建议)、回收报告、碳减排报告
15. **数据批量导入** - CSV/JSON格式批量导入电池数据，含导入日志和错误追踪
16. **系统通知** - 全系统预警通知，支持分类筛选和已读管理

## 目录结构

```
src/                        # 前端
  index.html                # 主页面入口
  css/style.css             # 全局样式
  js/
    api.js                  # API客户端
    app.js                  # 主应用逻辑
  contracts/                # 智能合约
    BatteryRegistry.sol
    LifecycleRecord.sol
    RoleManager.sol
    BatteryTransfer.sol
    AnomalyDetector.sol
    HealthDataStore.sol
    RecycleTracker.sol
    MaintenanceTracker.sol  # 维护追踪
    CarbonCredit.sol       # 碳减排追踪
    CertificateRegistry.sol # 证书登记
    CascadeManager.sol     # 梯次利用管理
    hardhat.config.js

backend/                    # 后端
  server.js                 # Express服务器
  package.json
  db/
    init.js                 # 数据库初始化 (15张表)
    seed.js                 # 种子数据
    conn.js                 # 数据库连接
    chainbattery.db         # SQLite数据库文件
  routes/
    batteries.js            # 电池API (含健康预测)
    events.js              # 事件API
    anomalies.js           # 异常API
    recycling.js           # 回收API
    enterprises.js         # 企业API
    transactions.js        # 交易API
    stats.js               # 统计API
    search.js              # 高级搜索API
    maintenance.js         # 维护管理API
    carbon.js              # 碳减排API
    audit.js               # 审计日志API
    certificates.js        # 证书管理API
    export.js              # 数据导出API
    alerts.js              # 预警中心API
    cascade.js             # 梯次利用管理API
    reports.js             # 报告生成API
    import.js              # 数据导入API
```

## 快速开始

### 1. 启动后端服务

```bash
cd backend
npm install                # 安装依赖
node db/init.js            # 初始化数据库
node db/seed.js            # 写入种子数据
node server.js             # 启动服务 (http://localhost:3000)
```

### 2. 访问前端

浏览器打开 http://localhost:3000 即可使用完整平台。

后端同时提供静态文件服务，前端页面和API在同一端口。

### 3. 智能合约部署 (可选)

```bash
cd src/contracts
npm install
npx hardhat compile
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

## 可交互操作

| 操作 | 说明 |
|------|------|
| 电池注册 | 填写表单 -> 上链登记 -> 数据写入SQLite + 生成交易Hash |
| 添加生命周期事件 | 选择事件类型 -> 提交上链 -> 写入数据库 + 交易记录 |
| 推进回收流程 | 点击推进按钮 -> 状态更新 -> 电池状态同步 -> 交易记录 |
| 处理异常 | 开始处理 / 标记已处理 -> 状态更新 |
| 认证企业 | 点击认证 -> 企业状态更新 |
| 更新SOH | 输入SOH值 -> 写入SOH历史 -> 更新电池 |
| 高级搜索 | 多维度筛选 -> 实时搜索 -> 导出结果 |
| 健康预测 | 点击加载 -> 线性回归分析 -> 预测图表展示 |
| 添加维护记录 | 填写维护信息 -> 上链存证 -> 交易记录 + 审计日志 |
| 添加碳减排记录 | 填写减排数据 -> 上链存证 -> 交易记录 + 审计日志 |
| 电池对比 | 选择多块电池 -> 多维度对比表格 + 图表 |
| 签发证书 | 填写证书信息 -> 上链存证 -> 生成数字凭证 |
| 验证证书 | 输入证书编号 -> 链上验证 -> 显示有效性 |
| 撤销证书 | 点击撤销 -> 状态更新 -> 审计日志 |
| 数据导出 | 选择数据类型 -> 导出CSV/JSON -> 自动审计 |
| 查看预警 | 打开预警中心 -> 查看聚合预警 -> 按级别/分类筛选 -> 跳转处理 |
| 创建梯次利用 | 输入电池ID和场景 -> 上链存证 -> 推进流程状态 |
| 生成报告 | 选择报告类型 -> 输入电池ID -> 生成详细报告 -> 导出JSON |
| 批量导入 | 输入CSV/JSON数据 -> 执行导入 -> 查看导入结果和错误日志 |

## 创新点

1. **一电池一身份** - 实物电池到数字身份的全程绑定
2. **跨企业可信数据链** - 多方共同维护的可信账本
3. **生命周期责任链** - 追踪"当时由谁负责"
4. **链上存证 + 智能异常检测** - 存证 + 分析 + 预警三位一体
5. **11大智能合约** - 覆盖注册、记录、权限、转移、异常、健康、回收、维护、碳减排、证书、梯次利用全流程
6. **电池健康预测** - 基于SOH历史数据的线性回归预测，估算退役时间和剩余循环次数
7. **碳减排量化追踪** - 将梯次利用、材料回收、维修延寿的碳减排效益量化上链
8. **全链路审计日志** - 所有写操作自动记录审计日志，支持可视化分析
9. **数据导出能力** - 支持8种数据类型的CSV/JSON导出，满足监管报告需求
10. **真实数据库** - SQLite存储所有业务数据，支持增删改查
11. **预警中心** - 聚合4类预警源，按严重级别智能分级，支持分类筛选和处理跳转
12. **智能报告生成** - 自动生成溯源/健康/回收/碳减排报告，健康报告含智能维护建议
13. **梯次利用全流程** - 评估到完成的完整状态机管理，覆盖储能/通信/低速车等场景
14. **批量数据导入** - 支持CSV/JSON批量导入，自动校验、错误追踪和导入日志

## 隐私与安全

- 公开数据上链：BatteryID、型号、状态、时间戳、Hash
- 企业敏感数据：链下存储 + Hash上链
- 用户隐私：匿名账户，不上链个人信息
- RBAC权限管理：不同角色只能提交对应类型数据
