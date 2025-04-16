import AntiCaptchaSolver from "./anticaptcha.js";
import TwoCaptchaSolver from "./twocaptcha.js";
import GeminiSolver from "./gemini.js"; // اضافه کردن GeminiSolver
import fetch from "node-fetch";
import Tools from "../../utils/tools.js";

class Solver {
  constructor(config) {
    this.solvers = {};
    this.defaultSolver = config.defaultSolver;
    this.initializeSolvers(config);
  }

  initializeSolvers(config) {
    try {
      if (config.antiCaptchaKey) {
        this.solvers.anticaptcha = new AntiCaptchaSolver(config.antiCaptchaKey);
      }

      if (config.twoCaptchaKey) {
        this.solvers.twocaptcha = new TwoCaptchaSolver(config.twoCaptchaKey, {
          pollingInterval: config.pollingInterval || 10,
        });
      }

      if (config.geminiApiKey) {
        this.solvers.gemini = new GeminiSolver(config.geminiApiKey); // اضافه کردن Gemini
      }

      if (!this.defaultSolver || !this.solvers[this.defaultSolver]) {
        const availableSolvers = Object.keys(this.solvers);
        if (availableSolvers.length > 0) {
          this.defaultSolver = availableSolvers[0];
          Tools.log(
            `No valid default solver specified, using ${this.defaultSolver}`
          );
        } else {
          throw new Error(
            "No solvers available. Please provide at least one API key"
          );
        }
      }

      Tools.log(`Initialized with ${this.defaultSolver} as default solver`);
    } catch (error) {
      Tools.log(`Error initializing solvers: ${error.message}`);
      throw error;
    }
  }

  async downloadImage(imageUrl) {
    try {
      Tools.log(`Downloading captcha from: ${imageUrl}`);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
          `Failed to download image: ${imageResponse.statusText}`
        );
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString("base64");
      Tools.log("Image converted to base64");
      return base64Image;
    } catch (error) {
      Tools.log(`Error downloading image: ${error.message}`);
      throw error;
    }
  }

  async solve(imageUrl, method = null) {
    try {
      if (!imageUrl) {
        throw new Error("No captcha image URL provided");
      }

      const base64Image = await this.downloadImage(imageUrl);

      const solverMethod = method || this.defaultSolver;
      const solver = this.solvers[solverMethod];

      if (!solver) {
        throw new Error(`Solver ${solverMethod} is not available`);
      }

      return await solver.solve(base64Image);
    } catch (error) {
      Tools.log(`Captcha solving error: ${error.message}`);
      throw error;
    }
  }

  reportGood() {
    const solver = this.solvers[this.defaultSolver];
    if (solver?.reportGood) {
      solver.reportGood();
    }
  }

  reportBad() {
    const solver = this.solvers[this.defaultSolver];
    if (solver?.reportBad) {
      solver.reportBad();
    }
  }

  dispose() {
    this.solvers = {};
    Tools.log("Solver disposed");
  }
}

export default Solver;
