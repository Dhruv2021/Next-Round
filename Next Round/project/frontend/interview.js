let questions = [];
let currentQuestion = 0;
let answers = [];
let isRecording = false;
let recognition = null;
let currentTranscript = '';
let silenceTimer;

// Load questions from localStorage (set by upload page)
window.onload = async () => {
    const resumeData = JSON.parse(localStorage.getItem('resumeData'));
    if (!resumeData) {
        window.location.href = 'upload.html';
        return;
    }
    await generateQuestions(resumeData);
};

async function generateQuestions(resumeData) {
    document.getElementById('questionText').textContent = 'Generating your personalized questions...';
    
    try {
        const res = await fetch('https://next-round-k2bk.onrender.com/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeData })
        });
        const data = await res.json();
        questions = data.questions;
        showQuestion(0);
    } catch (err) {
        console.error('Error generating questions:', err);
    }
}

function showQuestion(index) {
    const q = questions[index];
    document.getElementById('questionText').textContent = q;
    document.getElementById('questionCount').textContent = `Question ${index + 1} of ${questions.length}`;
    document.getElementById('progressFill').style.width = `${((index + 1) / questions.length) * 100}%`;
    
    // Reset transcript
    currentTranscript = '';
    document.getElementById('transcriptBox').innerHTML = '<p class="transcript-placeholder">Your speech will appear here in real-time...</p>';
    document.getElementById('micStatus').textContent = 'Click to speak';
    
    // Auto play question
    playQuestion();
}

function playQuestion() {
    const text = questions[currentQuestion];
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();

    utterance.voice =
    
        voices.find(v => v.name === "Google US English") ||
        voices[0];

    utterance.rate = 0.88;
    utterance.pitch = 0.92;
    utterance.volume = 1;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);

utterance.onend = () => {
    document.getElementById('aiWave').classList.add('inactive');

    setTimeout(() => {
        startRecording();
    }, 800);
};

    console.log("Using voice:", utterance.voice?.name);

}

speechSynthesis.onvoiceschanged = () => {
    console.log(speechSynthesis.getVoices());
};

function toggleMic() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition not supported in this browser. Use Chrome!');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        console.log("started");
    };

    recognition.onresult = (event) => {

        clearTimeout(silenceTimer);

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {

            if (event.results[i].isFinal) {
                final += event.results[i][0].transcript + ' ';
            } else {
                interim += event.results[i][0].transcript;
            }

        }

        currentTranscript += final;

        document.getElementById('transcriptBox').innerHTML =
            `<p class="transcript-text">
                ${currentTranscript}
                <span style="color: rgba(255,255,255,0.4)">
                    ${interim}
                </span>
            </p>`;

        // 3 sec silence => stop mic
        silenceTimer = setTimeout(() => {
            if (isRecording) {
                stopRecording();
            }
        }, 3000);
    };

    recognition.onerror = (e) => {
        console.log("FULL ERROR:", e);
        console.log("ERROR TYPE:", e.error);

        if (e.error === "no-speech") {
            return;
        }
    };

    recognition.onend = () => {
        console.log("ended");
    };

    recognition.start();

    isRecording = true;

    const micBtn = document.getElementById('micBtn');

    micBtn.classList.add('recording');
    micBtn.textContent = '⏹️';

    document.getElementById('micStatus').textContent =
        'Recording...';

    document.querySelectorAll('.mic-wave')
        .forEach(w => w.classList.add('active'));
}

function stopRecording() {

    clearTimeout(silenceTimer);

    if (recognition) {
        recognition.stop();
    }

    isRecording = false;

    const micBtn = document.getElementById('micBtn');

    micBtn.classList.remove('recording');
    micBtn.textContent = '🎤';

    document.getElementById('micStatus').textContent =
        'Answer recorded ✓';

    document.querySelectorAll('.mic-wave')
        .forEach(w => w.classList.remove('active'));
}

async function nextQuestion() {
    answers.push({
        question: questions[currentQuestion],
        answer: currentTranscript
    });

    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        showQuestion(currentQuestion);
    } else {
        // Show loading
        document.getElementById('questionText').textContent = 'Evaluating your interview...';
        document.getElementById('nextBtn').disabled = true;

        // Get resume data
        const resumeData = JSON.parse(localStorage.getItem('resumeData'));

        try {
            const res = await fetch('https://next-round-k2bk.onrender.com/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers, resumeData })
            });
            const evaluation = await res.json();

            // Save everything to localStorage
            localStorage.setItem('interviewAnswers', JSON.stringify(answers));
            localStorage.setItem('evaluationData', JSON.stringify(evaluation));
            localStorage.setItem('resumeSuggestions', localStorage.getItem('resumeSuggestions') || '{}');

            window.location.href = 'results.html';
        } catch (err) {
            console.error('Evaluation error:', err);
            document.getElementById('questionText').textContent = 'Evaluation failed. Please try again.';
            document.getElementById('nextBtn').disabled = false;
        }
    }
}
window.addEventListener('load', () => {
    if (navigator.brave) {
        document
            .getElementById('browserWarning')
            .classList.add('show');

        setTimeout(() => {
            document
                .getElementById('browserWarning')
                .classList.remove('show');
        }, 6000);
    }
});
