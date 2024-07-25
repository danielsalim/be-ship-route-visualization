import dotenv from 'dotenv';

dotenv.config();

const GEOSERVER_URL = process.env.GEOSERVER_URL
const GEOSERVER_USERNAME = process.env.GEOSERVER_USERNAME
const GEOSERVER_PASSWORD = process.env.GEOSERVER_PASSWORD
const S57_WOKRSPACE_URL = process.env.S57_WORKSPACE_URL

async function getS57Layers() {
    try {
        const response = await fetch(`${S57_WOKRSPACE_URL}/layers`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${GEOSERVER_USERNAME}:${GEOSERVER_PASSWORD}`).toString('base64')}`
            }
        });
        const responseData = await response.json();
        return responseData.layers.layer;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

async function getS57LayersDetail(featureTypeName) {
    try {
        const response = await fetch(`${GEOSERVER_URL}/s57-tugas-akhir/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=s57-tugas-akhir:${featureTypeName}&outputFormat=application/json`);
        const responseData = await response.json();
        return responseData.features;
    } catch (error) {
        console.error("Error fetching data:", error);
        throw error;
    }
}

async function readGeoJSONFilesFromGeoServer(layerNames) {
    const allFeatures = {};

    for (const layerName of layerNames) {
        try {
            const features = await getS57LayersDetail(layerName);
            allFeatures[layerName] = features;
        } catch (error) {
            console.error(`Error fetching layer details for ${layerName}:`, error);
            throw error
        }
    }

    return allFeatures;
}

export {
    getS57Layers,
    getS57LayersDetail,
    readGeoJSONFilesFromGeoServer,
};