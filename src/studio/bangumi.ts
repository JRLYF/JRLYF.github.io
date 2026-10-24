import {
  normalizeEntry,
  resourceUrl,
  type BangumiSubject,
} from "@/data/entries";

const api = "https://api.bgm.tv";
export interface SubjectResult {
  id: number;
  type: number;
  name: string;
  name_cn?: string;
  images?: { common?: string; large?: string };
}
async function request(path: string, signal: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${api}${path}`, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
      credentials: "omit",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      "暂时无法连接 Bangumi，请检查网络后重试。已填写的内容会保留。"
    );
  }
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "未找到此 Bangumi 条目，或条目暂不公开。"
        : `Bangumi 暂时无法读取（${response.status}），请稍后重试。`
    );
  return response.json();
}
export async function searchSubjects(
  keyword: string,
  type: 2 | 4,
  signal: AbortSignal
): Promise<SubjectResult[]> {
  // The public GET search supports browser CORS; selecting a result uses v0 details.
  const result = await request(
    `/search/subject/${encodeURIComponent(keyword)}?type=${type}&responseGroup=small&max_results=12`,
    signal
  );
  return (Array.isArray(result.list) ? result.list : [])
    .filter((item: SubjectResult) => item.type === type)
    .slice(0, 12);
}
export async function getSubject(
  id: number,
  type: 2 | 4,
  signal: AbortSignal
): Promise<BangumiSubject> {
  const result = await request(`/v0/subjects/${id}`, signal);
  if (result.type !== type)
    throw new Error(type === 2 ? "请选择动画条目。" : "请选择游戏条目。");
  const wanted =
    type === 2
      ? ["导演", "动画制作", "原作"]
      : ["开发", "开发商", "发行", "发行商", "游戏类型", "游玩人数"];
  const facts = (result.infobox ?? [])
    .filter((item: { key: string }) => wanted.includes(item.key))
    .slice(0, 4)
    .map((item: { key: string; value: unknown }) => ({
      label: item.key,
      value:
        typeof item.value === "string"
          ? item.value
          : Array.isArray(item.value)
            ? item.value
                .map((part: { v?: string }) => part.v ?? "")
                .filter(Boolean)
                .join("、")
            : "",
    }));
  return normalizeEntry({
    subject: {
      id: result.id,
      type,
      name: result.name_cn || result.name,
      originalName: result.name,
      image: resourceUrl(result.images?.common || result.images?.large),
      date: result.date || "",
      platform: result.platform || "",
      summary: result.summary || "",
      episodes: result.eps || result.total_episodes || 0,
      facts,
    },
  }).subject!;
}

export function subjectId(value: string): number | null {
  const match = value
    .trim()
    .match(
      /^(?:https:\/\/(?:bgm\.tv|bangumi\.tv|chii\.in)\/subject\/)?(\d+)\/?$/
    );
  return match && Number.isSafeInteger(Number(match[1]))
    ? Number(match[1])
    : null;
}
