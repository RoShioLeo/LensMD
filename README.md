# LensMD

LensMD 是为 Halo 维护的 Markdown 编辑器，基于 [halo-sigs/plugin-bytemd v1.10.0](https://github.com/halo-sigs/plugin-bytemd/tree/v1.10.0)，通过 ByteMD 的扩展接口支持 Typora / GitHub 常用语法。

需要 **Halo >= 2.26.0**。插件标识为 `lensmd`，显示名称为 **LensMD**。完整保留原项目 GPL-3.0 许可和原有贡献者署名，详见 [LICENSE](LICENSE) 和 [NOTICE.md](NOTICE.md)。

## 支持的语法

| 功能                                   | 写法                                                                      | 说明                                      |
| -------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| 提示框                                 | `> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]` | 标记单独占一行，正文继续使用引文语法      |
| 高亮                                   | `==高亮内容==`                                                            | 支持内部加粗、链接等行内格式              |
| 上标 / 下标                            | `x^2^`、`H~2~O`                                                           | 兼容 Typora 常用写法                      |
| Emoji                                  | `:smile:`、`:+1:`                                                         | GitHub Emoji 短代码                       |
| 文内目录                               | 独立一行的 `[TOC]` 或 `[toc]`                                             | 使用实际标题 ID，兼容自定义 ID 和重复标题 |
| 表格、任务列表、删除线、脚注、自动链接 | GFM 写法                                                                  | 继承原插件支持，删除线使用 `~~文字~~`     |
| 数学公式、Mermaid、标题自定义 ID       | 原插件写法                                                                | 公式显示仍按上游要求配合 KaTeX 插件       |

编辑器预览和保存 HTML 使用相同的扩展和清理配置，主题页面共享提示框样式。Markdown 源文保留。代码、转义字符、普通引文和未知提示类型保持原有含义。

```markdown
> [!TIP]
> 可以在 Typora 写好后粘贴 Markdown 源码。
>
> - 支持 **加粗**、链接、列表和代码块。

==重要内容==，H~~2~~O，x^2^，:smile:
```

## 从官方 ByteMD 迁移

1. 保留数据库备份、官方插件 JAR 和需要沿用的插件设置。
2. 暂停编辑，停用官方 **ByteMD**，安装并启用 **LensMD**。
3. 检查旧文章展示，打开旧文章验证原文、预览与保存，再验证五种提示框。
4. 验收通过后卸载官方 ByteMD，刷新浏览器使前端插件重新加载。

LensMD 保留 `rawType: markdown` 及内部编辑器键 `bytemd`。旧文章的 `content.halo.run/preferred-editor: bytemd` 因而仍能找到编辑器，文章与历史快照保持原位。正式使用时仅启用 LensMD，避免两个插件注册同一个编辑器键。

LensMD 的设置独立保存；需要 Vim 键映射时，在新插件设置中重新选择。独立的插件标识和移除的官方应用市场标记可避免 ByteMD 官方更新覆盖自维护版。

既有文章通常已保存为 HTML。安装会提供显示样式；过去被当作普通文字保存的扩展语法，需要打开相应文章重新保存 / 发布，才会生成新 HTML。迁移不批量改写文章。

单个 `~内容~` 在上游 ByteMD 中可被当作非标准删除线，LensMD 将其解释为下标。旧文若用该写法表示删除线，应在重新保存前改成 `~~内容~~`。回归检查应特别检查这个差异。

Wiki 链接、图片路径、引用文献及本地文件嵌入需要对应的网站资源或路由，Typora 本地文件名不会自动变成博客链接。

## 本地构建

使用 JDK 21、Node.js 24 和 pnpm 12.16.1：

```bash
cd console
pnpm install --frozen-lockfile
pnpm check
cd ..
./gradlew build
```

Windows 使用 `gradlew.bat build`。JAR 输出到 `build/libs/`。构建收集生产依赖的许可声明及随包提供的 LICENSE / NOTICE 文件，与原 GPL 许可及修改说明一起打包。

## 同步上游

稳定版本保存在 `main`，开发使用 `dev/` 分支。`upstream` 指向 `halo-sigs/plugin-bytemd`，`origin` 指向 LensMD：

```bash
git fetch upstream --tags
git switch -c dev/sync-upstream main
git merge <已核实的上游版本标签>
```

解决变更后运行全部检查，复查插件标识、许可文件和迁移约定，再合并到 `main` 并发布 LensMD 自己的版本。GitHub Actions 构建每次变更；创建 `lensmd-v*` 标签（例如 `lensmd-v1.0.0`）时发布 JAR，发布源码与安装包保持同一标签。独立的标签前缀保留上游历史标签，避免版本名冲突。
