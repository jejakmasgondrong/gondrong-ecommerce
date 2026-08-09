import type { ReactNode } from "react";

export default function HorizontalScroll({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold">
        {icon && <span aria-hidden>{icon}</span>}
        {title}
      </h2>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2">
        {children}
      </div>
    </section>
  );
}