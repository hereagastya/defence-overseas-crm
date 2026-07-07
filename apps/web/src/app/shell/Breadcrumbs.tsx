import { Link, useMatches } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface RouteHandle {
  breadcrumb?: string;
}

export function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches
    .filter((m) => Boolean((m.handle as RouteHandle | undefined)?.breadcrumb))
    .map((m) => ({
      label: (m.handle as RouteHandle).breadcrumb!,
      pathname: m.pathname,
    }));

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        {crumbs.map((crumb, i) => (
          <li key={crumb.pathname} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            {i === crumbs.length - 1 ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.pathname}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
