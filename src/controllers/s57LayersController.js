import { getS57Layers, readGeoJSONFilesFromGeoServer } from '../services/s57LayersService.js';

const getS57LayersController = async (req, res) => {
    try {
        const layers = await getS57Layers();
        const layerNames = layers.map(layer => layer.name); // Adjust this as needed if the layer names are structured differently
        const features = await readGeoJSONFilesFromGeoServer(layerNames);
        res.json({ features });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default getS57LayersController;