import { Home } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export function Header({ title = "Buyer-First Intel", showBack, rightElement }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border"
      data-testid="header-main"
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack ? (
            <Link href="/">
              <button 
                className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover-elevate"
                data-testid="button-back"
              >
                <Home className="h-5 w-5" />
              </button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">BFI</span>
              </div>
            </div>
          )}
          <h1 className="text-base font-semibold text-foreground truncate">
            {title}
          </h1>
        </div>
        {rightElement && (
          <div className="flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
