import bip39 from "bip39";
import moment from "moment-timezone";
import Display from "./display.js";

class Tools {
  static async delay(ms, message) {
    return new Promise((resolve) => {
      Display.log(message);
      setTimeout(resolve, ms);
    });
  }

  static getDisplay() {
    return global.display || null;
  }

  static updateDisplay(wallet) {
    const display = this.getDisplay();
    if (display) {
      display.updateWallet(wallet);
      if (wallet.agents) {
        display.updateAgents(wallet.agents);
      }
    }
  }

  static log(message) {
    Display.log(message);
  }

  static getRandomUA() {
    const userAgents = [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6383.90 Mobile Safari/537.36",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  static msToTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.round((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  static checkKeyType(key) {
    if (bip39.validateMnemonic(key)) return "phrase";
    if (/^[0-9a-fA-F]{64}$/.test(key.replace("0x", ""))) return "private";
    return "invalid";
  }

  static generateRef() {
    return "75DFCD04";
  }

  static getCurrentTime() {
    return moment().format("HH:mm:ss");
  }

  static truncateAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  static formatAmount(amount, decimals = 4) {
    if (!amount) return "0";
    return Number(amount).toFixed(decimals);
  }
}

export default Tools;
