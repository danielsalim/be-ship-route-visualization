const express = require('express');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const convertYamlToGeoJson = require('./src/convertYamlToGeoJson');

const app = express();
const port = 3000;

app.get('/convert', (req, res) => {
    // Specify the YAML file to convert
    const yamlFileName = req.query.file || '101AA00DS0001.yaml'; // Default to 's101-dataset1.yaml' if not specified
    const yamlFilePath = path.join(__dirname, 'data', 'yaml', yamlFileName);

    // Check if the YAML file exists
    if (!fs.existsSync(yamlFilePath)) {
        return res.status(404).json({ error: 'YAML file not found' });
    }

    // Read and convert the YAML file
    const yamlData = yaml.load(fs.readFileSync(yamlFilePath, 'utf8'));
    const geojsonData = convertYamlToGeoJson(yamlData);

    // Define the output file path
    const outputFileName = `${path.parse(yamlFileName).name}.geojson`;
    const outputFilePath = path.join(__dirname, 'data', 'geojson', outputFileName);

    // Write the GeoJSON data to the file
    fs.writeFileSync(outputFilePath, JSON.stringify(geojsonData, null, 2));

    // Respond with the path to the converted file
    res.json({ message: 'Conversion successful', filePath: outputFilePath });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
