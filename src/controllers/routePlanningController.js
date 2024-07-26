import { aStarAlgorithm } from '../services/routePlanningService.js';
import { getS57Layers, readGeoJSONFilesFromGeoServer } from '../services/s57LayersService.js';

const generateRoute = async (req, res) => {
    const { start, end, minimumDepth, maxDistanceFromLand, neighborDistance } = req.body;

    if (!start || !end) {
        return res.status(400).json({ error: "Start and end points are required" });
    }

    try {
        const layers = await getS57Layers();
        const layerNames = layers.map(layer => layer.name); // Adjust this as needed if the layer names are structured differently
        const features = await readGeoJSONFilesFromGeoServer(layerNames);

        const route = aStarAlgorithm(start, end, features, minimumDepth, maxDistanceFromLand, neighborDistance);
        res.json(route);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default generateRoute;