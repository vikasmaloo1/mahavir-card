import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Customer Sign In",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginForm />;
}

