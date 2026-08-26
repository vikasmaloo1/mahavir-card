"use client";

import SwaggerUI from "swagger-ui-react";

export function ApiReference() {
  return <SwaggerUI url="/api/openapi" docExpansion="list" deepLinking persistAuthorization={false} />;
}
