const STORAGE_KEY = 'kosakata_dihafal';

const app = {
    userData: null,
    allData: [],
    terjemahanData: [],
    daftarSurahData: [],
    hafalData: [],
    currentJuz: 30,
    currentSurah: null,
    surahData: [],
    
    // Flashcard State
    fcIndex: 0,
    
    // Kuis State
    kuisQuestions: [],
    kuisIndex: 0,
    kuisScore: 0,
    kuisHasAnswered: false,

    // Baca Quran State
    bacaMode: 'saja',

    // Tutup Kata State
    isArabBlurred: false,
    isIndoBlurred: false,

    // Ujian Hafalan State
    ujianQuestions: [],
    ujianIndex: 0,
    ujianScore: 0,
    ujianTimer: 10,
    ujianInterval: null,
    ujianHistory: [],
    ujianHasAnswered: false,

    async init() {
        this.loadHafalData();
        
        const historyStored = localStorage.getItem('ujian_history');
        if (historyStored) {
            try {
                this.ujianHistory = JSON.parse(historyStored);
            } catch(e) {
                console.error('Failed to parse ujian_history', e);
                this.ujianHistory = [];
            }
        }

        const userStored = localStorage.getItem('userData');
        if (userStored) {
            try {
                this.userData = JSON.parse(userStored);
            } catch(e) {
                console.error('Failed to parse userData', e);
                this.userData = null;
            }
        }

        await this.loadDaftarSurah();
        await this.loadData(this.currentJuz);
        
        if (this.userData) {
            this.showDashboard();
        } else {
            this.showView('view-welcome');
            document.getElementById('nav-actions').classList.add('hidden');
        }
    },

    loadHafalData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this.hafalData = JSON.parse(stored);
            } catch(e) {
                console.error('Failed to parse hafalData', e);
                this.hafalData = [];
            }
        } else {
            this.hafalData = [];
        }
    },

    saveHafalData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hafalData));
    },

    async loadDaftarSurah() {
        try {
            const response = await fetch('daftar_surah.json');
            this.daftarSurahData = await response.json();
        } catch (error) {
            console.error("Gagal memuat daftar surah:", error);
        }
    },

    async changeJuz(juzNum) {
        this.currentJuz = parseInt(juzNum);
        await this.loadData(this.currentJuz);
        this.showDashboard();
    },

    async loadData(juzNum) {
        try {
            // Memuat file JSON secara dinamis
            const response = await fetch(`juz${juzNum}.json`);
            this.allData = await response.json();
            
            const responseTerjemahan = await fetch(`terjemahan_ayat_juz${juzNum}.json`);
            this.terjemahanData = await responseTerjemahan.json();
        } catch (error) {
            console.error("Gagal memuat data:", error);
            alert(`Gagal memuat data Juz ${juzNum}. Pastikan file json tersedia.`);
        }
    },

    getWordId(word) {
        const juz = word.juz || this.currentJuz;
        return `${juz}_${word.surah}_${word.ayat}_${word.urutan_kata}`;
    },

    showView(viewId) {
        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
        });
        
        const target = document.getElementById(viewId);
        target.classList.remove('hidden');
        target.style.display = '';
        
        const navActions = document.getElementById('nav-actions');
        if (viewId === 'view-dashboard') {
            navActions.classList.add('hidden');
        } else {
            navActions.classList.remove('hidden');
        }
    },

    // --- WELCOME SCREEN ---
    updateKategoriForm() {
        const kategori = document.getElementById('welcome-kategori').value;
        const labelDetail = document.getElementById('label-detail');
        const inputDetail = document.getElementById('welcome-detail');
        
        if (kategori === 'Pelajar/Santri') {
            labelDetail.textContent = 'Kelas / Nama Instansi Sekolah';
            inputDetail.placeholder = 'Contoh: Kelas 10 / SMA Bina Bangsa';
        } else {
            labelDetail.textContent = 'Profesi / Asal Kota (Opsional)';
            inputDetail.placeholder = 'Contoh: Guru / Jakarta';
        }
    },

    simpanProfil() {
        const nama = document.getElementById('welcome-nama').value.trim();
        const kategori = document.getElementById('welcome-kategori').value;
        const detail = document.getElementById('welcome-detail').value.trim();

        if (!nama) {
            alert('Silakan masukkan Nama Lengkap Anda terlebih dahulu!');
            return;
        }

        this.userData = {
            nama: nama,
            kategori: kategori,
            detail: detail
        };

        localStorage.setItem('userData', JSON.stringify(this.userData));
        
        const welcomeView = document.getElementById('view-welcome');
        welcomeView.style.opacity = '0';
        welcomeView.style.transition = 'opacity 0.4s ease';
        
        setTimeout(() => {
            welcomeView.style.opacity = '1';
            this.showDashboard();
        }, 400);
    },

    // --- DASHBOARD ---
    showDashboard() {
        if (this.userData) {
            const profileNavEl = document.getElementById('user-profile-nav');
            if (profileNavEl) {
                profileNavEl.classList.remove('hidden');
                profileNavEl.classList.add('flex');
                
                const nameEl = document.getElementById('user-nav-name');
                const avatarEl = document.getElementById('user-nav-avatar');
                
                if (nameEl) nameEl.textContent = this.userData.nama || 'User';
                if (avatarEl) {
                    avatarEl.textContent = this.userData.nama ? this.userData.nama.charAt(0) : 'U';
                }
            }

            const heroGreetingEl = document.getElementById('hero-greeting');
            if (heroGreetingEl) {
                heroGreetingEl.textContent = `Ahlan wa Sahlan, ${this.userData.nama}! 👋`;
            }
        }

        this.showView('view-dashboard');
        const container = document.getElementById('surah-list');
        container.innerHTML = '';

        // Mengelompokkan data berdasarkan surat untuk dashboard
        const surahMap = new Map();
        this.allData.forEach(word => {
            if (!surahMap.has(word.surah)) {
                surahMap.set(word.surah, { id: word.surah, totalWords: 0, memorizedWords: 0 });
            }
            const surahInfo = surahMap.get(word.surah);
            surahInfo.totalWords++;
            if (this.hafalData.includes(this.getWordId(word))) {
                surahInfo.memorizedWords++;
            }
        });

        // Tampilkan kartu untuk setiap surat
        const sortedSurahs = Array.from(surahMap.values()).sort((a, b) => b.id - a.id);
        
        if (sortedSurahs.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">Data tidak tersedia.</p>`;
            return;
        }

        sortedSurahs.forEach(surah => {
            const progress = surah.totalWords === 0 ? 0 : Math.round((surah.memorizedWords / surah.totalWords) * 100);
            
            const surahMeta = this.daftarSurahData.find(s => s.id === surah.id);
            const namaSurah = surahMeta ? surahMeta.nama_latin : `Surat ${surah.id}`;
            const namaArabic = surahMeta ? surahMeta.nama_arabic : '';
            const totalAyat = surahMeta ? surahMeta.total_ayat : '?';
            
            const card = document.createElement('div');
            card.className = "bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition flex flex-col justify-between";
            card.onclick = () => this.showSurahMenu(surah.id);
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${surah.id}. ${namaSurah}</h3>
                        <p class="text-xs text-gray-500">${totalAyat} Ayat</p>
                    </div>
                    <span class="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">${progress}%</span>
                </div>
                <div class="flex justify-between items-center mb-3 mt-1">
                    <p class="font-arabic text-xl text-emerald-600" dir="rtl">${namaArabic}</p>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                </div>
                <p class="text-xs text-gray-500 text-right">${surah.memorizedWords} dari ${surah.totalWords} kata dihafal</p>
            `;
            container.appendChild(card);
        });
    },

    // --- SURAH MENU ---
    showSurahMenu(surahNum = this.currentSurah) {
        if (!surahNum) {
            this.showDashboard();
            return;
        }
        this.currentSurah = surahNum;
        this.surahData = this.allData.filter(w => w.surah === surahNum);
        
        const surahMeta = this.daftarSurahData.find(s => s.id === surahNum);
        const titleText = surahMeta ? `${surahNum}. ${surahMeta.nama_latin} (${surahMeta.nama_arabic})` : `Surat ${surahNum}`;
        document.getElementById('menu-surah-title').textContent = titleText;
        
        // Update nav back button to point to dashboard
        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showDashboard()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Dashboard
            </button>
        `;

        this.showView('view-surah-menu');
    },

    // --- FITUR: BACA QURAN ---
    startBacaQuran() {
        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Menu
            </button>
        `;
        this.showView('view-baca-quran');
        this.renderBacaQuran();
    },

    setBacaMode(mode) {
        this.bacaMode = mode;
        const btnSaja = document.getElementById('btn-quran-saja');
        const btnTerjemah = document.getElementById('btn-quran-terjemah');

        if (mode === 'saja') {
            btnSaja.className = 'px-4 py-2 bg-white shadow-sm text-emerald-700 rounded-md text-sm font-medium transition';
            btnTerjemah.className = 'px-4 py-2 text-gray-600 rounded-md text-sm font-medium hover:text-gray-800 transition';
        } else {
            btnTerjemah.className = 'px-4 py-2 bg-white shadow-sm text-emerald-700 rounded-md text-sm font-medium transition';
            btnSaja.className = 'px-4 py-2 text-gray-600 rounded-md text-sm font-medium hover:text-gray-800 transition';
        }
        this.renderBacaQuran();
    },

    renderBacaQuran() {
        const container = document.getElementById('baca-quran-container');
        container.innerHTML = '';
        
        const ayatList = this.terjemahanData.filter(t => t.surah === this.currentSurah);
        ayatList.sort((a, b) => a.ayat - b.ayat);
        
        if (ayatList.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Data ayat tidak tersedia untuk surat ini.</p>';
            return;
        }

        ayatList.forEach(ayat => {
            const block = document.createElement('div');
            block.className = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col';
            
            let html = `
                <div class="flex justify-between items-center mb-4">
                    <span class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">${ayat.ayat}</span>
                </div>
                <p class="font-arabic text-4xl text-gray-800 leading-loose text-right mb-4" dir="rtl">${ayat.teks_arab || ''}</p>
            `;
            
            if (this.bacaMode === 'terjemah') {
                html += `<p class="text-gray-600 text-lg border-t border-gray-100 pt-4 mt-2">${ayat.teks_terjemahan || ''}</p>`;
            }
            
            block.innerHTML = html;
            container.appendChild(block);
        });
    },

    // --- FITUR A: TUTUP KATA ---
    startTutupKata() {
        this.isArabBlurred = false;
        this.isIndoBlurred = false;
        this.updateBlurButtons();

        // Update nav back button to point to surah menu
        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Menu
            </button>
        `;

        const container = document.getElementById('tutup-kata-container');
        container.innerHTML = '';

        // Kelompokkan kata per ayat
        const ayatMap = new Map();
        this.surahData.forEach(word => {
            if (!ayatMap.has(word.ayat)) {
                ayatMap.set(word.ayat, []);
            }
            ayatMap.get(word.ayat).push(word);
        });

        // Render setiap ayat
        Array.from(ayatMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([ayatNum, words]) => {
            // Urutkan kata berdasarkan urutan_kata (Biasanya dari kanan ke kiri untuk Arab, tapi di HTML kita render flex-wrap-reverse atau rtl)
            words.sort((a, b) => a.urutan_kata - b.urutan_kata);

            const ayatBlock = document.createElement('div');
            ayatBlock.className = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100';
            
            const ayatHeader = document.createElement('div');
            ayatHeader.className = 'mb-4 border-b pb-2';
            ayatHeader.innerHTML = `<h4 class="font-bold text-gray-700">Ayat ${ayatNum}</h4>`;
            ayatBlock.appendChild(ayatHeader);

            const wordsContainer = document.createElement('div');
            wordsContainer.className = 'flex flex-wrap gap-4 justify-start'; // RTL flow
            wordsContainer.dir = "rtl"; // Set direction for Arabic text alignment
            
            words.forEach(word => {
                const id = this.getWordId(word);
                const isHafal = this.hafalData.includes(id);
                
                const wordBoxDiv = document.createElement('div');
                wordBoxDiv.className = 'flex flex-col items-center p-3 border border-gray-100 rounded-lg bg-gray-50 min-w-[100px] shadow-sm';
                
                wordBoxDiv.innerHTML = `
                    <div class="mb-3 text-center cursor-pointer">
                        <p class="font-arabic text-3xl text-gray-800 mb-2 arab-text" onclick="app.unblur(this)">${word.arab}</p>
                        <p class="text-sm text-gray-600 indo-text" onclick="app.unblur(this)" dir="ltr">${word.indonesia}</p>
                    </div>
                    <button class="hafal-btn mt-auto text-xs px-3 py-1.5 rounded-full border border-gray-300 font-medium ${isHafal ? 'hafal-active' : 'text-gray-500 bg-white hover:bg-gray-100'}" 
                            onclick="app.toggleHafal('${id}', this)">
                        ${isHafal ? '✓ Hafal' : 'Tandai Hafal'}
                    </button>
                `;
                wordsContainer.appendChild(wordBoxDiv);
            });

            ayatBlock.appendChild(wordsContainer);

            // Cari teks terjemahan ayat utuh
            const terjemahan = this.terjemahanData.find(t => t.surah === this.currentSurah && t.ayat === Number(ayatNum));
            if (terjemahan) {
                const terjemahanDiv = document.createElement('div');
                terjemahanDiv.className = 'mt-5 border-t border-gray-100 pt-3';
                terjemahanDiv.innerHTML = `<p class="text-sm text-gray-600 italic">${terjemahan.teks_terjemahan}</p>`;
                ayatBlock.appendChild(terjemahanDiv);
            }

            container.appendChild(ayatBlock);
        });

        this.showView('view-tutup-kata');
        this.applyBlur();
    },

    toggleBlur(type) {
        if (type === 'arab') {
            this.isArabBlurred = !this.isArabBlurred;
        } else {
            this.isIndoBlurred = !this.isIndoBlurred;
        }
        this.updateBlurButtons();
        this.applyBlur();
    },

    updateBlurButtons() {
        const btnArab = document.getElementById('toggle-arab');
        const btnIndo = document.getElementById('toggle-indo');
        
        btnArab.className = `px-4 py-2 rounded-md text-sm font-medium transition ${this.isArabBlurred ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
        btnArab.textContent = this.isArabBlurred ? 'Tampilkan Arab' : 'Sembunyikan Arab';
        
        btnIndo.className = `px-4 py-2 rounded-md text-sm font-medium transition ${this.isIndoBlurred ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
        btnIndo.textContent = this.isIndoBlurred ? 'Tampilkan Arti' : 'Sembunyikan Arti';
    },

    applyBlur() {
        document.querySelectorAll('.arab-text').forEach(el => {
            el.classList.remove('unblurred');
            if (this.isArabBlurred) el.classList.add('blur-text');
            else el.classList.remove('blur-text');
        });
        document.querySelectorAll('.indo-text').forEach(el => {
            el.classList.remove('unblurred');
            if (this.isIndoBlurred) el.classList.add('blur-text');
            else el.classList.remove('blur-text');
        });
    },

    unblur(element) {
        // Fitur intip arti: hilangkan blur jika diklik
        if (element.classList.contains('blur-text')) {
            element.classList.add('unblurred');
        }
    },

    toggleHafal(id, btnElement) {
        const index = this.hafalData.indexOf(id);
        if (index === -1) {
            this.hafalData.push(id);
            btnElement.classList.add('hafal-active');
            btnElement.classList.remove('text-gray-500', 'bg-white', 'hover:bg-gray-100');
            btnElement.textContent = '✓ Hafal';
        } else {
            this.hafalData.splice(index, 1);
            btnElement.classList.remove('hafal-active');
            btnElement.classList.add('text-gray-500', 'bg-white', 'hover:bg-gray-100');
            btnElement.textContent = 'Tandai Hafal';
        }
        this.saveHafalData();
    },

    // --- FITUR B: FLASHCARD ---
    startFlashcard() {
        if (this.surahData.length === 0) return alert("Tidak ada data kosakata.");
        this.fcIndex = 0;
        
        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Menu
            </button>
        `;

        this.showView('view-flashcard');
        this.renderFlashcard();
    },

    renderFlashcard() {
        if (this.fcIndex >= this.surahData.length) {
            alert("Kamu telah menyelesaikan flashcard untuk surat ini!");
            this.showSurahMenu();
            return;
        }

        const word = this.surahData[this.fcIndex];
        
        document.getElementById('flashcard-counter').textContent = `Kata ${this.fcIndex + 1} dari ${this.surahData.length}`;
        document.getElementById('fc-arab').textContent = word.arab;
        document.getElementById('fc-indo').textContent = word.indonesia;
        
        // Reset flip state
        document.getElementById('current-flashcard').classList.remove('flipped');
    },

    flipCard(container) {
        const card = container.querySelector('.flashcard');
        card.classList.toggle('flipped');
    },

    nextFlashcard(isHafal) {
        if (isHafal) {
            const word = this.surahData[this.fcIndex];
            const id = this.getWordId(word);
            if (!this.hafalData.includes(id)) {
                this.hafalData.push(id);
                this.saveHafalData();
            }
        }
        this.fcIndex++;
        this.renderFlashcard();
    },

    // --- FITUR C: KUIS ---
    startKuis() {
        if (this.surahData.length < 4) {
            alert("Kata di surat ini terlalu sedikit untuk kuis.");
            return;
        }

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Menu
            </button>
        `;

        // Pilih 10 kata acak atau semua jika kurang dari 10
        let shuffled = [...this.surahData];
        this.shuffleArray(shuffled);
        this.kuisQuestions = shuffled.slice(0, 10);
        this.kuisIndex = 0;
        this.kuisScore = 0;
        
        document.getElementById('kuis-result').classList.add('hidden');
        document.getElementById('kuis-question').parentElement.classList.remove('hidden');
        document.getElementById('kuis-options').classList.remove('hidden');

        this.showView('view-kuis');
        this.renderKuis();
    },

    renderKuis() {
        if (this.kuisIndex >= this.kuisQuestions.length) {
            this.showKuisResult();
            return;
        }

        this.kuisHasAnswered = false;
        document.getElementById('kuis-next-container').classList.add('hidden');

        const currentWord = this.kuisQuestions[this.kuisIndex];
        document.getElementById('kuis-counter').textContent = `${this.kuisIndex + 1}/${this.kuisQuestions.length}`;
        document.getElementById('kuis-question').textContent = currentWord.arab;

        // Siapkan opsi jawaban: 1 benar, 3 pengecoh (distractors)
        const correctAnswer = currentWord.indonesia;
        let distractors = this.allData
            .filter(w => w.indonesia !== correctAnswer)
            .map(w => w.indonesia);
        
        // Hapus duplikat dari distractors
        distractors = [...new Set(distractors)];
        this.shuffleArray(distractors);
        
        const options = [correctAnswer, ...distractors.slice(0, 3)];
        this.shuffleArray(options); // Acak posisi jawaban

        const optionsContainer = document.getElementById('kuis-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left bg-white border-2 border-solid border-gray-100 hover:border-emerald-300 p-4 rounded-xl font-medium text-gray-700 transition shadow-sm outline-none';
            btn.textContent = option;
            btn.onclick = () => this.answerKuis(option === correctAnswer, btn);
            optionsContainer.appendChild(btn);
        });
    },

    answerKuis(isCorrect, btnElement) {
        if (this.kuisHasAnswered) return; // Mencegah klik ganda
        this.kuisHasAnswered = true;

        const options = document.getElementById('kuis-options').children;
        const currentWord = this.kuisQuestions[this.kuisIndex];
        const correctAnswer = currentWord.indonesia;

        // Tampilkan jawaban yang benar dan salah
        for (let btn of options) {
            btn.classList.add('pointer-events-none');
            if (btn.textContent === correctAnswer) {
                btn.classList.remove('border-gray-100', 'hover:border-emerald-300');
                btn.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-800');
            } else if (btn === btnElement && !isCorrect) {
                btn.classList.remove('border-gray-100', 'hover:border-emerald-300');
                btn.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            }
        }

        if (isCorrect) {
            this.kuisScore++;
        }

        document.getElementById('kuis-next-container').classList.remove('hidden');
    },

    nextKuis() {
        this.kuisIndex++;
        this.renderKuis();
    },

    showKuisResult() {
        document.getElementById('kuis-question').parentElement.classList.add('hidden');
        document.getElementById('kuis-options').classList.add('hidden');
        document.getElementById('kuis-next-container').classList.add('hidden');
        
        const resultContainer = document.getElementById('kuis-result');
        resultContainer.classList.remove('hidden');
        
        const maxScore = this.kuisQuestions.length;
        document.getElementById('kuis-score').textContent = `${this.kuisScore} / ${maxScore}`;
        
        // Simpan progress hafal jika skor sempurna? (Opsional, saat ini hanya kuis evaluasi)
    },

    // --- FITUR D: UJIAN HAFALAN ---
    startUjian() {
        if (this.surahData.length === 0) {
            alert("Tidak ada data kosakata pada surat ini.");
            return;
        }

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Berhenti Ujian
            </button>
        `;

        // Pilih maksimal 50 soal acak dari surat ini
        let shuffled = [...this.surahData];
        this.shuffleArray(shuffled);
        this.ujianQuestions = shuffled.slice(0, 50);
        this.ujianIndex = 0;
        this.ujianScore = 0; // ini hitungan benar
        
        document.getElementById('view-ujian-result').classList.add('hidden');
        this.showView('view-ujian');
        this.renderUjian();
    },

    renderUjian() {
        if (this.ujianIndex >= this.ujianQuestions.length) {
            this.finishUjian();
            return;
        }

        this.ujianHasAnswered = false;
        const currentWord = this.ujianQuestions[this.ujianIndex];
        
        document.getElementById('ujian-counter').textContent = `${this.ujianIndex + 1}/${this.ujianQuestions.length}`;
        document.getElementById('ujian-question').textContent = currentWord.arab;

        // Siapkan opsi: 1 benar, 3 pengecoh acak dari SELURUH data (semua surah)
        const correctAnswer = currentWord.indonesia;
        let distractors = this.allData
            .filter(w => w.indonesia !== correctAnswer)
            .map(w => w.indonesia);
        
        distractors = [...new Set(distractors)]; // unik
        this.shuffleArray(distractors);
        
        const options = [correctAnswer, ...distractors.slice(0, 3)];
        this.shuffleArray(options); // Acak posisi

        const optionsContainer = document.getElementById('ujian-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left bg-white border-2 border-solid border-gray-100 hover:border-emerald-300 p-4 rounded-xl font-medium text-gray-700 transition shadow-sm outline-none';
            btn.textContent = option;
            btn.onclick = () => this.answerUjian(option === correctAnswer, btn);
            optionsContainer.appendChild(btn);
        });

        this.startUjianTimer();
    },

    startUjianTimer() {
        if (this.ujianInterval) clearInterval(this.ujianInterval);
        this.ujianTimer = 10;
        const timerBar = document.getElementById('ujian-timer-bar');
        const timerText = document.getElementById('ujian-timer-text');
        
        timerBar.style.width = '100%';
        timerBar.className = 'bg-emerald-500 h-3 rounded-full transition-all duration-1000 linear';
        timerText.textContent = '10s';

        this.ujianInterval = setInterval(() => {
            this.ujianTimer--;
            const percentage = (this.ujianTimer / 10) * 100;
            timerBar.style.width = `${percentage}%`;
            timerText.textContent = `${this.ujianTimer}s`;

            if (this.ujianTimer <= 3) {
                timerBar.classList.replace('bg-emerald-500', 'bg-red-500');
                timerBar.classList.replace('bg-orange-500', 'bg-red-500'); // jika transisi manual
            } else if (this.ujianTimer <= 6) {
                timerBar.classList.replace('bg-emerald-500', 'bg-orange-500');
            }

            if (this.ujianTimer <= 0) {
                clearInterval(this.ujianInterval);
                this.answerUjian(false, null, true); // Timeout
            }
        }, 1000);
    },

    answerUjian(isCorrect, btnElement = null, isTimeout = false) {
        if (this.ujianHasAnswered) return;
        this.ujianHasAnswered = true;
        if (this.ujianInterval) clearInterval(this.ujianInterval);

        const options = document.getElementById('ujian-options').children;
        const currentWord = this.ujianQuestions[this.ujianIndex];
        const correctAnswer = currentWord.indonesia;

        // Disable semua tombol & tandai warna
        for (let btn of options) {
            btn.classList.add('pointer-events-none');
            if (btn.textContent === correctAnswer) {
                btn.classList.remove('border-gray-100', 'hover:border-emerald-300');
                btn.classList.add('bg-emerald-100', 'border-emerald-500', 'text-emerald-800');
            } else if (btn === btnElement && !isCorrect) {
                btn.classList.remove('border-gray-100', 'hover:border-emerald-300');
                btn.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            }
        }

        if (isCorrect) {
            this.ujianScore++;
            // Otomatis masukkan ke hafalan jika benar
            const wordId = this.getWordId(currentWord);
            if (!this.hafalData.includes(wordId)) {
                this.hafalData.push(wordId);
                this.saveHafalData();
            }
        }

        // Delay singkat untuk memperlihatkan jawaban sebelum lanjut otomatis
        setTimeout(() => {
            this.ujianIndex++;
            this.renderUjian();
        }, 1000);
    },

    finishUjian() {
        if (this.ujianInterval) clearInterval(this.ujianInterval);
        
        const totalSoal = this.ujianQuestions.length;
        // Skala 0-100
        const finalScore = Math.round((this.ujianScore / totalSoal) * 100);
        
        document.getElementById('ujian-final-score').textContent = finalScore;
        document.getElementById('ujian-correct-count').textContent = this.ujianScore;
        document.getElementById('ujian-wrong-count').textContent = totalSoal - this.ujianScore;
        
        // Simpan Riwayat
        const surahMeta = this.daftarSurahData.find(s => s.id === this.currentSurah);
        const namaSurah = surahMeta ? surahMeta.nama_latin : `Surat ${this.currentSurah}`;
        
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const record = {
            surah_id: this.currentSurah,
            nama_surah: namaSurah,
            score: finalScore,
            date: `${dateStr} ${timeStr}`
        };
        
        this.ujianHistory.unshift(record); // Tambah ke awal
        localStorage.setItem('ujian_history', JSON.stringify(this.ujianHistory));

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm">
                &larr; Kembali ke Menu
            </button>
        `;
        
        this.showView('view-ujian-result');
    },

    showHistory() {
        this.showView('view-history');
        const container = document.getElementById('history-container');
        container.innerHTML = '';

        if (this.ujianHistory.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-10">Belum ada riwayat ujian.</p>';
            return;
        }

        this.ujianHistory.forEach(record => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center';
            
            let scoreColor = 'text-gray-600';
            let bgScore = 'bg-gray-100';
            if (record.score >= 80) { scoreColor = 'text-emerald-700'; bgScore = 'bg-emerald-100'; }
            else if (record.score >= 60) { scoreColor = 'text-orange-700'; bgScore = 'bg-orange-100'; }
            else { scoreColor = 'text-red-700'; bgScore = 'bg-red-100'; }

            card.innerHTML = `
                <div>
                    <h4 class="font-bold text-gray-800">${record.surah_id}. ${record.nama_surah}</h4>
                    <p class="text-xs text-gray-500">${record.date}</p>
                </div>
                <div class="${bgScore} ${scoreColor} font-bold text-lg px-4 py-2 rounded-lg">
                    ${record.score}
                </div>
            `;
            container.appendChild(card);
        });
    },

    // --- UTILITAS ---
    /**
     * Algoritma Fisher-Yates untuk mengacak array secara in-place.
     * Sangat efisien untuk menghasilkan urutan acak yang tidak bias.
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// Inisialisasi aplikasi saat DOM dimuat
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
