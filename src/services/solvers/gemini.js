import { GoogleGenerativeAI } from "@google/generative-ai";
import Tools from "../../utils/tools.js";

class GeminiSolver {
  constructor(apiKey) {
    this.initialize(apiKey);
  }

  initialize(apiKey) {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    Tools.log("Gemini initialized successfully");
  }

  async solve(base64Image) {
    const maxRetries = 5; 
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        Tools.log(`Solving captcha with Gemini... Attempt ${attempt + 1}`);
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: "image/png",
              data: base64Image,
            },
          },
          {
            text: "Extract the text (letters and numbers) from this captcha image. The text is 5-6 characters long and contains a mix of letters and numbers with colorful noise.",
          },
        ]);

        const captchaText = result.response.text().trim();
        if (!captchaText || captchaText.length < 5 || captchaText.length > 6) {
          throw new Error("Invalid captcha text length detected");
        }

        Tools.log(`Gemini solved captcha: ${captchaText}`);
        return captchaText;
      } catch (error) {
        attempt++;
        Tools.log(`Gemini solving error: ${error.message}`);
        if (attempt === maxRetries) {
          throw error; 
        }

        const delay = Math.floor(Math.random() * (120000 - 60000 + 1)) + 60000;
        Tools.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

export default GeminiSolver;
