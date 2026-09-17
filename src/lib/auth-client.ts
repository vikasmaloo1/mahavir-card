import { createAuthClient } from "better-auth/react";
import { phoneNumberClient, emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [phoneNumberClient(), emailOTPClient()] });
