# arch-web

把以 Proto JSON 与 Mermaid 维护的架构数据渲染为静态站点，支持架构图、示意图与迁移路线三类页面，均为可选，每张架构图、每组示意图或每条路线占一个标签页，数量与命名由数据决定：

- 自动计算嵌套分层布局，服务调用决定上下次序；
- 示意图页以 Mermaid 绘制时序、状态、流程等机制图与折线、饼图等图表，配色跟随站点主题；
- 划分了领域的图提供领域总览与领域视图，跨领域连线按领域对合并；
- 支持搜索、按仓库或要点高亮、组件与连线详情、迁移阶段与组件互相跳转，以及 PNG 导出。

前端与数据分离：各系统在自己的仓库中维护数据，构建时传入。[example](example) 是一套完整的示例数据。

## 数据

数据目录下每个一级子目录是一个页面，根目录的每个 JSON 文件是一条迁移路线，数量均不限、可为零。直接含 `*.mmd`
的目录是示意图页，其余目录是架构图；迁移路线连接任意两张架构图：

| 路径 | 模型 | 内容 |
| --- | --- | --- |
| `<目录>/**/*.json` | `arch.v1.Architecture` 片段 | 架构图，目录名为其 ID |
| `<目录>/*.mmd`、`<目录>/*.json` | Mermaid、`arch.v1.Explainer` | 示意图页：每个 `.mmd` 是一张图，唯一的 JSON 清单声明标题、导语与各图的标题、说明和顺序 |
| `<ID>.json` | `arch.v1.Migration` | 迁移路线，`baseline` 与 `target` 声明起点和终点架构图的目录名 |

迁移路线与页面目录不能重名。

一张架构图可拆成任意多个片段，便于按领域分文件维护和评审。片段按路径顺序以
[Protobuf 合并语义](https://protobuf.com/docs/language-spec#merging-protobuf-messages)合成：列表字段依次追加，
`title` 与 `baseline` 只能由一个片段声明；节点、连线与要点的引用在合成后整体校验，可以跨片段。
[example](example) 含三张架构图、一个示意图页与一条迁移路线：`current/` 是单个片段；`target/` 按领域拆分，`architecture.json`
放标题、仓库、领域目录、未归属领域的节点及其发起的连线，`domains/<领域>.json` 放领域内的节点、由本领域节点发起的
连线与领域内要点，`notes.json` 放跨领域要点；`order-flow/` 不在迁移路线中；`order-lifecycle/` 是含时序图、状态图与折线图的
示意图页；`migration.json` 从 `current` 迁移到 `target`。

`proto/arch/v1/architecture.proto` 定义架构图：

- `Node` 经 `parent` 嵌套为集群、命名空间与分组；叶子节点为运行组件、配置制品或外部系统；
- `Edge` 由发起方指向被访问方，分为服务调用、异步事件、设备南向与配置加载四类；
- `change` 标记相对迁移起点新增或改造的组件；
- `tier` 约束顶层节点的纵向分层：北向外部系统不设置，集群等内部节点从 1 开始，南向外部系统取更大的值；
  嵌套节点仍按连线自动分层；
- `Domain` 是职责归属与视图单元，`Node.domain` 声明在节点或容器上并由后代继承；每个内部叶子节点
  恰好归属一个领域，外部系统可按场景归属；`category` 把领域分为核心（生产必需）、可选（按需部署）与研发（非生产）；
  `expanded: true` 将共享部署等领域展示为容纳具体组件的范围；
- `Note` 是架构要点，引用其涉及的节点；
- `repository` 与 `source` 按仓库地址生成 GitHub 或 GitLab 源码链接；规划中的仓库没有地址。

`proto/arch/v1/migration.proto` 定义迁移路线：声明起点与终点架构图，阶段按顺序声明交付的终点节点、下线的起点节点、
目标与完成标准。终点图中每个新增或改造的叶子节点恰好交付一次，起点图中不再存在于终点的叶子节点恰好下线一次。

`proto/arch/v1/explainer.proto` 定义示意图页：`Figure.source` 引用同目录的 `.mmd` 文件，每个文件恰好被引用一次，
去掉扩展名后作为 URL 定位用的图 ID。图的源码遵循 [Mermaid 语法](https://mermaid.js.org/intro/syntax-reference.html)，
GitHub 与 GitLab 也能直接预览。

数据按 Proto JSON 映射严格解析：未知字段、非法枚举、悬空引用、容器环路、空容器、指向容器的连线、
未归属、嵌套声明或缺少分类的领域，重复声明标题或基线的片段，迁移路线引用不存在的起点或终点，迁移阶段的漏排、
重排或排入未改动节点，以及示意图清单缺失、重复、引用不存在或遗漏源文件都会使加载失败，片段的解析错误带文件路径。
`src/model/diagrams.test.ts` 对所选数据的每张图做通用校验：图标已注册、组件与制品标注仓库、每个叶子节点都有连线、
要点有说明、划分领域的图每个领域视图不超过 30 个叶子节点；每条迁移路线的终点图中起点没有的组件须带变更标记。
`src/model/explainer.test.ts` 用 Mermaid 解析所选数据的每张示意图，语法错误在构建前暴露。
数据目录中的 `*.test.ts` 随单元测试运行，可经 `@/model` 为数据集编写专项断言，
见 [example/example.test.ts](example/example.test.ts)。

图标取自 `src/lib/icons.ts` 的注册表：上游品牌资源（[来源记录](src/assets/brands/README.md)）、Simple Icons 与 Lucide。

## 视图

布局按服务调用关系排列：服务调用与设备南向按条数加权，调用方排在被调用方之上，异步事件与配置加载不参与定向；
总览按 `tier` 分区，领域视图以本领域为中轴，调用它的相邻领域与外部系统在上，被它调用的在下。

领域总览按分类框入核心、可选与研发领域，顶层外部系统按 `tier` 框入北向与南向。
领域默认折叠为方框；`expanded` 领域在总览中以范围框包住具体组件，在相邻视图保留实际关联组件及其部署容器。
领域视图展开该领域及其所在集群与命名空间，相邻领域折叠为方框并保留全部组件的最近公共容器；
跨部署根的领域保持独立，连向同一方框的同类连线合并。
合并连线的详情列出原始连线；搜索、要点与仓库中的组件不在当前视图时，自动切换到其所在领域。

示意图页按清单顺序排列各图，配色取自站点主题的颜色变量，图表的数据系列依次使用主色、信息、成功、紫、警示等颜色；
Mermaid 只在打开示意图页时加载。

标签名取自各页面的 `title`。顺序为：迁移路线按 ID 排序，每条连同其起点与终点依次在前，其余页面按目录名排在后面。
详情面板只为迁移路线中的图显示迁移阶段，图同时是多条路线的端点时优先取以它为终点的路线。
URL hash（`#<图 ID>`、`#<图 ID>/<领域 ID>`、`#<迁移路线 ID>`、`#<迁移路线 ID>/<阶段号>`、`#<示意图页 ID>/<图 ID>`）
直达页面、领域、阶段或示意图。

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
- Mermaid 渲染示意图，按需加载；
- Proto 定义数据模型，buf 与 protobuf-es 在构建时生成 TypeScript 类型，生成物不入库；
- Biome 负责格式化与静态检查，Vitest 负责单元测试（Mermaid 语法校验运行在 jsdom 中），Playwright 负责冒烟测试。

## 代码导航

| 路径 | 职责 |
| --- | --- |
| `proto/arch/v1` | 架构图、示意图页与迁移路线的数据模型 |
| `src/model` | 模型解析、索引、完整性校验、领域视图投影与总览分组 |
| `src/layout` | 按调用关系的 ELK 布局约束、分层布局与贝塞尔连线路由 |
| `src/graph` | React Flow 元素生成、聚焦与搜索高亮 |
| `src/components` | 画布、迁移路线、示意图页、节点、详情面板、要点与仓库面板、工具栏 |
| `src/hooks` | 布局缓存、视口操作、页面与页内定位路由、主题 |
| `src/lib` | 图标表、PNG 导出与 Mermaid 渲染 |
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
