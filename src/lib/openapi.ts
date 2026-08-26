type Operation = Record<string, unknown>;

const apiError = { description: "Safe error response", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } };
const success = { description: "Successful response", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } };

function operation(summary: string, access: string, requestBody?: Record<string, unknown>): Operation {
  return { summary, description: `Access: ${access}. Responses use { success, data } or { success: false, error }.`, ...(requestBody ? { requestBody } : {}), responses: { "200": success, "201": success, "400": apiError, "401": apiError, "403": apiError, "404": apiError, "422": apiError, "500": apiError } };
}

const body = (schema: string, required = true) => ({ required, content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } } });
const adminCollection = (name: string) => ({ get: operation(`List ${name}`, "ADMIN; query: page, limit, and q where supported"), post: operation(`Create ${name}`, "ADMIN", body("AdminMutation")) });
const adminDetail = (name: string) => ({ get: operation(`Get ${name}`, "ADMIN; path: id"), patch: operation(`Update ${name}`, "ADMIN; path: id", body("AdminMutation")), delete: operation(`Deactivate or delete ${name}`, "ADMIN; path: id") });

export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "Mahavir Card API", version: "1.0.0", description: "HTTP API for Mahavir Card. Database access stays server-side behind Next.js Route Handlers." },
  servers: [{ url: "/", description: "Current deployment" }],
  tags: [{ name: "System" }, { name: "Catalog" }, { name: "Customer" }, { name: "Admin" }, { name: "Authentication" }],
  paths: {
    "/api/health": { get: { ...operation("Health check", "Public"), tags: ["System"], responses: { "200": { description: "Service is available", content: { "application/json": { example: { success: true, data: { status: "ok" } } } } } } } },
    "/api/openapi": { get: { ...operation("OpenAPI document", "Public"), tags: ["System"] } },
    "/api/auth/{path}": { post: { ...operation("Better Auth endpoint", "Public or session-based, depending on operation"), tags: ["Authentication"], parameters: [{ name: "path", in: "path", required: true, schema: { type: "string" }, description: "Better Auth operation, for example sign-in/email or sign-in/phone-number." }] } },
    "/api/account/phone": { post: { ...operation("Attach or update a mobile number", "Authenticated CUSTOMER or ADMIN", body("PhoneInput")), tags: ["Customer"] } },
    "/api/categories": { get: { ...operation("List active categories", "Public"), tags: ["Catalog"] }, post: { ...operation("Create category", "ADMIN", body("CategoryInput")), tags: ["Admin"] } },
    "/api/categories/{id}": { get: { ...operation("Get category", "Public; path: id"), tags: ["Catalog"], parameters: [{ $ref: "#/components/parameters/Id" }] } },
    "/api/products": { get: { ...operation("List active products", "Public; query: q"), tags: ["Catalog"] }, post: { ...operation("Create product", "ADMIN", body("ProductInput")), tags: ["Admin"] } },
    "/api/products/{id}": { get: { ...operation("Get product by ID or slug", "Public; path: id"), tags: ["Catalog"], parameters: [{ $ref: "#/components/parameters/Id" }] } },
    "/api/pricing/calculate": { post: { ...operation("Calculate server-side price", "Public", body("PricingRequest")), tags: ["Catalog"] } },
    "/api/inquiries": { get: { ...operation("List inquiries", "ADMIN"), tags: ["Admin"] }, post: { ...operation("Create inquiry", "Public", body("InquiryInput")), tags: ["Customer"] } },
    "/api/leads": { get: { ...operation("List leads", "ADMIN"), tags: ["Admin"] }, post: { ...operation("Create lead", "Public", body("InquiryInput")), tags: ["Customer"] } },
    "/api/quotes": { get: { ...operation("List quotes", "Authenticated CUSTOMER owns records; ADMIN sees all"), tags: ["Customer"] }, post: { ...operation("Create quote", "Public or authenticated CUSTOMER", body("QuoteInput")), tags: ["Customer"] } },
    "/api/orders": { get: { ...operation("List orders", "Authenticated CUSTOMER owns records; ADMIN sees all"), tags: ["Customer"] }, post: { ...operation("Create order", "Authenticated CUSTOMER or ADMIN", body("OrderInput")), tags: ["Customer"] } },
    "/api/orders/{id}/payment": { get: { ...operation("Get order payment", "Authenticated CUSTOMER owns order; path: id"), tags: ["Customer"], parameters: [{ $ref: "#/components/parameters/Id" }] }, post: { ...operation("Create payment intent", "Authenticated CUSTOMER owns order; path: id", body("PaymentInput")), tags: ["Customer"], parameters: [{ $ref: "#/components/parameters/Id" }] } },
    "/api/artworks": { get: { ...operation("List artworks", "Authenticated CUSTOMER owns records; ADMIN sees all"), tags: ["Customer"] }, post: { ...operation("Register CDR artwork metadata", "Authenticated CUSTOMER or ADMIN; CDR only", body("ArtworkInput")), tags: ["Customer"] } },
    "/api/artworks/{id}": { get: { ...operation("Get artwork", "Authenticated CUSTOMER owns artwork; ADMIN sees all; path: id"), tags: ["Customer"], parameters: [{ $ref: "#/components/parameters/Id" }] } },
    "/api/admin/categories": { ...adminCollection("categories"), tags: ["Admin"] },
    "/api/admin/categories/{id}": { ...adminDetail("category"), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/products": { ...adminCollection("products"), tags: ["Admin"] },
    "/api/admin/products/{id}": { ...adminDetail("product"), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/pricing": { ...adminCollection("pricing rules"), tags: ["Admin"] },
    "/api/admin/pricing/{id}": { ...adminDetail("pricing rule"), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/quotes": { get: operation("List quotes", "ADMIN; query: page, limit"), post: operation("Create quote", "ADMIN", body("QuoteInput")), tags: ["Admin"] },
    "/api/admin/quotes/{id}": { get: operation("Get quote", "ADMIN; path: id"), patch: operation("Update quote status or totals", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/orders": { get: operation("List orders", "ADMIN; query: page, limit"), tags: ["Admin"] },
    "/api/admin/orders/{id}": { get: operation("Get order", "ADMIN; path: id"), patch: operation("Update order lifecycle", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/payments": { get: operation("List payments", "ADMIN"), tags: ["Admin"] },
    "/api/admin/payments/{id}": { get: operation("Get payment", "ADMIN; path: id"), patch: operation("Update payment status", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/customers": { get: operation("List customers", "ADMIN; query: page, limit, q"), tags: ["Admin"] },
    "/api/admin/customers/{id}": { get: operation("Get customer", "ADMIN; path: id"), patch: operation("Update customer", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/artworks": { get: operation("List artworks", "ADMIN"), tags: ["Admin"] },
    "/api/admin/artworks/{id}": { get: operation("Get artwork", "ADMIN; path: id"), patch: operation("Review artwork", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/inquiries": { get: operation("List inquiries", "ADMIN; query: page, limit, q"), tags: ["Admin"] },
    "/api/admin/inquiries/{id}": { get: operation("Get inquiry", "ADMIN; path: id"), patch: operation("Update inquiry", "ADMIN; path: id", body("AdminMutation")), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/inquiries/{id}/convert-to-quote": { post: operation("Convert inquiry to quote", "ADMIN; path: id"), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
    "/api/admin/admins": { get: operation("List admins", "ADMIN"), post: operation("Create admin", "ADMIN", body("AdminInput")), tags: ["Admin"] },
    "/api/admin/admins/{id}": { get: operation("Get admin", "ADMIN; path: id"), patch: operation("Update or deactivate admin", "ADMIN; path: id", body("AdminMutation")), delete: operation("Deactivate admin", "ADMIN; path: id"), tags: ["Admin"], parameters: [{ $ref: "#/components/parameters/Id" }] },
  },
  components: {
    parameters: { Id: { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } } },
    schemas: {
      SuccessResponse: { type: "object", required: ["success", "data"], properties: { success: { type: "boolean", const: true }, data: {} } },
      ErrorResponse: { type: "object", required: ["success", "error"], properties: { success: { type: "boolean", const: false }, error: { type: "object", properties: { code: { type: "string", enum: ["UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONFLICT", "REQUEST_ERROR", "INTERNAL_ERROR"] }, message: { type: "string" }, details: {} } } } },
      PhoneInput: { type: "object", required: ["phoneNumber"], properties: { phoneNumber: { type: "string", example: "9876543210" } } },
      CategoryInput: { type: "object", required: ["name", "slug"], properties: { name: { type: "string" }, slug: { type: "string" }, description: { type: "string" }, isActive: { type: "boolean" } } },
      ProductInput: { type: "object", required: ["name", "slug", "categoryId"], properties: { name: { type: "string" }, slug: { type: "string" }, categoryId: { type: "string", format: "uuid" }, description: { type: "string" }, configuration: { type: "object" } } },
      PricingRequest: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string", format: "uuid" }, quantity: { type: "integer", minimum: 1 }, options: { type: "object" } } },
      InquiryInput: { type: "object", required: ["contactName", "email", "message"], properties: { contactName: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" }, message: { type: "string" } } },
      QuoteInput: { type: "object", required: ["contactName", "email", "items"], properties: { contactName: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" }, items: { type: "array", items: { type: "object" } } } },
      OrderInput: { type: "object", required: ["items"], properties: { customerId: { type: "string", format: "uuid" }, items: { type: "array", items: { type: "object" } } } },
      PaymentInput: { type: "object", required: ["orderId", "method", "amount"], properties: { orderId: { type: "string", format: "uuid" }, method: { type: "string", enum: ["RAZORPAY", "COD"] }, amount: { type: "string", example: "500.00" } } },
      ArtworkInput: { type: "object", required: ["fileName", "fileType"], properties: { fileName: { type: "string", example: "business-card.cdr" }, fileType: { type: "string", const: "cdr" }, extension: { type: "string", const: ".cdr" } } },
      AdminInput: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", format: "password" }, phoneNumber: { type: "string" } } },
      AdminMutation: { type: "object", description: "Use the endpoint-specific editable fields. Status enums include inquiry NEW/CONTACTED/CONVERTED, order PENDING through DELIVERED/CANCELLED, artwork PENDING_REVIEW/APPROVED/CHANGES_REQUIRED/REJECTED, and payment PENDING/PAID/FAILED/REFUNDED/COD_PENDING/COD_COLLECTED." },
    },
  },
} as const;
