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
        
        // Call Perplexity Sonar API
        const perplexityResponse = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'sonar-pro',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: prompt
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image
                                }
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

        console.log("Perplexity Response:", JSON.stringify(perplexityResponse.data, null, 2));
        if (perplexityResponse.data.error) {
              console.error("Perplexity API error:", perplexityResponse.data.error);
        }


        // Extract the generated image URL from response
        const generatedContent = perplexityResponse.data.choices.message.content;
        
        // Parse the response to extract image URL
        // Note: This parsing logic may need adjustment based on actual Perplexity response format
        let imageUrl = null;
        
        // Look for image URLs in the response
        const imageUrlRegex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i;
        const match = generatedContent.match(imageUrlRegex);
        
        if (match) {
            imageUrl = match;
        }
        
        if (!imageUrl) {
            return res.status(500).json({
                success: false,
                error: 'No image generated in response'
            });
        }
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            originalResponse: generatedContent
        });
        
    } catch (error) {
        console.error('Error generating 3D character:', error.response?.data || error.message);
        
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
