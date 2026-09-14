import type { Metadata } from "next";

// Every /account/* route is customer-private: keep the whole subtree out of search.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return children;
}
