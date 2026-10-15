import { notFound } from "next/navigation";
import { course, lessonById } from "@/content/course";
import { LessonPlayer } from "@/components/lesson/player";
import { AuthGate } from "@/components/auth-gate";

export function generateStaticParams() {
  return course.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/lesson/[id]">) {
  const lesson = lessonById((await params).id);
  return { title: lesson ? `${lesson.city} — ${lesson.title}` : "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/lesson/[id]">) {
  const lesson = lessonById((await params).id);
  if (!lesson) notFound();
  return (
    <AuthGate>
      <LessonPlayer key={lesson.id} lesson={lesson} />
    </AuthGate>
  );
}
