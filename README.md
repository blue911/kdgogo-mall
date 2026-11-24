# KDGOGO商城

KDGOGO 商城：数码与生活好物精选，支持多语言切换、分类筛选、关键词搜索、商品详情弹窗、图集轮播与购物车本地持久化。前台为原生 HTML / CSS / JavaScript，后台为 Cloudflare Pages Functions + D1 数据库，可在免费额度内运行。

## 功能特性

### 前台（index.html）
- **多语言**：12 种语言切换——中文、English、Русский、Español、العربية、Français、Português、Deutsch、Bahasa Indonesia、日本語、한국어、Türkçe；选择保存在浏览器 localStorage，阿拉伯语自动按 RTL 从右向左排版
- 商品展示：分类标签、评分、价格、原价划线、品牌 / 型号、库存与配送标识
- 分类筛选：分类按钮由后台已有商品**动态生成**，后台可直接填写新分类
- 关键词实时搜索；新品快捷筛选
- 商品详情弹窗：图集轮播（多图）、功能卖点、数量选择、加入购物车
- 购物车抽屉：数量增减、移除、合计金额，数据保存在浏览器 localStorage
- 响应式布局：桌面 / 平板 / 手机自适应
- 数据来源：优先从后端 API（`/api/products`）加载；API 不可用时自动回退到内置演示数据

### 下单与订单（checkout.html / payment.html / orders.html）
- 结算页：核对收货信息、配送方式与商品清单，提交生成订单号后进入收银台
- 支付页：选择支付方式（支付宝 / 微信 / 银行卡），倒计时，支付成功跳转成功页并清空购物车
- 订单查询：按订单号搜索、按状态筛选、物流进度时间线
- 订单数据保存在浏览器 localStorage，同一浏览器可走通「加购 → 结算 → 支付 → 查订单」闭环

> **关于支付：当前为模拟支付，不产生真实扣款。** 真实支付网关需商家资质、应用审核与服务端签名 / 回调验签。本版本流程与界面完整可走，仅不产生真实交易；接入真实支付时可由后端 Functions 完成签名与回调。

### 后台（admin.html）
- 管理员登录（密码验证，密码经环境变量配置）
- 商品管理：新增、编辑、删除、上下架、新品标签
- 商品字段：名称、分类、价格、品牌、型号 / 规格、原价（划线价）、库存数量、评分、排序权重、主图、图集、卖点、包邮 / 运费
- 库存状态：有货 / 库存紧张 / 缺货；缺货商品前台不可加购
- 图片快捷选择：点选现有商品图，或粘贴任意图片地址；图集每行一条
- 修改即时生效：保存后前台刷新即可看到变化

## 商品数据字段（D1：products）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER | 自增主键 |
| name | TEXT | 商品名称 |
| category | TEXT | 分类标识（后台填写，自动转 slug） |
| catName | TEXT | 分类展示名 |
| price | REAL | 售价 |
| original_price | REAL | 原价（划线价，0 表示不显示） |
| rating | REAL | 评分 0–5 |
| stock | INTEGER | 库存数量，0 为缺货 |
| brand | TEXT | 品牌 |
| model | TEXT | 型号 / 规格 |
| images | TEXT(JSON) | 图集 URL 数组，第一张为主图 |
| image | TEXT | 主图地址（图集第一张） |
| description | TEXT | 一句话描述 |
| feats | TEXT(JSON) | 卖点数组，每行一条 |
| free_shipping | INTEGER | 是否包邮 1/0 |
| shipping_fee | REAL | 运费（未包邮时生效） |
| sort | INTEGER | 排序权重，数字越小越靠前 |
| isNew | INTEGER | 新品标签 1/0 |
| on_sale | INTEGER | 上架状态 1/0 |

> 老数据库首次运行时会自动通过 `ALTER TABLE` 补齐新增列，无需手动迁移。

## 技术栈

- 前台：原生 HTML5 / CSS3 / JavaScript（无框架、无构建工具）
- 后端：Cloudflare Pages Functions（REST API）
- 数据库：Cloudflare D1（免费 SQLite 云数据库）
- 字体：Noto Serif SC / Noto Sans SC（自托管镜像）
- 商品图片：素材存放于 `assets/`

## 目录结构

```
kdgogo-mall/
├── index.html          # 前台商城页（多语言、购物车、分类动态渲染）
├── admin.html          # 后台管理页（登录后可用）
├── checkout.html       # 结算页
├── payment.html        # 支付页
├── orders.html         # 订单查询页
├── functions/          # Cloudflare Pages Functions 后端
│   ├── _lib.js         # 共享工具：鉴权、建表 / 迁移、字段标准化
│   └── api/
│       ├── login.js     # POST /api/login 管理员登录
│       ├── products.js # GET/POST /api/products 列表与新增
│       └── products/[id].js # GET/PUT/DELETE /api/products/:id
├── assets/             # 商品与主视觉图片
├── LICENSE
└── README.md
```

## API 一览

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| POST | /api/login | `{password}` → `{token}` | 无 |
| GET | /api/products | 商品列表（首次访问自动建表并写入默认商品） | 无 |
| POST | /api/products | 新增商品 | Bearer 密码 |
| GET | /api/products/:id | 单个商品 | 无 |
| PUT | /api/products/:id | 修改商品 | Bearer 密码 |
| DELETE | /api/products/:id | 删除商品 | Bearer 密码 |

写操作需请求头 `Authorization: Bearer <管理密码>`。默认管理密码为 `orange2026`，正式使用请在 Cloudflare 后台为项目添加环境变量 `ADMIN_PASSWORD` 覆盖。

## 本地运行

前台直接用浏览器打开 `index.html` 即可（无 API 时显示内置演示数据），也可以起一个静态服务：

```bash
python -m http.server 8080
# 访问 http://localhost:8080
```

后台与 API 依赖 Cloudflare D1，需部署后在线上使用。

## 部署到 Cloudflare Pages（免费）

1. 将本项目推送到 GitHub 仓库；
2. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages；
3. 选择 **Connect to Git**，授权并选择本仓库；
4. 构建设置：Framework preset 选 **None**，Build command 留空，Build output directory 填 `/`；
5. 点击 Deploy，完成后即可获得 `https://<项目名>.pages.dev` 的免费域名。

### 配置数据库（D1）

1. Cloudflare Dashboard → 左侧 **D1** → **Create database**，创建数据库；
2. 进入 Workers & Pages → 点击本项目 → **Settings** → **Functions** → **D1 database bindings**；
3. 点 **Add binding**，变量名填 `DB`，选择刚创建的数据库，保存；
4. 保存后 Cloudflare 会自动重新部署，第一次访问前台时自动建表并写入默认商品。

### 配置管理密码（环境变量）

项目 → **Settings** → **Variables and secrets** → Production 环境添加：

| 变量名 | 类型 | 说明 |
|---|---|---|
| `ADMIN_PASSWORD` | Secret（加密） | 后台登录密码；留空会回退到默认密码 `orange2026` |

保存变量后需触发一次新部署（重新推送或 Retry deployment）才会在运行时生效。

后台访问路径：`https://<项目名>.pages.dev/admin.html`
