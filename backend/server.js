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
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: image } }
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

        console.log("Perplexity API raw response:", JSON.stringify(perplexityResponse.data, null, 2));

        // Defensive response extraction
        let imageUrl = null;
        let textResult = null;

        const choices = perplexityResponse.data.choices;
        if (
            choices &&
            choices[0] &&
            choices[0].message &&
            choices[0].message.content
        ) {
            const content = choices[0].message.content;
            // Handle multimodal: content could be a string or array
            if (Array.isArray(content)) {
                for (const item of content) {
                    if (item.type === 'image_url' && item.image_url && item.image_url.url) {
                        imageUrl = item.image_url.url;
                    }
                    if (item.type === 'text' && item.text && !textResult) {
                        textResult = item.text;
                    }
                }
            } else if (typeof content === 'string') {
                textResult = content;
            }
        }

        // Respond with whichever is available
        if (imageUrl) {
            return res.json({
                success: true,
                imageUrl,
                textResult: textResult || "Image generated! No additional instructions."
            });
        } else if (textResult) {
            return res.json({
                success: false,
                error: 'No 3D image generated. AI tips and workflow instructions returned instead.',
                textResult
            });
        } else {
            return res.status(500).json({
                success: false,
                error: 'Unexpected Perplexity API response, no image or instructional text returned.',
                data: perplexityResponse.data
            });
        }
    } catch (error) {
        console.error('Error generating 3D character:', error.response?.data || error.message, error.stack);
        res.status(500).json({
            success: false,
            error: error.response?.data?.error || error.message || 'Internal server error'
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
