import { ethers } from "ethers";
import Network from "./network.js";
import Tools from "../utils/tools.js";
import Client from "../services/client.js";
import Display from "../utils/display.js";
import Solver from "../services/solvers/index.js";
import fs from "fs/promises";

const loadConfig = async () => {
  const configFile = await fs.readFile(
    new URL("../../config.json", import.meta.url)
  );
  return JSON.parse(configFile);
};

class WalletManager extends Client {
  constructor(privateKey) {
    super();
    this.privateKey = privateKey;
    this.provider = new ethers.JsonRpcProvider(Network.RPCURL, Network.CHAINID);
    this.config = null;
    this.user = null;
    this.token = null;
    this.wallet = null;
    this.address = null;
    this.activeMatches = {};
    this.solver = null;
  }

  async checkProxyIP() {
    try {
        await this.updateProxy();
        const ip = await this.getCurrentIP();
    } catch (error) {
        Display.log("❌ Failed to fetch proxy IP:", error.message);
    }
  }

  async initialize() {
    this.config = await loadConfig();
    this.solver = new Solver(this.config);
    await this.checkProxyIP();
  }


  async connect() {
    try {
      if (!this.config) {
        await this.initialize();
      }

      await Tools.delay(1000, "Connecting to wallet...");
      // const accountType = Tools.checkKeyType(this.privateKey);
      const accountType = "private"
      if (accountType === "phrase") {
        this.wallet = ethers.Wallet.fromPhrase(this.privateKey, this.provider);
      } else if (accountType === "private") {
        this.wallet = new ethers.Wallet(this.privateKey.trim(), this.provider);
      } else {
        throw new Error("Invalid private key or phrase");
      }

      this.address = this.wallet.address;
      await Tools.delay(1000, `Connected to ${this.address}`);
    } catch (error) {
      throw error;
    }
  }

  async getBalance() {
    try {
      await Tools.delay(500, `Getting balance for ${this.address}`);
      const balance = ethers.formatEther(
        await this.provider.getBalance(this.address)
      );
      this.balance = { ETH: balance };
      await Tools.delay(500, "Balance updated");
    } catch (error) {
      throw error;
    }
  }

  async login(retryCount = 0, maxRetries = 3) {
    try {
      await Tools.delay(500, "Connecting to Fraction AI");

      const delayTime = Math.min(2000 * Math.pow(2, retryCount), 30000);
      if (retryCount > 0) {
        await Tools.delay(
          delayTime,
          `Retry attempt ${retryCount}/${maxRetries}`
        );
      }

      const nonceResponse = await this.fetch("/auth/nonce");
      const nonce = nonceResponse.data.nonce;

      const message =
        "dapp.fractionai.xyz wants you to sign in with your Ethereum account:\n" +
        this.address +
        "\n\nSign in with your wallet to Fraction AI.\n\nURI: https://dapp.fractionai.xyz\nVersion: 1\nChain ID: 11155111\nNonce: " +
        nonce +
        "\nIssued At: " +
        new Date().toISOString();

      const signature = await this.wallet.signMessage(message);

      const authResponse = await this.fetch("/auth/verify", "POST", undefined, {
        message,
        signature,
        referralCode: Tools.generateRef(),
      });

      if (authResponse.status !== 200 || !authResponse.data) {
        if (
          retryCount < maxRetries &&
          (authResponse.status === 502 || authResponse.status === 504)
        ) {
          return this.login(retryCount + 1, maxRetries);
        }
        throw new Error(
          `Authentication failed: ${
            authResponse.data?.error || authResponse.status
          }`
        );
      }

      this.user = authResponse.data.user;
      this.token = authResponse.data.accessToken;

      await Tools.delay(500, "Connected to Fraction AI");
    } catch (error) {
      if (error.message.includes("502") && retryCount < maxRetries) {
        return this.login(retryCount + 1, maxRetries);
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async getAgents() {
    try {
      await Tools.delay(500, "Getting agents list");

      const response = await this.fetch(
        `/agents/user/${this.user.id}`,
        "GET",
        this.token
      );

      if (response.status !== 200 || !response.data) {
        throw new Error("Failed to fetch agents");
      }

      this.agents = Array.isArray(response.data) ? response.data : [];
      await Tools.delay(500, `Retrieved ${this.agents.length} agents`);

      const display = Display.getInstance();
      if (display) {
        display.updateAgents(this.agents, this.activeMatches);
      }
    } catch (error) {
      throw error;
    }
  }

  async getSessions() {
    try {
      await Tools.delay(500, "Getting sessions list");

      const response = await this.fetch(
        "/session-types/list",
        "GET",
        this.token
      );

      if (response.status !== 200 || !response.data) {
        throw new Error("Failed to fetch sessions");
      }

      this.sessions = Array.isArray(response.data) ? response.data : [];
      await Tools.delay(500, `Retrieved ${this.sessions.length} sessions`);
    } catch (error) {
      throw error;
    }
  }

  async getFractalInfo() {
    try {
      await Tools.delay(500, "Getting fractal info");

      const response = await this.fetch(
        `/rewards/fractal/user/${this.user.id}`,
        "GET",
        this.token
      );

      if (response.status !== 200 || !response.data) {
        throw new Error("Failed to fetch fractal info");
      }

      this.fractalInfo = response.data;
      const display = Display.getInstance();
      if (display) {
        display.updateFractalInfo(this.fractalInfo);
      }
      await Tools.delay(500, "Fractal info updated");
    } catch (error) {
      throw error;
    }
  }

  async checkAgentStatus(agent) {
    try {
      const response = await this.fetch(
        `/agents/user/${this.user.id}/${agent.id}/status`,
        "GET",
        this.token
      );

      if (response.status === 200 && response.data) {
        return response.data.inQueue || false;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async startMatch(agent, session) {
    try {
      if (!this.config) {
        await this.initialize();
      }

      const isInQueue = await this.checkAgentStatus(agent);
      if (isInQueue) {
        Tools.log(`Agent ${agent.name} is already in queue`);
        return false;
      }

      await Tools.delay(
        2000,
        `Starting match: Agent ${agent.name} - Session ${session.sessionType.name}`
      );

      const nonceResponse = await this.fetch("/auth/nonce", "GET", this.token);
      if (!nonceResponse.status === 200) {
        throw new Error("Failed to get nonce and captcha");
      }

      Tools.log("Solving captcha...");
      const captchaSolution = await this.solver.solve(nonceResponse.data.image);

      const response = await this.fetch(
        "/matchmaking/initiate",
        "POST",
        this.token,
        {
          userId: this.user.id,
          agentId: agent.id,
          entryFees: this.config.fee,
          sessionTypeId: session.sessionType.id,
          nonce: nonceResponse.data.nonce,
          captchaText: captchaSolution,
        }
      );

      if (response.status === 200) {
        this.activeMatches[agent.id] = true;
        Tools.updateDisplay(this);
        await Tools.delay(
          500,
          `Match started: ${agent.name} - ${session.sessionType.name}`
        );
        this.solver.reportGood();
        return true;
      } else if (response.data?.error?.includes("already in queue")) {
        this.activeMatches[agent.id] = true;
        Tools.updateDisplay(this);
        Tools.log(`Agent ${agent.name} is already in active match`);
        return false;
      } else if (response.data?.error?.includes("invalid captcha")) {
        Tools.log("Invalid captcha solution, retrying...");
        this.solver.reportBad();
        return await this.startMatch(agent, session);
      } else {
        throw new Error(response.data?.error || "Failed to start match");
      }
    } catch (error) {
      if (error.message.includes("captcha")) {
        Tools.log("Captcha error, retrying match start...");
        await Tools.delay(2000, "Waiting before retry");
        return await this.startMatch(agent, session);
      }
      throw error;
    }
  }

  async startAutoMatch(agent, session, maxGames, feeTier) {
    try {
        if (!this.config) {
            await this.initialize();
        }

        const isInQueue = await this.checkAgentStatus(agent);
        if (isInQueue) {
            Tools.log(`Agent ${agent.name} is already in queue`);
            return false;
        }

        await Tools.delay(2000, `Starting automation: Agent ${agent.name} - Session ${session.sessionType.name}`);

        // 🔹 Fetch nonce and captcha
        const nonceResponse = await this.fetch("/auth/nonce", "GET", this.token);
        if (nonceResponse.status !== 200 || !nonceResponse.data.nonce || !nonceResponse.data.image) {
            throw new Error("Failed to get nonce and captcha");
        }

        Tools.log("Solving captcha...");
        const captchaSolution = await this.solver.solve(nonceResponse.data.image);
        
        // 🔹 Construct payload for automated matchmaking
        const payload = {
            agentId: agent.id,
            sessionTypeId: session.sessionType.id,
            maxGames: maxGames,
            maxParallelGames: 10, 
            stopLoss: 0.5,  
            takeProfit: 0.1, 
            feeTier: feeTier,    
            nonce: nonceResponse.data.nonce,
            captchaText: captchaSolution
        };

        // 🔹 Call API for automated matchmaking
        const response = await this.fetch("/automated-matchmaking/enable", "POST", this.token, payload);
        Tools.log(response.data.message)
        if (response.status === 201 && response.data.message === "Automated matchmaking enabled successfully") {
            Tools.updateDisplay(this);
            await Tools.delay(500, `Automation enabled: ${agent.name} - ${session.sessionType.name}`);
            this.solver.reportGood();
            return true;
        } else if (response.data?.error?.includes("invalid captcha")) {
            Tools.log("Invalid captcha solution, retrying...");
            this.solver.reportBad();
            return await this.startMatch(agent, session);
        } else {
            throw new Error(response.data?.error || "Failed to enable automated matchmaking");
        }
    } catch (error) {
        if (error.message.includes("captcha")) {
            Tools.log("Captcha error, retrying...");
            await Tools.delay(2000, "Waiting before retry");
            return await this.startMatch(agent, session);
        }
        throw error;
    }
  }


  async executeTx(txData) {
    try {
      await Tools.delay(500, "Executing transaction...");
      const txResponse = await this.wallet.sendTransaction(txData);
      await Tools.delay(500, "Waiting for transaction confirmation...");
      const txReceipt = await txResponse.wait();
      await Tools.delay(
        500,
        `Transaction confirmed: ${Network.EXPLORER}tx/${txReceipt.hash}`
      );
      await this.getBalance();
      return txReceipt;
    } catch (error) {
      if (error.message.includes("504")) {
        await Tools.delay(5000, error.message);
      } else {
        throw error;
      }
    }
  }

  async getNonce() {
    try {
      const latestNonce = await this.provider.getTransactionCount(
        this.wallet.address,
        "latest"
      );
      const pendingNonce = await this.provider.getTransactionCount(
        this.wallet.address,
        "pending"
      );
      return Math.max(pendingNonce, latestNonce);
    } catch (error) {
      throw error;
    }
  }

  async estimateGas(
    txData,
    value = 0,
    isFeatureEnabled = false,
    maxRetries = 3
  ) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const estimatedGas = await this.provider.estimateGas({
          from: this.wallet.address,
          to: txData.to,
          value: value,
          data: txData.data,
        });
        return estimatedGas;
      } catch (error) {
        if (isFeatureEnabled) throw error;

        await Tools.delay(
          3000,
          `Gas estimation failed. Attempt ${attempt + 1}/${maxRetries}`
        );

        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to estimate gas after ${maxRetries} attempts`
          );
        }
      }
    }
  }

  async buildTx(txData, isFeatureEnabled = false, value = 0) {
    const nonce = await this.getNonce();
    const gasLimit = await this.estimateGas(txData, value, isFeatureEnabled);

    return {
      to: txData.to,
      from: this.address,
      value: value,
      gasLimit: gasLimit,
      gasPrice: ethers.parseUnits("1.5", "gwei"),
      nonce: nonce,
      data: txData.data,
    };
  }
}

export default WalletManager;
