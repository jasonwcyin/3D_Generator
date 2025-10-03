const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://jasonwcyin.github.io' // Replace with your GitHub Pages URL
    ]
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 3D Character generation endpoint
app.post('/api/generate-3d', async (req, res) => {
    try {
        const { image, prompt } = req.body;

        if (!image || !prompt) {
            return res.status(400).json({
                success: false,
                error: 'Image and prompt are required'
            });
        }

        // Step 1: Analyze the uploaded image to create a search query
        const analysisResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Analyze this character image and describe the key visual features, clothing, pose, and style that would be important for creating a 3D version. Focus on specific details like hair color, clothing style, facial features, and overall appearance.'
                            },
                            {
                                type: 'image_url',
                                image_url: { url: image }
                            }
                        ]
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("Image analysis response:", JSON.stringify(analysisResponse.data, null, 2));

        // Extract character description from analysis
        let characterDescription = '';
        if (analysisResponse.data.choices && 
            analysisResponse.data.choices[0] && 
            analysisResponse.data.choices[0].message && 
            analysisResponse.data.choices[0].message.content) {
            characterDescription = analysisResponse.data.choices[0].message.content;
        }

        // Step 2: Use the analysis to search for similar 3D character images
        const searchQuery = `3D rendered character similar to: ${characterDescription.substring(0, 200)}. 3D model, rendered character, digital art, animation style`;

        const imageSearchResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'sonar',
                return_images: true,
                image_domain_filter: [
                    'artstation.com', 
                    'sketchfab.com', 
                    'turbosquid.com',
                    'cgtrader.com',
                    'blendswap.com',
                    '-gettyimages.com',
                    '-shutterstock.com',
                    '-istockphoto.com'
                ],
                image_format_filter: ['jpeg', 'png', 'webp'],
                messages: [
                    {
                        role: 'user',
                        content: searchQuery
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("Image search response:", JSON.stringify(imageSearchResponse.data, null, 2));

        // Extract images and text from the response
        let foundImages = [];
        let textResult = '';

        if (imageSearchResponse.data.choices && 
            imageSearchResponse.data.choices[0] && 
            imageSearchResponse.data.choices[0].message) {
            
            const content = imageSearchResponse.data.choices[0].message.content;
            if (typeof content === 'string') {
                textResult = content;
            }
        }

        // Look for images in the response
        if (imageSearchResponse.data.images && Array.isArray(imageSearchResponse.data.images)) {
            foundImages = imageSearchResponse.data.images.map(img => ({
                url: img.url,
                title: img.title || 'Similar 3D Character',
                source: img.source || 'Web'
            }));
        }

        // Alternative: Check if images are embedded in content
        if (foundImages.length === 0 && textResult) {
            const imageUrlRegex = /https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp)/gi;
            const matches = textResult.match(imageUrlRegex);
            if (matches) {
                foundImages = matches.slice(0, 5).map(url => ({
                    url: url,
                    title: 'Similar 3D Character',
                    source: 'Web Search'
                }));
            }
        }

        if (foundImages.length > 0) {
            return res.json({
                success: true,
                imageUrl: foundImages[0].url, // Primary image for compatibility
                images: foundImages, // Array of similar images
                characterAnalysis: characterDescription,
                searchQuery: searchQuery,
                textResult: textResult || 'Found similar 3D character references'
            });
        } else {
            return res.json({
                success: false,
                error: 'No similar 3D character images found',
                characterAnalysis: characterDescription,
                textResult: textResult || 'Could not find matching 3D character images',
                searchQuery: searchQuery
            });
        }

    } catch (error) {
        console.error('Error generating 3D character:', error.response?.data || error.message, error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Failed to generate 3D character',
            details: error.response?.data?.error || error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
