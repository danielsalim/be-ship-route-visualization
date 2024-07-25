import yaml from 'js-yaml';

// Function to specifically remove the leading 'R' from keys
const normalizeKey = (key) => key.startsWith('R') ? key.slice(1) : key;

const convertYamlToGeoJson = (yamlData) => {
    const features = [];

    // Convert Points
    const points = {};
    if (Array.isArray(yamlData.Points)) {
        yamlData.Points.forEach(point => {
            const [lon, lat] = point.Location.split(',').map(Number);
            points[point.Name] = [lon, lat];
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lon, lat],
                },
                properties: { name: point.Name },
            });
        });
    }

    // Convert Curves
    const curves = {};
    if (Array.isArray(yamlData.Curves)) {
        yamlData.Curves.forEach(curve => {
            if (!curve.Vertices) {
                console.warn(`Missing Vertices for curve: ${curve.Name}`);
                return;
            }
            const vertices = curve.Vertices.split(',').map(Number);
            const coordinates = [];
            for (let i = 0; i < vertices.length; i += 2) {
                coordinates.push([vertices[i], vertices[i + 1]]);
            }
            curves[curve.Name] = coordinates;
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
                properties: { name: curve.Name },
            });
        });
    }

    // Convert CompositeCurves
    if (Array.isArray(yamlData.CompositeCurves)) {
        yamlData.CompositeCurves.forEach(compositeCurve => {
            const coordinates = [];
            compositeCurve.Components.split(',').forEach(component => {
                const normalizedKey = normalizeKey(component);
                const curveCoordinates = curves[normalizedKey];
                if (curveCoordinates) {
                    coordinates.push(...curveCoordinates);
                } else {
                    console.warn(`Missing component curve for composite curve: ${compositeCurve.Name}`);
                }
            });
            curves[compositeCurve.Name] = coordinates;
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
                properties: { name: compositeCurve.Name },
            });
        });
    }

    // Convert Surfaces
    if (Array.isArray(yamlData.Surfaces)) {
        yamlData.Surfaces.forEach(surface => {
            const exteriorCurve = curves[surface.Exterior];
            if (!exteriorCurve) {
                console.warn(`Missing exterior curve for surface: ${surface.Name}`);
                return;
            }
            const interiorCoordinates = [];
            if (surface.Interior) {
                surface.Interior.forEach(hole => {
                    const holeCurve = curves[normalizeKey(hole.Hole)];
                    if (!holeCurve) {
                        console.warn(`Missing hole curve for surface: ${surface.Name}`);
                        return;
                    }
                    interiorCoordinates.push(holeCurve);
                });
            }
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [exteriorCurve].concat(interiorCoordinates),
                },
                properties: { name: surface.Name },
            });
        });
    }

    // Convert Features
    if (Array.isArray(yamlData.Features)) {
        yamlData.Features.forEach(feature => {
            const geometry = features.find(f => f.properties.name === feature.Geometry);
            if (!geometry) {
                console.warn(`Missing geometry for feature: ${feature.Name}`);
                return;
            }
            features.push({
                type: 'Feature',
                geometry: geometry.geometry,
                properties: {
                    name: feature.Name,
                    foid: feature.Foid,
                    prim: feature.Prim,
                    attributes: feature.Attributes,
                },
            });
        });
    }

    return { type: 'FeatureCollection', features };
};

export default convertYamlToGeoJson;