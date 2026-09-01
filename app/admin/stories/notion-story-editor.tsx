"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Heading2, ImagePlus, Italic, Link2, Loader2, MessageSquareQuote, Pilcrow, Redo2, Strikethrough, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { replaceHeicSelection } from "@/lib/heic";
import type { StoryContentBlock, StoryTextSegment } from "@/lib/story-content";

const StoryImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: "" }
    };
  }
});

function id() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function segmentsToContent(segments: StoryTextSegment[] | undefined, fallback: string): JSONContent[] {
  if (!segments?.length) return fallback ? [{ type: "text", text: fallback }] : [];
  return segments.map((segment) => ({
    type: "text",
    text: segment.text,
    marks: [
      ...(segment.marks ?? []).map((mark) => ({ type: mark })),
      ...(segment.link ? [{ type: "link", attrs: { href: segment.link, target: "_blank", rel: "noopener noreferrer" } }] : [])
    ]
  }));
}

function blocksToDocument(blocks: StoryContentBlock[]): JSONContent {
  return {
    type: "doc",
    content: blocks.map((block): JSONContent => {
      if (block.type === "image") return { type: "image", attrs: { src: block.url, alt: block.alt, caption: block.caption } };
      if (block.type === "link") return { type: "paragraph", content: [{ type: "text", text: block.label, marks: [{ type: "link", attrs: { href: block.url, target: "_blank", rel: "noopener noreferrer" } }] }] };
      const paragraph = { type: "paragraph", content: segmentsToContent(block.segments, block.text) };
      if (block.type === "heading") return { type: "heading", attrs: { level: 2 }, content: paragraph.content };
      if (block.type === "quote") return { type: "blockquote", content: [paragraph] };
      return paragraph;
    })
  };
}

function textNodesToSegments(nodes: JSONContent[] | undefined): StoryTextSegment[] {
  return (nodes ?? []).flatMap((node): StoryTextSegment[] => {
    if (node.type !== "text" || !node.text) return [];
    const marks = (node.marks ?? []).flatMap((mark): Array<"bold" | "italic" | "strike"> =>
      mark.type === "bold" || mark.type === "italic" || mark.type === "strike" ? [mark.type] : []
    );
    const linkMark = (node.marks ?? []).find((mark) => mark.type === "link");
    const link = typeof linkMark?.attrs?.href === "string" ? linkMark.attrs.href : undefined;
    return [{ text: node.text, ...(marks.length ? { marks } : {}), ...(link ? { link } : {}) }];
  });
}

function documentToBlocks(document: JSONContent): StoryContentBlock[] {
  return (document.content ?? []).flatMap((node): StoryContentBlock[] => {
    if (node.type === "image") {
      const url = String(node.attrs?.src ?? "");
      return url ? [{ id: id(), type: "image", url, alt: String(node.attrs?.alt ?? ""), caption: String(node.attrs?.caption ?? "") }] : [];
    }
    const textNodes = node.type === "blockquote" ? node.content?.[0]?.content : node.content;
    const segments = textNodesToSegments(textNodes);
    const text = segments.map((segment) => segment.text).join("").trim();
    if (!text) return [];
    if (node.type === "heading") return [{ id: id(), type: "heading", text, segments }];
    if (node.type === "blockquote") return [{ id: id(), type: "quote", text, segments }];
    return [{ id: id(), type: "paragraph", text, segments }];
  });
}

function ToolbarButton({ active = false, label, onClick, children }: { active?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${active ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-charcoal"}`}>{children}</button>;
}

export function NotionStoryEditor({
  value,
  onChange,
  imageBucket = "story-images",
  imageFolder = "stories",
  minHeight = 460
}: {
  value: StoryContentBlock[];
  onChange: (blocks: StoryContentBlock[]) => void;
  imageBucket?: string;
  imageFolder?: string;
  minHeight?: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
        heading: { levels: [2] },
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false
      }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: "https" }),
      StoryImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "내용을 입력하거나 '/'를 눌러 블록을 추가하세요." })
    ],
    content: blocksToDocument(value),
    editorProps: {
      attributes: { class: "story-notion-editor px-7 py-8 text-base leading-8 text-slate-700 outline-none" },
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith("image/"));
        if (!file) return false;
        void uploadImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = Array.from(event.dataTransfer?.files ?? []).find((item) => item.type.startsWith("image/"));
        if (!file) return false;
        event.preventDefault();
        void uploadImage(file);
        return true;
      }
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(documentToBlocks(currentEditor.getJSON()));
      setSlashOpen(currentEditor.state.selection.$from.parent.textContent.endsWith("/"));
    }
  });

  async function uploadImage(file: File) {
    if (!editor) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("이미지는 JPG, PNG, WEBP 형식만 사용할 수 있습니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("이미지는 한 장당 8MB 이하만 업로드할 수 있습니다.");
      return;
    }
    setUploading(true);
    setError("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError("로그인 정보를 확인할 수 없습니다.");
      setUploading(false);
      return;
    }
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${userData.user.id}/${imageFolder}/${id()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(imageBucket).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (uploadError) setError(uploadError.message);
    else {
      const url = supabase.storage.from(imageBucket).getPublicUrl(path).data.publicUrl;
      editor.chain().focus().setImage({ src: url, alt: "" }).run();
    }
    setUploading(false);
  }

  function runSlash(command: "paragraph" | "heading" | "quote" | "image") {
    if (!editor) return;
    const position = editor.state.selection.from;
    const chain = editor.chain().focus().deleteRange({ from: Math.max(0, position - 1), to: position });
    if (command === "heading") chain.toggleHeading({ level: 2 }).run();
    else if (command === "quote") chain.toggleBlockquote().run();
    else if (command === "image") { chain.run(); fileInputRef.current?.click(); }
    else chain.setParagraph().run();
    setSlashOpen(false);
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("연결할 웹 주소를 입력하세요.", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function editImageDescription() {
    if (!editor || !editor.isActive("image")) return;
    const current = editor.getAttributes("image");
    const alt = window.prompt("이미지 대체 텍스트를 입력하세요.", String(current.alt ?? ""));
    if (alt === null) return;
    const caption = window.prompt("이미지 아래에 표시할 설명을 입력하세요.", String(current.caption ?? ""));
    if (caption === null) return;
    editor.chain().focus().updateAttributes("image", { alt: alt.trim(), caption: caption.trim() }).run();
  }

  if (!editor) return <div className="min-h-[520px] animate-pulse rounded-xl bg-slate-50" />;

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
        <ToolbarButton label="실행 취소" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton label="다시 실행" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="문단" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow size={16} /></ToolbarButton>
        <ToolbarButton label="소제목" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
        <ToolbarButton label="인용" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><MessageSquareQuote size={16} /></ToolbarButton>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="굵게" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
        <ToolbarButton label="기울임" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
        <ToolbarButton label="취소선" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
        <ToolbarButton label="링크" active={editor.isActive("link")} onClick={setLink}><Link2 size={16} /></ToolbarButton>
        <ToolbarButton label="이미지" onClick={() => fileInputRef.current?.click()}>{uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}</ToolbarButton>
        {editor.isActive("image") ? <button type="button" onClick={editImageDescription} className="ml-1 rounded-lg bg-primary/10 px-3 py-2 text-xs font-black text-primary">이미지 설명</button> : null}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={async (event) => { const selected = event.target.files?.[0]; if (!selected) return; const result = await replaceHeicSelection(event.currentTarget, selected); if (result.error) setError(result.error); if (result.file) await uploadImage(result.file); event.currentTarget.value = ""; }} />
      </div>
      <div style={{ minHeight }}><EditorContent editor={editor} /></div>
      {slashOpen ? <div className="absolute left-8 top-24 z-20 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"><p className="px-2 pb-2 text-[11px] font-black text-slate-400">블록 추가</p>{([['paragraph','문단'],['heading','소제목'],['quote','인용'],['image','이미지']] as const).map(([command,label]) => <button key={command} type="button" onClick={() => runSlash(command)} className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-bold text-charcoal hover:bg-primary/5 hover:text-primary">{label}</button>)}</div> : null}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400"><span>/ 를 입력해 블록을 추가할 수 있어요.</span>{uploading ? <span className="font-bold text-primary">이미지 업로드 중…</span> : null}</div>
      {error ? <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs font-bold text-red-600">{error}</p> : null}
    </div>
  );
}
