# SEO and project discovery checklist

Ayla uses descriptive page titles, visible project copy, structured data and repository metadata to help search engines associate the product, brand and creator without keyword stuffing.

## Implemented in the repository

- Descriptive Chinese title and meta description.
- `index,follow` crawler directives for Googlebot and Baiduspider.
- Open Graph and Twitter Card metadata with a real project screenshot.
- Schema.org `SoftwareApplication`, `Organization` and `Person` data.
- A crawlable `/ai-workbench/about.html` page with visible product content.
- Dynamic host-aware `/robots.txt` and `/sitemap.xml` in the Docker/Kestrel host.
- GitHub README, topics, author file and `CITATION.cff` identity signals.
- Meaningful screenshot filenames and Markdown alternative text.

## Production-domain checklist

1. Deploy on a stable public HTTPS domain; a LAN IP or `localhost` cannot be indexed from the public internet.
2. Confirm these URLs return HTTP 200 without authentication:
   - `/ai-workbench/`
   - `/ai-workbench/about.html`
   - `/robots.txt`
   - `/sitemap.xml`
3. Make sure the generated sitemap uses the public scheme and host forwarded by the reverse proxy.
4. Register and verify the domain in Google Search Console and 百度搜索资源平台.
5. Submit `/sitemap.xml`; use URL inspection / 抓取诊断 to verify the rendered page.
6. Set the GitHub repository homepage to the final public URL.
7. Recheck titles, structured data, mobile layout, response time, 4xx/5xx rates and image accessibility after each deployment.

## Identity vocabulary

Use these names naturally and consistently in public profiles, release notes and inbound links:

- Product: `Ayla`, `Ayla AI Workspace`
- Brand: `Aycsoft`
- Creator: `杨鹏`, `Peng Yang`, `Perry Yang`, `YangPeng`

Search engines decide crawl timing, indexing and ranking. Correct metadata and sitemap submission improve discoverability but do not guarantee a specific position or immediate inclusion.

## Primary references

- [Google Search Essentials and SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google title link guidance](https://developers.google.com/search/docs/appearance/title-link)
- [Google structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [百度搜索资源平台使用指南](https://ziyuan.baidu.com/college/articleinfo/?id=3329)
- [GitHub repository customization](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository)
