export const categoryIds = [
  "paper-reading",
  "game",
  "photo",
  "anime",
  "notes",
] as const;

export type CategoryId = (typeof categoryIds)[number];

// Add or rename a section here; categoryIds also defines the Markdown schema.
export const categories = [
  {
    id: "paper-reading",
    title: "Paper Reading",
    subtitle: "阅读与研究",
    description: "把读过的论文，变成自己的理解。",
    detail: "论文阅读、研究线索与值得反复思考的问题。",
    icon: "book",
    number: "01",
    emptyTitle: "下一篇阅读，从这里开始。",
    emptyDescription: "这里将收录论文笔记、方法拆解与阅读中的思考。",
  },
  {
    id: "game",
    title: "Game",
    subtitle: "游戏与体验",
    description: "在另一个世界里，收集故事。",
    detail: "游戏体验、通关随记与虚拟世界里的小小发现。",
    icon: "game",
    number: "02",
    emptyTitle: "新的存档，等待开启。",
    emptyDescription: "这里将记录玩过的游戏、喜欢的故事与难忘的瞬间。",
  },
  {
    id: "photo",
    title: "Photo",
    subtitle: "影像与日常",
    description: "留住光线，也留住普通的一天。",
    detail: "用照片保存路上的风景，以及日常里细微的美好。",
    icon: "camera",
    number: "03",
    emptyTitle: "等一束光，也等一个瞬间。",
    emptyDescription: "这里将收藏摄影作品、旅行片段与日常影像。",
  },
  {
    id: "anime",
    title: "Anime",
    subtitle: "动画与故事",
    description: "把喜欢的故事，留在现实的一角。",
    detail: "追番记录、动画短评，以及故事落幕之后的回响。",
    icon: "sparkles",
    number: "04",
    emptyTitle: "下一段故事，正要开场。",
    emptyDescription: "这里将记录喜欢的动画、追番感想与值得重温的作品。",
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "随笔与想法",
    description: "一些不必归类的想法。",
    detail: "零散的灵感、生活片段与还在生长的想法。",
    icon: "pen",
    number: "05",
    emptyTitle: "给偶然的灵感，留一点位置。",
    emptyDescription: "这里将放下日常随笔、零散想法与不必归类的记录。",
  },
] as const;

export function getCategory(id: CategoryId) {
  return categories.find(category => category.id === id)!;
}
