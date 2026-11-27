import { ApiError, createApiClient } from "@rct/shared";
import { BASE_URL } from "./config";

/** Same client as the web app (packages/shared/src/client.ts), pointed at the backend's public URL. */
export const api = createApiClient(BASE_URL);
export { ApiError };
