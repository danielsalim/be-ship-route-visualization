// src/convertYamlToGeoJson.js
const fs = require('fs');
const yaml = require('js-yaml');

const convertYamlToGeoJson = (yamlData) => {
    const features = [];

    // Convert Points
    yamlData.Points.forEach(point => {
        const [lon, lat] = point.Location.split(',').map(Number);
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lon, lat],
            },
            properties: { name: point.Name },
        });
    });

    // Convert Curves
    yamlData.Curves.forEach(curve => {
        const vertices = curve.Vertices.split(',').map(Number);
        const coordinates = [];
        for (let i = 0; i < vertices.length; i += 2) {
            coordinates.push([vertices[i], vertices[i + 1]]);
        }
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates,
            },
            properties: { name: curve.Name },
        });
    });

    // Convert Surfaces
    yamlData.Surfaces.forEach(surface => {
        const exteriorCurve = yamlData.Curves.find(curve => curve.Name === surface.Exterior);
        const exteriorVertices = exteriorCurve.Vertices.split(',').map(Number);
        const exteriorCoordinates = [];
        for (let i = 0; i < exteriorVertices.length; i += 2) {
            exteriorCoordinates.push([exteriorVertices[i], exteriorVertices[i + 1]]);
        }
        const interiorCoordinates = [];
        if (surface.Interior) {
            surface.Interior.forEach(hole => {
                const holeCurve = yamlData.Curves.find(curve => curve.Name === hole);
                const holeVertices = holeCurve.Vertices.split(',').map(Number);
                const holeCoordinates = [];
                for (let i = 0; i < holeVertices.length; i += 2) {
                    holeCoordinates.push([holeVertices[i], holeVertices[i + 1]]);
                }
                interiorCoordinates.push(holeCoordinates);
            });
        }
        features.push({
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [exteriorCoordinates].concat(interiorCoordinates),
            },
            properties: { name: surface.Name },
        });
    });

    return { type: 'FeatureCollection', features };
};

module.exports = convertYamlToGeoJson;