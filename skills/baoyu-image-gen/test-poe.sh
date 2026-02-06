#!/bin/bash

# POE Provider 测试脚本
# 使用前请先设置 POE_API_KEY 环境变量和代理

echo "Testing POE provider..."
echo ""

# 设置代理（POE API 需要代理访问）
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897

# 检查 API key
if [ -z "$POE_API_KEY" ]; then
  echo "❌ Error: POE_API_KEY is not set"
  echo "Please set it in ~/.baoyu-skills/.env or export it:"
  echo "  export POE_API_KEY=your_api_key_here"
  exit 1
fi

echo "✓ POE_API_KEY is set"
echo "✓ Proxy configured: $https_proxy"
echo ""

# 测试基础生成
echo "Test 1: Basic image generation"
npx -y bun scripts/main.ts \
  --prompt "19世纪东京繁忙的街道，日本浮世绘风格" \
  --image test-poe-basic.png \
  --provider poe

if [ $? -eq 0 ]; then
  echo "✓ Test 1 passed: test-poe-basic.png"
else
  echo "❌ Test 1 failed"
  exit 1
fi

echo ""
echo "Test 2: With aspect ratio"
npx -y bun scripts/main.ts \
  --prompt "A beautiful landscape" \
  --image test-poe-16x9.png \
  --provider poe \
  --ar 16:9

if [ $? -eq 0 ]; then
  echo "✓ Test 2 passed: test-poe-16x9.png"
else
  echo "❌ Test 2 failed"
fi

echo ""
echo "Test 3: High quality"
npx -y bun scripts/main.ts \
  --prompt "A cute cat" \
  --image test-poe-hq.png \
  --provider poe \
  --quality 2k

if [ $? -eq 0 ]; then
  echo "✓ Test 3 passed: test-poe-hq.png"
else
  echo "❌ Test 3 failed"
fi

echo ""
echo "All tests completed!"
echo "Check the generated images:"
echo "  - test-poe-basic.png"
echo "  - test-poe-16x9.png"
echo "  - test-poe-hq.png"
