
<h1 align="center">多功能 Markdown 编辑器</h1>

<div align="center">

[![status](https://img.shields.io/github/actions/workflow/status/doocs/md/deploy.yml?style=flat-square&labelColor=564341&color=42cc23)](https://github.com/doocs/md/actions) [![node](https://img.shields.io/badge/node-%3E%3D20-42cc23?style=flat-square&labelColor=564341)](https://nodejs.org/en/about/previous-releases) [![pr](https://img.shields.io/badge/prs-welcome-42cc23?style=flat-square&labelColor=564341)](https://github.com/doocs/md/pulls) [![stars](https://img.shields.io/github/stars/doocs/md?style=flat-square&labelColor=564341&color=42cc23)](https://github.com/doocs/md/stargazers) [![forks](https://img.shields.io/github/forks/doocs/md?style=flat-square&labelColor=564341&color=42cc23)](https://github.com/doocs/md)<br> [![release](https://img.shields.io/github/v/release/doocs/md?style=flat-square&labelColor=564341&color=42cc23)](https://github.com/doocs/md/releases) [![npm](https://img.shields.io/npm/v/@doocs/md-cli?style=flat-square&labelColor=564341&color=42cc23)](https://www.npmjs.com/package/@doocs/md-cli) [![docker](https://img.shields.io/badge/docker-latest-42cc23?style=flat-square&labelColor=564341)](https://hub.docker.com/r/doocs/md)

</div>

## 项目介绍

Docs<sup style="color:red">+</sup>  forked from [Doocs](https://github.com/doocs/md)。应用内及[这里](https://docs.auiapps.top)有完整的语法介绍和渲染效果展示。对比 Doocs，Doc<sup style="color:red">+</sup> 增加/删改了如下内容。



#### 特点
1. 项目完全自依赖，运行时不需要外部资源。可以保持完全离线使用。
2. 追求多端统一的样式效果：html、pdf（借助 pagedjs）、微信公众号、知乎文章等。
3. 已打包 macos 和 windows 的桌面应用，安装即用。同时自带了**本地图床服务**和**微信图床代理服务**。请到 [release](https://github.com/iniself/md/releases/) 下载。
4. 也可以 git clone 本仓库后按照 [Doocs](https://github.com/doocs/md?tab=readme-ov-file#%E5%A6%82%E4%BD%95%E5%BC%80%E5%8F%91%E5%92%8C%E9%83%A8%E7%BD%B2) 介绍自行构建 Web App。但是微信图床代理服务需要自己搭建。

#### 增加

1. 优化多种格式的统一表现。适配了微信、知乎、HTML 等多种场景。同时兼顾了各特点：比如知乎有卡片样式链接，对锚点支持也较好但知乎排版限制较多；微信虽不支持这些，但是有更丰富的文本效果；而 HTML 不受任何影响，需要保持 markdown 渲染后的完整样式。
2. 注释和链接。
     * 微信：脚注 `[^1]`会展示在注释区，而链接`[]()`会展示在链接区。
     * 知乎的脚注和链接功能会遵循知乎排版展示。同时`[[](https://)]` 语法复制到知乎后会展示为知乎卡片链接。 快捷键：`Command + Option + K`
     * HTML 展示不受任何功能限制。
3. 对于加粗、斜体、代码、标题、列表这些基本 markdown 元素，微信、HTML 表现一致；知乎对 HTML 的渲染有自己的固定的要求，所以主题和配色对于知乎都失效，但基本 markdown 渲染效果还是在的。
4. 支持更多对文字样式的设置。 `=white:theme:12 文字内容...=` 这样的语法会渲染出白色文字，主题色背景，`12px` 大小的一段文字。注意微信和 HTML 支持，知乎不支持。快捷键：`Command + J`。
5. 增加波浪下划线，样式跟随主题色。微信和 HTML支持，知乎不支持。快捷键：`Command + U`。
6. 增加上标下标语法。`Docs^red:+^` 上标语法，颜色设置成`theme`可以跟随主题色`Docs^+^`不设置颜色。`H~red:2~O^`下标语法，颜色同上标。微信和 HTML支持，知乎不支持。快捷键：`Command + Option + P` 和 `Command + Option + B`。
7. 增加 Admonition：
`abstract/attention/bug/caution/danger/error/example/failure/hint/info/note/question/quote/success/tip/warning`。微信和 HTML 支持，知乎不支持。快捷键：`Command + Option + A`。
8. 删除线随主题色改变，同时加粗。
9. 增加对纯英文的格式支持。
10. 增加了配置图片 `width`、`height`、`object-fit` 的语法。比如下面分别会设置图片为宽度 `200px` 高度 `300px` object-fit `cover`；和宽度为 `50%` object-fit `contain`
      ```
      <!-- 单位为 px -->
    https://example.com/image.png =200x300 @cover

    <!-- 单位为 % -->
    https://example.com/image.png =50% @cotain

      ```
11.  表格语法扩展。支持合并单元格等操作。详见[这里](https://docs.auiapps.top)
12.  `mermaid` 支持设置图形大小、居中和标题。
13.  增加配置：
      * 提供隐藏不必要功能的选项：AI助手、AI工具箱、发布按钮。
      * 样式类配置：段落对齐方式、表头文字是否居中。
14.  增加 `gitee` 图床支持。
15.  增加本地图床服务
16.  直接粘贴 excel 表格会自动转化为 markdown 表格，同时支持 Docs<sup style="color:red">+</sup> 扩展表格语法。也就是支持合并单元格等。 

#### 删减
1. 删除 google analytics
2. 外部依赖全部本地化。


#### 修复问题
1. 引用外部样式文件时导出成 `HTML` 和复制到微信时会丢失样式。
2. 列表恢复成浏览器默认标签。否则会导致复制到知乎等地方时出现重复列表符号。
3. 引用里段落间不能空行问题。
4. 导出 `HTML` 和复制 `HTML` 样式效果不一致
5. 样式表现和语义逻辑矛盾，比如 H1 和 H2 一样大
6. 更多略
#### 其他
1. “大纲”从预览页面移动到左侧文件列表处切换显示。保证预览页面的清爽干净。
2. 统一链接在新标签中打开。桌面应用中的链接也统一采用系统浏览器打开。


#### TODO
* 渲染引擎和 mdbook 结合

### 联系

加我微信聊天: **Aui_Team**
