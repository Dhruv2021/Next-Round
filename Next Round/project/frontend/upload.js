const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');

uploadBox.addEventListener('click', () => fileInput.click());

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.classList.add('dragover');
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) handleFile(file);
});

function handleFile(file) {
    if (file.type !== 'application/pdf') {
        showError("Couldn't fetch details. Try uploading a resume in PDF format.");
        return;
    }
    const url = URL.createObjectURL(file);
    document.getElementById('previewBox').innerHTML = `<iframe src="${url}"></iframe>`;
    document.getElementById('analysisSection').style.display = 'flex';
    uploadResume(file);
}

function showError(message) {
    const errorDiv = document.getElementById('uploadError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 4000);
}

async function uploadResume(file) {
    console.log("Uploading file:", file.name);
    const formData = new FormData();
    formData.append('resume', file);
    try {
        const res = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        });
        console.log("Response status:", res.status);
        const data = await res.json();
        if (data.error) {
            showError(data.error);
            document.getElementById('analysisSection').style.display = 'none';
            return;
            }      

            localStorage.setItem(
    'resumeData',
    JSON.stringify(data)
);

      displayAnalysis(data);
    } catch (err) {
        console.error('Upload error:', err);
    }
}

function displayAnalysis(data) {
    // Skills
    const skillsTags = document.getElementById('skillsTags');
    skillsTags.innerHTML = '';
    if (data.skills) {
        data.skills.forEach(skill => {
            skillsTags.innerHTML += `<span class="tag">${skill}</span>`;
        });
    }

    // Experience
    const expList = document.getElementById('experienceList');
    expList.innerHTML = '';
    if (data.experience) {
        data.experience.forEach(exp => {
            expList.innerHTML += `<li>${exp}</li>`;
        });
    }

    // Projects
    const projList = document.getElementById('projectsList');
    projList.innerHTML = '';
    if (data.projects) {
        data.projects.forEach(proj => {
            projList.innerHTML += `<li>${proj}</li>`;
        });
    }

    // Education
    const eduList = document.getElementById('educationList');
    eduList.innerHTML = '';
    if (data.education) {
        data.education.forEach(edu => {
            eduList.innerHTML += `<li>${edu}</li>`;
        });
    }

    // Suggestions
    if (data.suggestions) {
        const s = data.suggestions;
        document.getElementById('resumeScore').textContent = s.score + '/100';

        const strengthsList = document.getElementById('strengthsList');
        strengthsList.innerHTML = '';
        s.strengths.forEach(str => {
            strengthsList.innerHTML += `<li>${str}</li>`;
        });

        const weaknessesList = document.getElementById('weaknessesList');
        weaknessesList.innerHTML = '';
        s.weaknesses.forEach(w => {
            weaknessesList.innerHTML += `<li>${w}</li>`;
        });

        const improvementsList = document.getElementById('improvementsList');
        improvementsList.innerHTML = '';
        s.improvements.forEach(imp => {
            improvementsList.innerHTML += `<li>${imp}</li>`;
        });
    }
}

function startInterview() {
    const resumeData = {
        skills: Array.from(document.querySelectorAll('.tag')).map(t => t.textContent),
        experience: Array.from(document.querySelectorAll('#experienceList li')).map(l => l.textContent),
        projects: Array.from(document.querySelectorAll('#projectsList li')).map(l => l.textContent),
        education: Array.from(document.querySelectorAll('#educationList li')).map(l => l.textContent),
    };

    // Save resume score + suggestions
    const resumeScore = document.getElementById('resumeScore')?.textContent || '0/100';
    const strengths = Array.from(document.querySelectorAll('#strengthsList li')).map(l => l.textContent);
    const weaknesses = Array.from(document.querySelectorAll('#weaknessesList li')).map(l => l.textContent);
    const improvements = Array.from(document.querySelectorAll('#improvementsList li')).map(l => l.textContent);

    localStorage.setItem('resumeData', JSON.stringify(resumeData));
    localStorage.setItem('resumeSuggestions', JSON.stringify({ resumeScore, strengths, weaknesses, improvements }));

    window.location.href = 'interview.html';
}