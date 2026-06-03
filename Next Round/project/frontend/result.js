window.onload = () => {
    const evaluation = JSON.parse(localStorage.getItem('evaluationData'));

    const resumeSuggestions = JSON.parse(
        localStorage.getItem('resumeSuggestions')
    );

    if (!evaluation) {
        window.location.href = 'upload.html';
        return;
    }

    // Save to MongoDB
    firebase.auth().onAuthStateChanged((user) => {
        if (user) saveInterview();
    });


    // Overall Score Circle
    drawScoreCircle(evaluation.overallScore);
    document.getElementById('scoreText').textContent = evaluation.overallScore + '%';

    // Radar Chart
    drawRadarChart(evaluation);

    // Ratings bars
    setRatingBar('commBar', 'commValue', evaluation.communicationScore);
    setRatingBar('confBar', 'confValue', evaluation.confidenceScore);
    setRatingBar('techBar', 'techValue', evaluation.technicalScore);

    // Resume score
    if (resumeSuggestions && resumeSuggestions.resumeScore) {
        const resumeNum = parseInt(resumeSuggestions.resumeScore);
        setRatingBar('resumeBar', 'resumeValue', resumeNum);
    }

    // Strengths
    const strengthsList = document.getElementById('strengthsList');
    evaluation.strengths.forEach(s => {
        strengthsList.innerHTML += `<li>${s}</li>`;
    });

    // Weaknesses
    const weaknessesList = document.getElementById('weaknessesList');
    evaluation.weaknesses.forEach(w => {
        weaknessesList.innerHTML += `<li>${w}</li>`;
    });

    // Improvements
    const improvementsList = document.getElementById('improvementsList');
    evaluation.improvements.forEach(i => {
        improvementsList.innerHTML += `<li>${i}</li>`;
    });

    // Question Feedback
    const qfList = document.getElementById('questionFeedbackList');
    evaluation.questionFeedback.forEach((qf, index) => {
        qfList.innerHTML += `
            <div class="question-feedback-item">
                <div class="qf-header">
                    <p class="qf-question">Q${index + 1}: ${qf.question}</p>
                    <span class="qf-score">Score: ${qf.score}/10</span>
                </div>
                <p class="qf-answer">Your Answer: ${qf.answer || 'No answer recorded'}</p>
                <p class="qf-feedback">💡 ${qf.feedback}</p>
            </div>
        `;
    });
};

function setRatingBar(barId, valueId, score) {
    setTimeout(() => {
        document.getElementById(barId).style.width = score + '%';
        document.getElementById(valueId).textContent = score;
    }, 300);
}

function drawScoreCircle(score) {
    const canvas = document.getElementById('scoreCircle');
    const ctx = canvas.getContext('2d');
    const cx = 80, cy = 80, r = 65;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * score / 100);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Score arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 12;
    ctx.stroke();
}

function drawRadarChart(evaluation) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Communication', 'Confidence', 'Technical', 'Overall'],
            datasets: [{
                data: [
                    evaluation.communicationScore,
                    evaluation.confidenceScore,
                    evaluation.technicalScore,
                    evaluation.overallScore
                ],
                backgroundColor: 'rgba(0, 255, 204, 0.1)',
                borderColor: '#00ffcc',
                pointBackgroundColor: '#00ffcc',
                pointBorderColor: '#00ffcc',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: { display: false },
                    grid: { color: 'rgba(255,255,255,0.08)' },
                    pointLabels: {
                        color: 'rgba(255,255,255,0.6)',
                        font: { size: 11 }
                    },
                    angleLines: { color: 'rgba(255,255,255,0.08)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function downloadReport() {
    const evaluation = JSON.parse(localStorage.getItem('evaluationData'));
    const resumeSuggestions = JSON.parse(localStorage.getItem('resumeSuggestions'));

    let report = `NEXTROUND — INTERVIEW REPORT\n`;
    report += `================================\n\n`;
    report += `SCORES\n`;
    report += `Overall Score: ${evaluation.overallScore}%\n`;
    report += `Communication: ${evaluation.communicationScore}\n`;
    report += `Confidence: ${evaluation.confidenceScore}\n`;
    report += `Technical: ${evaluation.technicalScore}\n`;
    if (resumeSuggestions) report += `Resume Score: ${resumeSuggestions.resumeScore}\n`;
    report += `\nSTRENGTHS\n`;
    evaluation.strengths.forEach(s => report += `• ${s}\n`);
    report += `\nWEAKNESSES\n`;
    evaluation.weaknesses.forEach(w => report += `• ${w}\n`);
    report += `\nIMPROVEMENTS\n`;
    evaluation.improvements.forEach(i => report += `• ${i}\n`);
    report += `\nQUESTION FEEDBACK\n`;
    evaluation.questionFeedback.forEach((qf, i) => {
        report += `\nQ${i+1}: ${qf.question}\n`;
        report += `Answer: ${qf.answer}\n`;
        report += `Score: ${qf.score}/10\n`;
        report += `Feedback: ${qf.feedback}\n`;
    });

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NextRound_Report.txt';
    a.click();
}

async function saveInterview() {
    const user = firebase.auth().currentUser;
    if (!user) return;

    const evaluation = JSON.parse(localStorage.getItem('evaluationData'));
    const resumeData = JSON.parse(localStorage.getItem('resumeData'));
    const resumeSuggestions = JSON.parse(localStorage.getItem('resumeSuggestions'));

    try {
        await fetch('http://localhost:5000/save-interview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                resumeData,
                resumeSuggestions,
                evaluation
            })
        });
        console.log('Interview saved ✅');
    } catch (err) {
        console.error('Save error:', err);
    }
}