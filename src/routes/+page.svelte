<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let mapContainer: HTMLElement;
	let map: L.Map;
	let L: any;
	let eventSource: EventSource | null = null;
	let markers: Map<number, any> = new Map();

	interface MapMark {
		id: number;
		name: string;
		description: string;
		lat: number;
		lng: number;
		created_at: string;
	}

	let marks: MapMark[] = [];
	let showForm = false;
	let isLoading = false;
	let formData = {
		name: '',
		description: '',
		lat: 43.2381,
		lng: 76.9452
	};

	async function loadExistingMarks() {
		try {
			const response = await fetch('/api/marks');
			if (response.ok) {
				const existingMarks = await response.json();
				marks = existingMarks;

				existingMarks.forEach((mark: MapMark) => {
					addMarkerToMap(mark);
				});
			}
		} catch (error) {
			console.error('Failed to load existing marks:', error);
		}
	}

	function addMarkerToMap(mark: MapMark) {
		if (!L || !map) return;

		const marker = L.marker([mark.lat, mark.lng]).addTo(map);
		marker.bindPopup(`<b>${mark.name}</b><br>${mark.description}`);
		markers.set(mark.id, marker);
	}

	function setupSSE() {
		eventSource = new EventSource('/api/events');

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === 'mark-added') {
					const newMark = data.data;

					if (!marks.find((m) => m.id === newMark.id)) {
						marks = [...marks, newMark];
						addMarkerToMap(newMark);
					}
				} else if (data.type === 'mark-deleted') {
					const deletedId = data.data.id;

					marks = marks.filter((m) => m.id !== deletedId);

					const marker = markers.get(deletedId);
					if (marker && map) {
						map.removeLayer(marker);
						markers.delete(deletedId);
					}
				}
			} catch (error) {
				console.error('Error parsing SSE message:', error);
			}
		};

		eventSource.onerror = (error) => {
			console.error('SSE connection error:', error);
		};
	}

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		map = L.map(mapContainer).setView([43.2381, 76.9452], 11);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
		}).addTo(map);

		map.on('click', (e: any) => {
			formData.lat = e.latlng.lat;
			formData.lng = e.latlng.lng;
			showForm = true;
		});

		await loadExistingMarks();
		setupSSE();
	});

	onDestroy(() => {
		if (eventSource) {
			eventSource.close();
		}
	});

	async function addMark() {
		if (formData.name.trim() === '' || isLoading) return;

		isLoading = true;

		try {
			const response = await fetch('/api/marks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.name,
					description: formData.description,
					lat: formData.lat,
					lng: formData.lng
				})
			});

			if (response.ok) {
				formData = {
					name: '',
					description: '',
					lat: 43.2381,
					lng: 76.9452
				};
				showForm = false;
			} else {
				console.error('Failed to add mark');
				alert('Failed to add mark. Please try again.');
			}
		} catch (error) {
			console.error('Error adding mark:', error);
			alert('Error adding mark. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	function cancelForm() {
		showForm = false;
		formData = {
			name: '',
			description: '',
			lat: 43.2381,
			lng: 76.9452
		};
	}
</script>

<div class="container">
	<div class="content">
		<h1>Almaty Interactive Map</h1>
		<p>Click on the map to add a new location marker</p>
		<div bind:this={mapContainer} class="map-container"></div>

		{#if showForm}
			<div class="form-overlay">
				<form on:submit|preventDefault={addMark} class="mark-form">
					<h3>Add New Location</h3>
					<p class="coordinates">
						Coordinates: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
					</p>

					<label>
						Name *
						<input
							type="text"
							bind:value={formData.name}
							placeholder="Enter location name"
							required
						/>
					</label>

					<label>
						Description
						<textarea
							bind:value={formData.description}
							placeholder="Enter description (optional)"
							rows="3"
						></textarea>
					</label>

					<div class="form-buttons">
						<button type="button" on:click={cancelForm} class="cancel-btn">Cancel</button>
						<button type="submit" class="submit-btn" disabled={isLoading}>
							{isLoading ? 'Adding...' : 'Add Marker'}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(html) {
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100%;
	}
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #f8f9fa;
		width: 100%;
	}

	.container {
		padding: 1rem;
		min-height: 100vh;
		width: 100vw;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		box-sizing: border-box;
	}

	.content {
		width: 100%;
		max-width: 90vw;
	}

	h1 {
		font-size: clamp(1.8rem, 4vw, 2.5rem);
		margin: 0 0 1rem 0;
		color: #2c3e50;
		font-weight: 700;
		text-align: left;
	}

	p {
		font-size: clamp(1rem, 2vw, 1.1rem);
		color: #6c757d;
		margin: 0 0 2rem 0;
		line-height: 1.6;
		text-align: left;
	}

	.map-container {
		height: 70vh;
		min-height: 400px;
		width: 100%;
		border-radius: 16px;
		border: 4px solid #e9ecef;
		box-shadow:
			0 10px 40px rgba(0, 0, 0, 0.1),
			0 4px 8px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
	}

	.map-container:hover {
		transform: translateY(-2px);
		box-shadow:
			0 15px 50px rgba(0, 0, 0, 0.15),
			0 8px 16px rgba(0, 0, 0, 0.1);
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.container {
			padding: 0.5rem;
		}

		.content {
			max-width: 95vw;
		}

		.map-container {
			height: 60vh;
			min-height: 300px;
			border-radius: 12px;
			border-width: 2px;
		}

		.map-container:hover {
			transform: none;
		}
	}

	.form-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.mark-form {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		width: 90%;
		max-width: 400px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
	}

	.mark-form h3 {
		margin: 0 0 1rem 0;
		color: #2c3e50;
		font-size: 1.5rem;
	}

	.coordinates {
		font-size: 0.9rem;
		color: #6c757d;
		margin: 0 0 1.5rem 0;
		font-family: monospace;
	}

	.mark-form label {
		display: block;
		margin-bottom: 1rem;
		font-weight: 600;
		color: #495057;
	}

	.mark-form input,
	.mark-form textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #e9ecef;
		border-radius: 8px;
		margin-top: 0.5rem;
		font-size: 1rem;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	.mark-form input:focus,
	.mark-form textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
	}

	.form-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.cancel-btn,
	.submit-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.cancel-btn {
		background: #6c757d;
		color: white;
	}

	.cancel-btn:hover {
		background: #5a6268;
	}

	.submit-btn {
		background: #007bff;
		color: white;
	}

	.submit-btn:hover {
		background: #0056b3;
	}
</style>
