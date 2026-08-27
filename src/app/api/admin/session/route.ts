import { handleApiError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { session, admin } = await requireAdmin(request);
    return jsonOk({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      role: admin.role,
      status: admin.status,
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
