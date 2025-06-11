import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllMarks, createMark, deleteMark } from '$lib/database.js';
import { eventBroadcaster } from '$lib/eventBroadcaster.js';

export const GET: RequestHandler = async () => {
	try {
		const marks = await getAllMarks();
		return json(marks);
	} catch (err) {
		console.error('Error fetching marks:', err);
		return error(500, 'Failed to fetch marks');
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, description, lat, lng } = await request.json();

		if (!name || typeof lat !== 'number' || typeof lng !== 'number') {
			return error(400, 'Invalid mark data');
		}

		const newMark = await createMark(name, description || '', lat, lng);

		eventBroadcaster.broadcast({
			type: 'mark-added',
			data: newMark,
			timestamp: new Date().toISOString()
		});

		return json(newMark);
	} catch (err) {
		console.error('Error creating mark:', err);
		return error(500, 'Failed to create mark');
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const id = url.searchParams.get('id');

		if (!id) {
			return error(400, 'Mark ID is required');
		}

		const success = await deleteMark(parseInt(id));

		if (!success) {
			return error(404, 'Mark not found');
		}

		eventBroadcaster.broadcast({
			type: 'mark-deleted',
			data: { id: parseInt(id) } as any,
			timestamp: new Date().toISOString()
		});

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting mark:', err);
		return error(500, 'Failed to delete mark');
	}
};
