// worker.ts
type WorkerInput = {
    imageData: ImageData;
    radius: number;
    width: number;
    height: number;
};

function calculateOptimalChunkSize(width: number, height: number): number {
    // Larger chunks for bigger images
    const totalPixels = width * height;
    if (totalPixels > 4000000) return 400; // 4MP+
    if (totalPixels > 1000000) return 200; // 1MP+
    return 100; // smaller images
}

function processImageChunk(
    imageData: ImageData,
    radius: number,
    startX: number,
    endX: number,
    startY: number,
    endY: number,
    result: Record<string, { r: number; c: [number, number, number, number] }>
): void {
    const data = imageData.data;
    const width = imageData.width;

    // Pre-calculate values outside loop
    const radiusHalf = radius / 2;

    for (let x = startX + radiusHalf; x < endX; x += radius) {
        const xBase = Math.floor(x);
        for (let y = startY + radiusHalf; y < endY; y += radius) {
            const yBase = Math.floor(y);
            const index = (yBase * width + xBase) * 4;

            // Direct array access is faster
            result[`${xBase},${yBase}`] = {
                r: radius,
                c: [data[index], data[index + 1], data[index + 2], data[index + 3]]
            };
        }
    }
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
    const { imageData, radius, width, height } = e.data;
    const result: Record<string, { r: number; c: [number, number, number, number] }> = {};

    // Calculate optimal chunk size
    const chunkSize = calculateOptimalChunkSize(width, height);
    const totalChunks = Math.ceil(width / chunkSize) * Math.ceil(height / chunkSize);
    let processedChunks = 0;

    // Pre-allocate chunks array for better memory management
    const chunks: Array<[number, number, number, number]> = [];
    for (let x = 0; x < width; x += chunkSize) {
        for (let y = 0; y < height; y += chunkSize) {
            chunks.push([
                x,
                Math.min(x + chunkSize, width),
                y,
                Math.min(y + chunkSize, height)
            ]);
        }
    }

    // Process chunks
    for (const [startX, endX, startY, endY] of chunks) {
        processImageChunk(imageData, radius, startX, endX, startY, endY, result);

        processedChunks++;
        if (processedChunks % 2 === 0) {
            // Cap progress at 99.9%
            const progress = Math.min(
                (processedChunks / totalChunks) * 100,
                99.9
            );
            self.postMessage({
                type: 'progress',
                progress
            });
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    self.postMessage({
        type: 'complete',
        data: result
    });
};