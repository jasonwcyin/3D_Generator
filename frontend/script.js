// Configuration
const API_BASE_URL = 'https://threed-character-backend.onrender.com'; // Replace with your Render URL
 
async function generateCharacter() {
    const fileInput = document.getElementById('imageInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showError('Please select an image file');
        return;
    }
    const file = fileInput.files[0];
    if (!file.type || !file.type.startsWith('image/')) {
        showError('Please select a valid image file');
        return;
    }
    console.log("Image selected:", file.name, file.type, file.size);
    showLoading();
    try {
        const base64Image = await fileToBase64(file);
        console.log("Base64 ready, sending to backend...");
        const response = await fetch(`${API_BASE_URL}/api/generate-3d`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64Image,
                prompt: "Transform this character into a detailed 3D rendered version, maintaining all key features, colors, and personality while adding dimensional depth, realistic lighting, and modern 3D animation style"
            })
        });
        console.log("Response received:", response.status);
        const result = await response.json();
        console.log("Result JSON:", result);
        if (result.success) {
            showResult(result.imageUrl);
        } else {
            showError(result.error || 'Failed to generate 3D character');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Failed to connect to server. Please try again.');
    }
}


function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showLoading() {
    hideAllSections();
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('generateBtn').disabled = true;
}

function showResult(imageUrl) {
    hideAllSections();
    const resultSection = document.getElementById('resultSection');
    const resultImage = document.getElementById('resultImage');
    
    resultImage.src = imageUrl;
    resultSection.classList.remove('hidden');
}

function showError(message) {
    hideAllSections();
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
    document.getElementById('generateBtn').disabled = false;
}

function hideAllSections() {
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
}

function resetApp() {
    hideAllSections();
    document.getElementById('imageInput').value = '';
    document.getElementById('generateBtn').disabled = false;
}
