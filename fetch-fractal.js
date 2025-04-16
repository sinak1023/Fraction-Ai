import axios from "axios";
import { ethers } from "ethers";
import fs from "fs/promises";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";

// 📂 Load private keys
const loadPrivateKeys = async () => {
  try {
    const data = await fs.readFile("data.txt", "utf8");
    const keys = data.split("\n").map(k => k.trim()).filter(k => k.length > 0);
    console.log(chalk.cyan(`🔹 Loaded ${keys.length} wallets from data.txt`));
    return keys;
  } catch (error) {
    console.error(chalk.red("❌ Failed to read data.txt:", error.message));
    process.exit(1);
  }
};

// 📂 Load proxies
const loadProxies = async () => {
  try {
    const data = await fs.readFile("proxies.txt", "utf8");
    const proxies = data.split("\n").map(p => p.trim()).filter(p => p.length > 0);
    console.log(chalk.cyan(`🌐 Loaded ${proxies.length} proxies from proxies.txt`));
    return proxies;
  } catch (error) {
    console.error(chalk.red("❌ Failed to read proxies.txt:", error.message));
    process.exit(1);
  }
};

// 🔄 Get next proxy (each wallet gets one proxy)
let proxyIndex = 0;
const getNextProxy = (proxies) => {
  if (proxies.length === 0) return null;
  const proxy = proxies[proxyIndex];
  proxyIndex = (proxyIndex + 1) % proxies.length;
  return proxy;
};

// 🌍 Fetch proxy IP
const getProxyIP = async (axiosInstance) => {
  try {
    const response = await axiosInstance.get("https://api64.ipify.org?format=json");
    return response.data.ip;
  } catch {
    return "Unknown";
  }
};

// 🟢 Initialize provider
const RPC_URL = "https://mainnet.base.org";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// ⏳ Format timestamp in UTC+7
const getFormattedTimestamp = () => {
  const now = new Date();
  now.setHours(now.getHours() + 7);
  return chalk.gray(`[${now.toLocaleTimeString("en-GB")} ${now.toLocaleDateString("en-GB")}]`);
};

// ⏳ Delay function
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔄 Create axios instance with proxy
const createAxiosInstance = (proxy) => {
  const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
  return axios.create({ httpsAgent: agent });
};

// 🔄 Retry function
const retry = async (fn, retries = 5, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status === 429) {
        await delay(delayMs);
      } else {
        console.warn(chalk.red(`❌ Request failed: ${error.message}`));
      }
      if (attempt === retries) throw error;
    }
  }
};

// 🌐 Fetch nonce
const getNonce = async (axiosInstance) => {
  // console.log(chalk.gray(`🔄 Fetching nonce`));
  return retry(async () => {
    const response = await axiosInstance.get("https://dapp-backend-4x.fractionai.xyz/api3/auth/nonce");
    // console.log(chalk.green("✅ Nonce received"));
    return response.data.nonce.trim();
  });
};

// ✍️ Sign message
const signMessage = async (wallet, nonce) => {
  const message = `dapp.fractionai.xyz wants you to sign in with your Ethereum account:
${wallet.address}

Sign in with your wallet to Fraction AI.

URI: https://dapp.fractionai.xyz
Version: 1
Chain ID: 11155111
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}
  `.trim();

  return { message, signature: await wallet.signMessage(message) };
};

// 🚀 Authenticate wallet (Only once per wallet)
const authenticate = async (wallet, axiosInstance) => {
  // console.log(chalk.gray(`🚀 Authenticating ${chalk.cyan(wallet.address)}...`));

  return retry(async () => {
    const nonce = await getNonce(axiosInstance);
    const signedData = await signMessage(wallet, nonce);

    const response = await axiosInstance.post("https://dapp-backend-4x.fractionai.xyz/api3/auth/verify", {
      message: signedData.message,
      signature: signedData.signature,
      referralCode: "",
    });

    console.log(chalk.green(`🎉 Authentication successful for ${chalk.cyan(`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`)}`));
    return { userId: response.data.user.id, accessToken: response.data.accessToken };
  });
};

// 📡 Fetch fractals
const fetchFractals = async (wallet, userId, accessToken, axiosInstance) => {
  console.log(chalk.gray(`📡 Fetching fractals for ${chalk.cyan(wallet.address)}`));

  return retry(async () => {
    const response = await axiosInstance.get(`https://dapp-backend-4x.fractionai.xyz/api3/rewards/fractal/user/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log(
      `${getFormattedTimestamp()} ${chalk.cyan(`[${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}]`)} ` +
      `${chalk.green("Total:")} ${chalk.yellow(response.data.userFractals)} | ` +
      `${chalk.magenta("Pending:")} ${chalk.yellow(response.data.dailyFractals)}`
    );
  });
};

// 🔄 Process wallets (Only authenticate once, then fetchFractals every 10 minutes)
const processWallets = async (privateKeys, proxies) => {
  // Lưu trữ thông tin wallet (userId + accessToken)
  const walletData = {};

  for (const privateKey of privateKeys) {
    const wallet = new ethers.Wallet(privateKey, provider);
    const proxy = getNextProxy(proxies);
    const axiosInstance = createAxiosInstance(proxy);

    console.log(chalk.blue(`\n🔑 Processing wallet: ${chalk.cyan(`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`)} using proxy: ${chalk.yellow(await getProxyIP(axiosInstance))}`));

    try {
      const { userId, accessToken } = await authenticate(wallet, axiosInstance);
      walletData[wallet.address] = { userId, accessToken, axiosInstance };

      // 🔥 Delay 3s để tránh rate limit
      await delay(3000);
    } catch (error) {
      console.error(chalk.red(`❌ Skipping wallet due to authentication failure:`, error.message));
    }
  }

  // 🔄 Fetch fractals mỗi 10 phút (Không đăng nhập lại)
  while (true) {
    await Promise.all(
      Object.entries(walletData).map(([address, { userId, accessToken, axiosInstance }]) =>
        fetchFractals({ address }, userId, accessToken, axiosInstance)
      )
    );

    console.log(chalk.blue.bold("\n⏳ Waiting 10 minutes before restarting the cycle...\n"));
    await delay(10 * 60 * 1000);
  }
};

// 🔥 Main function
const main = async () => {
  const privateKeys = await loadPrivateKeys();
  const proxies = await loadProxies();
  if (privateKeys.length > 0) await processWallets(privateKeys, proxies);
};

main();
