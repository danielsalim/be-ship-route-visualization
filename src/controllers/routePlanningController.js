const fs = require('fs');
const path = require('path');
const { aStarAlgorithm } = require('../services/routePlanningService');

exports.generateRoute = (req, res) => {
    const { start, end } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: "Start and end points are required" });
    }

    // Path to the LNDARE.geojson file
    const geojsonFilePath = path.join(__dirname, '../../data/s-57/geojson/LNDARE.geojson');

    try {
        // Read the GeoJSON file
        const geojsonData = fs.readFileSync(geojsonFilePath, 'utf8');

        // Parse the GeoJSON data
        const geojson = JSON.parse(geojsonData);

        // Extract features
        const features = geojson.features;

        // Generate the route using aStarAlgorithm and include features
        const route = aStarAlgorithm(start, end, features);
        console.log(route)
        res.json({ route });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
