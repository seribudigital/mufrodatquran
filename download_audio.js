const fs = require('fs');
const path = require('path');
const https = require('https');

const AUDIO_DIR = path.join(__dirname, 'audio_juz30');
const SURAH_FILE = path.join(__dirname, 'daftar_surah.json');

// Membuat folder jika belum ada
if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Membaca daftar surah
if (!fs.existsSync(SURAH_FILE)) {
    console.error('File daftar_surah.json tidak ditemukan!');
    process.exit(1);
}

const surahList = JSON.parse(fs.readFileSync(SURAH_FILE, 'utf8'));
// Filter Surah 78 (An-Naba') sampai 114 (An-Nas) -> Juz 30
const juz30Surahs = surahList.filter(s => s.id >= 78 && s.id <= 114);

// Kumpulkan seluruh daftar antrean download (surah & ayat)
const queue = [];
juz30Surahs.forEach(surah => {
    for (let ayat = 1; ayat <= surah.total_ayat; ayat++) {
        queue.push({
            surahId: surah.id,
            surahName: surah.nama_latin,
            ayatNum: ayat
        });
    }
});

console.log(`Menemukan ${juz30Surahs.length} surah di Juz 30 dengan total ${queue.length} ayat.`);
console.log('Memulai proses unduhan audio offline...');

let currentIndex = 0;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper untuk fetch JSON dari API
function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Gagal fetch JSON, status code: ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// Helper untuk download file dari URL
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(destPath, () => {});
                reject(new Error(`Gagal download file, status code: ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

async function processQueue() {
    if (currentIndex >= queue.length) {
        console.log('\n🎉 Semua file audio Juz 30 berhasil diunduh secara offline!');
        return;
    }

    const item = queue[currentIndex];
    const fileName = `${item.surahId}_${item.ayatNum}.mp3`;
    const destPath = path.join(AUDIO_DIR, fileName);

    const progressPercent = Math.round((currentIndex / queue.length) * 100);
    const progressText = `[${currentIndex + 1}/${queue.length}] (${progressPercent}%)`;

    // Cek jika file sudah terdownload sebelumnya (skip jika sudah ada)
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
        console.log(`${progressText} Skip (Sudah ada): Surah ${item.surahId} (${item.surahName}) Ayat ${item.ayatNum}`);
        currentIndex++;
        processQueue();
        return;
    }

    console.log(`${progressText} Mengunduh: Surah ${item.surahId} (${item.surahName}) Ayat ${item.ayatNum}...`);

    try {
        // Dapatkan URL audio dari Alquran.cloud API
        const apiUrl = `https://api.alquran.cloud/v1/ayah/${item.surahId}:${item.ayatNum}/ar.alafasy`;
        const apiData = await fetchJson(apiUrl);
        
        if (apiData && apiData.data && apiData.data.audio) {
            const audioUrl = apiData.data.audio;
            await downloadFile(audioUrl, destPath);
            console.log(`   ✓ Berhasil disimpan: ${fileName}`);
        } else {
            throw new Error('URL audio tidak ditemukan dalam respons API.');
        }
    } catch (error) {
        console.error(`   ✗ Gagal mengunduh Surah ${item.surahId} Ayat ${item.ayatNum}: ${error.message}`);
    }

    currentIndex++;
    // Delay 1 detik sebelum download berikutnya
    await delay(1000);
    processQueue();
}

processQueue();
