export const categoryIds = [
  "paper-reading",
  "game",
  "photo",
  "anime",
  "notes",
] as const;

export type CategoryId = (typeof categoryIds)[number];

// categoryIds also defines the Markdown schema; subtitles label the editor options.
export const categories = [
  {
    id: "paper-reading",
    title: "Paper Reading",
    subtitle: "论文",
    icon: "book",
  },
  { id: "game", title: "Game", subtitle: "游戏", icon: "game" },
  { id: "photo", title: "Photo", subtitle: "摄影", icon: "camera" },
  { id: "anime", title: "Anime", subtitle: "动画", icon: "sparkles" },
  { id: "notes", title: "Notes", subtitle: "随笔", icon: "pen" },
] as const;

export function getCategory(id: CategoryId) {
  return categories.find(category => category.id === id)!;
}
