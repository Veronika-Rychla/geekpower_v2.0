import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/guards";
import { hasTeacherAccess } from "@/lib/utils";
import { BlogPostEditor } from "@/components/blog/editor/blog-post-editor";
import { getDictionary } from "@/lib/dictionary";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).blog.newTitle };
}

export default async function NewBlogPostPage() {
  // /blog/* is open to everyone in proxy.ts, so the role check lives here
  const user = await getCurrentUser();
  if (!hasTeacherAccess(user?.role)) {
    notFound();
  }

  return <BlogPostEditor />;
}
