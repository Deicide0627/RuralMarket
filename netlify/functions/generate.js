exports.handler = async (event, context) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API key is not set." }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body." }) };
    }

    // 1. We now accept a "language" parameter
    const { productName, productDescription, base64Data, mimeType, language } = body;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    // 2. Define instructions based on language
    let systemText = "";
    
    if (language === 'zh') {
        // CHINESE INSTRUCTIONS
        systemText = `你是 'RuralMarket.AI'，一个帮助砂拉越农村卖家的助手。你的目标是生成专业且吸引人的产品列表。
        - 分析用户的输入（产品名称、描述和图片）。
        - 如果有图片，请以图片为主要信息来源。
        - 生成引人注目的标题（使用中文）。
        - 撰写亲切且有说服力的描述（使用中文），并在后面列出关键特点。
        - 建议一个合理的马来西亚林吉特 (RM) 价格。
        - 建议重量、尺寸或数量（例如 "每500克"）。
        - 生成相关的标签 (Hashtags)，包含中文和英文标签。
        - 必须严格按照请求的 JSON 格式返回。JSON 的 Key 必须是英文 (title, description)，但 Value 必须是中文。`;
    } else {
        // ENGLISH INSTRUCTIONS (Default)
        systemText = `You are 'RuralMarket.AI', a helpful assistant for rural sellers in Sarawak, Malaysia. Your goal is to generate a complete, professional, and appealing product listing.
        - Analyze the user's input.
        - Generate a compelling title.
        - Write a friendly and persuasive description, followed by a list of key features.
        - Suggest a realistic price in Malaysian Ringgit (RM).
        - Suggest a weight, size, or quantity.
        - Generate relevant hashtags.
        - ALWAYS return your response in the requested JSON format.`;
    }

    const systemInstruction = {
        parts: [{ text: systemText }]
    };

    let userPromptParts = [
        {
            text: `Please generate a product listing based on the following details:
            Product Name: "${productName}"
            Description: "${productDescription}"
            Location: Sibu, Sarawak, Malaysia.`
        }
    ];

    if (base64Data && mimeType) {
        userPromptParts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });
    }

    const generationConfig = {
        responseMimeType: "application/json",
        responseSchema: {
            type: "OBJECT",
            properties: {
                "title": { "type": "STRING" },
                "description": { "type": "STRING" },
                "weight": { "type": "STRING" },
                "price": { "type": "STRING" },
                "features": { "type": "ARRAY", "items": { "type": "STRING" } },
                "hashtags": { "type": "ARRAY", "items": { "type": "STRING" } }
            },
            required: ["title", "description", "weight", "price", "features", "hashtags"]
        }
    };
    
    const payload = {
        contents: [{ role: "user", parts: userPromptParts }],
        systemInstruction: systemInstruction,
        generationConfig: generationConfig
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return { statusCode: response.status, body: JSON.stringify({ error: "Failed to get response from AI." }) };
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
            return { statusCode: 200, body: result.candidates[0].content.parts[0].text };
        } else {
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to parse AI response." }) };
        }

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};