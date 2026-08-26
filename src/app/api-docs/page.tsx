import { ApiReference } from "@/components/swagger-ui";

export const metadata = { title: "API Reference | Mahavir Card" };

export default function ApiDocsPage() {
  return <main className="min-h-screen bg-white"><ApiReference /></main>;
}
