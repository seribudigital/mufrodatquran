// ============================================================
// MufrodatQur'an — app.js (Enhanced Version v3)
// Fitur baru: Dark Mode, Toast, Streak, Badge, Confetti,
//             Audio, Cache JSON, Pencarian, Flashcard 2 Arah
// ============================================================

const STORAGE_KEY   = 'kosakata_dihafal';
const STREAK_KEY    = 'streak_data';
const BADGES_KEY    = 'earned_badges';
const THEME_KEY     = 'app_theme';

// ── Kutipan motivasi (dirotasi setiap buka dashboard) ──────
const QUOTES = [
    { text: '"Sebaik-baik kalian adalah orang yang belajar Al-Qur\'an dan mengajarkannya"', src: '— HR. Bukhari' },
    { text: '"Bacalah Al-Qur\'an, sesungguhnya ia akan datang memberikan syafaat bagi para pembacanya di hari kiamat"', src: '— HR. Muslim' },
    { text: '"Orang yang mahir membaca Al-Qur\'an akan bersama para malaikat yang mulia dan taat"', src: '— HR. Bukhari & Muslim' },
    { text: '"Sesungguhnya Allah mengangkat derajat suatu kaum dengan kitab ini (Al-Qur\'an)"', src: '— HR. Muslim' },
    { text: '"Hiasilah Al-Qur\'an dengan suaramu, karena suara yang indah menambah keindahan Al-Qur\'an"', src: '— HR. Darimi' },
    { text: '"Barang siapa yang membaca satu huruf dari Al-Qur\'an, maka baginya satu kebaikan..."', src: '— HR. Tirmidzi' },
];

// ── Definisi Badge ──────────────────────────────────────────
const BADGES_DEF = [
    { id: 'pemula',    icon: '🌱', name: 'Pemula',      desc: 'Hafal 10 kata pertama' },
    { id: 'bintang',   icon: '⭐', name: 'Bintang',     desc: 'Raih skor ujian ≥ 80' },
    { id: 'konsisten', icon: '🔥', name: 'Konsisten',   desc: 'Belajar 7 hari berturut' },
    { id: 'centurion', icon: '💯', name: 'Centurion',   desc: 'Hafal 100 kata' },
    { id: 'sempurna',  icon: '🏆', name: 'Sempurna',    desc: 'Raih skor ujian 100' },
    { id: 'rajin',     icon: '📚', name: 'Rajin',       desc: 'Ikuti 10 ujian' },
    { id: 'hafidz',    icon: '💎', name: 'Hafidz Muda', desc: 'Hafal 500 kata' },
    { id: 'ustadz',    icon: '🎓', name: 'Ustadz',      desc: 'Belajar 30 hari berturut' },
];

// ============================================================
const app = {
    userData       : null,
    allData        : [],
    terjemahanData : [],
    daftarSurahData: [],
    hafalData      : [],
    currentJuz     : 30,
    currentSurah   : null,
    surahData      : [],

    // Cache JSON agar tidak fetch ulang saat ganti juz
    juzCache: {},

    // Flashcard
    fcIndex    : 0,
    fcDirection: 'arab', // 'arab' = tampilkan Arab dulu | 'indo' = tampilkan Indonesia dulu

    // Kuis
    kuisQuestions  : [],
    kuisIndex      : 0,
    kuisScore      : 0,
    kuisHasAnswered: false,

    // Baca Quran
    bacaMode: 'saja',
    audioRepeatCount: 1,
    isPlayingRange: false,
    rangeStartAyat: 1,
    rangeEndAyat: 1,
    currentRangePlayingAyat: null,
    currentAyatRepeatPlayedCount: 0,

    // Tutup Kata
    isArabBlurred: false,
    isIndoBlurred: false,

    // Ujian
    ujianQuestions  : [],
    ujianIndex      : 0,
    ujianScore      : 0,
    ujianTimer      : 10,
    ujianInterval   : null,
    ujianHistory    : [],
    ujianHasAnswered: false,
    ujianActive     : false,   // flag: true hanya saat ujian sedang berlangsung

    // Audio
    currentAudio: null,

    // Streak & Badge
    streakData  : { lastDate: null, streakCount: 0 },
    earnedBadges: [],

    // Kutipan
    quoteIndex: 0,
    quoteInterval: null,

    // ──────────────────────────────────────────────────────
    //  INISIALISASI
    // ──────────────────────────────────────────────────────
    async init() {
        this.loadHafalData();
        this.loadEarnedBadges();
        this.loadStreak();
        this.applyTheme();
        this.startQuoteRotation();

        const historyStored = localStorage.getItem('ujian_history');
        if (historyStored) {
            try { this.ujianHistory = JSON.parse(historyStored); } catch(e) { this.ujianHistory = []; }
        }

        const userStored = localStorage.getItem('userData');
        if (userStored) {
            try { this.userData = JSON.parse(userStored); } catch(e) { this.userData = null; }
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

    // ──────────────────────────────────────────────────────
    //  TEMA / DARK MODE
    // ──────────────────────────────────────────────────────
    applyTheme() {
        const theme = localStorage.getItem(THEME_KEY) || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const btn = document.getElementById('dark-mode-toggle');
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    },

    toggleDarkMode() {
        const current = document.documentElement.getAttribute('data-theme');
        const next    = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(THEME_KEY, next);
        const btn = document.getElementById('dark-mode-toggle');
        if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
        this.showToast(next === 'dark' ? '🌙 Mode Gelap aktif' : '☀️ Mode Terang aktif', 'info', 2000);
    },

    // ──────────────────────────────────────────────────────
    //  TOAST NOTIFIKASI
    // ──────────────────────────────────────────────────────
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️', badge: '🏅' };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
        container.appendChild(toast);

        // Hapus setelah animasi selesai
        setTimeout(() => toast.remove(), duration + 400);
    },

    // ──────────────────────────────────────────────────────
    //  STREAK HARIAN
    // ──────────────────────────────────────────────────────
    loadStreak() {
        const stored = localStorage.getItem(STREAK_KEY);
        if (stored) {
            try { this.streakData = JSON.parse(stored); } catch(e) {
                this.streakData = { lastDate: null, streakCount: 0 };
            }
        }
    },

    updateStreak() {
        const today     = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const { lastDate, streakCount } = this.streakData;

        if (lastDate === today) return; // Sudah diupdate hari ini

        let newStreak;
        if (lastDate === yesterday) {
            newStreak = streakCount + 1;
            if (newStreak % 7 === 0) {
                setTimeout(() => this.showToast(`🔥 MasyaAllah! Streak ${newStreak} hari berturut! Luar biasa!`, 'badge', 5000), 1000);
            } else if (newStreak > 1) {
                setTimeout(() => this.showToast(`🔥 Streak ${newStreak} hari berturut! Tetap semangat!`, 'success', 3000), 500);
            }
        } else if (!lastDate) {
            newStreak = 1;
        } else {
            newStreak = 1;
            if (streakCount > 2) {
                setTimeout(() => this.showToast(`Streak ${streakCount} hari terputus. Yuk mulai lagi! 💪`, 'warning'), 500);
            }
        }

        this.streakData = { lastDate: today, streakCount: newStreak };
        localStorage.setItem(STREAK_KEY, JSON.stringify(this.streakData));
        this.checkBadges();
    },

    // ──────────────────────────────────────────────────────
    //  BADGE / PENCAPAIAN
    // ──────────────────────────────────────────────────────
    loadEarnedBadges() {
        const stored = localStorage.getItem(BADGES_KEY);
        if (stored) {
            try { this.earnedBadges = JSON.parse(stored); } catch(e) { this.earnedBadges = []; }
        } else {
            this.earnedBadges = [];
        }
    },

    getStats() {
        const totalHafal = this.hafalData.length;
        const streak     = this.streakData.streakCount || 0;
        const totalUjian = this.ujianHistory.length;
        const bestScore  = totalUjian > 0 ? Math.max(...this.ujianHistory.map(r => r.score)) : 0;
        const avgScore   = totalUjian > 0
            ? Math.round(this.ujianHistory.reduce((s, r) => s + r.score, 0) / totalUjian)
            : 0;
        return { totalHafal, streak, totalUjian, bestScore, avgScore };
    },

    checkBadges() {
        const stats = this.getStats();
        const checks = {
            pemula   : stats.totalHafal >= 10,
            bintang  : stats.bestScore  >= 80,
            konsisten: stats.streak     >= 7,
            centurion: stats.totalHafal >= 100,
            sempurna : stats.bestScore  >= 100,
            rajin    : stats.totalUjian >= 10,
            hafidz   : stats.totalHafal >= 500,
            ustadz   : stats.streak     >= 30,
        };

        const newlyEarned = [];
        BADGES_DEF.forEach(badge => {
            if (!this.earnedBadges.includes(badge.id) && checks[badge.id]) {
                this.earnedBadges.push(badge.id);
                newlyEarned.push(badge);
            }
        });

        if (newlyEarned.length > 0) {
            localStorage.setItem(BADGES_KEY, JSON.stringify(this.earnedBadges));
            newlyEarned.forEach((badge, i) => {
                setTimeout(() => {
                    this.showToast(`${badge.icon} Badge baru diraih: "${badge.name}"! ${badge.desc}`, 'badge', 5000);
                }, i * 1800);
            });
        }
    },

    renderBadges() {
        const container = document.getElementById('badge-container');
        const countEl   = document.getElementById('badge-earned-count');
        const statEl    = document.getElementById('stat-badge-count');
        if (!container) return;

        container.innerHTML = '';
        const earned = this.earnedBadges.length;
        if (countEl) countEl.textContent = `${earned} dari ${BADGES_DEF.length} diraih`;
        if (statEl)  statEl.textContent  = earned;

        BADGES_DEF.forEach(badge => {
            const isEarned = this.earnedBadges.includes(badge.id);
            const card = document.createElement('div');
            card.className = `badge-card ${isEarned ? 'earned' : 'not-earned'}`;
            card.title     = badge.desc;
            card.innerHTML = `
                <span style="font-size:28px">${badge.icon}</span>
                <span style="font-size:11px;font-weight:700;color:${isEarned ? '#065f46' : '#9ca3af'}">${badge.name}</span>
                <span style="font-size:10px;color:#9ca3af;line-height:1.3">${badge.desc}</span>
            `;
            container.appendChild(card);
        });
    },

    updateDashboardStats() {
        const stats = this.getStats();

        const elStreak = document.getElementById('stat-streak');
        const elHafal  = document.getElementById('stat-total-hafal');
        const elAvg    = document.getElementById('stat-avg-score');
        if (elStreak) elStreak.textContent = stats.streak;
        if (elHafal)  elHafal.textContent  = stats.totalHafal;
        if (elAvg)    elAvg.textContent    = stats.totalUjian > 0 ? stats.avgScore : '—';

        // Tampilkan streak di navbar jika ≥ 2 hari
        const navStreak      = document.getElementById('nav-streak');
        const navStreakBadge = document.getElementById('nav-streak-badge');
        if (navStreak && navStreakBadge) {
            if (stats.streak >= 2) {
                navStreak.classList.remove('hidden');
                navStreakBadge.textContent = `🔥 ${stats.streak}`;
            } else {
                navStreak.classList.add('hidden');
            }
        }

        // Tampilkan tombol Riwayat Ujian hanya jika ada riwayat
        const btnRiwayat   = document.getElementById('btn-riwayat-dashboard');
        const badgeRiwayat = document.getElementById('stat-total-ujian-badge');
        if (btnRiwayat) {
            if (stats.totalUjian > 0) {
                btnRiwayat.classList.remove('hidden');
                if (badgeRiwayat) badgeRiwayat.textContent = `${stats.totalUjian} ujian`;
            } else {
                btnRiwayat.classList.add('hidden');
            }
        }
    },

    // ──────────────────────────────────────────────────────
    //  KUTIPAN MOTIVASI
    // ──────────────────────────────────────────────────────
    nextQuote() {
        this.quoteIndex = (this.quoteIndex + 1) % QUOTES.length;
        this._renderQuote();
        this.startQuoteRotation(); // Reset timer saat diklik manual
    },

    startQuoteRotation() {
        if (this.quoteInterval) clearInterval(this.quoteInterval);
        this.quoteInterval = setInterval(() => {
            const dashboardEl = document.getElementById('view-dashboard');
            if (dashboardEl && !dashboardEl.classList.contains('hidden')) {
                this.quoteIndex = (this.quoteIndex + 1) % QUOTES.length;
                this._renderQuote();
            }
        }, 8000); // Ganti otomatis setiap 8 detik
    },

    _renderQuote() {
        const quoteEl = document.getElementById('motivasi-quote');
        const numEl   = document.getElementById('quote-num');
        if (!quoteEl) return;

        const q = QUOTES[this.quoteIndex];
        quoteEl.innerHTML = `${q.text}<br><span class="text-sm font-semibold">${q.src}</span>`;

        // Trigger animasi ulang tanpa forced reflow (offsetWidth)
        quoteEl.classList.remove('quote-anim');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                quoteEl.classList.add('quote-anim');
            });
        });

        if (numEl) numEl.textContent = `Kutipan ${this.quoteIndex + 1} dari ${QUOTES.length}`;
    },

    // ──────────────────────────────────────────────────────
    //  PENCARIAN KATA
    // ──────────────────────────────────────────────────────
    handleSearch(query) {
        const container  = document.getElementById('search-results-container');
        const surahListEl = document.getElementById('surah-list');
        if (!container) return;

        query = query.trim();
        if (!query) {
            container.classList.add('hidden');
            container.innerHTML = '';
            if (surahListEl) surahListEl.style.display = '';
            return;
        }

        const lq      = query.toLowerCase();
        const results = this.allData.filter(w =>
            w.arab.includes(query) || w.indonesia.toLowerCase().includes(lq)
        ).slice(0, 25);

        container.classList.remove('hidden');
        if (surahListEl) surahListEl.style.display = 'none';

        if (results.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-5 text-sm">Tidak ada hasil untuk pencarian ini.</p>';
            return;
        }

        container.innerHTML = `<p class="text-sm text-gray-500 font-medium mb-1">${results.length} hasil ditemukan:</p>`;
        results.forEach(word => {
            const surahMeta = this.daftarSurahData.find(s => s.id === word.surah);
            const namaSurah = surahMeta ? surahMeta.nama_latin : `Surah ${word.surah}`;
            const div = document.createElement('div');
            div.className = 'search-result-word';
            div.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px">
                    <span class="font-arabic" style="font-size:1.4rem;color:#1f2937" dir="rtl">${word.arab}</span>
                    <span style="color:#d1d5db">|</span>
                    <span style="font-weight:600;color:#374151">${word.indonesia}</span>
                </div>
                <span style="font-size:11px;color:#059669;background:#ecfdf5;padding:3px 10px;border-radius:999px;white-space:nowrap">
                    ${namaSurah} ${word.ayat}:${word.urutan_kata}
                </span>
            `;
            div.onclick = () => {
                document.getElementById('search-input').value = '';
                this.handleSearch('');
                this.showSurahMenu(word.surah);
            };
            container.appendChild(div);
        });
    },

    // ──────────────────────────────────────────────────────
    //  KONFETI 🎊
    // ──────────────────────────────────────────────────────
    launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        canvas.style.display = 'block';
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx    = canvas.getContext('2d');
        const colors = ['#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316'];

        const particles = Array.from({ length: 130 }, () => ({
            x      : Math.random() * canvas.width,
            y      : Math.random() * -canvas.height * 0.6,
            r      : Math.random() * 8 + 4,
            color  : colors[Math.floor(Math.random() * colors.length)],
            vx     : (Math.random() - 0.5) * 4,
            vy     : Math.random() * 3 + 2,
            opacity: 1,
            rot    : Math.random() * 360,
            rotSpd : (Math.random() - 0.5) * 7,
            shape  : Math.random() > 0.5 ? 'rect' : 'circle',
        }));

        let frame = 0;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x   += p.vx;
                p.y   += p.vy;
                p.rot += p.rotSpd;
                if (frame > 70) p.opacity = Math.max(0, p.opacity - 0.014);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot * Math.PI / 180);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle   = p.color;
                if (p.shape === 'rect') {
                    ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.55);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.r / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
            frame++;
            if (frame < 210) requestAnimationFrame(draw);
            else {
                canvas.style.display = 'none';
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };
        requestAnimationFrame(draw);
    },

    // ──────────────────────────────────────────────────────
    //  AUDIO PELAFALAN
    // ──────────────────────────────────────────────────────
    playCurrentWordAudio() {
        if (!this.surahData || this.fcIndex >= this.surahData.length) return;
        this.playWordAudio(this.surahData[this.fcIndex]);
    },

    playWordAudio(word) {
        if (!word) return;

        // Hentikan audio sebelumnya
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Hapus class 'playing' dari tombol audio ayat lain
        document.querySelectorAll('.ayat-audio-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
        });

        const btn = document.getElementById('fc-audio-btn');
        const url = `https://audio.qurancdn.com/wbw/${word.surah}_${word.ayat}_${word.urutan_kata}.mp3`;

        this.currentAudio = new Audio(url);

        this.currentAudio.play()
            .then(() => { if (btn) btn.classList.add('playing'); })
            .catch(() => this._fallbackTTS(word.arab));

        this.currentAudio.onended = () => { if (btn) btn.classList.remove('playing'); };
        this.currentAudio.onerror = () => {
            if (btn) btn.classList.remove('playing');
            this._fallbackTTS(word.arab);
        };
    },

    playAyatAudio(surahId, nomorAyat, btnElement, isFromRange = false) {
        // Hapus highlight dari ayat lain
        document.querySelectorAll('.ayat-block').forEach(el => {
            el.classList.remove('border-emerald-500', 'bg-emerald-50/30', 'dark:border-emerald-500', 'dark:bg-emerald-950/20');
        });

        // Hentikan audio sebelumnya
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Jika diputar secara manual (bukan dari rangkaian), hentikan mode rangkaian
        if (!isFromRange && this.isPlayingRange) {
            this._stopRangePlay();
        }

        // Hapus class 'playing' dari tombol audio ayat lain dan tombol flashcard
        document.querySelectorAll('.ayat-audio-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
        });
        const fcBtn = document.getElementById('fc-audio-btn');
        if (fcBtn) fcBtn.classList.remove('playing');

        if (btnElement) btnElement.classList.add('playing');

        // Tambahkan highlight ke kartu ayat yang sedang diputar
        const ayatBlock = document.getElementById(`ayat-block-${nomorAyat}`);
        if (ayatBlock) {
            ayatBlock.classList.add('border-emerald-500', 'bg-emerald-50/30', 'dark:border-emerald-500', 'dark:bg-emerald-950/20');
            // Auto-scroll ke ayat tersebut
            ayatBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        this.currentRangePlayingAyat = nomorAyat;

        const apiUrl = `https://api.alquran.cloud/v1/ayah/${surahId}:${nomorAyat}/ar.alafasy`;
        
        fetch(apiUrl)
            .then(res => {
                if (!res.ok) throw new Error('Gagal mengambil data audio dari API');
                return res.json();
            })
            .then(json => {
                // Jika tombol ini sudah tidak memiliki class 'playing' (misal pengguna memencet tombol lain selama loading)
                if (btnElement && !btnElement.classList.contains('playing')) {
                    return;
                }

                const audioUrl = json.data.audio;
                
                const playWithRepeat = () => {
                    this.currentAudio = new Audio(audioUrl);
                    this.currentAudio.play()
                        .catch(err => {
                            console.error("Gagal memutar audio ayat:", err);
                            cleanup();
                        });

                    this.currentAudio.onended = () => {
                        this.currentAyatRepeatPlayedCount++;
                        if (this.currentAyatRepeatPlayedCount < this.audioRepeatCount) {
                            playWithRepeat();
                        } else {
                            // Selesai dengan ayat ini
                            cleanup();
                            // Pindah ke ayat berikutnya jika range play aktif
                            if (this.isPlayingRange) {
                                const nextAyat = nomorAyat + 1;
                                if (nextAyat <= this.rangeEndAyat) {
                                    // Cari tombol play untuk ayat berikutnya
                                    setTimeout(() => {
                                        const nextBtn = document.querySelector(`.ayat-audio-btn[data-ayat="${nextAyat}"]`);
                                        this.currentAyatRepeatPlayedCount = 0;
                                        this.playAyatAudio(surahId, nextAyat, nextBtn, true);
                                    }, 800); // jeda sedikit antar ayat agar terdengar natural
                                } else {
                                    this._stopRangePlay();
                                    this.showToast('Selesai memutar rangkaian ayat.', 'success');
                                }
                            }
                        }
                    };

                    this.currentAudio.onerror = () => {
                        cleanup();
                        if (this.isPlayingRange) {
                            this._stopRangePlay();
                        }
                    };
                };

                const cleanup = () => {
                    if (btnElement) btnElement.classList.remove('playing');
                    const ab = document.getElementById(`ayat-block-${nomorAyat}`);
                    if (ab && !this.isPlayingRange) {
                        ab.classList.remove('border-emerald-500', 'bg-emerald-50/30', 'dark:border-emerald-500', 'dark:bg-emerald-950/20');
                    }
                };

                playWithRepeat();
            })
            .catch(err => {
                console.error("Error API audio ayat:", err);
                if (btnElement) btnElement.classList.remove('playing');
                const ab = document.getElementById(`ayat-block-${nomorAyat}`);
                if (ab) ab.classList.remove('border-emerald-500', 'bg-emerald-50/30', 'dark:border-emerald-500', 'dark:bg-emerald-950/20');
                if (this.isPlayingRange) {
                    this._stopRangePlay();
                }
            });
    },

    _fallbackTTS(text) {
        // Gunakan Web Speech API sebagai fallback
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(text);
            utter.lang  = 'ar-SA';
            utter.rate  = 0.75;
            window.speechSynthesis.speak(utter);
        }
    },

    // ──────────────────────────────────────────────────────
    //  MUAT DATA (dengan cache)
    // ──────────────────────────────────────────────────────
    loadHafalData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { this.hafalData = JSON.parse(stored); } catch(e) { this.hafalData = []; }
        } else {
            this.hafalData = [];
        }
    },

    saveHafalData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.hafalData));
    },

    async loadDaftarSurah() {
        try {
            const res          = await fetch('daftar_surah.json');
            this.daftarSurahData = await res.json();
        } catch(e) {
            console.error('Gagal memuat daftar surah:', e);
        }
    },

    async changeJuz(juzNum) {
        this.currentJuz = parseInt(juzNum);
        await this.loadData(this.currentJuz);
        this.showDashboard();
    },

    async loadData(juzNum) {
        // Gunakan cache jika tersedia → ganti juz jadi instan
        if (this.juzCache[juzNum]) {
            this.allData        = this.juzCache[juzNum].allData;
            this.terjemahanData = this.juzCache[juzNum].terjemahanData;
            return;
        }

        try {
            // Muat kedua file secara paralel
            const [resWords, resTerjemah] = await Promise.all([
                fetch(`juz${juzNum}.json`),
                fetch(`terjemahan_ayat_juz${juzNum}.json`)
            ]);

            if (!resWords.ok || !resTerjemah.ok) throw new Error('Fetch gagal');

            this.allData        = await resWords.json();
            this.terjemahanData = await resTerjemah.json();

            // Simpan ke cache
            this.juzCache[juzNum] = {
                allData       : this.allData,
                terjemahanData: this.terjemahanData
            };
        } catch(e) {
            console.error('Gagal memuat data:', e);
            this.showToast(`Gagal memuat Juz ${juzNum}. Pastikan file JSON tersedia.`, 'error');
        }
    },

    getWordId(word) {
        const juz = word.juz || this.currentJuz;
        return `${juz}_${word.surah}_${word.ayat}_${word.urutan_kata}`;
    },

    // ──────────────────────────────────────────────────────
    //  NAVIGASI VIEW
    // ──────────────────────────────────────────────────────
    showView(viewId) {
        // Hentikan ujian sepenuhnya jika user keluar dari halaman ujian
        if (viewId !== 'view-ujian') {
            this._stopUjian();
        }
        // Hentikan pemutaran rangkaian ayat jika keluar dari mode baca quran
        if (viewId !== 'view-baca-quran') {
            this._stopRangePlay();
        }

        document.querySelectorAll('.view-section').forEach(el => {
            el.classList.add('hidden');
            el.style.display = 'none';
        });
        const target = document.getElementById(viewId);
        if (!target) return;
        target.classList.remove('hidden');
        target.style.display = '';

        const navActions = document.getElementById('nav-actions');
        if (viewId === 'view-dashboard') {
            navActions.classList.add('hidden');
        } else {
            navActions.classList.remove('hidden');
        }

        // Jalankan scrollTo di frame berikutnya untuk menghindari forced reflow dari perubahan display DOM di atas
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    },

    /**
     * Hentikan semua proses ujian secara bersih.
     * Dipanggil saat user keluar dari halaman ujian kapan saja.
     */
    _stopUjian() {
        this.ujianActive      = false;
        this.ujianHasAnswered = true;  // blokir callback yang masih menunggu
        if (this.ujianInterval) {
            clearInterval(this.ujianInterval);
            this.ujianInterval = null;
        }
        // Hapus semua toast yang sedang tampil
        // (termasuk "Waktu habis!" yang mungkin baru saja muncul)
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) toastContainer.innerHTML = '';
    },

    // ──────────────────────────────────────────────────────
    //  WELCOME SCREEN
    // ──────────────────────────────────────────────────────
    updateKategoriForm() {
        const kategori   = document.getElementById('welcome-kategori').value;
        const labelDetail = document.getElementById('label-detail');
        const inputDetail = document.getElementById('welcome-detail');

        if (kategori === 'Pelajar/Santri') {
            labelDetail.textContent    = 'Kelas / Nama Instansi Sekolah';
            inputDetail.placeholder    = 'Contoh: Kelas 10 / SMA Bina Bangsa';
        } else if (kategori === 'Guru') {
            labelDetail.textContent    = 'Mata Pelajaran / Instansi';
            inputDetail.placeholder    = 'Contoh: Guru PAI / MTsN 1 Jakarta';
        } else {
            labelDetail.textContent    = 'Profesi / Asal Kota (Opsional)';
            inputDetail.placeholder    = 'Contoh: Karyawan / Surabaya';
        }
    },

    simpanProfil() {
        const nama    = document.getElementById('welcome-nama').value.trim();
        const kategori = document.getElementById('welcome-kategori').value;
        const detail  = document.getElementById('welcome-detail').value.trim();

        if (!nama) {
            this.showToast('Silakan masukkan Nama Lengkap Anda terlebih dahulu!', 'warning');
            document.getElementById('welcome-nama').focus();
            return;
        }

        this.userData = { nama, kategori, detail };
        localStorage.setItem('userData', JSON.stringify(this.userData));
        this.updateStreak();

        const welcomeView = document.getElementById('view-welcome');
        welcomeView.style.opacity    = '0';
        welcomeView.style.transition = 'opacity 0.4s ease';

        setTimeout(() => {
            welcomeView.style.opacity = '1';
            this.showDashboard();
            setTimeout(() => this.showToast(`Selamat datang, ${nama}! Yuk mulai menghafal 🎉`, 'success', 4000), 300);
        }, 400);
    },

    // ──────────────────────────────────────────────────────
    //  DASHBOARD
    // ──────────────────────────────────────────────────────
    showDashboard() {
        // Update profil navbar
        if (this.userData) {
            const profileNavEl = document.getElementById('user-profile-nav');
            if (profileNavEl) {
                profileNavEl.classList.remove('hidden');
                profileNavEl.classList.add('flex');
                const nameEl   = document.getElementById('user-nav-name');
                const avatarEl = document.getElementById('user-nav-avatar');
                if (nameEl)   nameEl.textContent   = this.userData.nama || 'User';
                if (avatarEl) avatarEl.textContent  = this.userData.nama ? this.userData.nama.charAt(0) : 'U';
            }

            const heroGreetingEl = document.getElementById('hero-greeting');
            if (heroGreetingEl) {
                heroGreetingEl.textContent = `Ahlan wa Sahlan, ${this.userData.nama}! 👋`;
            }
        }

        // Rotasi kutipan motivasi — maju satu per satu setiap buka dashboard
        this.quoteIndex = (this.quoteIndex + 1) % QUOTES.length;
        this._renderQuote();

        this.showView('view-dashboard');
        this.updateDashboardStats();
        this.renderBadges();
        this.checkBadges();

        // Reset search
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        this.handleSearch('');

        // Render daftar surah
        const container = document.getElementById('surah-list');
        container.innerHTML = '';

        const surahMap = new Map();
        this.allData.forEach(word => {
            if (!surahMap.has(word.surah)) {
                surahMap.set(word.surah, { id: word.surah, totalWords: 0, memorizedWords: 0 });
            }
            const info = surahMap.get(word.surah);
            info.totalWords++;
            if (this.hafalData.includes(this.getWordId(word))) info.memorizedWords++;
        });

        const sortedSurahs = Array.from(surahMap.values()).sort((a, b) => b.id - a.id);

        if (sortedSurahs.length === 0) {
            container.innerHTML = `<p class="col-span-full text-center text-gray-500">Data tidak tersedia.</p>`;
            return;
        }

        sortedSurahs.forEach(surah => {
            const progress  = surah.totalWords === 0 ? 0 : Math.round((surah.memorizedWords / surah.totalWords) * 100);
            const surahMeta = this.daftarSurahData.find(s => s.id === surah.id);
            const namaSurah = surahMeta ? surahMeta.nama_latin : `Surat ${surah.id}`;
            const namaArab  = surahMeta ? surahMeta.nama_arabic : '';
            const totalAyat = surahMeta ? surahMeta.total_ayat : '?';

            // Warna progress berdasarkan persentase
            const barColor  = progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-blue-400' : 'bg-gray-300';
            const pctColor  = progress >= 80 ? 'text-emerald-600 bg-emerald-50' : progress >= 40 ? 'text-blue-600 bg-blue-50' : 'text-gray-500 bg-gray-100';

            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between';
            card.onclick   = () => this.showSurahMenu(surah.id);

            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${surah.id}. ${namaSurah}</h3>
                        <p class="text-xs text-gray-500">${totalAyat} Ayat</p>
                    </div>
                    <span class="text-sm font-semibold ${pctColor} px-2 py-1 rounded-full">${progress}%</span>
                </div>
                <div class="flex justify-between items-center mb-3 mt-1">
                    <p class="font-arabic text-xl text-emerald-600" dir="rtl">${namaArab}</p>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div class="${barColor} h-2.5 rounded-full progress-bar-anim" style="width:${progress}%"></div>
                </div>
                <p class="text-xs text-gray-500 text-right">${surah.memorizedWords} dari ${surah.totalWords} kata dihafal</p>
            `;
            container.appendChild(card);
        });
    },

    // ──────────────────────────────────────────────────────
    //  SURAH MENU
    // ──────────────────────────────────────────────────────
    showSurahMenu(surahNum = this.currentSurah) {
        if (!surahNum) { this.showDashboard(); return; }
        this.currentSurah = surahNum;
        this.surahData    = this.allData.filter(w => w.surah === surahNum);
        this.updateStreak(); // Catat belajar hari ini

        const surahMeta = this.daftarSurahData.find(s => s.id === surahNum);
        const titleText = surahMeta
            ? `${surahNum}. ${surahMeta.nama_latin} (${surahMeta.nama_arabic})`
            : `Surat ${surahNum}`;

        document.getElementById('menu-surah-title').textContent = titleText;

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showDashboard()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Dashboard
            </button>
        `;
        this.showView('view-surah-menu');
    },

    // ──────────────────────────────────────────────────────
    //  BACA QUR'AN
    // ──────────────────────────────────────────────────────
    startBacaQuran() {
        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Menu
            </button>
        `;
        this.showView('view-baca-quran');
        
        // Hentikan pemutaran rangkaian yang sedang berjalan sebelumnya
        this._stopRangePlay();

        // Cari tahu jumlah total ayat
        const ayatList = this.terjemahanData.filter(t => t.surah === this.currentSurah);
        const totalAyat = ayatList.length;

        // Inisialisasi dropdown rangkaian ayat
        this.initRangeSelectors(totalAyat);

        // Reset repeat dropdown value to 1
        const repeatSelect = document.getElementById('audio-repeat-select');
        if (repeatSelect) {
            repeatSelect.value = "1";
            this.audioRepeatCount = 1;
        }

        this.renderBacaQuran();
    },

    setBacaMode(mode) {
        this.bacaMode = mode;
        const btnSaja    = document.getElementById('btn-quran-saja');
        const btnTerjemah = document.getElementById('btn-quran-terjemah');

        if (mode === 'saja') {
            btnSaja.className    = 'px-4 py-2 bg-white shadow-sm text-emerald-700 rounded-md text-sm font-medium transition';
            btnTerjemah.className = 'px-4 py-2 text-gray-600 rounded-md text-sm font-medium hover:text-gray-800 transition';
        } else {
            btnTerjemah.className = 'px-4 py-2 bg-white shadow-sm text-emerald-700 rounded-md text-sm font-medium transition';
            btnSaja.className    = 'px-4 py-2 text-gray-600 rounded-md text-sm font-medium hover:text-gray-800 transition';
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
            block.id = `ayat-block-${ayat.ayat}`;
            block.className = 'ayat-block bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all duration-300';

            let html = `
                <div class="flex justify-between items-center mb-4">
                    <div class="flex items-center space-x-2">
                        <span class="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">${ayat.ayat}</span>
                        <button onclick="app.playAyatAudio(${ayat.surah}, ${ayat.ayat}, this)" 
                                class="ayat-audio-btn w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center text-xs transition duration-200" 
                                data-ayat="${ayat.ayat}"
                                title="Putar Audio Ayat">
                            🔊
                        </button>
                    </div>
                </div>
                <p class="font-arabic text-4xl text-gray-800 leading-loose text-right mb-4" dir="rtl">${ayat.teks_arab || ''}</p>
            `;

            if (this.bacaMode === 'terjemah') {
                html += `<p class="text-gray-600 text-base border-t border-gray-100 pt-4 mt-2">${ayat.teks_terjemahan || ''}</p>`;
            }

            block.innerHTML = html;
            container.appendChild(block);
        });
    },

    initRangeSelectors(totalAyat) {
        const startSelect = document.getElementById('range-start-select');
        const endSelect = document.getElementById('range-end-select');
        if (!startSelect || !endSelect) return;

        startSelect.innerHTML = '';
        endSelect.innerHTML = '';

        for (let i = 1; i <= totalAyat; i++) {
            const opt1 = document.createElement('option');
            opt1.value = i;
            opt1.textContent = i;
            startSelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = i;
            opt2.textContent = i;
            endSelect.appendChild(opt2);
        }

        // Set defaults
        startSelect.value = 1;
        endSelect.value = totalAyat;
        this.rangeStartAyat = 1;
        this.rangeEndAyat = totalAyat;
    },

    validateAyatRange(type) {
        const startSelect = document.getElementById('range-start-select');
        const endSelect = document.getElementById('range-end-select');
        if (!startSelect || !endSelect) return;

        let startVal = parseInt(startSelect.value);
        let endVal = parseInt(endSelect.value);

        if (startVal > endVal) {
            if (type === 'start') {
                endSelect.value = startVal;
                endVal = startVal;
            } else {
                startSelect.value = endVal;
                startVal = endVal;
            }
        }

        this.rangeStartAyat = startVal;
        this.rangeEndAyat = endVal;
    },

    setAudioRepeat(val) {
        this.audioRepeatCount = parseInt(val);
    },

    toggleRangePlay() {
        if (this.isPlayingRange) {
            this._stopRangePlay();
            this.showToast('Pemutaran rangkaian dihentikan.', 'info');
        } else {
            this.isPlayingRange = true;
            this.currentAyatRepeatPlayedCount = 0;
            
            const btn = document.getElementById('btn-play-range');
            const icon = document.getElementById('btn-play-range-icon');
            const text = document.getElementById('btn-play-range-text');
            
            if (btn) {
                btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-700');
                btn.classList.add('bg-red-600', 'hover:bg-red-700');
            }
            if (icon) icon.textContent = '⏹';
            if (text) text.textContent = 'Hentikan';

            // Mulai putar dari rangeStartAyat
            const startBtn = document.querySelector(`.ayat-audio-btn[data-ayat="${this.rangeStartAyat}"]`);
            this.playAyatAudio(this.currentSurah, this.rangeStartAyat, startBtn, true);
        }
    },

    _stopRangePlay() {
        this.isPlayingRange = false;
        this.currentAyatRepeatPlayedCount = 0;
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        const btn = document.getElementById('btn-play-range');
        const icon = document.getElementById('btn-play-range-icon');
        const text = document.getElementById('btn-play-range-text');
        
        if (btn) {
            btn.classList.remove('bg-red-600', 'hover:bg-red-700');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }
        if (icon) icon.textContent = '▶';
        if (text) text.textContent = 'Putar Rangkaian';

        // Hapus class playing pada tombol audio
        document.querySelectorAll('.ayat-audio-btn.playing').forEach(b => {
            b.classList.remove('playing');
        });

        // Hapus highlight dari semua block ayat
        document.querySelectorAll('.ayat-block').forEach(el => {
            el.classList.remove('border-emerald-500', 'bg-emerald-50/30', 'dark:border-emerald-500', 'dark:bg-emerald-950/20');
        });
    },

    // ──────────────────────────────────────────────────────
    //  TUTUP KATA
    // ──────────────────────────────────────────────────────
    startTutupKata() {
        this.isArabBlurred = false;
        this.isIndoBlurred = false;
        this.updateBlurButtons();

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Menu
            </button>
        `;

        const container = document.getElementById('tutup-kata-container');
        container.innerHTML = '';

        const ayatMap = new Map();
        this.surahData.forEach(word => {
            if (!ayatMap.has(word.ayat)) ayatMap.set(word.ayat, []);
            ayatMap.get(word.ayat).push(word);
        });

        Array.from(ayatMap.entries()).sort((a, b) => a[0] - b[0]).forEach(([ayatNum, words]) => {
            words.sort((a, b) => a.urutan_kata - b.urutan_kata);

            const ayatBlock = document.createElement('div');
            ayatBlock.className = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100';

            const ayatHeader = document.createElement('div');
            ayatHeader.className = 'mb-4 border-b pb-2 border-gray-100';
            ayatHeader.innerHTML = `<h4 class="font-bold text-gray-700">Ayat ${ayatNum}</h4>`;
            ayatBlock.appendChild(ayatHeader);

            const wordsContainer = document.createElement('div');
            wordsContainer.className = 'flex flex-wrap gap-4 justify-start';
            wordsContainer.dir = 'rtl';

            words.forEach(word => {
                const id      = this.getWordId(word);
                const isHafal = this.hafalData.includes(id);

                const wordBox = document.createElement('div');
                wordBox.className = 'flex flex-col items-center p-3 border border-gray-100 rounded-lg bg-gray-50 min-w-[90px] shadow-sm hover:shadow-md transition-shadow cursor-default';

                wordBox.innerHTML = `
                    <div class="mb-3 text-center">
                        <p class="font-arabic text-3xl text-gray-800 mb-2 arab-text" onclick="app.unblur(this)">${word.arab}</p>
                        <p class="text-sm text-gray-600 indo-text" onclick="app.unblur(this)" dir="ltr">${word.indonesia}</p>
                    </div>
                    <span class="mt-auto text-xs px-3 py-1.5 rounded-full border font-medium text-center transition-all duration-200
                                 ${isHafal ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700/50 dark:bg-slate-800/30 dark:text-gray-500'}">
                        ${isHafal ? '✓ Hafal (Ujian)' : 'Belum Hafal'}
                    </span>
                `;
                wordsContainer.appendChild(wordBox);
            });

            ayatBlock.appendChild(wordsContainer);

            // Terjemahan ayat
            const terjemahan = this.terjemahanData.find(
                t => t.surah === this.currentSurah && t.ayat === Number(ayatNum)
            );
            if (terjemahan) {
                const tDiv = document.createElement('div');
                tDiv.className = 'mt-5 border-t border-gray-100 pt-3';
                tDiv.innerHTML = `<p class="text-sm text-gray-600 italic">${terjemahan.teks_terjemahan}</p>`;
                ayatBlock.appendChild(tDiv);
            }

            container.appendChild(ayatBlock);
        });

        this.showView('view-tutup-kata');
        this.applyBlur();
    },

    toggleBlur(type) {
        if (type === 'arab') this.isArabBlurred = !this.isArabBlurred;
        else                 this.isIndoBlurred = !this.isIndoBlurred;
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
        if (element.classList.contains('blur-text')) {
            element.classList.add('unblurred');
        }
    },

    toggleHafal(id, btnElement) {
        // Dinonaktifkan karena data hafalan diperbarui secara valid hanya melalui hasil Ujian Hafalan.
    },

    // ──────────────────────────────────────────────────────
    //  FLASHCARD (dengan arah dua arah & audio)
    // ──────────────────────────────────────────────────────
    setFcDirection(direction) {
        this.fcDirection = direction;
        const btnArab = document.getElementById('fc-dir-arab');
        const btnIndo = document.getElementById('fc-dir-indo');
        if (btnArab) btnArab.classList.toggle('active', direction === 'arab');
        if (btnIndo) btnIndo.classList.toggle('active', direction === 'indo');
        this.renderFlashcard();
    },

    startFlashcard() {
        if (this.surahData.length === 0) {
            this.showToast('Tidak ada data kosakata untuk surat ini.', 'warning');
            return;
        }
        this.fcIndex     = 0;
        this.fcDirection = 'arab';

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Menu
            </button>
        `;

        // Reset toggle UI
        const btnArab = document.getElementById('fc-dir-arab');
        const btnIndo = document.getElementById('fc-dir-indo');
        if (btnArab) btnArab.classList.add('active');
        if (btnIndo) btnIndo.classList.remove('active');

        this.showView('view-flashcard');
        this.renderFlashcard();
    },

    renderFlashcard() {
        if (this.fcIndex >= this.surahData.length) {
            this.showToast('🎉 Semua flashcard surat ini selesai! Hebat!', 'success', 4000);
            this.showSurahMenu();
            return;
        }

        const word    = this.surahData[this.fcIndex];
        const frontEl = document.getElementById('fc-front');
        const backEl  = document.getElementById('fc-back');

        document.getElementById('flashcard-counter').textContent =
            `Kata ${this.fcIndex + 1} dari ${this.surahData.length}`;

        if (this.fcDirection === 'arab') {
            // Front: Arab, Back: Indonesia
            if (frontEl) {
                frontEl.textContent = word.arab;
                frontEl.className   = 'font-arabic text-5xl text-gray-800 leading-relaxed text-center';
                frontEl.setAttribute('dir', 'rtl');
            }
            if (backEl) {
                backEl.textContent = word.indonesia;
                backEl.className   = 'text-2xl font-bold text-emerald-800 mb-2';
                backEl.removeAttribute('dir');
            }
        } else {
            // Front: Indonesia, Back: Arab
            if (frontEl) {
                frontEl.textContent = word.indonesia;
                frontEl.className   = 'text-2xl font-bold text-gray-800 text-center';
                frontEl.removeAttribute('dir');
            }
            if (backEl) {
                backEl.textContent = word.arab;
                backEl.className   = 'font-arabic text-5xl text-emerald-800 mb-2';
                backEl.setAttribute('dir', 'rtl');
            }
        }

        // Reset flip
        const card = document.getElementById('current-flashcard');
        if (card) card.classList.remove('flipped');

        // Reset audio
        const audioBtn = document.getElementById('fc-audio-btn');
        if (audioBtn) audioBtn.classList.remove('playing');
        if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
    },

    flipCard(container) {
        const card = container.querySelector('.flashcard');
        if (card) card.classList.toggle('flipped');
    },

    nextFlashcard() {
        // Navigasi ke flashcard berikutnya tanpa memodifikasi data hafalan permanen.
        this.fcIndex++;
        this.renderFlashcard();
    },

    // ──────────────────────────────────────────────────────
    //  KUIS PILIHAN GANDA
    // ──────────────────────────────────────────────────────
    startKuis() {
        if (this.surahData.length < 4) {
            this.showToast('Kata di surat ini terlalu sedikit untuk kuis (minimal 4 kata).', 'warning');
            return;
        }

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Menu
            </button>
        `;

        let shuffled = [...this.surahData];
        this.shuffleArray(shuffled);
        this.kuisQuestions   = shuffled.slice(0, 10);
        this.kuisIndex       = 0;
        this.kuisScore       = 0;

        document.getElementById('kuis-result').classList.add('hidden');
        const questionParent = document.getElementById('kuis-question')?.parentElement;
        if (questionParent) questionParent.classList.remove('hidden');
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
        document.getElementById('kuis-counter').textContent  = `${this.kuisIndex + 1}/${this.kuisQuestions.length}`;
        document.getElementById('kuis-question').textContent = currentWord.arab;

        const correctAnswer = currentWord.indonesia;
        let distractors     = [...new Set(
            this.allData.filter(w => w.indonesia !== correctAnswer).map(w => w.indonesia)
        )];
        this.shuffleArray(distractors);

        const options = [correctAnswer, ...distractors.slice(0, 3)];
        this.shuffleArray(options);

        const optionsContainer = document.getElementById('kuis-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left bg-white border-2 border-gray-100 hover:border-emerald-300 hover:-translate-y-0.5 p-4 rounded-xl font-medium text-gray-700 transition shadow-sm outline-none';
            btn.textContent = option;
            btn.onclick     = () => this.answerKuis(option === correctAnswer, btn);
            optionsContainer.appendChild(btn);
        });
    },

    answerKuis(isCorrect, btnElement) {
        if (this.kuisHasAnswered) return;
        this.kuisHasAnswered = true;

        const options       = document.getElementById('kuis-options').children;
        const currentWord   = this.kuisQuestions[this.kuisIndex];
        const correctAnswer = currentWord.indonesia;

        for (let btn of options) {
            btn.classList.add('pointer-events-none');
            if (btn.textContent === correctAnswer) {
                btn.classList.replace('border-gray-100', 'border-emerald-500');
                btn.classList.add('bg-emerald-100', 'text-emerald-800', 'anim-correct');
            } else if (btn === btnElement && !isCorrect) {
                btn.classList.replace('border-gray-100', 'border-red-500');
                btn.classList.add('bg-red-100', 'text-red-800', 'anim-wrong');
            }
        }

        if (isCorrect) {
            this.kuisScore++;
            this.showToast('✅ Jawaban Benar!', 'success', 900);
        } else {
            this.showToast(`❌ Jawaban: ${correctAnswer}`, 'error', 1800);
        }

        document.getElementById('kuis-next-container').classList.remove('hidden');
    },

    nextKuis() {
        this.kuisIndex++;
        this.renderKuis();
    },

    showKuisResult() {
        const questionParent = document.getElementById('kuis-question')?.parentElement;
        if (questionParent) questionParent.classList.add('hidden');
        document.getElementById('kuis-options').classList.add('hidden');
        document.getElementById('kuis-next-container').classList.add('hidden');

        const resultContainer = document.getElementById('kuis-result');
        resultContainer.classList.remove('hidden');

        const maxScore = this.kuisQuestions.length;
        const pct      = Math.round((this.kuisScore / maxScore) * 100);

        document.getElementById('kuis-score').textContent = `${this.kuisScore} / ${maxScore}`;

        const iconEl = document.getElementById('kuis-result-icon');
        const msgEl  = document.getElementById('kuis-result-msg');

        if (pct === 100) {
            if (iconEl) iconEl.textContent = '🏆';
            if (msgEl)  msgEl.textContent  = 'MasyaAllah! Sempurna! Kamu benar-benar hafal semua! 🎉';
            this.launchConfetti();
        } else if (pct >= 70) {
            if (iconEl) iconEl.textContent = '⭐';
            if (msgEl)  msgEl.textContent  = 'Bagus sekali! Terus tingkatkan hafalanmu!';
        } else if (pct >= 40) {
            if (iconEl) iconEl.textContent = '📖';
            if (msgEl)  msgEl.textContent  = 'Lumayan! Pelajari lagi kata-kata yang belum hafal ya.';
        } else {
            if (iconEl) iconEl.textContent = '💪';
            if (msgEl)  msgEl.textContent  = 'Jangan menyerah! Ulangi lagi untuk hasil lebih baik.';
        }

        this.checkBadges();
    },

    // ──────────────────────────────────────────────────────
    //  UJIAN HAFALAN
    // ──────────────────────────────────────────────────────
    startUjian() {
        if (this.surahData.length === 0) {
            this.showToast('Tidak ada data kosakata pada surat ini.', 'warning');
            return;
        }

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Berhenti Ujian
            </button>
        `;

        let shuffled = [...this.surahData];
        this.shuffleArray(shuffled);
        this.ujianQuestions = shuffled.slice(0, 50);
        this.ujianIndex     = 0;
        this.ujianScore     = 0;

        this.showView('view-ujian');
        this.ujianActive = true; // aktifkan SETELAH showView (showView meresetnya ke false)
        this.renderUjian();
    },

    renderUjian() {
        if (this.ujianIndex >= this.ujianQuestions.length) {
            this.finishUjian();
            return;
        }

        this.ujianHasAnswered = false;
        const currentWord     = this.ujianQuestions[this.ujianIndex];

        document.getElementById('ujian-counter').textContent  = `${this.ujianIndex + 1}/${this.ujianQuestions.length}`;
        document.getElementById('ujian-question').textContent = currentWord.arab;

        const correctAnswer = currentWord.indonesia;
        let distractors     = [...new Set(
            this.allData.filter(w => w.indonesia !== correctAnswer).map(w => w.indonesia)
        )];
        this.shuffleArray(distractors);

        const options = [correctAnswer, ...distractors.slice(0, 3)];
        this.shuffleArray(options);

        const optionsContainer = document.getElementById('ujian-options');
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left bg-white border-2 border-gray-100 hover:border-emerald-300 p-4 rounded-xl font-medium text-gray-700 transition shadow-sm outline-none';
            btn.textContent = option;
            btn.onclick     = () => this.answerUjian(option === correctAnswer, btn);
            optionsContainer.appendChild(btn);
        });

        this.startUjianTimer();
    },

    startUjianTimer() {
        if (this.ujianInterval) clearInterval(this.ujianInterval);
        this.ujianTimer = 10;

        const timerBar  = document.getElementById('ujian-timer-bar');
        const timerText = document.getElementById('ujian-timer-text');

        if (timerBar)  { timerBar.style.width = '100%'; timerBar.style.backgroundColor = '#10b981'; }
        if (timerText) timerText.textContent = '10s';

        this.ujianInterval = setInterval(() => {
            // Jika ujian sudah tidak aktif (user keluar), hentikan timer
            if (!this.ujianActive) {
                clearInterval(this.ujianInterval);
                this.ujianInterval = null;
                return;
            }

            this.ujianTimer--;
            const pct = (this.ujianTimer / 10) * 100;
            if (timerBar)  timerBar.style.width = `${pct}%`;
            if (timerText) timerText.textContent = `${this.ujianTimer}s`;

            // Ubah warna timer sesuai waktu tersisa
            if (this.ujianTimer <= 3) {
                if (timerBar) timerBar.style.backgroundColor = '#ef4444';
            } else if (this.ujianTimer <= 6) {
                if (timerBar) timerBar.style.backgroundColor = '#f59e0b';
            }

            if (this.ujianTimer <= 0) {
                clearInterval(this.ujianInterval);
                this.ujianInterval = null;
                if (this.ujianActive) this.answerUjian(false, null, true); // timeout
            }
        }, 1000);
    },

    answerUjian(isCorrect, btnElement = null, isTimeout = false) {
        // Batalkan jika sudah dijawab atau user sudah keluar dari halaman ujian
        if (this.ujianHasAnswered || !this.ujianActive) return;
        this.ujianHasAnswered = true;
        if (this.ujianInterval) { clearInterval(this.ujianInterval); this.ujianInterval = null; }

        const options       = document.getElementById('ujian-options')?.children;
        const currentWord   = this.ujianQuestions[this.ujianIndex];
        const correctAnswer = currentWord.indonesia;

        if (options) {
            for (let btn of options) {
                btn.classList.add('pointer-events-none');
                if (btn.textContent === correctAnswer) {
                    btn.classList.replace('border-gray-100', 'border-emerald-500');
                    btn.classList.add('bg-emerald-100', 'text-emerald-800');
                } else if (btn === btnElement && !isCorrect) {
                    btn.classList.replace('border-gray-100', 'border-red-500');
                    btn.classList.add('bg-red-100', 'text-red-800');
                }
            }
        }

        if (isTimeout) {
            this.showToast('⏰ Waktu habis!', 'warning', 700);
        } else if (isCorrect) {
            this.ujianScore++;
            const wordId = this.getWordId(currentWord);
            if (!this.hafalData.includes(wordId)) {
                this.hafalData.push(wordId);
                this.saveHafalData();
            }
        }

        setTimeout(() => {
            // Jangan lanjut jika user sudah keluar dari ujian
            if (!this.ujianActive) return;
            this.ujianIndex++;
            this.renderUjian();
        }, 900);
    },

    finishUjian() {
        if (this.ujianInterval) clearInterval(this.ujianInterval);

        const totalSoal  = this.ujianQuestions.length;
        const finalScore = Math.round((this.ujianScore / totalSoal) * 100);

        document.getElementById('ujian-final-score').textContent  = finalScore;
        document.getElementById('ujian-correct-count').textContent = this.ujianScore;
        document.getElementById('ujian-wrong-count').textContent   = totalSoal - this.ujianScore;

        const iconEl  = document.getElementById('ujian-result-icon');
        const pesanEl = document.getElementById('ujian-result-pesan');

        if (finalScore === 100) {
            if (iconEl)  iconEl.textContent  = '🏆';
            if (pesanEl) pesanEl.textContent = 'MasyaAllah! Nilai sempurna! Kamu luar biasa! 🎉';
            this.launchConfetti();
            setTimeout(() => this.showToast('🏆 Nilai sempurna! Luar biasa!', 'badge', 5000), 800);
        } else if (finalScore >= 80) {
            if (iconEl)  iconEl.textContent  = '🌟';
            if (pesanEl) pesanEl.textContent = 'Bagus sekali! Terus pertahankan semangat belajarmu!';
            this.launchConfetti();
        } else if (finalScore >= 60) {
            if (iconEl)  iconEl.textContent  = '👍';
            if (pesanEl) pesanEl.textContent = 'Cukup baik! Perbanyak latihan untuk hasil lebih maksimal.';
        } else {
            if (iconEl)  iconEl.textContent  = '📖';
            if (pesanEl) pesanEl.textContent = 'Jangan menyerah! Pelajari kembali mufrodatnya ya.';
        }

        // Simpan ke riwayat
        const surahMeta = this.daftarSurahData.find(s => s.id === this.currentSurah);
        const namaSurah = surahMeta ? surahMeta.nama_latin : `Surat ${this.currentSurah}`;

        const now     = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const record = {
            surah_id  : this.currentSurah,
            nama_surah: namaSurah,
            score     : finalScore,
            benar     : this.ujianScore,
            salah     : totalSoal - this.ujianScore,
            date      : `${dateStr} ${timeStr}`
        };

        this.ujianHistory.unshift(record);
        localStorage.setItem('ujian_history', JSON.stringify(this.ujianHistory));

        document.getElementById('nav-actions').innerHTML = `
            <button onclick="app.showSurahMenu()" class="text-emerald-100 hover:text-white transition text-sm font-medium">
                &larr; Kembali ke Menu
            </button>
        `;

        this.checkBadges();
        this.showView('view-ujian-result');
    },

    // ──────────────────────────────────────────────────────
    //  RIWAYAT UJIAN
    // ──────────────────────────────────────────────────────
    showHistory() {
        this.showView('view-history');
        const container = document.getElementById('history-container');
        container.innerHTML = '';

        if (this.ujianHistory.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-10 text-sm">Belum ada riwayat ujian. Yuk mulai ujian pertamamu!</p>';
            return;
        }

        this.ujianHistory.forEach(record => {
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow';

            let scoreColor = 'text-gray-600';
            let bgScore    = 'bg-gray-100';
            let icon       = '📖';

            if (record.score === 100) { scoreColor = 'text-emerald-700'; bgScore = 'bg-emerald-100'; icon = '🏆'; }
            else if (record.score >= 80) { scoreColor = 'text-emerald-700'; bgScore = 'bg-emerald-100'; icon = '🌟'; }
            else if (record.score >= 60) { scoreColor = 'text-orange-700'; bgScore = 'bg-orange-100'; icon = '👍'; }
            else { scoreColor = 'text-red-700'; bgScore = 'bg-red-100'; icon = '📖'; }

            card.innerHTML = `
                <div>
                    <h4 class="font-bold text-gray-800">${icon} ${record.surah_id}. ${record.nama_surah}</h4>
                    <p class="text-xs text-gray-500 mt-0.5">${record.date}</p>
                    ${record.benar !== undefined
                        ? `<p class="text-xs text-gray-400 mt-0.5">✅ ${record.benar} benar &nbsp;❌ ${record.salah} salah</p>`
                        : ''
                    }
                </div>
                <div class="${bgScore} ${scoreColor} font-black text-2xl px-4 py-2 rounded-xl text-center min-w-[60px]">
                    ${record.score}
                </div>
            `;
            container.appendChild(card);
        });
    },

    // ──────────────────────────────────────────────────────
    //  UTILITAS
    // ──────────────────────────────────────────────────────
    /**
     * Fisher-Yates shuffle — mengacak array secara in-place tanpa bias.
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
};

// ── Inisialisasi aplikasi saat DOM siap ──
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
