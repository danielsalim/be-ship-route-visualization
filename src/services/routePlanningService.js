const turf = require('@turf/turf');

const aStarAlgorithm = (start, goal, features, lambda = 0.5, omega = 0.5) => {
    const isCloseEnough = (coord1, coord2, tolerance = 20) => {
        return turf.distance(turf.point(coord1), turf.point(coord2), { units: 'meters' }) < tolerance;
    };

    const coordinateToString = (coord) => `${coord[0]},${coord[1]}`;

    const openSet = [start];
    const cameFrom = {};
    const gScore = {};
    const fScore = {};

    gScore[coordinateToString(start)] = 0;
    fScore[coordinateToString(start)] = heuristic(start, goal);

    while (openSet.length > 0) {
        let current = openSet.reduce((acc, node) => {
            return fScore[coordinateToString(node)] < fScore[coordinateToString(acc)] ? node : acc;
        });

        console.log(`Current Node: ${current}, Heuristic: ${heuristic(current, goal)}`);

        if (isCloseEnough(current, goal)) {
            const path = [];
            console.log("Goal reached");
            while (current) {
                path.push(current);
                if (isCloseEnough(current, start)) {
                    break;
                }
                current = cameFrom[coordinateToString(current)];
            }
            path.push(start);
            path.unshift(goal);
            return path.reverse();
        }

        openSet.splice(openSet.indexOf(current), 1);

        const neighbors = generateNeighbors(current);
        neighbors.forEach(neighbor => {
            const tentativeGScore = gScore[coordinateToString(current)] + heuristic(current, neighbor);
            if (tentativeGScore < (gScore[coordinateToString(neighbor)] || Infinity)) {
                cameFrom[coordinateToString(neighbor)] = current;
                gScore[coordinateToString(neighbor)] = tentativeGScore;
                fScore[coordinateToString(neighbor)] = gScore[coordinateToString(neighbor)] + heuristic(neighbor, goal) + additionalCost(neighbor, features);
                if (!openSet.some(node => isCloseEnough(node, neighbor))) {
                    openSet.push(neighbor);
                }
            }
        });

    }

    return []; // No path found
};

const heuristic = (start, goal) => {
    // Example: Euclidean distance
    return turf.distance(turf.point(start), turf.point(goal), { units: 'meters' });
};

const additionalCost = (node, features) => {
    // Example: Check if the node is within any obstacle
    let cost = 0;
    features.forEach(feature => {
        if (turf.booleanPointInPolygon(turf.point(node), feature.geometry)) {
            cost += 99999999; // Example cost for being within an obstacle
        }
    });
    return cost;
};

const generateNeighbors = (node) => {
    const distance = 0.0003; // Approx. 200m in degrees
    const [x, y] = node;
    return [
        [x + distance, y],                    // Right
        [x - distance, y],                    // Left
        [x, y + distance],                    // Down
        [x, y - distance],                    // Up
        [x + distance, y + distance],          // Down-Right
        [x - distance, y + distance],          // Down-Left
        [x + distance, y - distance],          // Up-Right
        [x - distance, y - distance],          // Up-Left


        // [x, y - distance],                    // Up
        // [x - distance * Math.cos(Math.PI / 6), y - distance * Math.sin(Math.PI / 6)],  // Up-Left
        // [x - distance, y],                    // Left
        // [x - distance * Math.cos(Math.PI / 6), y + distance * Math.sin(Math.PI / 6)],  // Down-Left
        // [x, y + distance],                    // Down
        // [x + distance * Math.cos(Math.PI / 6), y + distance * Math.sin(Math.PI / 6)],  // Down-Right
        // [x + distance, y],                    // Right
        // [x + distance * Math.cos(Math.PI / 6), y - distance * Math.sin(Math.PI / 6)],  // Up-Right
        // [x - distance * Math.cos(Math.PI / 3), y - distance * Math.sin(Math.PI / 3)],  // Slightly Up-Left
        // [x - distance * Math.cos(Math.PI / 3), y + distance * Math.sin(Math.PI / 3)],  // Slightly Down-Left
        // [x + distance * Math.cos(Math.PI / 3), y - distance * Math.sin(Math.PI / 3)],  // Slightly Up-Right
        // [x + distance * Math.cos(Math.PI / 3), y + distance * Math.sin(Math.PI / 3)],  // Slightly Down-Right   d
        
    ];
};

module.exports = {
    aStarAlgorithm
};
