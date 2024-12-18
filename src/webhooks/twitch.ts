import { FastifyReply, FastifyRequest, RouteOptions } from "fastify";
import { TwitchAPI } from "../integrations/twitchAPI";

const TwitchCallbackWebhookBodyType = {
	code: { type: "string" },
}

export const twitchWebhook: RouteOptions = {
	method: "GET",
	url: "/twitch",
	schema: {
		querystring: {
			type: "object",
			properties: TwitchCallbackWebhookBodyType
		},
		response: {
			200: {
				type: "boolean",
			},
		},
	},
	handler: async (request: FastifyRequest, reply: FastifyReply) => {
		const { code } = request.query as { code: string };
		if (code && code.length > 0) {
			TwitchAPI.exchangeAuthorizationCode(code);
		}
		reply.code(200).send(true);
	},
};
