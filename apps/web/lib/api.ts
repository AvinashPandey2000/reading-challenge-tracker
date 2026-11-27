import { ApiError, createApiClient } from "@rct/shared";

/** Same-origin client: the browser calls /api/... and Next.js forwards it to the Node API. */
export const api = createApiClient("");
export { ApiError };
