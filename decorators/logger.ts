import { FastifyRequest, FastifyReply } from "fastify";

export const loggerDecorator = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const timestamp = new Date().toISOString();
  const { method, url, headers, ip } = request;

  console.log(`[${timestamp}] ${method} ${url}`);
  console.log(`  IP: ${ip}`);
  console.log(`  User-Agent: ${headers["user-agent"] || "N/A"}`);
  console.log(`  Content-Type: ${headers["content-type"] || "N/A"}`);

  if (request.body) {
    console.log(`  Body: ${JSON.stringify(request.body)}`);
  }
};
