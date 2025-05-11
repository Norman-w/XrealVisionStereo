<script setup lang="ts">
// Function to Append Logs to UI
function appendLog(message: string) {
	const currentLogContainer = document.getElementById('cpp-log-overlay');
	if (currentLogContainer) {
		const logEntry = document.createElement('span');
		logEntry.textContent = message;
		currentLogContainer.appendChild(logEntry);
		currentLogContainer.appendChild(document.createElement('br'));
		currentLogContainer.scrollTop = currentLogContainer.scrollHeight;
	}
	console.log("[C++ LOG]:", message);
}

defineExpose({
	appendLog,
});
</script>
<template>
	<div id="cpp-log-overlay">
		<!-- C++ Logs will be appended here -->
	</div>
</template>

<style scoped>

/* Styles for C++ Log Overlay */
#cpp-log-overlay {
	position: fixed; /* Fixed position */
	bottom: 10px;
	left: 10px;
	width: calc(100vw - 20px); /* Full width minus padding */
	height: 150px; /* Fixed height */
	background-color: rgba(0, 0, 0, 0.7); /* Semi-transparent black */
	border: 1px solid #555;
	color: #0f0; /* Green text */
	font-family: monospace;
	font-size: 12px;
	overflow-y: scroll; /* Enable vertical scrolling */
	padding: 5px;
	box-sizing: border-box;
	z-index: 100; /* Ensure it's on top */
	/* pointer-events: none; /* Allow clicks to pass through - REMOVED FOR BUTTON */
}
</style>