# 网站部署

代码仓库：<https://github.com/LYF0422/LYF0422.github.io>。

## GitHub Pages

主页：<https://lyf0422.github.io/>。写作台：<https://lyf0422.github.io/studio/>。

仓库名与账号名对应，使用根路径部署。Settings → Pages 的 Source 选择 **GitHub Actions**。向 `main` 推送后，现有工作流自动构建、发布；在仓库的 Actions 中查看部署结果。

写作台的配置位于 `src/data/studio.ts`，目标仓库为 `LYF0422/LYF0422.github.io`。首次使用与发布步骤见 [写作台指南](STUDIO.md)。

## 后续接入 Cloudflare

Cloudflare 尚未绑定。可以继续使用 GitHub Pages，仅由 Cloudflare 管理自定义域名，也可以将网站托管到 Cloudflare Pages。两种方式都保留 GitHub 作为文章和图片的来源。

### Cloudflare Pages 托管

1. 在 Cloudflare 控制台创建 Pages 项目，连接 GitHub，授权并选择 `LYF0422/LYF0422.github.io`。
2. 生产分支选择 `main`；框架选择 Astro；构建命令填写 `pnpm build`；输出目录填写 `dist`；根目录保留仓库根目录。
3. 构建环境设置 `NODE_VERSION=24`、`PNPM_VERSION=12.14.0`。
4. 首次部署后取得实际的 `*.pages.dev` 地址；也可以在项目的 Custom domains 中添加自己的域名。
5. 将 `astro-paper.config.ts` 的 `site.url`、`site.profile` 和 `src/data/studio.ts` 的 `siteUrl` 更新为最终域名，重新部署。当前网站使用静态构建，不需要 Cloudflare SSR 适配器。

写作台发布时会提交到同一 GitHub 仓库，Cloudflare 的 Git 集成会自动触发构建。写作台中的“查看网站部署进度”目前链接到 GitHub Actions；切换托管后也应改为 Cloudflare 项目对应的部署页面。GitHub Pages 工作流可以继续保留作为备用站点。

### Cloudflare 管理域名，GitHub Pages 托管

需要已有的自定义域名。在 GitHub Pages 的 Custom domain 中绑定并验证域名，然后按 GitHub 提供的记录配置 Cloudflare DNS。GitHub 配置成功、HTTPS 证书签发后，在仓库保留对应的 `public/CNAME` 文件，并将上面的三个站点 URL 配置更新为最终域名。无需创建 Cloudflare Pages 项目。

不能直接把 `github.io` 域名交给 Cloudflare 管理；这条方式需要自己拥有的域名。

参考：[Cloudflare 的 Astro 部署指南](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)；[Cloudflare 的 GitHub 集成](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)；[GitHub Pages 自定义域名](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)。
