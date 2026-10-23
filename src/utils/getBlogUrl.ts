import { getRelativeLocaleUrl } from "astro:i18n";
import type { CategoryId } from "@/data/categories";
import config from "@/config";

export function getBlogUrl(category?: CategoryId, page = 1) {
  const segments = ["blog", category, page > 1 ? String(page) : undefined];
  return getRelativeLocaleUrl(
    config.site.lang,
    segments.filter(Boolean).join("/")
  );
}
