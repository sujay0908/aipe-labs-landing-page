import "server-only";
import type { ComponentProps } from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { BuildTask, DoneWhen, Note, Warning } from "@/components/Callouts";
import { CodeBlock } from "@/components/CodeBlock";

const components = {
  pre: CodeBlock,
  table: (props: ComponentProps<"table">) => (
    <div className="table-wrap"><table {...props} /></div>
  ),
  a: ({ href = "", ...props }: ComponentProps<"a">) =>
    /^https?:\/\//.test(href)
      ? <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
      : <a href={href} {...props} />,
  // eslint-disable-next-line @next/next/no-img-element
  img: (props: ComponentProps<"img">) => <img loading="lazy" alt="" {...props} />,
  BuildTask,
  DoneWhen,
  Note,
  Warning,
};

export async function renderMdx(source: string) {
  const { content } = await compileMDX({
    source,
    components,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [[rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: false }]],
      },
    },
  });
  return content;
}
