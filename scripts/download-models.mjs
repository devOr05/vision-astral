import fs from 'fs';
import path from 'path';
import https from 'https';

const MODELS_DIR = path.join(process.cwd(), 'public', 'models');
const BASE_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

const files = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2',
    'face_expression_model-weights_manifest.json',
    'face_expression_model-shard1'
];

if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const downloadFile = (filename) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path.join(MODELS_DIR, filename));
        https.get(`${BASE_URL}/${filename}`, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${filename}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(path.join(MODELS_DIR, filename), () => {});
            reject(err);
        });
    });
};

const main = async () => {
    console.log(`Downloading models to ${MODELS_DIR}...`);
    try {
        await Promise.all(files.map(file => downloadFile(file)));
        console.log('All models downloaded successfully!');
    } catch (err) {
        console.error('Error downloading models:', err);
    }
};

main();
