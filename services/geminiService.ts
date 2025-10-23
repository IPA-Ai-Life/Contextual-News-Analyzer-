
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult, ChatMessage, Source, OpposingViewpoint } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise, neutral summary/description of the main points of the content. Should be 3-5 sentences.",
        },
        detailedAnalysis: {
            type: Type.STRING,
            description: "A longer, more detailed and enhanced analysis of the content. This should be a few paragraphs long, offering deeper insights, exploring nuances, and explaining complex topics mentioned in the source material. It should be written in a neutral, informative tone.",
        },
        contextualQuestions: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
            },
            description: "A list of 3-5 critical thinking questions to help a user understand the broader context, potential biases, and significance of the topic. Questions should be insightful and encourage further research.",
        },
        publicationDate: {
            type: Type.STRING,
            description: "The original publication date of the content in YYYY-MM-DD format. If the date is not found or cannot be determined, this should be null or omitted."
        },
        sources: {
            type: Type.ARRAY,
            description: "A list of the primary web sources used to generate the summary and analysis. Each source should have a 'uri' and a 'title'.",
            items: {
                type: Type.OBJECT,
                properties: {
                    uri: { type: Type.STRING },
                    title: { type: Type.STRING },
                },
                required: ['uri', 'title'],
            },
        },
    },
    required: ["summary", "detailedAnalysis", "contextualQuestions"],
};

const parseGeminiJsonResponse = (jsonText: string) => {
    let cleanJsonText = jsonText.trim();
    if (cleanJsonText.startsWith('```json')) {
        cleanJsonText = cleanJsonText.substring(7, cleanJsonText.length - 3).trim();
    } else if (cleanJsonText.startsWith('```')) {
        cleanJsonText = cleanJsonText.substring(3, cleanJsonText.length - 3).trim();
    }
    
    if (!cleanJsonText) {
        throw new Error("The API returned an empty response.");
    }

    try {
        return JSON.parse(cleanJsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", cleanJsonText);
        throw new Error("The API returned a response that was not valid JSON.");
    }
};

const isImageUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(urlObj.pathname);
    } catch (e) {
        return false;
    }
};

const isYoutubeUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        return (
            (hostname.includes('youtube.com') && !!urlObj.searchParams.get('v')) ||
            hostname.includes('youtu.be')
        );
    } catch (e) {
        return false;
    }
}

async function urlToGenerativePart(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
            throw new Error(`The content at the URL is not an image (MIME type: ${blob.type}).`);
        }
        
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result.split(',')[1]);
                } else {
                    reject(new Error('Failed to read file as data URL.'));
                }
            };
            reader.onerror = (error) => reject(new Error('File reading error: ' + error));
            reader.readAsDataURL(blob);
        });

        return {
            inlineData: {
                data: base64Data as string,
                mimeType: blob.type,
            },
        };
    } catch (error) {
        console.error("Error fetching or converting image:", error);
        throw new Error(`Could not fetch the image from the URL. This might be due to network issues or Cross-Origin (CORS) restrictions on the server hosting the image. Please try a different image URL.`);
    }
}

const fileToGenerativePart = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        throw new Error(`The uploaded file is not an image (MIME type: ${file.type}).`);
    }

    const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error('Failed to read file as data URL.'));
            }
        };
        reader.onerror = (error) => reject(new Error('File reading error: ' + error));
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: base64Data as string,
            mimeType: file.type,
        },
    };
};

export const analyzeContent = async (url: string, file: File | null, text: string | null): Promise<Omit<AnalysisResult, 'conversation'>> => {
    if (text && text.trim()) {
        return analyzePastedTextContent(text);
    }
    if (file) {
        return analyzeUploadedImageContent(file);
    }
    if (isYoutubeUrl(url)) {
        return analyzeVideoContent(url);
    } else if (isImageUrl(url)) {
        return analyzeImageContent(url);
    } else {
        return analyzeTextContent(url);
    }
};

const analyzeVideoContent = async (url: string): Promise<Omit<AnalysisResult, 'conversation'>> => {
    const prompt = `
        Analyze the video at the YouTube URL: ${url}

        Your task is to use web search to provide a neutral summary, a detailed analysis, insightful contextual questions, its publication date, and a list of primary sources you consulted.

        Your final output MUST be a single, valid JSON object. Do not include any text outside of the JSON object. The JSON object must have the following structure:
        {
          "summary": "A concise, neutral summary of the video's main topics and arguments. 3-5 sentences.",
          "detailedAnalysis": "A longer, more detailed analysis expanding on the summary, offering deeper insights into the video's arguments, narrative, and potential impact. A few paragraphs long.",
          "contextualQuestions": [
            "A list of 3-5 insightful critical thinking questions about the video's content and context."
          ],
          "publicationDate": "The original publication date of the video in YYYY-MM-DD format. Omit this key if the date cannot be determined.",
          "sources": [
            {
              "uri": "The full URL of a source used for analysis.",
              "title": "The title of the source page."
            }
          ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.5,
                tools: [{ googleSearch: {} }],
            },
        });

        const parsedResult = parseGeminiJsonResponse(response.text);

        if (!parsedResult.summary || !parsedResult.detailedAnalysis || !Array.isArray(parsedResult.contextualQuestions)) {
            throw new Error("The API response did not match the expected format.");
        }

        return { ...parsedResult, url, type: 'video' };
    } catch (error) {
        console.error("Error calling Gemini API for video analysis:", error);
        if (error instanceof Error && error.message.includes("The API returned a response that was not valid JSON.")) {
             throw error;
        }
        throw new Error("Failed to communicate with the AI model for video analysis. Please check the URL and try again.");
    }
};


const analyzeImageContent = async (url: string): Promise<Omit<AnalysisResult, 'conversation'>> => {
    const imagePart = await urlToGenerativePart(url);
    
    const textPart = {
        text: `
            Analyze this image in detail. Use web search to find context about it.
            
            Your final output MUST be a single, valid JSON object. Do not include any text outside of the JSON object. The JSON object must have the following structure:
            {
              "summary": "A comprehensive and neutral description of what is depicted in the image.",
              "detailedAnalysis": "A longer, more detailed analysis using web search to find context about the image's composition, symbolism, history, and potential impact.",
              "contextualQuestions": [
                "A list of 3-5 insightful critical thinking questions a viewer should ask about this image."
              ],
              "publicationDate": "The publication date in YYYY-MM-DD format if the image is from a page with a date. Omit this key if not found.",
              "sources": [
                {
                  "uri": "The full URL of a source used for analysis.",
                  "title": "The title of the source page."
                }
              ]
            }
        `
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                temperature: 0.3,
                tools: [{ googleSearch: {} }],
            },
        });

        const parsedResult = parseGeminiJsonResponse(response.text);

        if (!parsedResult.summary || !parsedResult.detailedAnalysis || !Array.isArray(parsedResult.contextualQuestions)) {
            throw new Error("The API response did not match the expected format.");
        }
        
        return { ...parsedResult, url, type: 'image' };

    } catch (error) {
        console.error("Error calling Gemini API for image analysis:", error);
        if (error instanceof Error && (error.message.includes('CORS') || error.message.includes('fetch') || error.message.includes("The API returned a response that was not valid JSON."))) {
            throw error;
        }
        throw new Error("Failed to communicate with the AI model for image analysis. The image may be in an unsupported format or too large.");
    }
};

const analyzeUploadedImageContent = async (file: File): Promise<Omit<AnalysisResult, 'conversation'>> => {
    const imagePart = await fileToGenerativePart(file);
    
    const textPart = {
        text: `
            Analyze this image in detail. Use web search to find context about it.
            
            Your final output MUST be a single, valid JSON object. Do not include any text outside of the JSON object. The JSON object must have the following structure:
            {
              "summary": "A comprehensive and neutral description of what is depicted in the image.",
              "detailedAnalysis": "A longer, more detailed analysis using web search to find context about the image's composition, symbolism, history, and potential impact.",
              "contextualQuestions": [
                "A list of 3-5 insightful critical thinking questions a viewer should ask about this image."
              ],
              "publicationDate": "The publication date in YYYY-MM-DD format if the image is from a page with a date. Omit this key if not found.",
              "sources": [
                {
                  "uri": "The full URL of a source used for analysis.",
                  "title": "The title of the source page."
                }
              ]
            }
        `
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                temperature: 0.3,
                tools: [{ googleSearch: {} }],
            },
        });

        const parsedResult = parseGeminiJsonResponse(response.text);

        if (!parsedResult.summary || !parsedResult.detailedAnalysis || !Array.isArray(parsedResult.contextualQuestions)) {
            throw new Error("The API response did not match the expected format.");
        }
        
        return { ...parsedResult, url: `Uploaded: ${file.name}`, type: 'image' };

    } catch (error) {
        console.error("Error calling Gemini API for uploaded image analysis:", error);
        if (error instanceof Error && error.message.includes("The API returned a response that was not valid JSON.")) {
            throw error;
        }
        throw new Error("Failed to communicate with the AI model for image analysis. The image may be in an unsupported format or too large.");
    }
};

const analyzeTextContent = async (url: string): Promise<Omit<AnalysisResult, 'conversation'>> => {
    const prompt = `
        Analyze the content at the URL: ${url}
        
        Your task is to use web search to provide a neutral summary, a detailed analysis, insightful contextual questions, the publication date, and a list of sources.
        
        Your final output MUST be a single, valid JSON object. Do not include any text outside of the JSON object. The JSON object must have the following structure:
        {
          "summary": "A concise, neutral summary of the main points. 3-5 sentences.",
          "detailedAnalysis": "A longer, more detailed analysis breaking down arguments, evidence, and tone. A few paragraphs long.",
          "contextualQuestions": [
            "A list of 3-5 insightful critical thinking questions about the content's context, author, and potential biases."
          ],
          "publicationDate": "The original publication date of the content in YYYY-MM-DD format. Omit this key if not found.",
          "sources": [
            {
              "uri": "The full URL of a source used for analysis.",
              "title": "The title of the source page."
            }
          ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.5,
                tools: [{ googleSearch: {} }],
            },
        });

        const parsedResult = parseGeminiJsonResponse(response.text);

        if (!parsedResult.summary || !parsedResult.detailedAnalysis || !Array.isArray(parsedResult.contextualQuestions)) {
            throw new Error("The API response did not match the expected format.");
        }

        return { ...parsedResult, url, type: 'text' };
    } catch (error) {
        console.error("Error calling Gemini API for text analysis:", error);
        if (error instanceof Error && error.message.includes("The API returned a response that was not valid JSON.")) {
             throw error;
        }
        throw new Error("Failed to communicate with the AI model for text analysis. Please check the URL and try again.");
    }
};

const analyzePastedTextContent = async (text: string): Promise<Omit<AnalysisResult, 'conversation'>> => {
    const prompt = `
        Analyze the following text content. The user has provided this text directly.
        
        Your task is to use web search for additional context if needed, and provide a neutral summary, a detailed analysis, and insightful contextual questions. The text provided may not have a publication date, so you can omit that field if it is not present in the text. Provide a list of external sources only if you consult them for additional context.
        
        Text to analyze:
        ---
        ${text}
        ---
        
        Your final output MUST be a single, valid JSON object. Do not include any text outside of the JSON object. The JSON object must have the following structure:
        {
          "summary": "A concise, neutral summary of the main points of the provided text. 3-5 sentences.",
          "detailedAnalysis": "A longer, more detailed analysis breaking down arguments, evidence, and tone from the text. A few paragraphs long.",
          "contextualQuestions": [
            "A list of 3-5 insightful critical thinking questions about the provided text's content, context, and potential biases."
          ],
          "publicationDate": "The original publication date if it's mentioned in the text, in YYYY-MM-DD format. Omit this key if not found.",
          "sources": [
            {
              "uri": "The full URL of any external source used for additional context.",
              "title": "The title of the source page."
            }
          ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.5,
                tools: [{ googleSearch: {} }],
            },
        });

        const parsedResult = parseGeminiJsonResponse(response.text);

        if (!parsedResult.summary || !parsedResult.detailedAnalysis || !Array.isArray(parsedResult.contextualQuestions)) {
            throw new Error("The API response did not match the expected format.");
        }

        return { ...parsedResult, url: 'Pasted Text', type: 'text' };
    } catch (error) {
        console.error("Error calling Gemini API for pasted text analysis:", error);
        if (error instanceof Error && error.message.includes("The API returned a response that was not valid JSON.")) {
             throw error;
        }
        throw new Error("Failed to communicate with the AI model for text analysis. Please try again.");
    }
};


export const getFollowUpAnswer = async (url: string, question: string): Promise<{ answer: string; sources: Source[] }> => {
    const prompt = `
        You are a helpful research assistant.
        The user is analyzing content from this source: ${url}
        Their question is: "${question}"
        
        Provide a clear, comprehensive answer to the question. Your answer should be based on the content of the source if possible, but also use your general knowledge and web search capabilities to provide broader context, verify facts, or find related information. Cite your sources clearly if you use external information.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const answer = response.text;
        if (!answer) {
            throw new Error("The AI did not provide an answer.");
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = groundingChunks?.map((chunk: any) => ({
            uri: chunk.web.uri,
            title: chunk.web.title,
        })).filter((source: Source, index: number, self: Source[]) => 
            index === self.findIndex((s) => s.uri === source.uri) // Deduplicate sources
        ) || [];

        return { answer, sources };

    } catch (error) {
        console.error("Error getting follow-up answer:", error);
        throw new Error("Failed to get follow-up answer from the AI model.");
    }
};

export const generateTags = async (summary: string, detailedAnalysis: string, conversation: ChatMessage[]): Promise<string[]> => {
    const contentToAnalyze = `
        Summary: ${summary}

        Detailed Analysis: ${detailedAnalysis}
        
        Further Discussion:
        ${conversation.map(c => `Q: ${c.question}\nA: ${c.answer}`).join('\n\n')}
    `;

    const prompt = `
        Based on the following summary and discussion about a news item, generate 3-5 relevant keyword tags. These tags should be concise, lowercase, and help categorize the content for future searching. Example tags: "politics", "tech-industry", "climate-change", "us-election-2024". Do not use hashtags. Just return a JSON array of strings.
        
        Content to analyze:
        ${contentToAnalyze}
    `;

    const tagSchema = {
        type: Type.OBJECT,
        properties: {
            tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
        required: ["tags"],
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: tagSchema,
            },
        });
        
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText);
        
        if (!parsedResult.tags || !Array.isArray(parsedResult.tags)) {
            return [];
        }

        return parsedResult.tags.map((tag: string) => tag.toLowerCase().replace(/\s+/g, '-'));

    } catch (error) {
        console.error("Error generating tags:", error);
        return []; // Return empty array on failure
    }
}

export const getOpposingViewpoint = async (url: string, summary: string): Promise<OpposingViewpoint | null> => {
    const perspectivePrompt = `
        Based on the content from the source ${url} which is summarized as: "${summary}", what is the most likely political perspective or viewpoint?
        For example: Left-leaning, Centrist, Right-leaning, Libertarian, etc.
        If the topic is not political or doesn't have a clear viewpoint, respond with "Neutral".
        Respond with only the viewpoint name.
    `;

    let perspective = 'Neutral';
    try {
        const perspectiveResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: perspectivePrompt,
            config: { temperature: 0.1 },
        });
        perspective = perspectiveResponse.text.trim().replace('.', '');
    } catch (error) {
        console.error("Could not determine perspective, assuming neutral.", error);
    }

    if (perspective === 'Neutral' || !perspective) {
        return null;
    }

    const opposingViewpointPrompt = `
        The content from ${url} has been identified as having a "${perspective}" perspective.
        Its summary is: "${summary}".

        Your task is to find credible sources that present a significantly different or opposing viewpoint on the same topic. For example, if the original is "Left-leaning", find "Right-leaning" sources.
        1. Use Google Search to find articles or analyses from reputable sources that counter or offer an alternative perspective to the original content.
        2. Write a concise, neutral summary of the main arguments from this opposing viewpoint. This summary should be written in an impartial, encyclopedic tone.
        3. Provide the list of sources you used for this information.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: opposingViewpointPrompt,
            config: { tools: [{ googleSearch: {} }] },
        });
        
        const answer = response.text;
        if (!answer) { return null; }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources: Source[] = groundingChunks?.map((chunk: any) => ({
            uri: chunk.web.uri,
            title: chunk.web.title,
        })).filter((source: Source, index: number, self: Source[]) => 
            index === self.findIndex((s) => s.uri === source.uri)
        ) || [];

        if (sources.length === 0 || answer.split(' ').length < 10) {
            return null;
        }

        return { summary: answer, sources };

    } catch (error) {
        console.error("Error getting opposing viewpoint:", error);
        throw new Error("Failed to get opposing viewpoint from the AI model.");
    }
};
