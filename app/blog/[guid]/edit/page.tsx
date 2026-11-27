import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { getBlogPost } from "@/lib/blog";
import { hasTeacherAccess } from "@/lib/utils";
import { BlogPostEditor } from "@/components/blog/editor/blog-post-editor";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).blog.editTitle };
}

export default async function EditBlogPostPage({
  params,
}: PageProps<"/blog/[guid]/edit">) {
  // /blog/* is open to everyone in proxy.ts, so the role check lives here
  const user = await getCurrentUser();
  if (!hasTeacherAccess(user?.role)) {
    notFound();
  }

  const post = await getBlogPost((await params).guid, { includeDrafts: true });
  if (!post) {
    notFound();
  }

  return (
    <BlogPostEditor
      guid={post.guid}
      defaultValues={{
        title: post.title,
        summary: post.summary,
        message: post.message,
        type: post.type,
        isDraft: post.isDraft,
      }}
    />
  );
}
