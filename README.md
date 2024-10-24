# 微信公众号阅读器

完全私有化部署，获取公众号最新发布的15篇文章

## 注意

本项目仅供学习交流使用

## 使用方法

1. 分享公众号文章链接到微信读书
2. 将公众号加入微信读书书架
3. 启动本项目后点击“All Book”旁的刷新按钮
4. 微信扫码登录，等待获取公众号目录
5. 点击“同步文章正文按钮”，等待同步文章和LLM生产摘要

![主界面](https://raw.githubusercontent.com/madizm/another-wechat-reader/refs/heads/main/reader-img.png)

## 部署

- node=v20.11.1
- pnpm=9.5.0
- 新建文件apps/server/.env 到siliconflow.cn注册获取免费的LLM_API_KEY
- pnpm install
- cd apps/server && pnpm run migrate
- pnpm run dev
