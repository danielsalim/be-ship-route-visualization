import * as turf from '@turf/turf';
import rbush from 'rbush';

const aStarAlgorithm = (start, goal, features, minDepth, lambda = 0.5, omega = 0.5) => {
    const spatialIndex = {
        lndare: buildSpatialIndex(features.lndare),
        depare: buildSpatialIndex(features.depare),
        drgare: buildSpatialIndex(features.drgare)
    };

    let neighborDistance = 0.0005;
    let tolerance = 60;
    let penaltyCost = 999999999;

    const openSet = [start];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    let timeLimit = 30000; // 30 seconds
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
        console.log("current", current)

        if (currentTime - startTime > timeLimit) {
            return { route: [], message: "No route found. Time limit reached." };
        }

        if (fScore[coordinateToString(current)] > penaltyCost) {
            if (neighborDistance > 0.000125) {
                neighborDistance *= 0.5;
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

        const neighbors = generateNeighbors(current, neighborDistance);

        neighbors.forEach(neighbor => {
            const tentativeGScore = gScore[coordinateToString(current)] + heuristic(current, neighbor);
            if (tentativeGScore < (gScore[coordinateToString(neighbor)] || Infinity)) {
                cameFrom[coordinateToString(neighbor)] = current;
                gScore[coordinateToString(neighbor)] = tentativeGScore;
                fScore[coordinateToString(neighbor)] = gScore[coordinateToString(neighbor)] + heuristic(neighbor, goal) + additionalCost(current, neighbor, spatialIndex, minDepth, penaltyCost);
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

const buildSpatialIndex = (features) => {
    const index = new rbush();
    const items = features.map(feature => ({
        minX: turf.bbox(feature)[0],
        minY: turf.bbox(feature)[1],
        maxX: turf.bbox(feature)[2],
        maxY: turf.bbox(feature)[3],
        feature,
    }));
    index.load(items);
    return index;
};

const checkIntersection = (index, line, lineBbox, minDepth) => {
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

const additionalCost = (current, node, spatialIndex, minDepth, penaltyCost) => {
    let cost = 0;
    const line = turf.lineString([current, node]);
    const lineBbox = turf.bbox(line);

    if (checkIntersection(spatialIndex.lndare, line, lineBbox)) {
        return penaltyCost; // Immediate return on land area intersection
    }

    if (minDepth != -3.3) {
        if (checkIntersection(spatialIndex.depare, line, lineBbox, minDepth) || checkIntersection(spatialIndex.drgare, line, lineBbox, minDepth)) {
            return penaltyCost; // Immediate return on depth area intersection
        }
    }

    return cost;
};

const isPathInRestrictedArea = (path, features, minDepth) => {
    const landArea = features.lndare;
    const depthArea = features.depare;
    const deradgedArea = features.drgare;

    for (const feature of landArea) {
        if (turf.booleanIntersects(path, feature.geometry)) {
            return true;
        }
    }
    // Check depth area
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
    return false;
};

const generateNeighbors = (node, distance) => {
    console.log(distance)
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
