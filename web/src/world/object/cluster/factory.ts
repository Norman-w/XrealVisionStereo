import * as THREE from "three";

function createCluster(spawnX: number): THREE.Group {
    const cluster = new THREE.Group();

    const boxHeightY = Math.random() * 12 + 26;
    const boxWidthX = boxHeightY * (Math.random() * 0.6 + 0.3);
    const boxDepthZ = boxWidthX * (Math.random() * 0.05 + 0.1);

    const blocksPerCluster = Math.floor(Math.random() * 30) + 25;

    cluster.position.x = spawnX;
    cluster.position.y = (Math.random() - 0.5) * 30;
    // Adjust Z position to be further away
    // Original: (Math.random() - 0.5) * 60 - 50; // Approx range [-80, -20)
    // New range: e.g., [-95, -35)
    cluster.position.z = (Math.random() - 0.5) * 60 - 65; // Approx range [-95, -35)

    // Create the outline for the bounding box
    const boxOutlineGeometry = new THREE.BoxGeometry(boxWidthX, boxHeightY, boxDepthZ);
    const edgesGeometry = new THREE.EdgesGeometry(boxOutlineGeometry);
    const outlineMaterial = new THREE.LineBasicMaterial({
        color: 0x0077aa, // Slightly darker blue for the lines themselves
        // color: 0x001133, // Slightly darker blue for the lines themselves
    });

    // Glow box for the outline's bloom effect
    const glowBoxMaterial = new THREE.MeshBasicMaterial({
        color: 0x004477, // Darker, less saturated blue (was 0x00aaff)
        // Removed emissive and emissiveIntensity as they are not valid for MeshBasicMaterial
        transparent: true,
        opacity: 0.12, // Further reduced opacity (was 0.15)
        side: THREE.BackSide
    });
    const glowBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(boxWidthX * 1.05, boxHeightY * 1.05, boxDepthZ * 1.05), glowBoxMaterial);
    cluster.add(glowBoxMesh);
    cluster.userData.glowBoxMaterial = glowBoxMaterial; // Store material for dynamic opacity

    const outline = new THREE.LineSegments(edgesGeometry, outlineMaterial);
    cluster.add(outline);

    for (let j = 0; j < blocksPerCluster; j++) {
        let sizeX, sizeY, sizeZ;
        let initialIntensity;
        let blockUserData;
        let materialOpacity;

        const isStructuralBlock = Math.random() < 0.20; // 20% chance of a structural block

        if (isStructuralBlock) {
            // Structural Block - Long and thin, very low emission, corner-biased
            if (Math.random() < 0.5) { // Long in X
                sizeX = boxWidthX * (Math.random() * 0.4 + 0.5);
                sizeY = boxHeightY * (Math.random() * 0.2 + 0.05);
            } else { // Long in Y
                sizeX = boxWidthX * (Math.random() * 0.2 + 0.05);
                sizeY = boxHeightY * (Math.random() * 0.4 + 0.5);
            }
            sizeZ = boxDepthZ * (Math.random() * 0.3 + 0.1);
            sizeZ = Math.max(sizeZ, 0.03);

            initialIntensity = 0.03;
            materialOpacity = Math.random() * 0.15 + 0.25;

            blockUserData = {
                brightnessSpeed: Math.random() * 0.05,
                brightnessPhase: Math.random() * Math.PI * 2,
                initialEmissiveIntensity: initialIntensity, // This will scale the base color
                minBrightnessFactor: 0.5,
                maxBrightnessFactor: 1.5,
                baseColorForBrightness: null as THREE.Color | null // Placeholder, will be set below
            };

        } else {
            // Normal Flickering Block
            sizeX = Math.random() * 1.1 + 0.15;
            sizeY = Math.random() * 1.6 + 0.25;
            sizeZ = (Math.random() < 0.5) ? (Math.random() * 0.07 + 0.01) : (Math.random() * 0.3 + 0.04);
            sizeZ = Math.max(sizeZ, 0.01);

            initialIntensity = (Math.random() < 0.7) ? (Math.random() * 0.3 + 0.1) : (Math.random() * 0.4 + 0.4);
            materialOpacity = Math.random() * 0.25 + 0.35;

            blockUserData = {
                brightnessSpeed: Math.random() * 3.5 + 2.0,
                brightnessPhase: Math.random() * Math.PI * 2,
                initialEmissiveIntensity: initialIntensity, // This will scale the base color
                minBrightnessFactor: 0.05,
                maxBrightnessFactor: initialIntensity > 0.5 ? 3.0 : 4.5,
                baseColorForBrightness: null // Placeholder, will be set below
            };
        }

        const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
        const baseGreen = new THREE.Color(0x00dd00);
        // randomGreen is the full brightness base color before specific intensity scaling
        const randomGreenColor = baseGreen.clone().multiplyScalar(Math.random() * 0.4 + 0.6);
        blockUserData.baseColorForBrightness = randomGreenColor.clone(); // Store base color

        const material = new THREE.MeshBasicMaterial({
            // Set initial color by scaling baseColor with initialIntensity
            color: randomGreenColor.clone().multiplyScalar(initialIntensity),
            transparent: true,
            opacity: materialOpacity,
        });

        const block = new THREE.Mesh(geometry, material); // Create block first
        block.userData = blockUserData; // Then assign userData

        // Then set position
        if (isStructuralBlock) {
            const halfBoxWidthEffective = (boxWidthX - sizeX) / 2;
            const halfBoxHeightEffective = (boxHeightY - sizeY) / 2;
            const signX = Math.random() < 0.5 ? -1 : 1;
            const signY = Math.random() < 0.5 ? -1 : 1;
            block.position.x = signX * halfBoxWidthEffective;
            block.position.y = signY * halfBoxHeightEffective;
            block.position.z = (Math.random() - 0.5) * (boxDepthZ - sizeZ);
        } else {
            block.position.x = (Math.random() - 0.5) * (boxWidthX - sizeX);
            block.position.y = (Math.random() - 0.5) * (boxHeightY - sizeY);
            block.position.z = (Math.random() - 0.5) * (boxDepthZ - sizeZ);
        }

        cluster.add(block);
    }

    cluster.userData = {
        moveSpeed: (Math.random() * 0.03 + 0.06) * (Math.random() > 0.7 ? 1 : 3.6),
        clusterWidth: boxWidthX, // Use the defined box width
    };
    return cluster;
}
export { createCluster };