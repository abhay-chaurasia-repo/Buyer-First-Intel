import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function PageContainer({ children, className, noPadding }: PageContainerProps) {
  return (
    <main 
      className={cn(
        "flex-1 max-w-lg mx-auto w-full pb-20",
        !noPadding && "px-4 py-4",
        className
      )}
    >
      {children}
    </main>
  );
}
