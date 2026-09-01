export const STORY_KINDS = ["news", "interview", "submission"] as const;
export type StoryKind = (typeof STORY_KINDS)[number];

export const EDITORIAL_STORY_KINDS = ["news", "interview"] as const;
export type EditorialStoryKind = (typeof EDITORIAL_STORY_KINDS)[number];
export type StoryStatus = "draft" | "published";

export type StoryContentBlock =
  | { id: string; type: "paragraph"; text: string; segments?: StoryTextSegment[] }
  | { id: string; type: "heading"; text: string; segments?: StoryTextSegment[] }
  | { id: string; type: "quote"; text: string; segments?: StoryTextSegment[] }
  | { id: string; type: "link"; label: string; url: string }
  | { id: string; type: "image"; url: string; alt: string; caption: string; inputName?: string };

export type StoryTextSegment = {
  text: string;
  marks?: Array<"bold" | "italic" | "strike">;
  link?: string;
};

const HTTP_URL = /^https?:\/\//i;

export function isEditorialStoryKind(value: string): value is EditorialStoryKind {
  return EDITORIAL_STORY_KINDS.includes(value as EditorialStoryKind);
}

export function storyKindLabel(kind: StoryKind) {
  if (kind === "news") return "새소식";
  if (kind === "interview") return "인터뷰";
  return "노원스토리";
}

export function parseStoryContentBlocks(value: unknown): StoryContentBlock[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw, index): StoryContentBlock[] => {
    if (!raw || typeof raw !== "object") return [];
    const block = raw as Record<string, unknown>;
    const id = String(block.id ?? `block-${index}`).slice(0, 80);
    const type = String(block.type ?? "");

    if (type === "paragraph" || type === "heading" || type === "quote") {
      const text = String(block.text ?? "").trim().slice(0, 5000);
      const segments = Array.isArray(block.segments) ? block.segments.flatMap((rawSegment): StoryTextSegment[] => {
        if (!rawSegment || typeof rawSegment !== "object") return [];
        const segment = rawSegment as Record<string, unknown>;
        const segmentText = String(segment.text ?? "").slice(0, 5000);
        if (!segmentText) return [];
        const marks = Array.isArray(segment.marks)
          ? segment.marks.filter((mark): mark is "bold" | "italic" | "strike" => mark === "bold" || mark === "italic" || mark === "strike")
          : [];
        const link = HTTP_URL.test(String(segment.link ?? "")) ? String(segment.link) : undefined;
        return [{ text: segmentText, ...(marks.length ? { marks } : {}), ...(link ? { link } : {}) }];
      }) : [];
      return text ? [{ id, type, text, ...(segments.length ? { segments } : {}) }] : [];
    }

    if (type === "link") {
      const label = String(block.label ?? "").trim().slice(0, 200);
      const url = String(block.url ?? "").trim().slice(0, 2000);
      return label && HTTP_URL.test(url) ? [{ id, type, label, url }] : [];
    }

    if (type === "image") {
      const url = String(block.url ?? "").trim().slice(0, 2000);
      const inputName = String(block.inputName ?? "").trim().slice(0, 120) || undefined;
      if (!url && !inputName) return [];
      return [{
        id,
        type,
        url: HTTP_URL.test(url) ? url : "",
        alt: String(block.alt ?? "").trim().slice(0, 300),
        caption: String(block.caption ?? "").trim().slice(0, 500),
        ...(inputName ? { inputName } : {})
      }];
    }

    return [];
  });
}

export function parseStoryContentBlocksJson(value: string) {
  try {
    return parseStoryContentBlocks(JSON.parse(value));
  } catch {
    return [];
  }
}

export function storyBlocksToPlainText(blocks: StoryContentBlock[]) {
  return blocks.flatMap((block) => {
    if (block.type === "image") return block.caption ? [block.caption] : [];
    if (block.type === "link") return [block.label, block.url];
    return [block.text];
  }).join("\n\n");
}
