import { S3 } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import path from "path";
import "dotenv/config";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";
import { v4 as uuid } from "uuid";

// Obtenir l'équivalent de __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENDPOINT = process.env.SCW_ENDPOINT as string;
const BUCKET_NAME = process.env.SCW_BUCKET_NAME as string;
const S3_REGION = process.env.SCW_REGION as string;
const ACCESS_KEY_ID = process.env.SCW_ACCESS_KEY as string;
const SECRET_KEY = process.env.SCW_SECRET_KEY as string;

console.log({
    endpoint: ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_KEY,
    },
});

// Create S3 service object
const s3 = new S3({
    endpoint: ENDPOINT,
    region: S3_REGION,
    credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_KEY,
    },
});

// Définir les résolutions et les paramètres
const resolutions = [
    { name: "1080p", bitrate: "5000k", maxrate: "5350k", bufsize: "7500k", width: 1920, height: 1080 },
    { name: "720p", bitrate: "3000k", maxrate: "3210k", bufsize: "4500k", width: 1280, height: 720 },
    { name: "480p", bitrate: "1500k", maxrate: "1605k", bufsize: "2250k", width: 854, height: 480 },
    { name: "140p", bitrate: "500k", maxrate: "600k", bufsize: "750k", width: 256, height: 140 },
];

(async () => {
    const folderKey = uuid();
    const folderPath = `${__dirname}/${folderKey}/`;
    try {
        mkdirSync(folderPath);
    } catch (e) {
        console.error(`Could not create folder path : ${folderPath}`);
    }

    const promises = resolutions.map(({ name, bitrate, maxrate, bufsize, width, height }) => {
        return new Promise((resolve, reject) => {
            const ffmpeg = spawn("ffmpeg", [
                "-i",
                "https://4mots-live.s3.fr-par.scw.cloud/input.mov",
                "-filter_complex",
                `[0:v]scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease[vout]`,
                "-map",
                "[vout]",
                "-map",
                "0:a",
                "-c:a",
                "aac",
                "-ar",
                "48000",
                "-c:v",
                "h264",
                "-profile:v",
                "high",
                "-crf",
                "20",
                "-sc_threshold",
                "0",
                "-g",
                "48",
                "-keyint_min",
                "48",
                "-hls_time",
                "6",
                "-hls_playlist_type",
                "vod",
                "-b:v",
                bitrate,
                "-maxrate",
                maxrate,
                "-bufsize",
                bufsize,
                "-hls_segment_filename",
                path.join(folderPath, `${name}_%03d.ts`), // Segments stockés dans le répertoire courant
                "-f",
                "hls",
                path.join(folderPath, `${name}.m3u8`), // Playlist HLS stockée dans le répertoire courant
            ]);

            ffmpeg.on("close", () => {
                resolve(true);
            });
            ffmpeg.on("error", () => {
                reject();
            });
        });
    });
    try {
        await Promise.all(promises);
    } catch (err) {
        console.log(err);
    }
})();
