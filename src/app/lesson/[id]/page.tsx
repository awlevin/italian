import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AuthGate, Splash } from "@/components/auth-gate";
import { LessonPlayer } from "@/components/lesson/player";
import { allLessons, lessonById } from "@/content/course";

export function generateStaticParams() {
  return allLessons.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/lesson/[id]">) {
  const lesson = lessonById((await params).id);
  return { title: lesson ? `${lesson.city} — ${lesson.title}` : "Lesson" };
}

async function Lesson({ params }: { params: PageProps<"/lesson/[id]">["params"] }) {
  const lesson = lessonById((await params).id);
  if (!lesson) notFound();
  return (
    <AuthGate>
      <LessonPlayer key={lesson.id} lesson={lesson} />
    </AuthGate>
  );
}

export default function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  return (
    <Suspense fallback={<Splash />}>
      <Lesson params={params} />
    </Suspense>
  );
}
