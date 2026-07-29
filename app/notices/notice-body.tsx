import Link from "next/link";
import { tokenizeNoticeBody } from "@/lib/notice-links";

export function NoticeBody({ body }: { body: string }) {
  const tokens = tokenizeNoticeBody(body);

  return (
    <div className="whitespace-pre-line text-base leading-8 text-gray-700">
      {tokens.map((token, index) => {
        const key = `${index}-${token.value}`;

        if (token.type === "internal") {
          return (
            <Link key={key} href={token.value} className="font-bold text-primary hover:underline">
              {token.value}
            </Link>
          );
        }

        if (token.type === "external") {
          return (
            <a
              key={key}
              href={token.value}
              target="_blank"
              rel="noreferrer noopener"
              className="font-bold text-primary hover:underline"
            >
              {token.value}
            </a>
          );
        }

        return <span key={key}>{token.value}</span>;
      })}
    </div>
  );
}
