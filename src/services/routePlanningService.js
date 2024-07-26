import * as turf from '@turf/turf';
import rbush from 'rbush';

const aStarAlgorithm = (start, goal, features, minDepth, maxDistanceFromLand, neighborDistance) => {
    const spatialIndex = {
        lndare: buildSpatialIndex(features.lndare),
        depare: buildSpatialIndex(features.depare),
        drgare: buildSpatialIndex(features.drgare),
        wrecks: buildSpatialIndex(features.wrecks),
        obstrn: buildSpatialIndex(features.obstrn),
        boylat: buildSpatialIndex(features.boylat),
    };

    let neighborDistanceDegree = 0.001
    let tolerance = 60

    if (maxDistanceFromLand != 22224) {
        neighborDistanceDegree = 0.00075
        tolerance = 45
    }

    if (neighborDistance != 100) {
        neighborDistanceDegree = neighborDistance / 111111;
        tolerance = neighborDistance * 6 / 10
    }

    let penaltyCost = 999999999;

    const openSet = [start];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    let timeLimit = 60000; // 60 seconds
    const startTime = Date.now();

    // Check if the current node is close enough to the other node
    // if it is within the tolerance, then it is considered the same node
    const isCloseEnough = (coord1, coord2, tolerance) => {
        return turf.distance(turf.point(coord1), turf.point(coord2), { units: 'meters' }) < tolerance;
    };

    const coordinateToString = (coord) => `${coord[0]},${coord[1]}`;

    gScore[coordinateToString(start)] = 0;
    fScore[coordinateToString(start)] = heuristic(start, goal);

    while (openSet.length > 0) {
        const currentTime = Date.now();
        let current = openSet.reduce((acc, node) => {
            return fScore[coordinateToString(node)] < fScore[coordinateToString(acc)] ? node : acc;
        });

        console.log(`fScore: ${fScore[coordinateToString(current)]}, Heuristic: ${heuristic(current, goal)}`);
        // console.log("current", current)

        if (currentTime - startTime > timeLimit) {
            return { route: [], message: "No route found" };
        }

        if (fScore[coordinateToString(current)] > penaltyCost) {
            if (neighborDistanceDegree > 0.000125) {
                neighborDistanceDegree *= 0.5;
                tolerance *= 0.5;
                const previous = cameFrom[coordinateToString(current)];
                openSet.splice(openSet.indexOf(current), 1);
                openSet.push(previous);
                current = previous;
                continue;
            }
            else {
                return { route: [], message: "No route found" };
            }
        }

        if (isCloseEnough(current, goal, tolerance)) {
            if (!isPathInRestrictedArea(turf.lineString([current, goal]), features, minDepth)) {
                console.log("Goal reached");
                const path = [];
                while (current) {
                    path.push(current);
                    if (isCloseEnough(current, start, tolerance)) {
                        if (!isPathInRestrictedArea(turf.lineString([current, start]), features, minDepth)) {
                            break;
                        }
                    }
                    current = cameFrom[coordinateToString(current)];
                }
                path.push(start);
                path.unshift(goal);

                if (isPathInRestrictedArea(turf.lineString(path), features, minDepth)) {
                    return { route: [], message: "No route found" };
                }

                const route = path.reverse();
                const actualDistance = routeActualDistance(route);
                console.log(currentTime - startTime)
                return { route, distance: actualDistance };
            }
        }

        openSet.splice(openSet.indexOf(current), 1);
        console.log(neighborDistanceDegree)
        const neighbors = generateNeighbors(current, neighborDistanceDegree);

        neighbors.forEach(neighbor => {
            const tentativeGScore = gScore[coordinateToString(current)] + heuristic(current, neighbor);
            let isInSea = false;

            while (!isInSea) {
                let foundInDepare = false;
                let foundInDrgare = false;
                for (const feature of features.depare) {
                    if (turf.booleanPointInPolygon(turf.point(neighbor), feature.geometry)) {
                        isInSea = true;
                        foundInDepare = true;
                        break; // Exit the for loop early
                    }
                }
                if (!foundInDepare) {
                    for (const feature of features.drgare) {
                        if (turf.booleanPointInPolygon(turf.point(neighbor), feature.geometry)) {
                            isInSea = true;
                            foundInDrgare = true;
                            break; // Exit the for loop early
                        }
                    }
                }
                if (!foundInDepare && !foundInDrgare) {
                    break;
                }
            }

            if (tentativeGScore < (gScore[coordinateToString(neighbor)] || Infinity) && isInSea) {
                cameFrom[coordinateToString(neighbor)] = current;
                gScore[coordinateToString(neighbor)] = tentativeGScore;
                fScore[coordinateToString(neighbor)] = gScore[coordinateToString(neighbor)] + heuristic(neighbor, goal) + additionalCost(current, neighbor, spatialIndex, minDepth, penaltyCost, maxDistanceFromLand);
                openSet.push(neighbor);
            }
        });

    }
    return [];
};

const heuristic = (start, goal) => {
    return turf.distance(turf.point(start), turf.point(goal), { units: 'meters' });
    //     return Math.sqrt((start[0] - goal[0]) ** 2 + (start[1] - goal[1]) ** 2);

};

const routeActualDistance = (route) => {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        distance += heuristic(route[i], route[i + 1]);
    }
    return distance;
}

const createBoundingBox = (point, epsilon = 0.0005) => {
    const [x, y] = point.coordinates;
    return {
        minX: x - epsilon,
        minY: y - epsilon,
        maxX: x + epsilon,
        maxY: y + epsilon,
        feature: point,
    };
};

const buildSpatialIndex = (features) => {
    const index = new rbush();
    const items = features.map(feature => {
        const bbox = feature.geometry.type === 'Point'
            ? createBoundingBox(feature.geometry)
            : {
                minX: turf.bbox(feature)[0],
                minY: turf.bbox(feature)[1],
                maxX: turf.bbox(feature)[2],
                maxY: turf.bbox(feature)[3],
                feature,
            };
        return { ...bbox, feature };
    });
    index.load(items);
    return index;
};

const checkIntersectionArea = (index, line, lineBbox, minDepth) => {
    const potentialIntersections = index.search({
        minX: lineBbox[0],
        minY: lineBbox[1],
        maxX: lineBbox[2],
        maxY: lineBbox[3],
    });
    for (const item of potentialIntersections) {
        if (turf.booleanIntersects(line, item.feature.geometry)) {
            if (minDepth && item.feature.properties.drval1 < minDepth) {
                return true;
            } else if (!minDepth) {
                return true;
            }
        }
    }
    return false;
};

const checkIntersectionPoint = (index, line, lineBbox, bufferDistance) => {
    const potentialIntersections = index.search({
        minX: lineBbox[0],
        minY: lineBbox[1],
        maxX: lineBbox[2],
        maxY: lineBbox[3],
    });
    // console.log(potentialIntersections)
    for (const item of potentialIntersections) {
        if (item.feature.geometry.type === "Point") {
            const buffer = turf.buffer(item.feature.geometry, bufferDistance, { units: 'meters' });
            // console.log(turf.booleanIntersects(line, buffer))
            if (turf.booleanIntersects(line, buffer)) {
                return true;
            }
        }
        else {
            if (turf.booleanIntersects(line, item.feature.geometry)) {
                return true;
            }
        }
    }
    return false;
};

const checkIntersectionMaxDistance = (index, circle, circleBbox) => {
    let intersects = false;
    const potentialIntersections = index.search({
        minX: circleBbox[0],
        minY: circleBbox[1],
        maxX: circleBbox[2],
        maxY: circleBbox[3],
    });
    for (const item of potentialIntersections) {
        if (turf.booleanIntersects(circle, item.feature.geometry)) {
            intersects = true;
        }
    }
    if (!intersects) {
        return true;
    }
    return false;
}

const additionalCost = (current, node, spatialIndex, minDepth, penaltyCost, maxDistanceFromLand) => {
    let cost = 0;
    const line = turf.lineString([current, node]);
    const lineBbox = turf.bbox(line);
    const circle = turf.buffer(turf.point(current), maxDistanceFromLand, { units: 'meters' });
    const circleBbox = turf.bbox(circle);
    const bufferDistance = 25;

    if (checkIntersectionArea(spatialIndex.lndare, line, lineBbox)) {
        return penaltyCost; // Immediate return on land area intersection
    }

    if (checkIntersectionPoint(spatialIndex.obstrn, line, lineBbox, bufferDistance)) {
        return penaltyCost; // Immediate return on obstruction intersection
    }

    if (checkIntersectionPoint(spatialIndex.wrecks, line, lineBbox, bufferDistance)) {
        return penaltyCost; // Immediate return on wreck intersection
    }

    if (checkIntersectionPoint(spatialIndex.boylat, line, lineBbox, bufferDistance)) {
        return penaltyCost; // Immediate return on buoy intersection
    }

    if (minDepth && minDepth != -3.3) {
        if (checkIntersectionArea(spatialIndex.depare, line, lineBbox, minDepth) || checkIntersectionArea(spatialIndex.drgare, line, lineBbox, minDepth)) {
            return penaltyCost; // Immediate return on depth area intersection
        }
    }

    if (maxDistanceFromLand && maxDistanceFromLand != 22224) {
        if (checkIntersectionMaxDistance(spatialIndex.lndare, circle, circleBbox)) {
            return penaltyCost; // Immediate return on area too far from land
        }
    }



    return cost;
};

const isPathInRestrictedArea = (path, features, minDepth) => {
    const landArea = features.lndare;
    const depthArea = features.depare;
    const deradgedArea = features.drgare;
    const wrecks = features.wrecks;
    const obstrn = features.obstrn;
    const boylat = features.boylat;
    const bufferDistance = 25

    for (const feature of landArea) {
        if (turf.booleanIntersects(path, feature.geometry)) {
            return true;
        }
    }

    for (const feature of wrecks) {
        if (feature.geometry.type === "Point") {
            const buffer = turf.buffer(feature.geometry, bufferDistance, { units: 'meters' });
            if (turf.booleanIntersects(path, buffer)) {
                return true;
            }
        }
        else {
            if (turf.booleanIntersects(path, feature.geometry)) {
                return true;
            }
        }
    }

    for (const feature of obstrn) {
        if (feature.geometry.type === "Point") {
            const buffer = turf.buffer(feature.geometry, bufferDistance, { units: 'meters' });
            if (turf.booleanIntersects(path, buffer)) {
                return true;
            }
        }
        else {
            if (turf.booleanIntersects(path, feature.geometry)) {
                return true;
            }
        }
    }

    for (const feature of boylat) {
        if (feature.geometry.type === "Point") {
            const buffer = turf.buffer(feature.geometry, bufferDistance, { units: 'meters' });
            if (turf.booleanIntersects(path, buffer)) {
                return true;
            }
        }
        else {
            if (turf.booleanIntersects(path, feature.geometry)) {
                return true;
            }
        }
    }

    // Check depth area
    if (minDepth && minDepth != -3.3) {
        for (const feature of depthArea) {
            if (turf.booleanIntersects(path, feature.geometry) && minDepth > feature.properties.drval1) {
                return true;
            }
        }
        for (const feature of deradgedArea) {
            if (turf.booleanIntersects(path, feature.geometry) && minDepth > feature.properties.drval1) {
                return true;
            }
        }
    }
    return false;
};

const generateNeighbors = (node, distance) => {
    const [x, y] = node;
    return [
        [x, y - distance],                    // Up
        [x + distance, y - distance],         // Up-Right
        [x + distance, y],                    // Right
        [x + distance, y + distance],         // Down-Right
        [x, y + distance],                    // Down
        [x - distance, y + distance],         // Down-Left
        [x - distance, y],                    // Left
        [x - distance, y - distance],         // Up-Left
    ];
};

export {
    aStarAlgorithm
};
