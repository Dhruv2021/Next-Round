window.onload = () => {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'home.html';
            return;
        }
        await loadHistory(user.uid);
    });
};

async function loadHistory(userId) {
    try {
        const res = await fetch(`https://next-round-k2bk.onrender.com/history/${userId}`);
        const interviews = await res.json();

        const historyList = document.getElementById('historyList');

        if (interviews.length === 0) {
            historyList.innerHTML = '<div class="empty-state">No interviews yet. <a href="upload.html" style="color:#00ffcc">Start your first interview!</a></div>';
            return;
        }

        historyList.innerHTML = '';
        interviews.forEach((interview, index) => {
            const date = new Date(interview.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });

            historyList.innerHTML += `
                <div class="history-item">
                    <div class="history-left">
                        <h3>Interview #${interviews.length - index}</h3>
                        <p>${date}</p>
                    </div>
                    <div class="history-scores">
                        <div class="score-badge">
                            <span>Overall</span>
                            <span>${interview.evaluation?.overallScore || '--'}%</span>
                        </div>
                        <div class="score-badge">
                            <span>Comm</span>
                            <span>${interview.evaluation?.communicationScore || '--'}</span>
                        </div>
                        <div class="score-badge">
                            <span>Tech</span>
                            <span>${interview.evaluation?.technicalScore || '--'}</span>
                        </div>
                    </div>
                    <button class="view-btn" onclick="viewInterview('${interview._id}')">View Report</button>
                </div>
            `;
        });
    } catch (err) {
        console.error('History error:', err);
    }
}

function viewInterview(id) {
    // Future feature — view specific interview
    alert('Coming soon!');
}
