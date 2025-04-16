import blessed from "blessed";
import contrib from "blessed-contrib";
import moment from "moment-timezone";

class Display {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "FractionAI BOT",
      fullUnicode: true,
      dockBorders: true,
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    this.initUI();
    this.setupKeys();
  }

  initUI() {
    this.grid.set(0, 0, 1, 12, blessed.box, {
      content: "Fraction AI BOT",
      align: "center",
      style: {
        fg: "green",
        bold: true,
      },
    });

    this.grid.set(1, 0, 1, 12, blessed.box, {
      content:
        "Kachal is Here| We Are gAME CHANGERS",
      align: "center",
      style: {
        fg: "white",
      },
    });

    this.walletInfo = this.grid.set(2, 0, 3, 4, contrib.table, {
      keys: true,
      interactive: false,
      fg: "green",
      selectedFg: "green",
      selectedBg: "black",
      label: " Wallet Status ",
      border: {
        type: "line",
        fg: "green",
      },
      columnSpacing: 3,
      columnWidth: [15, 25],
      align: "left",
    });

    this.agentInfo = this.grid.set(2, 4, 3, 4, contrib.table, {
      keys: true,
      interactive: false,
      fg: "yellow",
      selectedFg: "yellow",
      selectedBg: "black",
      label: " Agent Status ",
      border: {
        type: "line",
        fg: "yellow",
      },
      columnSpacing: 1,
      columnWidth: [16, 8, 8, 8, 8],
      align: "left",
    });

    this.fractalInfo = this.grid.set(2, 8, 3, 4, contrib.table, {
      keys: true,
      interactive: false,
      fg: "cyan",
      selectedFg: "cyan",
      selectedBg: "black",
      label: " Fractal Status ",
      border: {
        type: "line",
        fg: "cyan",
      },
      columnSpacing: 3,
      columnWidth: [15, 15],
      align: "left",
    });

    this.log = this.grid.set(5, 0, 7, 12, contrib.log, {
      fg: "green",
      selectedFg: "green",
      label: " Activity Log ",
      border: {
        type: "line",
        fg: "green",
      },
      style: {
        fg: "green",
      },
      bufferLength: 50,
      interactive: false,
      padding: 1,
    });
  }

  updateWallet(data) {
    if (!data) return;

    this.walletInfo.setData({
      headers: ["Property", "Value"],
      data: [
        ["Address", this.formatAddress(data.address)],
        ["Balance", this.formatBalance(data.balance?.ETH)],
        ["Network", "Sepolia"],
        ["Last Update", moment().format("HH:mm:ss")],
      ],
    });
    this.render();
  }

  formatAddress(address) {
    if (!address) return "Not Connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatBalance(balance) {
    if (!balance) return "0.00000000 ETH";
    return `${parseFloat(balance).toFixed(8)} ETH`;
  }

  updateAgents(agents = [], activeMatches = {}) {
    const data = agents.map((agent) => [
      this.truncateString(agent.name, 14),
      activeMatches[agent.id] ? "In Match" : "Ready",
      this.formatROI(agent.stats.roi),
      this.formatAvgScore(agent.stats.avgScore),
      agent.stats.totalSessions.toString(),
    ]);

    this.agentInfo.setData({
      headers: ["Agent", "Status", "ROI", "Score", "Sessions"],
      data: data.length ? data : [["No Agents", "N/A", "N/A", "N/A", "N/A"]],
    });
    this.render();
  }

  formatROI(roi) {
    if (typeof roi !== "number") return "N/A";
    return `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`;
  }

  formatAvgScore(score) {
    if (typeof score !== "number") return "N/A";
    return score.toFixed(1);
  }

  updateFractalInfo(data) {
    if (!data) return;

    this.fractalInfo.setData({
      headers: ["Property", "Value"],
      data: [
        ["Total Fractals", this.formatNumber(data.userFractals)],
        ["Daily Fractals", this.formatNumber(data.dailyFractals)],
        ["Current Rank", data.fractalRank?.currentRank || "N/A"],
        ["Next Rank", data.fractalRank?.nextRank || "N/A"],
        ["Progress", this.formatProgress(data.fractalRank)],
      ],
    });
    this.render();
  }

  formatNumber(value) {
    if (!value) return "0.00";
    return parseFloat(value).toFixed(2);
  }

  formatProgress(rankData) {
    if (!rankData) return "0.0%";
    const progress =
      (rankData.currentFractal / rankData.fractalNeededForNextRank) * 100;
    return `${progress.toFixed(1)}%`;
  }

  truncateString(str, length) {
    if (!str) return "";
    if (str.length <= length) return str;
    return str.slice(0, length - 3) + "...";
  }

  static formatError(message) {
    if (typeof message !== "string") return message;

    if (message.includes("<!DOCTYPE html>")) {
      return "Error: Invalid API Response";
    }

    if (message.includes("maximum number of sessions")) {
      const matches = message.match(
        /User has reached maximum number of sessions:\s*(\d+)\s*for the hour/
      );
      if (matches) {
        return `Session limit reached: ${matches[1]} sessions per hour`;
      }
    }

    if (message.includes("POST /") || message.includes("GET /")) {
      return null;
    }

    if (message.includes("Error Response:")) {
      try {
        const jsonStart = message.indexOf("{");
        const jsonStr = message.slice(jsonStart);
        const jsonObj = JSON.parse(jsonStr);
        return `Error: ${jsonObj.error || "Unknown error"}`;
      } catch {
        return message;
      }
    }

    return message;
  }

  static log(message) {
    if (!message) return;

    if (global.display) {
      const time = moment().format("HH:mm:ss");
      const formattedMessage = Display.formatError(message);

      if (formattedMessage) {
        global.display.log.log(`[${time}] ${formattedMessage}`);
        global.display.render();
      }
    } else {
      console.log(`[${moment().format("HH:mm:ss")}] ${message}`);
    }
  }

  refresh() {
    this.log.log("Refreshing display...");
    this.render();
  }

  render() {
    this.screen.render();
  }

  clearLog() {
    this.log.setContent("");
    this.log.log("Log cleared");
    this.render();
  }

  setupKeys() {
    this.screen.key(["escape", "q", "C-c"], () => {
      process.exit(0);
    });

    this.screen.key(["r"], () => {
      this.refresh();
    });

    this.screen.key(["c"], () => {
      this.clearLog();
    });
  }
}

let displayInstance = null;

export default {
  init() {
    if (!displayInstance) {
      displayInstance = new Display();
      global.display = displayInstance;
    }
    return displayInstance;
  },
  log: Display.log,
  getInstance() {
    return displayInstance;
  },
};
