import fs from "fs/promises";
import WalletManager from "./src/core/wallet.js";
import Tools from "./src/utils/tools.js";
import Display from "./src/utils/display.js";

async function loadConfig() {
  try {
    const data = await fs.readFile("config.json", "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ Failed to load config.json:", error.message);
    process.exit(1);
  }
}

const config = await loadConfig();

const isAutoMatch = config.matchMode === "auto";

async function loadKeys() {
  try {
    const data = await fs.readFile("./data.txt", "utf8");
    return data.split("\n").filter((key) => key.trim());
  } catch (error) {
    throw new Error(
      "Please create data.txt with your private keys (one per line)"
    );
  }
}

async function handleSessionLimit(lastSessionTime) {
  const elapsedTime = Date.now() - lastSessionTime;
  const cooldownTime = 60 * 60 * 1000;
  const remainingTime = cooldownTime - elapsedTime;

  if (remainingTime > 0) {
    const remainingMinutes = Math.ceil(remainingTime / 60000);
    Tools.log(`Session limit cooldown: ${remainingMinutes} minutes remaining`);
    await Tools.delay(
      remainingTime,
      `Waiting for session cooldown to expire...`
    );
    return true;
  }
  return false;
}

async function runWallet(key, lastAgentIndex = 0) {
  const wallet = new WalletManager(key);
  let sessionCount = 0;
  let lastSessionTime = null;
  let currentAgentIndex = lastAgentIndex;
  const activeAgents = new Set();

  try {
    if (lastSessionTime && sessionCount >= 6) {
      await handleSessionLimit(lastSessionTime);
      sessionCount = 0;
      activeAgents.clear();
      lastSessionTime = null;
      return await runWallet(key, currentAgentIndex);
    }

    await wallet.connect();
    await wallet.getBalance();
    await wallet.login();
    await wallet.getAgents();
    await wallet.getSessions();
    await wallet.getFractalInfo();

    Display.getInstance().updateWallet(wallet);
    Display.getInstance().updateAgents(wallet.agents);
    Display.getInstance().updateFractalInfo(wallet.fractalInfo);

    if (wallet.agents.length === 0) {
      await Tools.delay(
        10000,
        "No agents available. Please create an agent first"
      );
      throw new Error("No agents available");
    }

    if (lastSessionTime && Date.now() - lastSessionTime >= 60 * 60 * 1000) {
      Tools.log("Hourly session limit reset");
      sessionCount = 0;
      activeAgents.clear();
      lastSessionTime = null;
    }

    for (const agent of wallet.agents) {
      const isInQueue = await wallet.checkAgentStatus(agent);
      if (isInQueue) {
        activeAgents.add(agent.id);
        Tools.log(`Agent ${agent.name} is already in queue/match`);
      }
    }

    for (let i = 0; i < wallet.agents.length && sessionCount < 6; i++) {
      const agentIndex = (currentAgentIndex + i) % wallet.agents.length;
      const agent = wallet.agents[agentIndex];

      Tools.log(
        `Checking agent ${agent.name} (${agentIndex + 1}/${
          wallet.agents.length
        })`
      );

      if (activeAgents.has(agent.id)) {
        continue;
      }

      for (const session of wallet.sessions) {
        if (agent.sessionType.sessionType === session.sessionType.sessionType) {
          if (!agent.automationEnabled) {
            try {
              let startResult;
              if (isAutoMatch) {
                  startResult = await wallet.startAutoMatch(agent, session, config.maxGames, config.fee);
              } else {
                  startResult = await wallet.startMatch(agent, session);
              }

              if (startResult) {
                sessionCount++;
                lastSessionTime = lastSessionTime || Date.now();
                activeAgents.add(agent.id);
                currentAgentIndex = (agentIndex + 1) % wallet.agents.length;

                Tools.log(`Sessions used: ${sessionCount}/6`);

                if (sessionCount >= 6) {
                  Tools.log("Session limit reached, starting cooldown");
                  await handleSessionLimit(lastSessionTime);
                  sessionCount = 0;
                  activeAgents.clear();
                  return await runWallet(key, currentAgentIndex);
                }

                await Tools.delay(2000, "Waiting before next match");
              }
            } catch (error) {
              if (error.message.includes("maximum number of sessions")) {
                Tools.log("Session limit reached, starting cooldown");
                lastSessionTime = lastSessionTime || Date.now();
                await handleSessionLimit(lastSessionTime);
                sessionCount = 0;
                activeAgents.clear();
                return await runWallet(key, currentAgentIndex);
              }
              continue;
            }
          } else {
            Tools.log("Already automated, skip to next agent...")
          }
        }
      }
    }

    let minDuration = 60;
    for (const session of wallet.sessions) {
      const duration =
        session.sessionType.durationPerRound * session.sessionType.rounds;
      if (duration < minDuration) minDuration = duration;
    }

    await Tools.delay(
      minDuration * 1000,
      `Processing completed. Waiting for ${Tools.msToTime(minDuration * 1000)}`
    );

    return await runWallet(key, currentAgentIndex);
  } catch (error) {
    const message = error.message || JSON.stringify(error);

    if (message.includes("maximum number of sessions")) {
      Tools.log("Session limit reached, starting cooldown");
      lastSessionTime = lastSessionTime || Date.now();
      await handleSessionLimit(lastSessionTime);
      sessionCount = 0;
      activeAgents.clear();
      return await runWallet(key, currentAgentIndex);
    }

    await Tools.delay(10000, `Error: ${message}. Retrying in 10s...`);
    return await runWallet(key, currentAgentIndex);
  }
}

async function startBot() {
  try {
    Display.init();
    Display.log("Starting FractionAI Battle BOT...");

    const keys = await loadKeys();
    if (keys.length === 0) {
      throw new Error("No private keys found in data.txt");
    }

    Display.log(`Loaded ${keys.length} wallet(s)`);

    const walletPromises = keys.map((key) => runWallet(key));
    await Promise.all(walletPromises);
  } catch (error) {
    Display.log(`Critical error: ${error.message}`);
    await Tools.delay(5000, "Restarting bot...");
    await startBot();
  }
}

startBot().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
