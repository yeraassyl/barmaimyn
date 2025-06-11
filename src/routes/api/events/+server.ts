import type { RequestHandler } from './$types';
import { eventBroadcaster } from '$lib/eventBroadcaster.js';
import type { SSEConnection } from '$lib/eventBroadcaster.js';

export const GET: RequestHandler = async () => {
	const stream = new ReadableStream({
		start(controller) {
			const connectionId = crypto.randomUUID();

			const connection: SSEConnection = {
				id: connectionId,
				controller
			};

			controller.enqueue(
				new TextEncoder().encode(
					'data: {"type":"connected","message":"SSE connection established"}\n\n'
				)
			);

			eventBroadcaster.addConnection(connection);

			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode('data: {"type":"heartbeat"}\n\n'));
				} catch (error) {
					clearInterval(heartbeat);
					eventBroadcaster.removeConnection(connectionId);
				}
			}, 30000);
		},

		cancel() {
			console.log('SSE connection cancelled');
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Content-Type'
		}
	});
};
