import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

export interface MapMark {
	id: number;
	name: string;
	description: string;
	lat: number;
	lng: number;
	created_at: string;
}

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function initDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
	if (db) return db;

	const dbPath = path.join(process.cwd(), 'map_marks.db');

	db = await open({
		filename: dbPath,
		driver: sqlite3.Database
	});

	await db.exec(`
		CREATE TABLE IF NOT EXISTS marks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			description TEXT,
			lat REAL NOT NULL,
			lng REAL NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`);

	return db;
}

export async function getDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
	if (!db) {
		return await initDatabase();
	}
	return db;
}

export async function getAllMarks(): Promise<MapMark[]> {
	const database = await getDatabase();
	return database.all('SELECT * FROM marks ORDER BY created_at DESC');
}

export async function createMark(
	name: string,
	description: string,
	lat: number,
	lng: number
): Promise<MapMark> {
	const database = await getDatabase();
	const result = await database.run(
		'INSERT INTO marks (name, description, lat, lng) VALUES (?, ?, ?, ?)',
		[name, description, lat, lng]
	);

	const mark = await database.get('SELECT * FROM marks WHERE id = ?', result.lastID);
	return mark as MapMark;
}

export async function deleteMark(id: number): Promise<boolean> {
	const database = await getDatabase();
	const result = await database.run('DELETE FROM marks WHERE id = ?', id);
	return (result.changes ?? 0) > 0;
}
