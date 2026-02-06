# POE Provider 使用指南

POE provider 已成功集成到 baoyu-image-gen skill 中。

## ⚠️ 重要提示

POE API 需要通过代理访问。在使用前请确保：
1. 已配置代理服务器
2. 设置了代理环境变量

## 配置

### 1. 获取 POE API Key

访问 [POE API](https://poe.com/api) 获取你的 API key。

### 2. 设置环境变量

在 `~/.baoyu-skills/.env` 或项目的 `.baoyu-skills/.env` 中添加：

```bash
POE_API_KEY=your_poe_api_key_here
POE_IMAGE_MODEL=nano-banana-pro  # 可选，默认值
POE_BASE_URL=https://api.poe.com/v1  # 可选，默认值
```

或者直接在终端中导出：

```bash
export POE_API_KEY=your_poe_api_key_here
```

### 3. 配置代理（必需）

POE API 需要通过代理访问：

```bash
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
```

请根据你的代理配置调整端口号。

## 使用示例

### 基础用法

```bash
# 设置代理
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897

# 生成图片
npx -y bun scripts/main.ts \
  --prompt "19世纪东京繁忙的街道，日本浮世绘风格" \
  --image output.png \
  --provider poe
```

### 指定宽高比

```bash
npx -y bun scripts/main.ts \
  --prompt "A beautiful landscape" \
  --image landscape.png \
  --provider poe \
  --ar 16:9
```

### 高质量生成

```bash
npx -y bun scripts/main.ts \
  --prompt "A cute cat" \
  --image cat.png \
  --provider poe \
  --quality 2k
```

### 自定义模型

```bash
npx -y bun scripts/main.ts \
  --prompt "A futuristic city" \
  --image city.png \
  --provider poe \
  --model your-custom-model
```

## 测试

运行测试脚本验证 POE provider 是否正常工作：

```bash
cd skills/baoyu-image-gen
./test-poe.sh
```

测试脚本会生成三张测试图片：
- `test-poe-basic.png` - 基础生成测试
- `test-poe-16x9.png` - 宽高比测试
- `test-poe-hq.png` - 高质量测试

## 响应格式调试

POE provider 实现了灵活的响应解析，支持多种可能的响应格式：

1. Google Gemini 风格的 `candidates` 格式
2. OpenAI 风格的 `data` 数组格式
3. 直接的 `output_image` 字段
4. `output_text` 中的 URL
5. 其他常见格式

首次运行时，控制台会打印完整的 API 响应结构：

```
POE API Response structure: {
  // 完整的响应 JSON
}
```

如果遇到 "No image data found in POE response" 错误，请查看控制台输出的响应结构，然后根据实际格式调整 `providers/poe.ts` 中的 `extractImageData()` 函数。

## 支持的功能

✅ 文本到图片生成
✅ 自定义宽高比
✅ 质量设置
✅ 自定义尺寸
✅ 自动重试（失败时）
✅ URL 和 base64 图片数据

⚠️ 参考图片（reference images）暂不支持

## 故障排除

### 错误：POE_API_KEY is required

确保已正确设置 `POE_API_KEY` 环境变量。

### 错误：Invalid provider: poe

确保已更新所有相关文件：
- `scripts/types.ts` - Provider 类型定义
- `scripts/main.ts` - 参数解析和 provider 加载
- `scripts/providers/poe.ts` - POE provider 实现

### 错误：No image data found in POE response

查看控制台输出的完整响应结构，根据实际 API 响应格式调整 `extractImageData()` 函数。

## 实现细节

POE provider 的实现位于 [`scripts/providers/poe.ts`](scripts/providers/poe.ts)，主要包括：

1. **getDefaultModel()** - 返回默认模型（nano-banana-pro）
2. **generateImage()** - 调用 POE API 生成图片
3. **extractImageData()** - 从响应中提取图片数据（支持多种格式）

实现参考了现有的 Google、OpenAI 和 DashScope providers，保持了一致的接口和错误处理方式。

## 相关文件

- [`scripts/types.ts`](scripts/types.ts) - 类型定义
- [`scripts/main.ts`](scripts/main.ts) - 主入口
- [`scripts/providers/poe.ts`](scripts/providers/poe.ts) - POE provider 实现
- [`SKILL.md`](SKILL.md) - Skill 文档
- [`test-poe.sh`](test-poe.sh) - 测试脚本
