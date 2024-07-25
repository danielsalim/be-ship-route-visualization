import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import convertYamlToGeoJson from '../utils/convertYamlToGeoJson.js';

const convertYamlFile = (req, res) => {
    const yamlFileName = req.query.file || '101AA00DS0001.yaml';
    const yamlFilePath = path.join(__dirname, '../../data/S-101/yaml', yamlFileName);

    if (!fs.existsSync(yamlFilePath)) {
        return res.status(404).json({ error: 'YAML file not found', filePath: yamlFilePath });
    }

    try {
        const yamlData = yaml.load(fs.readFileSync(yamlFilePath, 'utf8'));
        const geojsonData = convertYamlToGeoJson(yamlData);

        const outputFileName = `${path.parse(yamlFileName).name}.json`;
        const outputFilePath = path.join(__dirname, '../../data/S-101/geojson', outputFileName);

        fs.writeFileSync(outputFilePath, JSON.stringify(geojsonData, null, 2));

        res.json({ message: 'Conversion successful', filePath: outputFilePath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export default convertYamlFile;
