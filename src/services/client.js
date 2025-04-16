import axios from "axios";
import fs from "fs";
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";
import Tools from "../utils/tools.js";
import Display from "../utils/display.js";

class Client {
  constructor() {
    this.baseUrl = "https://dapp-backend-4x.fractionai.xyz/api3";
    this.userAgent = Tools.getRandomUA();
    
    // 🔹 Load config from config.json
    this.config = this.loadConfig();
    this.useProxy = this.config.useProxy ?? false; // Default to true if not specified

    this.proxies = this.useProxy ? this.loadProxies() : [];
    this.proxyIndex = 0;
    
    // 🔹 Only use proxy if enabled in config
    this.currentProxy = this.useProxy ? this.getNextProxy() : null;
    this.axiosInstance = this.createAxiosInstance(this.currentProxy);

    this.maxRetries = 5;
    this.retryDelay = 5000;
  }

  // 📌 Load config from config.json
  loadConfig() {
    try {
      const configData = fs.readFileSync("config.json", "utf8");
      return JSON.parse(configData);
    } catch (error) {
      console.error("❌ Failed to read config.json:", error.message);
      process.exit(1);
    }
  }

  // 📌 Load proxies from proxies.txt (if enabled)
  loadProxies() {
    if (!this.useProxy) return [];
    
    try {
      const proxies = fs.readFileSync("proxies.txt", "utf8")
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.startsWith("http"));

      if (proxies.length === 0) {
        Display.log("❌ No valid proxies found! Exiting...");
        process.exit(1);
      }
      return proxies;
    } catch (error) {
      console.error("❌ Error reading proxies.txt:", error.message);
      process.exit(1);
    }
  }

  // 📌 Get next proxy (only if proxy is enabled)
  getNextProxy() {
    if (!this.useProxy || this.proxies.length === 0) return null;

    const proxy = this.proxies[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.proxies.length;
    return proxy;
  }

  // 📌 Create axios instance with or without proxy
  createAxiosInstance(proxyUrl) {
    if (!this.useProxy || !proxyUrl) {
      return axios.create({
        headers: { "User-Agent": this.userAgent },
        timeout: 30000,
      });
    }

    const isHttp = proxyUrl.startsWith("http://");
    const agent = isHttp ? new HttpProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);

    return axios.create({
      headers: { "User-Agent": this.userAgent, "Content-Type": "application/json" },
      timeout: 30000,
      proxy: false,
      httpAgent: isHttp ? agent : undefined,
      httpsAgent: !isHttp ? agent : undefined,
    });
  }

  // 📌 Update to the next proxy (only if enabled)
  async updateProxy() {
    if (!this.useProxy) return;
    
    this.currentProxy = this.getNextProxy();
    this.axiosInstance = this.createAxiosInstance(this.currentProxy);
  }

  // 📌 Retrieve the current proxy's IP address
  async getCurrentIP() {
    if (!this.useProxy) {
      // Display.log("🔹 Proxy is disabled, using direct connection.");
      return "Direct Connection";
    }

    try {
      const response = await this.axiosInstance.get("http://api64.ipify.org?format=json");
      Display.log(`Using Proxy: ${response.data?.ip || "Unknown"}`);
      return response.data?.ip || "Unknown";
    } catch (error) {
      Display.log("⚠️ Failed to fetch proxy IP:", error.message);
      return "Unknown";
    }
  }

  // 📌 Fetch API request with retry & proxy handling
  async fetch(endpoint, method = "GET", token, body = {}, attempt = 0) {
    try {
      if (attempt >= this.maxRetries) {
        return { status: 429, data: null };
      }

      const url = this.baseUrl + endpoint;
      const headers = await this.createHeaders(token);

      const response = await this.axiosInstance({
        method,
        url,
        headers,
        data: method !== "GET" ? body : undefined,
      });

      return { status: response.status, data: response.data };
    } catch (error) {
      if (this.useProxy) this.updateProxy(); // ✅ Rotate proxy before retrying

      if (error.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay)); // 🔥 Wait before retrying
      }

      return this.fetch(endpoint, method, token, body, attempt + 1);
    }
  }

  // 📌 Create request headers
  async createHeaders(token) {
    const headers = {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Allowed-State": "na",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  // 📌 Retrieve a nonce from the API
  async getNonce() {
    try {
      const response = await this.axiosInstance("/auth/nonce");
      if (!response.data?.nonce) throw new Error("Invalid nonce response");
      return response.data.nonce;
    } catch (error) {
      throw new Error(`Failed to get nonce: ${error.message}`);
    }
  }
}

export default Client;
