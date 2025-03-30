const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;
let referenceQueue = [];
let currentGlobalIndex = 0;
const CROSSREF_API_URL = "https://api.crossref.org/works?query=cannabis&rows=1000";
const ROTATION_INTERVAL_MS = 20000; // Rotate every 10 seconds
const BATCH_SIZE = 10; // Number of references to show at once

app.use(cors());

// Track the last rotation time
let lastRotationTime = Date.now();

async function fetchAndStoreReferences() {
    try {
        const response = await axios.get(CROSSREF_API_URL);
        const rawEntries = response.data.message.items;

        referenceQueue = rawEntries
            .filter(entry => entry.title && entry.DOI && entry.author && entry["published-print"])
            .map(entry => ({
                title: entry.title[0],
                doi: entry.DOI,
                author: entry.author.map(a => `${a.given} ${a.family}`).join(", "),
                year: entry["published-print"]["date-parts"][0][0]
            }));

        console.log(`Fetched and stored ${referenceQueue.length} valid references.`);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// Update the global index based on time
function updateGlobalIndex() {
    const now = Date.now();
    const timeSinceLastRotation = now - lastRotationTime;
    const rotations = Math.floor(timeSinceLastRotation / ROTATION_INTERVAL_MS);
    
    if (rotations > 0) {
        if (referenceQueue.length > 0) {
            currentGlobalIndex = (currentGlobalIndex + (BATCH_SIZE * rotations)) % referenceQueue.length;
        }
        lastRotationTime = now - (timeSinceLastRotation % ROTATION_INTERVAL_MS);
    }
}

// Get the current batch of references for all users
function getCurrentBatch() {
    if (referenceQueue.length === 0) return [];
    
    // Calculate the end index, handling wrap-around
    let endIndex = currentGlobalIndex + BATCH_SIZE;
    if (endIndex > referenceQueue.length) {
        // If we need to wrap around, concatenate the beginning
        return [
            ...referenceQueue.slice(currentGlobalIndex),
            ...referenceQueue.slice(0, endIndex % referenceQueue.length)
        ];
    }
    return referenceQueue.slice(currentGlobalIndex, endIndex);
}

// Endpoint that all users hit to get the same references
app.get("/references", (req, res) => {
    updateGlobalIndex(); // Update position based on time
    const currentBatch = getCurrentBatch();
    res.json(currentBatch);
});

// Initialize and start periodic tasks
function initialize() {
    fetchAndStoreReferences();
    
    // Refresh data periodically (e.g., every hour)
    setInterval(fetchAndStoreReferences, 3600000);
    
    // Update index periodically (more frequently than rotation to keep it smooth)
    setInterval(updateGlobalIndex, 1000);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initialize();
});