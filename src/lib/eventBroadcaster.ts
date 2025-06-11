import type { MapMark } from './database.js';

export interface SSEConnection {
	id: string;
	controller: ReadableStreamDefaultController;
	userId?: string;
}

export interface MapEvent {
	type: 'mark-added' | 'mark-deleted';
	data: MapMark;
	timestamp: string;
}

class EventBroadcaster {
	private connections: Map<string, SSEConnection> = new Map();

	addConnection(connection: SSEConnection): void {
		this.connections.set(connection.id, connection);
		console.log(
			`SSE connection added: ${connection.id}. Total connections: ${this.connections.size}`
		);
	}

	removeConnection(connectionId: string): void {
		this.connections.delete(connectionId);
		console.log(
			`SSE connection removed: ${connectionId}. Total connections: ${this.connections.size}`
		);
	}

	broadcast(event: MapEvent): void {
		const eventData = `data: ${JSON.stringify(event)}\n\n`;

		const disconnectedConnections: string[] = [];

		for (const [id, connection] of this.connections) {
			try {
				connection.controller.enqueue(new TextEncoder().encode(eventData));
			} catch (error) {
				console.log(`Failed to send to connection ${id}:`, error);
				disconnectedConnections.push(id);
			}
		}

		disconnectedConnections.forEach((id) => this.removeConnection(id));
	}

	getConnectionCount(): number {
		return this.connections.size;
	}
}

export const eventBroadcaster = new EventBroadcaster();
