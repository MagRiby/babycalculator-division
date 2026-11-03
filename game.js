// === App Version - increment to force refresh on mobile ===
const APP_VERSION = '4';
const storedVersion = localStorage.getItem('kawaii_div_version');
if (storedVersion && storedVersion !== APP_VERSION) {
    localStorage.setItem('kawaii_div_version', APP_VERSION);
    location.reload();
} else {
    localStorage.setItem('kawaii_div_version', APP_VERSION);
}

// === Score & Error History (localStorage + optional Firebase) ===
function isDesktop() {
    return /Windows|Macintosh/i.test(navigator.userAgent) && !/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.maxTouchPoints <= 1;
}

function trackError(dividend, divisor) {
    const errors = JSON.parse(localStorage.getItem('kawaii_div_errors') || '{}');
    const key = `${dividend}÷${divisor}`;
    errors[key] = (errors[key] || 0) + 1;
    localStorage.setItem('kawaii_div_errors', JSON.stringify(errors));
    syncErrorsToFirebase(errors);
}

function saveSession(mode, finalScore, bestStreak) {
    const session = {
        date: new Date().toISOString(),
        mode: mode,
        score: finalScore,
        streak: bestStreak
    };

    const history = JSON.parse(localStorage.getItem('kawaii_div_scores') || '[]');
    history.unshift(session);
    if (history.length > 50) history.length = 50;
    localStorage.setItem('kawaii_div_scores', JSON.stringify(history));

    pushSessionToFirebase(session);

    const panel = document.getElementById('historyPanel');
    if (panel && !panel.classList.contains('hidden')) {
        renderHistory();
    }
}

function renderHistory() {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;

    const list = document.getElementById('historyList');

    if (typeof firebaseDB !== 'undefined' && firebaseDB) {
        renderHistoryFromFirebase(list);
        return;
    }

    renderHistoryLocal(list);
}

function renderHistoryLocal(list) {
    const history = JSON.parse(localStorage.getItem('kawaii_div_scores') || '[]');
    const errors = JSON.parse(localStorage.getItem('kawaii_div_errors') || '{}');
    list.innerHTML = buildHistoryHTML(history, errors);
}

function renderHistoryFromFirebase(list) {
    list.innerHTML = '<div class="history-empty">Chargement... 🌸</div>';

    firebaseDB.ref('div_scores').orderByChild('date').limitToLast(50).on('value', snap => {
        const sessions = [];
        snap.forEach(child => sessions.push(child.val()));
        sessions.reverse();

        firebaseDB.ref('div_errors').once('value', errSnap => {
            const errors = errSnap.val() || {};
            list.innerHTML = buildHistoryHTML(sessions, errors);
        });
    });
}

function buildHistoryHTML(history, errors) {
    let html = '';

    if (errors && Object.keys(errors).length > 0) {
        const tableCounts = {};
        for (const [key, count] of Object.entries(errors)) {
            const parts = key.split('÷');
            const divisor = Number(parts[1]);
            if (!isNaN(divisor)) {
                tableCounts[divisor] = (tableCounts[divisor] || 0) + count;
            }
        }
        const tables = Object.entries(tableCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const hardest = Object.entries(errors).sort((a, b) => b[1] - a[1]).slice(0, 5);

        html += '<div class="struggle-section">';
        html += '<div class="struggle-title">🥺 Tables à travailler</div>';
        html += '<div class="struggle-tags">';
        tables.forEach(([table, count]) => {
            html += `<span class="struggle-tag">÷${table} <small>(${count})</small></span>`;
        });
        html += '</div>';
        html += '<div class="struggle-subtitle">Divisions les plus ratées</div>';
        html += '<div class="struggle-tags">';
        hardest.forEach(([key, count]) => {
            html += `<span class="struggle-tag hard">${key} <small>(${count})</small></span>`;
        });
        html += '</div></div>';
    }

    if (!history || history.length === 0) {
        html += '<div class="history-empty">Aucune partie encore. Lance-toi ! 🌸</div>';
    } else {
        html += history.map(h => {
            const d = new Date(h.date);
            const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return `<div class="history-item">
                <span class="history-date">${dateStr} ${timeStr}</span>
                <span class="history-mode">${h.mode}</span>
                <span class="history-score">Score: ${h.score} | 🔥 ${h.streak}</span>
            </div>`;
        }).join('');
    }

    return html;
}

// === Firebase Sync Functions ===
function pushSessionToFirebase(session) {
    if (typeof firebaseDB === 'undefined' || !firebaseDB) return;
    try {
        firebaseDB.ref('div_scores').push(session);
    } catch (e) {
        console.warn('Firebase push failed:', e);
    }
}

function syncErrorsToFirebase(localErrors) {
    if (typeof firebaseDB === 'undefined' || !firebaseDB) return;
    try {
        firebaseDB.ref('div_errors').once('value', snap => {
            const remote = snap.val() || {};
            const merged = { ...remote };
            for (const [key, count] of Object.entries(localErrors)) {
                merged[key] = Math.max(merged[key] || 0, count);
            }
            firebaseDB.ref('div_errors').set(merged);
        });
    } catch (e) {
        console.warn('Firebase error sync failed:', e);
    }
}

// === Kawaii Web Audio Sound Effects ===
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    if (type === 'click') {
        // Cute bubble pop sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.055);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.055);
        osc.start(now);
        osc.stop(now + 0.055);
    } else if (type === 'correct') {
        // Sparkly kawaii chime
        const notes = [587.33, 739.99, 880, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.065);
            gain.gain.setValueAtTime(0, now + i * 0.065);
            gain.gain.linearRampToValueAtTime(0.22, now + i * 0.065 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.065 + 0.32);
            osc.start(now + i * 0.065);
            osc.stop(now + i * 0.065 + 0.32);
        });
    } else if (type === 'wrong') {
        // Gentle sad boop
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(360, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
    } else if (type === 'start') {
        const melody = [523.25, 659.25, 783.99, 1046.5];
        melody.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, now + i * 0.06);
            gain.gain.setValueAtTime(0, now + i * 0.06);
            gain.gain.linearRampToValueAtTime(0.16, now + i * 0.06 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.06 + 0.18);
            osc.start(now + i * 0.06);
            osc.stop(now + i * 0.06 + 0.18);
        });
    }
}

// === DOM Elements ===
const settings = document.getElementById('settings');
const game = document.getElementById('game');
const startBtn = document.getElementById('startBtn');
const maxNumberSelect = document.getElementById('maxNumber');
const num1El = document.getElementById('num1');
const num2El = document.getElementById('num2');
const answerDisplay = document.getElementById('answerDisplay');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const scoreEl = document.getElementById('score');
const streakEl = document.getElementById('streak');
const newGameBtn = document.getElementById('newGameBtn');
const backBtn = document.getElementById('backBtn');
const numButtons = document.querySelectorAll('.num-btn');
const robot = document.getElementById('robot');
const timerFill = document.getElementById('timerFill');
const challengesPanel = document.getElementById('challengesPanel');
const challengesList = document.getElementById('challengesList');
const challengeModeLabel = document.getElementById('challengeModeLabel');
const challengeTableNum = document.getElementById('challengeTableNum');
const masteredPanel = document.getElementById('masteredPanel');
const masteredList = document.getElementById('masteredList');
const masteredCountEl = document.getElementById('masteredCount');
const masteredTotalEl = document.getElementById('masteredTotal');
const sidePanels = document.querySelector('.side-panels');
const tableButtons = document.querySelectorAll('.btn-table');
const roundButtons = document.querySelectorAll('.btn-round');
const questionCounter = document.getElementById('questionCounter');
const currentQEl = document.getElementById('currentQ');
const totalQEl = document.getElementById('totalQ');
const globalTimerBar = document.getElementById('globalTimerBar');
const globalTimerFill = document.getElementById('globalTimerFill');
const globalTimerText = document.getElementById('globalTimerText');
const endScreen = document.getElementById('endScreen');
const endTitle = document.getElementById('endTitle');
const endScore = document.getElementById('endScore');
const endCorrect = document.getElementById('endCorrect');
const endStreak = document.getElementById('endStreak');
const endStars = document.getElementById('endStars');
const replayBtn = document.getElementById('replayBtn');
const endMenuBtn = document.getElementById('endMenuBtn');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const historyPanel = document.getElementById('historyPanel');

// === Game State ===
let score = 0;
let streak = 0;
let bestStreak = 0;
let currentAnswer = 0;
let maxNumber = 12;
let userInput = '';
let currentNum1 = 0; // Dividend
let currentNum2 = 0; // Divisor
let timer = null;
let timeLeft = 12;
const TIMER_DURATION = 12;
let challenges = []; // Array of {n1, n2, answer}
let currentIsChallenge = false;
let currentChallengeIndex = -1;
let challengeTableMode = 0; // 0 = normal mode, 1-12 = specific divisor table
let mastered = []; // Array of quotients (1..12) mastered in challenge mode

// Round mode
let totalQuestions = 10;
let currentQuestion = 0;
let correctAnswers = 0;
let globalTimer = null;
let globalTimeLeft = 0;
const TIME_PER_10 = 95; // 1:35 per 10 division questions

// Show history automatically on desktop, or toggle via button on iPad
if (isDesktop()) {
    historyPanel.classList.remove('hidden');
    renderHistory();
}

toggleHistoryBtn.addEventListener('click', () => {
    const isHidden = historyPanel.classList.toggle('hidden');
    if (!isHidden) renderHistory();
});

closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.add('hidden');
});

// === Korean + English Encouragement Messages ===
const correctMessages = [
    '대박! DAEBAK! Mind-blowing! 🌟',
    '천재! CHEONJAE! Pure Genius! 🧠✨',
    '완벽해! WANBYEOKAE! Flawless Hit! 🎯',
    '최고! CHEGO! Simply the Best! 👑',
    '잘했어! JALHESSEO! Nailed It! 🚀',
    '멋져! MEOTJYEO! Super Cool! ⚡',
    '짱! JJANG! Totally Epic! 🏆',
    '미쳤다! CRAZY COMBO! 🔥',
    '화이팅! HWAITING! Power Up! 💪',
    '반짝반짝! SHINING STAR! 🌠',
    '레전드! LEGENDARY MOVE! 💎',
    '원픽! NUMBER ONE PICK! 💖'
];

const wrongMessages = [
    '괜찮아~ Gwaenchana~ Shake it off! 💭',
    '다시! Dasi! One more try! 🔄',
    '힘내! Himnae! You got this! 💪',
    '아깝다~ Akkapda~ So close! ⚡'
];

// === Event Listeners ===
startBtn.addEventListener('click', () => {
    initAudio();
    playSound('start');
    challengeTableMode = 0;
    startGame();
});

tableButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        initAudio();
        playSound('start');
        challengeTableMode = parseInt(btn.dataset.table, 10);
        startGame();
    });
});

submitBtn.addEventListener('click', checkAnswer);
newGameBtn.addEventListener('click', goToMenu);
backBtn.addEventListener('click', goToMenu);

roundButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        initAudio();
        playSound('click');
        roundButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        totalQuestions = parseInt(btn.dataset.rounds, 10);
    });
});

replayBtn.addEventListener('click', () => {
    endScreen.classList.add('hidden');
    initAudio();
    playSound('start');
    startGame();
});

endMenuBtn.addEventListener('click', () => {
    endScreen.classList.add('hidden');
    goToMenu();
});

function goToMenu() {
    stopTimer();
    stopGlobalTimer();

    if (score > 0) {
        const mode = challengeTableMode > 0 ? `Défi ÷${challengeTableMode}` : `Tables 1-${maxNumber}`;
        saveSession(mode, score, bestStreak);
    }

    settings.classList.remove('hidden');
    game.classList.add('hidden');
    endScreen.classList.add('hidden');
    newGameBtn.classList.add('hidden');
    challengesPanel.classList.remove('visible');
    masteredPanel.classList.remove('visible');
    sidePanels.classList.remove('visible');
    challengeModeLabel.classList.add('hidden');
    questionCounter.classList.add('hidden');
    globalTimerBar.classList.add('hidden');
    document.body.classList.remove('challenge-theme');
    robot.className = 'robot';

    score = 0;
    streak = 0;
    bestStreak = 0;
    currentQuestion = 0;
    correctAnswers = 0;
    challenges = [];
    mastered = [];
}

numButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        initAudio();
        playSound('click');
        const num = btn.dataset.num;
        const action = btn.dataset.action;

        if (num !== undefined) {
            if (userInput.length < 3) {
                userInput += num;
                updateDisplay();
            }
        } else if (action === 'clear') {
            userInput = '';
            updateDisplay();
        } else if (action === 'back') {
            userInput = userInput.slice(0, -1);
            updateDisplay();
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (game.classList.contains('hidden')) return;

    if (e.key >= '0' && e.key <= '9') {
        initAudio();
        playSound('click');
        if (userInput.length < 3) {
            userInput += e.key;
            updateDisplay();
        }
    } else if (e.key === 'Backspace') {
        userInput = userInput.slice(0, -1);
        updateDisplay();
    } else if (e.key === 'Enter') {
        checkAnswer();
    } else if (e.key === 'Escape') {
        userInput = '';
        updateDisplay();
    }
});

function updateDisplay() {
    answerDisplay.textContent = userInput;
    if (userInput === '') {
        answerDisplay.classList.add('empty');
    } else {
        answerDisplay.classList.remove('empty');
    }
}

function startGame() {
    maxNumber = parseInt(maxNumberSelect.value, 10);
    score = 0;
    streak = 0;
    bestStreak = 0;
    userInput = '';
    currentQuestion = 0;
    correctAnswers = 0;
    challenges = [];
    mastered = [];
    updateChallengesPanel();
    updateMasteredPanel();
    scoreEl.textContent = score;
    streakEl.textContent = streak;
    settings.classList.add('hidden');
    endScreen.classList.add('hidden');
    newGameBtn.classList.add('hidden');
    game.classList.remove('hidden');
    feedback.textContent = '';
    feedback.className = 'feedback';

    if (challengeTableMode > 0) {
        challengeModeLabel.classList.remove('hidden');
        challengeTableNum.textContent = challengeTableMode;
        document.body.classList.add('challenge-theme');
        questionCounter.classList.add('hidden');
        globalTimerBar.classList.add('hidden');
    } else {
        challengeModeLabel.classList.add('hidden');
        document.body.classList.remove('challenge-theme');
        questionCounter.classList.remove('hidden');
        totalQEl.textContent = totalQuestions;
        currentQEl.textContent = '1';
        globalTimerBar.classList.remove('hidden');
        globalTimeLeft = Math.round((totalQuestions / 10) * TIME_PER_10);
        startGlobalTimer();
    }

    updateDisplay();
    generateQuestion();
}

// Build valid exact divisions where divisor (n2, second number) is 1..maxLimit (max 12)
function getNormalPool(maxLimit) {
    const cap = Math.min(maxLimit, 12);
    const pool = [];
    for (let n2 = 1; n2 <= cap; n2++) {
        for (let quotient = 1; quotient <= cap; quotient++) {
            pool.push({ n1: n2 * quotient, n2, answer: quotient });
        }
    }
    return pool;
}

// Build challenge pool for a given divisor table (1..12), quotients 1..12
function getChallengePool(tableNum) {
    const pool = [];
    for (let quotient = 1; quotient <= 12; quotient++) {
        const n1 = tableNum * quotient;
        pool.push({ n1, n2: tableNum, answer: quotient, key: `${n1}÷${tableNum}` });
    }
    return pool;
}

function generateQuestion() {
    stopTimer();
    currentIsChallenge = false;

    // 30% chance to pick from missed challenges queue if any exist
    if (challenges.length > 0 && Math.random() < 0.3) {
        const challengeIndex = Math.floor(Math.random() * challenges.length);
        const challenge = challenges[challengeIndex];
        currentNum1 = challenge.n1;
        currentNum2 = challenge.n2;
        currentAnswer = challenge.answer;
        currentIsChallenge = true;
        currentChallengeIndex = challengeIndex;
        highlightChallenge(challengeIndex);
    } else if (challengeTableMode > 0) {
        // Challenge table mode: all exact divisions with n1 <= 12 involving challengeTableMode
        const fullPool = getChallengePool(challengeTableMode);
        const remaining = fullPool.filter(item => !mastered.includes(item.key));

        if (remaining.length === 0) {
            stopTimer();
            saveSession(`Défi ÷${challengeTableMode} ✅`, score, bestStreak);
            spawnTableMasterCelebration();
            newGameBtn.classList.remove('hidden');
            return;
        }

        let candidates = remaining.filter(item => !(item.n1 === currentNum1 && item.n2 === currentNum2));
        if (candidates.length === 0) candidates = remaining;

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        currentNum1 = pick.n1;
        currentNum2 = pick.n2;
        currentAnswer = pick.answer;
        clearChallengeHighlight();
    } else {
        // Normal mode: exact divisions where dividend (n1) is between 1 and maxNumber (at most 12)
        const pool = getNormalPool(maxNumber);
        let candidates = pool.filter(item => !(item.n1 === currentNum1 && item.n2 === currentNum2));
        if (candidates.length === 0) candidates = pool;

        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        currentNum1 = pick.n1;
        currentNum2 = pick.n2;
        currentAnswer = pick.answer;
        clearChallengeHighlight();
    }

    num1El.textContent = currentNum1;
    num2El.textContent = currentNum2;
    userInput = '';
    updateDisplay();
    startTimer();
}

function highlightChallenge(index) {
    const items = challengesList.querySelectorAll('.challenge-item');
    items.forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
}

function clearChallengeHighlight() {
    const items = challengesList.querySelectorAll('.challenge-item');
    items.forEach(item => item.classList.remove('active'));
}

function checkAnswer() {
    stopTimer();
    const userAnswer = parseInt(userInput, 10);

    if (isNaN(userAnswer) || userInput === '') {
        feedback.textContent = 'Entre un nombre ! 🌸';
        feedback.className = 'feedback';
        startTimer();
        return;
    }

    if (userAnswer === currentAnswer) {
        playSound('correct');
        robot.className = 'robot happy';
        setTimeout(() => { robot.className = 'robot'; }, 2850);

        score++;
        streak++;
        correctAnswers++;
        if (streak > bestStreak) bestStreak = streak;
        scoreEl.textContent = score;
        streakEl.textContent = streak;
        feedback.textContent = correctMessages[Math.floor(Math.random() * correctMessages.length)];
        feedback.className = 'feedback correct';

        removeChallengeIfExists(currentNum1, currentNum2);

        if (challengeTableMode > 0) {
            addToMastered(`${currentNum1}÷${currentNum2}`);
        }

        spawnConfetti();

        setTimeout(() => advanceQuestion(), 800);
    } else {
        handleWrongAnswer();
    }
}

function advanceQuestion() {
    if (challengeTableMode === 0) {
        currentQuestion++;
        currentQEl.textContent = Math.min(currentQuestion + 1, totalQuestions);

        if (currentQuestion >= totalQuestions) {
            endRound();
            return;
        }
    }
    generateQuestion();
}

function endRound() {
    stopTimer();
    stopGlobalTimer();

    const mode = challengeTableMode > 0 ? `Défi ÷${challengeTableMode}` : `Tables 1-${maxNumber} (${totalQuestions}Q)`;
    saveSession(mode, score, bestStreak);

    game.classList.add('hidden');
    endScreen.classList.remove('hidden');

    endScore.textContent = score;
    endCorrect.textContent = `${correctAnswers}/${totalQuestions}`;
    endStreak.textContent = `🔥 ${bestStreak}`;

    const pct = correctAnswers / totalQuestions;
    if (pct >= 0.9) {
        endTitle.textContent = '완벽해! PERFECT SCORE! 👑';
        endStars.textContent = '⭐⭐⭐';
        spawnConfetti();
        setTimeout(() => spawnConfetti(), 400);
    } else if (pct >= 0.7) {
        endTitle.textContent = '잘했어! AWESOME JOB! 🌟';
        endStars.textContent = '⭐⭐';
        spawnConfetti();
    } else if (pct >= 0.5) {
        endTitle.textContent = '힘내! KEEP GOING! 💪';
        endStars.textContent = '⭐';
    } else {
        endTitle.textContent = '다시! LET\'S TRY AGAIN! 🚀';
        endStars.textContent = '🌱';
    }
}

function startGlobalTimer() {
    updateGlobalTimerDisplay();
    globalTimer = setInterval(() => {
        globalTimeLeft -= 1;
        updateGlobalTimerDisplay();

        if (globalTimeLeft <= 0) {
            stopGlobalTimer();
            stopTimer();
            feedback.textContent = '⏰ Temps écoulé !';
            feedback.className = 'feedback wrong';
            setTimeout(() => endRound(), 1000);
        }
    }, 1000);
}

function stopGlobalTimer() {
    if (globalTimer) {
        clearInterval(globalTimer);
        globalTimer = null;
    }
}

function updateGlobalTimerDisplay() {
    const totalTime = Math.round((totalQuestions / 10) * TIME_PER_10);
    const pct = Math.max(0, (globalTimeLeft / totalTime) * 100);
    globalTimerFill.style.width = pct + '%';

    const mins = Math.floor(globalTimeLeft / 60);
    const secs = globalTimeLeft % 60;
    globalTimerText.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

    if (globalTimeLeft <= 15) {
        globalTimerFill.className = 'global-timer-fill critical';
    } else if (globalTimeLeft <= 30) {
        globalTimerFill.className = 'global-timer-fill warning';
    } else {
        globalTimerFill.className = 'global-timer-fill';
    }
}

function handleWrongAnswer() {
    playSound('wrong');
    robot.className = 'robot sad';
    setTimeout(() => { robot.className = 'robot'; }, 1400);
    streak = 0;
    streakEl.textContent = streak;
    feedback.textContent = `${wrongMessages[Math.floor(Math.random() * wrongMessages.length)]} (${currentNum1} ÷ ${currentNum2} = ${currentAnswer})`;
    feedback.className = 'feedback wrong';

    trackError(currentNum1, currentNum2);
    addToChallenge(currentNum1, currentNum2, currentAnswer);

    setTimeout(() => advanceQuestion(), 1600);
}

function addToChallenge(n1, n2, answer) {
    const exists = challenges.some(c => c.n1 === n1 && c.n2 === n2);
    if (!exists) {
        challenges.push({ n1, n2, answer });
        updateChallengesPanel();
    }
}

function removeChallengeIfExists(n1, n2) {
    const index = challenges.findIndex(c => c.n1 === n1 && c.n2 === n2);

    if (index !== -1) {
        const items = challengesList.querySelectorAll('.challenge-item');
        if (items[index]) {
            items[index].classList.add('solved');
        }

        setTimeout(() => {
            challenges.splice(index, 1);
            updateChallengesPanel();
        }, 450);

        playSound('correct');
    }
}

function updateChallengesPanel() {
    if (challenges.length === 0) {
        challengesPanel.classList.remove('visible');
        updateSidePanels();
        return;
    }

    challengesPanel.classList.add('visible');
    challengesList.innerHTML = challenges.map(c =>
        `<div class="challenge-item">${c.n1}÷${c.n2}</div>`
    ).join('');
    updateSidePanels();
}

function addToMastered(divKey) {
    if (!mastered.includes(divKey)) {
        mastered.push(divKey);
        updateMasteredPanel();
    }
}

function updateMasteredPanel() {
    const totalForTable = challengeTableMode > 0 ? getChallengePool(challengeTableMode).length : 12;
    if (masteredCountEl) {
        masteredCountEl.textContent = mastered.length;
    }
    if (masteredTotalEl) {
        masteredTotalEl.textContent = totalForTable;
    }
    if (mastered.length === 0 || challengeTableMode === 0) {
        masteredPanel.classList.remove('visible');
        updateSidePanels();
        return;
    }

    masteredPanel.classList.add('visible');
    masteredList.innerHTML = mastered.map(key =>
        `<div class="mastered-item">${key}</div>`
    ).join('');
    updateSidePanels();
}

function updateSidePanels() {
    const hasVisible = masteredPanel.classList.contains('visible') || challengesPanel.classList.contains('visible');
    sidePanels.classList.toggle('visible', hasVisible);
}

function startTimer() {
    timeLeft = TIMER_DURATION;
    timerFill.style.width = '100%';
    timerFill.className = 'timer-fill';

    timer = setInterval(() => {
        timeLeft -= 0.1;
        const percent = Math.max(0, (timeLeft / TIMER_DURATION) * 100);
        timerFill.style.width = percent + '%';

        if (timeLeft <= 3) {
            timerFill.className = 'timer-fill critical';
        } else if (timeLeft <= 5.5) {
            timerFill.className = 'timer-fill warning';
        }

        if (timeLeft <= 0) {
            stopTimer();
            feedback.textContent = '⏰ Temps écoulé !';
            feedback.className = 'feedback wrong';
            handleWrongAnswer();
        }
    }, 100);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// === Multi-Style Korean + English Visual Celebrations ===
const celebrationBanners = [
    { kr: '대박! DAEBAK!', en: '🌟 UNSTOPPABLE! 🌟', theme: 'theme-gold' },
    { kr: '천재! CHEONJAE!', en: '🧠 GENIUS MODE! ✨', theme: 'theme-cyber' },
    { kr: '완벽해! PERFECT!', en: '🎯 FLAWLESS HIT! 💖', theme: 'theme-pink' },
    { kr: '최고! CHEGO!', en: '👑 ULTIMATE BOSS! 🔥', theme: 'theme-gold' },
    { kr: '잘했어! NAILED IT!', en: '🚀 ROCKET SPEED! 💫', theme: 'theme-mint' },
    { kr: '멋져! SO COOL!', en: '⚡ ELECTRIC POWER! 🌈', theme: 'theme-cyber' },
    { kr: '짱! JJANG!', en: '🏆 TOTALLY EPIC! ⭐', theme: 'theme-galaxy' },
    { kr: '미쳤다! INSANE!', en: '🔥 MEGA COMBO! 🎉', theme: 'theme-pink' },
    { kr: '레전드! LEGEND!', en: '💎 DIAMOND BRAIN! ✨', theme: 'theme-galaxy' },
    { kr: '화이팅! POWER UP!', en: '💪 FULL ENERGY! ⚡', theme: 'theme-mint' }
];

const emojiPalettes = [
    ['⚡', '🚀', '🌟', '💎', '🔥', '👑', '✨', '💫'],
    ['🌈', '🦄', '💖', '⭐', '🎉', '🏆', '💫', '🔮'],
    ['🤖', '⚙️', '⚡', '💎', '🛸', '🌠', '✨', '🎯'],
    ['🔥', '💥', '👑', '🏆', '🌟', '💯', '🎉', '🚀']
];

const celebrationGifs = [
    'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXp4dmhucmoxcXRnZjZiNHZzbzEzZjFyOXRhbDljYmxoem1iZjR1OSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Y97iZVAYoSYfjnYxZY/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MTg3bGh2dnVwdXc1cmUxcTV1d2ZuMzRkdWEzdzQ5a2FrODl2MXlheSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/LN2JXGKWRYUft7eJ9w/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MTg3bGh2dnVwdXc1cmUxcTV1d2ZuMzRkdWEzdzQ5a2FrODl2MXlheSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/suAwqVyxWh9RyGk2iE/giphy.gif',
    'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHlwbDJsMXBybjY3eDZhNmp3aHprMTNlejVubHhpNzU5d25icDFxdSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/Ol96t6QvBO28UgHKdB/giphy.gif'
];

function spawnConfetti() {
    const palette = emojiPalettes[Math.floor(Math.random() * emojiPalettes.length)];
    const effectType = Math.floor(Math.random() * 4);

    // 1. Screen Flash
    const flash = document.createElement('div');
    flash.className = 'screen-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 850);

    // 2. Random Celebration GIF (+2s longer)
    const gif = document.createElement('img');
    gif.src = celebrationGifs[Math.floor(Math.random() * celebrationGifs.length)];
    gif.className = 'celebration-gif';
    document.body.appendChild(gif);
    setTimeout(() => gif.remove(), 3850);

    // 3. Random Korean + English Dual-Line Banner (+2s longer)
    const bannerData = celebrationBanners[Math.floor(Math.random() * celebrationBanners.length)];
    const bigText = document.createElement('div');
    bigText.className = `big-celebration ${bannerData.theme}`;
    bigText.innerHTML = `<span class="kr-text">${bannerData.kr}</span><span class="en-text">${bannerData.en}</span>`;
    document.body.appendChild(bigText);
    setTimeout(() => bigText.remove(), 3250);

    // 4. Random Visual Eye-Candy Effect (4 distinct styles, all +2s longer!)
    if (effectType === 0) {
        // Style A: Center Starburst + Dual Expanding Shockwave Rings
        ['#ff75ad', '#5ce1e6'].forEach((color, idx) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'shockwave-ring';
                ring.style.borderColor = color;
                document.body.appendChild(ring);
                setTimeout(() => ring.remove(), 2900);
            }, idx * 180);
        });

        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.textContent = palette[Math.floor(Math.random() * palette.length)];
                confetti.style.left = '50%';
                confetti.style.top = '50%';
                confetti.style.setProperty('--tx', (Math.random() - 0.5) * 520 + 'px');
                confetti.style.setProperty('--ty', (Math.random() - 0.5) * 520 + 'px');
                confetti.style.setProperty('--rot', Math.random() * 600 - 300 + 'deg');
                document.body.appendChild(confetti);
                setTimeout(() => confetti.remove(), 3800);
            }, i * 25);
        }
    } else if (effectType === 1) {
        // Style B: Rising Emoji Fountain from Bottom
        for (let i = 0; i < 18; i++) {
            setTimeout(() => {
                const drop = document.createElement('div');
                drop.className = 'fountain-emoji';
                drop.textContent = palette[Math.floor(Math.random() * palette.length)];
                drop.style.left = (15 + Math.random() * 70) + '%';
                drop.style.setProperty('--fx', (Math.random() - 0.5) * 220 + 'px');
                drop.style.setProperty('--fy', -(350 + Math.random() * 350) + 'px');
                drop.style.setProperty('--frot', (Math.random() * 540 - 270) + 'deg');
                document.body.appendChild(drop);
                setTimeout(() => drop.remove(), 3600);
            }, i * 35);
        }
    } else if (effectType === 2) {
        // Style C: Diagonal Shooting Star & Comet Shower
        const starIcons = ['🌠', '⭐', '🌟', '✨', '💫', '⚡', '🚀'];
        for (let i = 0; i < 16; i++) {
            setTimeout(() => {
                const star = document.createElement('div');
                star.className = 'shooting-star';
                star.textContent = starIcons[Math.floor(Math.random() * starIcons.length)];
                star.style.left = (Math.random() * 75) + '%';
                star.style.top = (Math.random() * 60) + '%';
                document.body.appendChild(star);
                setTimeout(() => star.remove(), 3100);
            }, i * 45);
        }
    } else {
        // Style D: Twin Left & Right Firework Bursts
        [25, 75].forEach((xPos, burstIdx) => {
            setTimeout(() => {
                const ring = document.createElement('div');
                ring.className = 'shockwave-ring';
                ring.style.left = xPos + '%';
                ring.style.top = '45%';
                ring.style.borderColor = burstIdx === 0 ? '#b589ff' : '#4cd995';
                document.body.appendChild(ring);
                setTimeout(() => ring.remove(), 2900);

                for (let i = 0; i < 12; i++) {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.textContent = palette[Math.floor(Math.random() * palette.length)];
                    confetti.style.left = xPos + '%';
                    confetti.style.top = '45%';
                    confetti.style.setProperty('--tx', (Math.random() - 0.5) * 380 + 'px');
                    confetti.style.setProperty('--ty', (Math.random() - 0.5) * 380 + 'px');
                    confetti.style.setProperty('--rot', Math.random() * 540 - 270 + 'deg');
                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 3800);
                }
            }, burstIdx * 200);
        });
    }
}

function spawnTableMasterCelebration() {
    robot.className = 'robot happy';
    feedback.textContent = '';
    feedback.className = 'feedback';

    const overlay = document.createElement('div');
    overlay.className = 'master-overlay';

    overlay.innerHTML = `
        <div class="master-badge">
            <div class="master-crown">👑</div>
            <div class="master-title">DIVISION MASTER</div>
            <div class="master-table">Table de ÷ ${challengeTableMode}</div>
            <div class="master-subtitle">완벽해! ALL DIVISIONS MASTERED! 🏆</div>
            <div class="master-stars">⭐ ⭐ ⭐</div>
        </div>
    `;

    document.body.appendChild(overlay);

    const gif = document.createElement('img');
    gif.src = celebrationGifs[Math.floor(Math.random() * celebrationGifs.length)];
    gif.className = 'master-gif';
    overlay.querySelector('.master-badge').appendChild(gif);

    for (let wave = 0; wave < 4; wave++) {
        setTimeout(() => {
            const emojis = ['👑', '🏆', '⭐', '🌟', '✨', '⚡', '💎', '💖', '🌈', '🚀'];
            for (let i = 0; i < 22; i++) {
                setTimeout(() => {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                    confetti.style.left = Math.random() * 100 + '%';
                    confetti.style.top = Math.random() * 100 + '%';
                    confetti.style.setProperty('--tx', (Math.random() - 0.5) * 520 + 'px');
                    confetti.style.setProperty('--ty', (Math.random() - 0.5) * 520 + 'px');
                    confetti.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg');
                    document.body.appendChild(confetti);
                    setTimeout(() => confetti.remove(), 4200);
                }, i * 20);
            }
        }, wave * 550);
    }

    playSound('correct');
    setTimeout(() => playSound('correct'), 400);
    setTimeout(() => playSound('start'), 800);

    overlay.addEventListener('click', () => {
        overlay.classList.add('master-fade-out');
        setTimeout(() => overlay.remove(), 450);
    });

    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.classList.add('master-fade-out');
            setTimeout(() => overlay.remove(), 450);
        }
    }, 8000);
}
