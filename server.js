const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

let savedReferences = [];
let pushedReferences = [];

app.get("/fetch-references", async (req, res) => {
    try {
        res.set("Cache-Control", "no-store"); // Prevent caching

        const randomOffset = Math.floor(Math.random() * 500); // Randomly shift results
        const response = await axios.get(`https://api.crossref.org/works?query=cannabis&rows=50&offset=${randomOffset}`);

        res.json(response.data.message.items);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch references" });
    }
});



// Save a reference
app.post("/save-reference", (req, res) => {
    const reference = req.body;
    if (!savedReferences.find((ref) => ref.DOI === reference.DOI)) {
        savedReferences.push(reference);
    }
    res.json(savedReferences);
});

// Delete a reference
app.post("/delete-reference", (req, res) => {
    const { DOI } = req.body;
    savedReferences = savedReferences.filter((ref) => ref.DOI !== DOI);
    console.log(`Reference with DOI ${DOI} deleted!`); // Debugging log
    res.json({ success: true, message: "Reference deleted!" });
});

// Push saved references without replacing existing pushed references
// Push saved references and remove them from saved list
app.post("/push-references", async (req, res) => {
    try {
        // Add only new references that are not already in pushedReferences
        const newPushed = savedReferences.filter(
            (ref) => !pushedReferences.some((pushed) => pushed.DOI === ref.DOI)
        );
        pushedReferences = [...pushedReferences, ...newPushed]; // Append new references

        savedReferences = []; // Clear saved references after pushing
        console.log("Saved references pushed and cleared!"); // Debugging log

        res.json({ success: true, message: "References pushed successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to push references" });
    }
});


// Retrieve pushed references
app.get("/get-pushed-references", (req, res) => {
    res.json(pushedReferences);
});

app.post("/delete-all-pushed-references", (req, res) => {
    pushedReferences = []; // Clear the pushed references
    console.log("All pushed references have been deleted!"); // Debugging log
    res.json({ success: true, message: "All pushed references deleted!" });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
