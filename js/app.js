const WEBHOOK_URL = 'https://n8n.srv1537367.hstgr.cloud/webhook/277261d1-d138-4ef1-8356-aa283421089b';

const infoPanel = document.getElementById('infoPanel');
const chatPanel = document.getElementById('chatPanel');
const studentForm = document.getElementById('studentForm');
const chatForm = document.getElementById('chatForm');
const chatMessages = document.getElementById('chatMessages');
const questionInput = document.getElementById('questionInput');
const btnSend = document.getElementById('btnSend');
const btnReset = document.getElementById('btnReset');
const studentNameDisplay = document.getElementById('studentNameDisplay');

let studentData = null;
let sessionId = null;
let isWaiting = false;

function generateSessionId() {
    return 'sid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

// Ogrenci formu gonderimi
studentForm.addEventListener('submit', function (e) {
    e.preventDefault();

    studentData = {
        adSoyad: document.getElementById('adSoyad').value.trim(),
        ogrenciNo: document.getElementById('ogrenciNo').value.trim(),
        bolum: document.getElementById('bolum').value.trim(),
        email: document.getElementById('email').value.trim()
    };

    sessionId = generateSessionId();
    sessionStorage.setItem('sessionId', sessionId);
    sessionStorage.setItem('studentData', JSON.stringify(studentData));

    studentNameDisplay.textContent = studentData.adSoyad + ' - ' + studentData.bolum;

    infoPanel.style.display = 'none';
    chatPanel.classList.add('active');
    questionInput.focus();
});

// Soru gonderimi
chatForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const question = questionInput.value.trim();
    if (!question || isWaiting) return;

    addMessage(question, 'user');
    questionInput.value = '';
    questionInput.style.height = 'auto';

    sendQuestion(question);
});

// Mesaj ekleme
function addMessage(text, type) {
    const div = document.createElement('div');
    div.className = 'message ' + type + '-message';
    div.innerHTML = '<div class="message-content">' + escapeHtml(text) + '</div>';
    chatMessages.appendChild(div);
    scrollToBottom();
}

// Bot mesaji (HTML destekli)
function addBotMessage(text) {
    const div = document.createElement('div');
    div.className = 'message bot-message';
    div.innerHTML = '<div class="message-content">' + escapeHtml(text) + '</div>';
    chatMessages.appendChild(div);
    scrollToBottom();
}

// Yazma animasyonu
function showTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'message typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = '<div class="message-content">' +
        '<span class="typing-dot"></span>' +
        '<span class="typing-dot"></span>' +
        '<span class="typing-dot"></span>' +
        '</div>';
    chatMessages.appendChild(div);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) indicator.remove();
}

// Webhook'a soru gonder
async function sendQuestion(question) {
    isWaiting = true;
    btnSend.disabled = true;
    showTypingIndicator();

    const payload = {
        sessionId: sessionId,
        adSoyad: studentData.adSoyad,
        ogrenciNo: studentData.ogrenciNo,
        bolum: studentData.bolum,
        email: studentData.email,
        soru: question
    };

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        hideTypingIndicator();

        if (!response.ok) {
            throw new Error('Sunucu hatasi: ' + response.status);
        }

        const data = await response.json();

        // n8n'den gelen cevabi goster
        const answer = data.output || data.response || data.text || data.message || data.cevap || JSON.stringify(data);
        addBotMessage(answer);
    } catch (error) {
        hideTypingIndicator();
        addBotMessage('Uzgunum, bir hata olustu. Lutfen tekrar deneyin. (' + error.message + ')');
    } finally {
        isWaiting = false;
        btnSend.disabled = false;
        questionInput.focus();
    }
}

// Oturumu sifirla
btnReset.addEventListener('click', function () {
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('studentData');
    studentData = null;
    sessionId = null;

    chatPanel.classList.remove('active');
    infoPanel.style.display = 'block';
    studentForm.reset();

    // Chat mesajlarini temizle (ilk bot mesaji haric)
    chatMessages.innerHTML = '<div class="message bot-message">' +
        '<div class="message-content">Merhaba! Marmara Universitesi ogrenci asistaniyim. ' +
        'Yonetmelikler, akademik takvim ve diger konularda sorularinizi yanitlayabilirim. ' +
        'Nasil yardimci olabilirim?</div></div>';
});

// Textarea otomatik yukseklik
questionInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Enter ile gonder, Shift+Enter ile yeni satir
questionInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Scroll
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
