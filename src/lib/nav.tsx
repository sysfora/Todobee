"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { forwardRef, type ComponentProps } from "react";

type Search = Record<string, string | undefined>;

function buildHref(to: string, params?: Record<string, string>, search?: Search) {
  let path = to;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.split(`$${key}`).join(encodeURIComponent(value));
    }
  }
  if (search) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(search)) {
      if (value) query.set(key, value);
    }
    const text = query.toString();
    path = path.split("?")[0] + (text ? `?${text}` : "");
  }
  return path;
}

export const Link = forwardRef<
  HTMLAnchorElement,
  Omit<ComponentProps<typeof NextLink>, "href"> & {
    to?: string;
    href?: string;
    params?: Record<string, string>;
    search?: Search;
  }
>(function Link({ to, href, params, search, ...rest }, ref) {
  return <NextLink ref={ref} href={buildHref(href ?? to ?? "/", params, search)} {...rest} />;
});

export function useNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  return (opts: string | { href?: string; to?: string; search?: Search; params?: Record<string, string>; replace?: boolean }) => {
    const target = typeof opts === "string" ? { href: opts } : opts;
    const path = buildHref(target.href ?? target.to ?? pathname, target.params, target.search);
    if (target.replace) router.replace(path);
    else router.push(path);
  };
}

export function useRouterState<T>(opts: {
  select: (state: { location: { pathname: string } }) => T;
}): T {
  const pathname = usePathname();
  return opts.select({ location: { pathname } });
}
