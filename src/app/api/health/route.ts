import { jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOk({ status: "ok" });
}
