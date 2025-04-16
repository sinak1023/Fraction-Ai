import TwoCaptcha from "@2captcha/captcha-solver";
import Tools from "../../utils/tools.js";

class TwoCaptchaSolver {
  constructor(apiKey, options = {}) {
    this.initialize(apiKey, options);
    this.lastCaptchaId = null;
  }

  initialize(apiKey, options) {
    if (!apiKey) {
      throw new Error("2Captcha API key is required");
    }
    this.solver = new TwoCaptcha.Solver(apiKey);
    this.pollingInterval = options.pollingInterval || 10;
    Tools.log("2Captcha initialized successfully");
  }

  async solve(base64Image) {
    try {
      Tools.log("Solving captcha with 2Captcha...");

      const result = await this.solver.imageCaptcha({
        body: `data:image/png;base64,${base64Image}`,
        numeric: 4,
        min_len: 5,
        max_len: 5,
      });

      if (!result || !result.data) {
        throw new Error("Failed to solve captcha with 2Captcha");
      }

      this.lastCaptchaId = result.id;

      Tools.log(`2Captcha solved captcha: ${result.data}`);
      return result.data;
    } catch (error) {
      Tools.log(`2Captcha solving error: ${error.message}`);
      throw error;
    }
  }

  async reportGood() {
    try {
      if (!this.lastCaptchaId) {
        Tools.log("No captcha ID available for reporting");
        return;
      }

      await this.solver.goodReport(this.lastCaptchaId);
      Tools.log(`Reported correct solution for captcha ${this.lastCaptchaId}`);
      this.lastCaptchaId = null;
    } catch (error) {
      Tools.log(`Error reporting correct solution: ${error.message}`);
    }
  }

  async reportBad() {
    try {
      if (!this.lastCaptchaId) {
        Tools.log("No captcha ID available for reporting");
        return;
      }

      await this.solver.badReport(this.lastCaptchaId);
      Tools.log(
        `Reported incorrect solution for captcha ${this.lastCaptchaId}`
      );
      this.lastCaptchaId = null;
    } catch (error) {
      Tools.log(`Error reporting incorrect solution: ${error.message}`);
    }
  }
}

export default TwoCaptchaSolver;
