import type { FastifyReply } from "fastify";
import type { ErrorCode } from "@rct/shared";

export function sendError(reply: FastifyReply, status: number, code: ErrorCode, message: string) {
  return reply.code(status).header("cache-control", "no-store").send({ error: { code, message } });
}
