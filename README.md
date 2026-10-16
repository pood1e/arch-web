# arch-web

把以 Proto JSON 维护的架构数据渲染为静态站点，包含现状架构、迁移路线和目标架构三个标签页：

- 自动计算嵌套分层布局，服务调用决定上下次序；
- 划分了领域的图提供领域总览与领域视图，跨领域连线按领域对合并；
- 支持搜索、按仓库或要点高亮、组件与连线详情、迁移阶段与组件互相跳转，以及 PNG 导出。

前端与数据分离：各系统在自己的仓库中维护数据，构建时传入。[example](example) 是一套完整的示例数据。

## 数据

数据目录包含两张架构图的目录与一份迁移路线：

| 路径 | 模型 | 内容 |
| --- | --- | --- |
| `current/**/*.json` | `arch.v1.Architecture` 片段 | 现状架构 |
| `target/**/*.json` | `arch.v1.Architecture` 片段 | 目标架构 |
| `migration.json` | `arch.v1.Migration` | 从现状到目标的迁移阶段 |

一张架构图可拆成任意多个片段，便于按领域分文件维护和评审。片段按路径顺序以
[Protobuf 合并语义](https://protobuf.com/docs/language-spec#merging-protobuf-messages)合成：列表字段依次追加，
`title` 与 `baseline` 只能由一个片段声明；节点、连线与要点的引用在合成后整体校验，可以跨片段。
[example](example) 的现状架构是单个片段，目标架构按领域拆分：`architecture.json` 放标题、仓库、领域目录、
未归属领域的节点及其发起的连线，`domains/<领域>.json` 放领域内的节点、由本领域节点发起的连线与领域内要点，
`notes.json` 放跨领域要点。

`proto/arch/v1/architecture.proto` 定义架构图：

- `Node` 经 `parent` 嵌套为集群、命名空间与分组；叶子节点为运行组件、配置制品或外部系统；
- `Edge` 由发起方指向被访问方，分为服务调用、异步事件、设备南向与配置加载四类；
- `change` 标记相对现状新增或改造的组件；
- `tier` 约束顶层节点的纵向分层：北向外部系统不设置，集群等内部节点从 1 开始，南向外部系统取更大的值；
  嵌套节点仍按连线自动分层；
- `Domain` 是职责归属与视图单元，`Node.domain` 声明在节点或容器上并由后代继承；每个内部叶子节点
  恰好归属一个领域，外部系统可按场景归属；`category` 把领域分为核心（生产必需）、可选（按需部署）与研发（非生产）；
- `Note` 是架构要点，引用其涉及的节点；
- `repository` 与 `source` 生成 GitLab 源码链接；规划中的仓库没有地址。

`proto/arch/v1/migration.proto` 定义迁移路线：阶段按顺序声明交付的目标节点、下线的现状节点、目标与完成标准。
每个新增或改造的目标叶子节点恰好交付一次，每个目标图中不再存在的现状叶子节点恰好下线一次。

数据按 Proto JSON 映射严格解析：未知字段、非法枚举、悬空引用、容器环路、空容器、指向容器的连线、
未归属、嵌套声明或缺少分类的领域，重复声明标题或基线的片段，以及迁移阶段的漏排、重排或排入未改动节点
都会使加载失败，片段的解析错误带文件路径。
`src/model/diagrams.test.ts` 对所选数据做通用校验：图标已注册、组件与制品标注仓库、每个叶子节点都有连线、
要点有说明、目标图中现状没有的组件带变更标记、每个领域视图不超过 30 个叶子节点。
数据目录中的 `*.test.ts` 随单元测试运行，可经 `@/model` 为数据集编写专项断言，
见 [example/example.test.ts](example/example.test.ts)。

图标取自 `src/lib/icons.ts` 的注册表：上游品牌资源（[来源记录](src/assets/brands/README.md)）、Simple Icons 与 Lucide。

## 视图

布局按服务调用关系排列：服务调用与设备南向按条数加权，调用方排在被调用方之上，异步事件与配置加载不参与定向；
总览按 `tier` 分区，领域视图以本领域为中轴，调用它的相邻领域与外部系统在上，被它调用的在下。

领域总览把每个领域折叠为方框，按分类框入核心、可选与研发领域，顶层外部系统按 `tier` 框入北向与南向；
领域视图展开该领域及其所在集群与命名空间，相邻领域折叠为方框并保留全部组件的最近公共容器；
跨部署根的领域保持独立，连向同一方框的同类连线合并。
合并连线的详情列出原始连线；搜索、要点与仓库中的组件不在当前视图时，自动切换到其所在领域。

URL hash（`#current`、`#migration`、`#migration/<阶段号>`、`#target`、`#target/<领域 ID>`）直达页面、阶段或领域。

## 构建站点

镜像构建经 `data` 构建上下文传入数据目录，先运行单元测试再构建，由非 root Nginx 在 8080 端口提供静态文件，
`/healthz` 用于健康检查。固定到本仓库的某个提交构建：

```bash
docker buildx build --build-context data=docs/architecture --tag architecture \
  "https://github.com/pood1e/arch-web.git#<提交>"
```

也可以用 Bake 声明：

```hcl
target "architecture" {
  context  = "https://github.com/pood1e/arch-web.git#<提交>"
  contexts = { data = "docs/architecture" }
}
```

本地预览其他数据：`ARCH_DATA=<数据目录> npm run dev`。

## 技术栈

- React 19、TypeScript 7、Vite 8、Tailwind CSS 4；
- React Flow 渲染画布，ELK layered 算法在 Web Worker 中计算嵌套容器与跨层级连线的布局；
- Proto 定义数据模型，buf 与 protobuf-es 在构建时生成 TypeScript 类型，生成物不入库；
- Biome 负责格式化与静态检查，Vitest 负责单元测试，Playwright 负责冒烟测试。

## 代码导航

| 路径 | 职责 |
| --- | --- |
| `proto/arch/v1` | 架构图与迁移路线的数据模型 |
| `src/model` | 模型解析、索引、完整性校验、领域视图投影与总览分组 |
| `src/layout` | 按调用关系的 ELK 布局约束、分层布局与贝塞尔连线路由 |
| `src/graph` | React Flow 元素生成、聚焦与搜索高亮 |
| `src/components` | 画布、迁移路线、节点、详情面板、要点与仓库面板、工具栏 |
| `src/hooks` | 布局缓存、视口操作、架构图与领域路由、主题 |
| `src/lib` | 图标表与 PNG 导出 |
| `example` | 示例数据，也是开发、测试与默认构建的数据 |
| `e2e` | 基于示例数据的冒烟测试 |

## 开发

```bash
npm ci
npm run dev        # 本地开发服务
npm run lint       # buf lint 与 Biome
npm run typecheck
npm test           # 单元测试
npm run test:e2e   # Playwright 冒烟测试，需要本机 Chromium
npm run build
```

## 许可证

[MIT](LICENSE)。`src/assets/brands` 中的上游品牌资源不在此列，许可与商标规则见[来源记录](src/assets/brands/README.md)。
