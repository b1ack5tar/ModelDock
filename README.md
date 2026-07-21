# ModelDock

ModelDock（模型坞）是一个本地优先的多模型 AI 对话工作台。它在同一界面中管理 OpenAI、Anthropic、DeepSeek 以及采用 OpenAI Chat Completions 协议的模型服务。

## 功能

- 多提供商与多模型切换
- 流式生成、停止生成和重新生成
- 回复复制
- 图片、PDF、文本与代码文件附件，支持预览、移除和下载
- Markdown、表格与代码高亮
- 对话搜索、重命名与本地持久化
- 主题、系统提示词、Temperature 和输出 Token 配置
- 响应式界面，支持电脑端，并提供测试阶段的手机端适配
- 不包含 API Key 的 JSON 数据备份与恢复

> 移动端适配目前仍处于测试阶段，部分设备或浏览器可能存在软键盘、输入框定位等兼容性问题，建议现阶段优先在电脑端使用。

对话、设置和 API Key 按浏览器独立保存在 IndexedDB 中，不会自动同步到其他设备。清除浏览器数据可能导致本地数据丢失，建议定期导出备份。

API Key 仅持久化在当前浏览器中，但请求模型时会随当前提供商配置提交到同源的 `/api/chat` 代理，再由代理请求模型服务。请仅在可信设备和可信部署环境中使用；若部署到公网，应在应用前增加身份认证和访问控制。

## 本地运行

需要 Node.js 20.9 或更高版本。首次运行前安装依赖：

```bash
npm install
```

### 开发环境

启动带热更新的本地开发服务器：

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 使用应用。

### 生产环境

先创建生产构建，再启动生产服务器：

```bash
npm run build
npm run start
```

生产服务器默认同样运行在 [http://localhost:3000](http://localhost:3000)。

## 提供商配置

启动应用后，在“设置 → API 提供商”中填写对应的 API Key。内置提供商已预置常用模型，也可以添加 OpenAI Chat Completions 兼容的自定义提供商，并根据账户权限管理模型 ID 与最大输出 Token。

每条消息最多添加 4 个附件，单个文件最大 5 MB，附件总大小最大 8 MB；图片和 PDF 的实际支持情况取决于所选模型。

## 质量检查

提交代码前建议依次运行：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
