import ac from "@antiadmin/anticaptchaofficial";
import Tools from "../../utils/tools.js";

class AntiCaptchaSolver {
  constructor(apiKey) {
    this.initialize(apiKey);
  }

  initialize(apiKey) {
    if (!apiKey) {
      throw new Error("AntiCaptcha API key is required");
    }
    ac.setAPIKey(apiKey);
    ac.setSoftId(0);
    Tools.log("AntiCaptcha initialized successfully");
  }

  async solve(base64Image) {
    try {
      Tools.log("Solving captcha with AntiCaptcha...");
      const result = await ac.solveImage(base64Image, {
        numeric: 0,
        minLength: 5,
        maxLength: 6,
        phrase: 0,
        case: 0,
        math: 0,
      });

      if (!result) {
        throw new Error("Failed to solve captcha with AntiCaptcha");
      }

      Tools.log(`AntiCaptcha solved captcha: ${result}`);
      return result;
    } catch (error) {
      Tools.log(`AntiCaptcha solving error: ${error.message}`);
      throw error;
    }
  }

  async reportGood() {
    try {
      Tools.log("Correct captcha solution reported");
    } catch (error) {
      Tools.log(`Error reporting correct solution: ${error.message}`);
    }
  }

  async reportBad() {
    try {
      Tools.log("Incorrect captcha solution reported");
    } catch (error) {
      Tools.log(`Error reporting incorrect solution: ${error.message}`);
    }
  }
}

export default AntiCaptchaSolver;
