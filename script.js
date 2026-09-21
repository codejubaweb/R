/**
 * آلة حاسبة بسيطة وسريعة الاستجابة
 * Simple & Responsive Modern Web Calculator
 */

// حالة الآلة الحاسبة
const state = {
    currentValue: '0',
    previousValue: null,
    operator: null,
    expression: '',
    shouldResetInput: false,
    history: [],
    soundEnabled: true,
    theme: 'dark'
};

// عناصر DOM
const currentDisplay = document.getElementById('current-display');
const expressionDisplay = document.getElementById('expression-display');
const keypad = document.querySelector('.keypad');
const copyBtn = document.getElementById('copy-btn');
const copyTooltip = document.getElementById('copy-tooltip');
const soundBtn = document.getElementById('sound-btn');
const soundIcon = document.getElementById('sound-icon');
const themeBtn = document.getElementById('theme-btn');
const themeIcon = document.getElementById('theme-icon');
const historyToggleBtn = document.getElementById('history-toggle-btn');
const closeHistoryBtn = document.getElementById('close-history-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyDrawer = document.getElementById('history-drawer');
const historyList = document.getElementById('history-list');

// محرك الصوت باستخدام Web Audio API
let audioCtx = null;
function playClickSound(type = 'default') {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const freq = type === 'operator' ? 440 : type === 'equals' ? 587 : 330;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.06);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
    } catch (e) {
        // تجاهل أخطاء تشغيل الصوت في بعض المتصفحات
    }
}

// تحديث الشاشة وضبط حجم الخط تلقائياً
function updateDisplay() {
    currentDisplay.textContent = state.currentValue;
    expressionDisplay.textContent = state.expression;

    // ضبط حجم الخط للأرقام الطويلة لمنع تجاوز حدود الشاشة
    const len = state.currentValue.length;
    if (len > 14) {
        currentDisplay.style.fontSize = '1.35rem';
    } else if (len > 10) {
        currentDisplay.style.fontSize = '1.75rem';
    } else if (len > 7) {
        currentDisplay.style.fontSize = '2.1rem';
    } else {
        currentDisplay.style.fontSize = '2.5rem';
    }

    // تحديث تمييز زر العملية النشطة
    document.querySelectorAll('.btn-operator').forEach(btn => {
        if (state.operator && btn.dataset.op === state.operator && state.shouldResetInput) {
            btn.classList.add('active-op');
        } else {
            btn.classList.remove('active-op');
        }
    });
}

// معالجة إدخال رقم
function inputDigit(digit) {
    if (state.currentValue === 'خطأ' || state.currentValue === 'Error') {
        clearAll();
    }

    if (state.shouldResetInput) {
        state.currentValue = digit;
        state.shouldResetInput = false;
    } else {
        if (state.currentValue === '0') {
            state.currentValue = digit;
        } else {
            // الحد الأقصى لطول الرقم 16 خانة
            if (state.currentValue.length < 16) {
                state.currentValue += digit;
            }
        }
    }
    updateDisplay();
}

// معالجة الفاصلة العشرية
function inputDecimal() {
    if (state.currentValue === 'خطأ') clearAll();

    if (state.shouldResetInput) {
        state.currentValue = '0.';
        state.shouldResetInput = false;
    } else if (!state.currentValue.includes('.')) {
        state.currentValue += '.';
    }
    updateDisplay();
}

// معالجة زر مسح رقم ⌫
function deleteLastDigit() {
    if (state.shouldResetInput || state.currentValue === 'خطأ') {
        state.currentValue = '0';
        updateDisplay();
        return;
    }

    if (state.currentValue.length > 1) {
        state.currentValue = state.currentValue.slice(0, -1);
        if (state.currentValue === '-' || state.currentValue === '') {
            state.currentValue = '0';
        }
    } else {
        state.currentValue = '0';
    }
    updateDisplay();
}

// تغيير إشارة الرقم (±)
function toggleSign() {
    if (state.currentValue === '0' || state.currentValue === 'خطأ') return;
    if (state.currentValue.startsWith('-')) {
        state.currentValue = state.currentValue.slice(1);
    } else {
        state.currentValue = '-' + state.currentValue;
    }
    updateDisplay();
}

// معالجة النسبة المئوية %
function inputPercent() {
    const val = parseFloat(state.currentValue);
    if (isNaN(val)) return;

    if (state.previousValue !== null && state.operator) {
        // مثال: 100 + 10% تصبح 100 + 10
        const prev = parseFloat(state.previousValue);
        const percentVal = (prev * val) / 100;
        state.currentValue = formatResult(percentVal);
    } else {
        state.currentValue = formatResult(val / 100);
    }
    updateDisplay();
}

// تنسيق الناتج لتجنب مشاكل الفاصلة العائمة في الجافاسكربت
function formatResult(num) {
    if (!isFinite(num) || isNaN(num)) return 'خطأ';
    
    // تقريب الأرقام العشرية الدقيقة
    const rounded = Math.round((num + Number.EPSILON) * 1e12) / 1e12;
    const str = rounded.toString();

    // إذا كان الرقم كبيراً جداً يتم عرضه بالصيغة الأسية
    if (str.length > 15) {
        return rounded.toPrecision(10).replace(/\.?0+$/, '');
    }
    return str;
}

// تنفيذ العملية الحسابية الأساسية
function compute(a, b, op) {
    const num1 = parseFloat(a);
    const num2 = parseFloat(b);

    if (isNaN(num1) || isNaN(num2)) return 'خطأ';

    switch (op) {
        case '+': return num1 + num2;
        case '-': return num1 - num2;
        case '×':
        case '*': return num1 * num2;
        case '÷':
        case '/':
            if (num2 === 0) return 'خطأ';
            return num1 / num2;
        default:
            return num2;
    }
}

// معالجة اختيار عملية (+, -, ×, ÷)
function handleOperator(nextOp) {
    if (state.currentValue === 'خطأ') clearAll();

    const inputValue = state.currentValue;

    if (state.previousValue === null) {
        state.previousValue = inputValue;
        state.expression = `${inputValue} ${nextOp}`;
    } else if (state.operator) {
        if (state.shouldResetInput) {
            // تغيير العملية فقط إذا لم يدخل المستخدم رقماً جديداً بعد
            state.operator = nextOp;
            state.expression = `${state.previousValue} ${nextOp}`;
            updateDisplay();
            return;
        }

        const result = compute(state.previousValue, inputValue, state.operator);
        if (result === 'خطأ') {
            state.currentValue = 'خطأ';
            state.expression = '';
            state.previousValue = null;
            state.operator = null;
            state.shouldResetInput = true;
            updateDisplay();
            return;
        }

        const formatted = formatResult(result);
        state.currentValue = formatted;
        state.previousValue = formatted;
        state.expression = `${formatted} ${nextOp}`;
    }

    state.operator = nextOp;
    state.shouldResetInput = true;
    updateDisplay();
}

// معالجة زر التساوي =
function calculateResult() {
    if (state.operator === null || state.previousValue === null) return;
    if (state.currentValue === 'خطأ') return;

    const op = state.operator;
    const prev = state.previousValue;
    const current = state.currentValue;

    const rawResult = compute(prev, current, op);
    if (rawResult === 'خطأ') {
        state.currentValue = 'خطأ';
        state.expression = `${prev} ${op} ${current} =`;
        state.previousValue = null;
        state.operator = null;
        state.shouldResetInput = true;
        updateDisplay();
        return;
    }

    const result = formatResult(rawResult);
    const exprText = `${prev} ${op} ${current} =`;

    // إضافة إلى سجل العمليات
    addToHistory(exprText, result);

    state.expression = exprText;
    state.currentValue = result;
    state.previousValue = null;
    state.operator = null;
    state.shouldResetInput = true;

    updateDisplay();
}

// مسح الكل (AC)
function clearAll() {
    state.currentValue = '0';
    state.previousValue = null;
    state.operator = null;
    state.expression = '';
    state.shouldResetInput = false;
    updateDisplay();
}

// إضافة عملية لسجل العمليات
function addToHistory(expr, res) {
    state.history.unshift({ expr, res, time: new Date().toLocaleTimeString('ar-EG') });
    if (state.history.length > 30) state.history.pop();
    renderHistory();
}

// عرض قائمة السجل
function renderHistory() {
    if (state.history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">لا توجد عمليات سابقة</div>';
        return;
    }

    historyList.innerHTML = '';
    state.history.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
            <div class="history-expr">${item.expr}</div>
            <div class="history-res">${item.res}</div>
        `;
        div.addEventListener('click', () => {
            state.currentValue = item.res;
            state.shouldResetInput = false;
            updateDisplay();
            closeHistory();
            playClickSound('default');
        });
        historyList.appendChild(div);
    });
}

// فتح وإغلاق درج السجل
function openHistory() {
    historyDrawer.classList.add('open');
}
function closeHistory() {
    historyDrawer.classList.remove('open');
}

// نسخ الناتج إلى الحافظة
async function copyResult() {
    try {
        await navigator.clipboard.writeText(state.currentValue);
        copyTooltip.classList.add('show');
        setTimeout(() => copyTooltip.classList.remove('show'), 1500);
    } catch (err) {
        // بديل للمتصفحات القديمة
        const ta = document.createElement('textarea');
        ta.value = state.currentValue;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        copyTooltip.classList.add('show');
        setTimeout(() => copyTooltip.classList.remove('show'), 1500);
    }
}

// تغيير المظهر (فاتح / داكن)
function toggleTheme() {
    if (document.body.classList.contains('light-theme')) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeIcon.textContent = '☀️';
        state.theme = 'dark';
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeIcon.textContent = '🌙';
        state.theme = 'light';
    }
}

// تبديل الصوت
function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
}

// الاستماع لنقرات الأزرار
keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    if (btn.dataset.num !== undefined) {
        playClickSound('default');
        inputDigit(btn.dataset.num);
        return;
    }

    const action = btn.dataset.action;
    switch (action) {
        case 'operator':
            playClickSound('operator');
            handleOperator(btn.dataset.op);
            break;
        case 'calculate':
            playClickSound('equals');
            calculateResult();
            break;
        case 'clear':
            playClickSound('default');
            clearAll();
            break;
        case 'delete':
            playClickSound('default');
            deleteLastDigit();
            break;
        case 'decimal':
            playClickSound('default');
            inputDecimal();
            break;
        case 'percent':
            playClickSound('default');
            inputPercent();
            break;
        case 'negate':
            playClickSound('default');
            toggleSign();
            break;
    }
});

function toggleHistory() {
    historyDrawer.classList.toggle('open');
}

// الاستماع لأزرار الرأس والسجل
copyBtn.addEventListener('click', copyResult);
themeBtn.addEventListener('click', toggleTheme);
soundBtn.addEventListener('click', toggleSound);
historyToggleBtn.addEventListener('click', toggleHistory);
closeHistoryBtn.addEventListener('click', closeHistory);
clearHistoryBtn.addEventListener('click', () => {
    state.history = [];
    renderHistory();
});

// الاستماع للوحة المفاتيح
window.addEventListener('keydown', (e) => {
    const key = e.key;

    if (/^[0-9]$/.test(key)) {
        playClickSound('default');
        inputDigit(key);
    } else if (key === '.' || key === ',') {
        playClickSound('default');
        inputDecimal();
    } else if (key === '+' || key === '-') {
        playClickSound('operator');
        handleOperator(key);
    } else if (key === '*') {
        playClickSound('operator');
        handleOperator('×');
    } else if (key === '/') {
        e.preventDefault();
        playClickSound('operator');
        handleOperator('÷');
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        playClickSound('equals');
        calculateResult();
    } else if (key === 'Backspace') {
        playClickSound('default');
        deleteLastDigit();
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        playClickSound('default');
        clearAll();
    } else if (key === '%') {
        playClickSound('default');
        inputPercent();
    }
});

// تهيئة أولية
updateDisplay();
renderHistory();
