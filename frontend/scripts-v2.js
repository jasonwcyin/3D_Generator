// Configuration
const API_BASE_URL = 'https://threed-character-backend.onrender.com'; // Replace with your actual Render URL

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
    
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showError('File size too large. Please select a smaller image (under 50MB)');
        return;
    }
    
    console.log("Image selected:", file.name, file.type, file.size);
    showLoading();
    
    try {
        // Convert image to base64
        const base64Image = await fileToBase64(file);
        console.log("Base64 ready, sending to backend...");
        
        // Call backend API
        const response = await fetch(`${API_BASE_URL}/api/generate-3d`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                prompt: 'Transform this character into a detailed 3D rendered version, maintaining all key features, colors, and personality while adding dimensional depth, realistic lighting, and modern 3D animation style'
            })
        });
        
        console.log("Response received:", response.status);
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Result JSON:", result);
        
        // Handle different response types
        if (result.images && Array.isArray(result.images) && result.images.length > 0) {
            showImageResults(result);
        } else if (result.imageUrl) {
            showSingleImage(result.imageUrl, result.textResult);
        } else if (result.textResult) {
            showTextResult(result.textResult, result.characterAnalysis);
        } else {
            showError(result.error || 'No results could be generated');
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

function showImageResults(result) {
    hideAllSections();
    
    const resultSection = document.getElementById('resultSection');
    
    // Create image gallery with error handling
    const imageElements = result.images.map((img, index) => `
        <div class="image-container" style="display: inline-block; margin: 10px; text-align: center;">
            <img 
                src="${img.image_url}" 
                alt="${img.title || 'Similar 3D Character'}"
                title="${img.title || 'Similar 3D Character'}"
                style="max-width: 250px; max-height: 250px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"
                onerror="handleImageError(this, '${img.origin_url}', '${img.title || 'View Source'}')"
                onload="console.log('Image ${index + 1} loaded successfully')"
            />
            <div style="margin-top: 5px;">
                <a href="${img.origin_url}" target="_blank" style="font-size: 12px; color: #666;">
                    ${img.title || 'View Source'}
                </a>
            </div>
        </div>
    `).join('');
    
    resultSection.innerHTML = `
        <h3>Similar 3D Character Images Found:</h3>
        <p style="color: #666; margin-bottom: 20px;">
            Here are similar 3D character references based on your uploaded image:
        </p>
        <div class="image-gallery" style="text-align: center; margin: 20px 0;">
            ${imageElements}
        </div>
        ${result.characterAnalysis ? `
            <details style="margin: 20px 0; text-align: left;">
                <summary style="cursor: pointer; font-weight: bold;">Character Analysis</summary>
                <div style="margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
                    ${formatText(result.characterAnalysis)}
                </div>
            </details>
        ` : ''}
        <button onclick="resetApp()" style="margin-top: 20px;">Generate Another</button>
    `;
    
    resultSection.classList.remove('hidden');
}

function showSingleImage(imageUrl, textResult) {
    hideAllSections();
    
    const resultSection = document.getElementById('resultSection');
    const resultImage = document.getElementById('resultImage');
    
    if (resultImage) {
        resultImage.src = imageUrl;
        resultImage.onerror = function() {
            showTextResult(textResult || 'Image could not be loaded, but here are the instructions:', '');
        };
    }
    
    resultSection.classList.remove('hidden');
}

function showTextResult(textResult, characterAnalysis) {
    hideAllSections();
    
    const resultSection = document.getElementById('resultSection');
    
    resultSection.innerHTML = `
        <h3>3D Character Creation Guide:</h3>
        <div class="text-result" style="text-align: left; max-width: 600px; margin: 0 auto;">
            ${formatText(textResult)}
            ${characterAnalysis ? `
                <hr style="margin: 20px 0;">
                <h4>Character Analysis:</h4>
                ${formatText(characterAnalysis)}
            ` : ''}
        </div>
        <button onclick="resetApp()" style="margin-top: 20px;">Try Another Image</button>
    `;
    
    resultSection.classList.remove('hidden');
}

function formatText(text) {
    if (!text) return '';
    
    // Convert markdown-like formatting to HTML
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/#{3}\s(.*?)$/gm, '<h4>$1</h4>')
        .replace(/#{2}\s(.*?)$/gm, '<h3>$1</h3>')
        .replace(/#{1}\s(.*?)$/gm, '<h2>$1</h2>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.)/g, '<p>$1')
        .replace(/(.)$/g, '$1</p>');
}

function handleImageError(img, originUrl, title) {
    console.log('Image failed to load:', img.src);
    
    // Replace failed image with a link to the source
    const container = img.parentElement;
    container.innerHTML = `
        <div style="
            width: 250px; 
            height: 200px; 
            border: 2px dashed #ccc; 
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: #f9f9f9;
            color: #666;
            text-align: center;
            padding: 20px;
        ">
            <p style="margin: 0 0 10px 0; font-size: 14px;">Image unavailable</p>
            <a href="${originUrl}" target="_blank" style="
                color: #4CAF50;
                text-decoration: none;
                font-weight: bold;
                font-size: 12px;
                padding: 8px 16px;
                border: 1px solid #4CAF50;
                border-radius: 5px;
                transition: all 0.3s;
            " onmouseover="this.style.background='#4CAF50'; this.style.color='white';"
               onmouseout="this.style.background='transparent'; this.style.color='#4CAF50';">
                View ${title}
            </a>
        </div>
    `;
}

function showLoading() {
    hideAllSections();
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('generateBtn').disabled = true;
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
