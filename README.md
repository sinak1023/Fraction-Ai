# 🤖 FractionAI BOT - Automate Your Battles in Fraction AI

*A fully automated bot for seamless battles in ********Fraction AI********.*

---

## 🚀 Key Features

✨ **Auto Match Making** – Join battles automatically, no manual effort needed.\
💰 **Multiple Wallet Support** – Manage multiple Ethereum wallets effortlessly.\
📊 **User-Friendly Dashboard** – A clean, intuitive, and interactive UI.\
⚙️ **Easy Setup & Configuration** – Minimal setup with flexible settings.

---

## ✅ Pre-Run Checklist

🔹 **Register at ************[Fraction AI](https://dapp.fractionai.xyz?referral=90225C22)************.**\
🔹 **Create your agent.**\
🔹 **Ensure you have enough Sepolia ETH.**\
🔹 **Customize settings in ************`config.json`************.**

---

## 📂 Project Structure

```
FractionAI-BOT/
├── config.json      # Configuration file
├── data.txt         # Stores private keys (for test wallets only)
├── src/             # Source code of the bot
├── logs/            # Log files
├── package.json     # Node.js dependencies
└── README.md       # Documentation
```

---

## 🔧 System Requirements

Before installing **FractionAI-BOT**, make sure you have:

- ✅ **Node.js v18+**
- ✅ **npm or yarn**
- ✅ **Ethereum Wallet with Sepolia ETH**
- ✅ **Git Installed (For Linux/macOS)**

---

## 📥 Installation Guide

### 🐧 Linux/macOS Users

#### 📌 Step 1: Clone the Repository

```bash
git clone https://github.com/sinak1023/Fraction-Ai.git
cd Fraction-Ai
```

#### 📌 Step 2: Install Dependencies

```bash
npm install
```

#### 📌 Step 3: Configure Wallets (Edit `data.txt`)

```bash
nano data.txt
```

Enter your **private keys** (one per line):

```txt
your_private_key
```

⚠️ **Only use test wallets! Never use your main wallet.**

#### 📌 Step 4: Adjust Configuration (`config.json`)

```bash
nano config.json
```

Modify settings as needed:

```json
{
  "useProxy": false,
  "antiCaptchaKey": "your-antiCaptcha-API-KEY",
  "twoCaptchaKey": "your-twoCaptcha-API-KEY",
  "defaultSolver": "gemini",
  "pollingInterval": 10,
  "retryDelay": 10000,
  "maxRetries": 3,
  "matchMode": "auto or manual",
  "fee": 0.1,
  "maxGames": 10,
  "geminiApiKey": "your-Gemini_api-key"
}
```

### 🔧 Configuration Details

| Setting           | Description |
|------------------|-------------|
| `useProxy`       | Set to `true` to enable proxy support. Default is `false`. |
| `antiCaptchaKey` | API key for Anti-Captcha service (leave blank if not used). |
| `twoCaptchaKey`  | API key for 2Captcha service (leave blank if not used). |
| `defaultSolver`  | Choose between `anticaptcha` or `twocaptcha` for solving captchas. |
| `pollingInterval`| Interval (in seconds) for checking match status. Default is `10`. |
| `retryDelay`     | Delay (in milliseconds) before retrying a failed request. Default is `10000` (10s). |
| `maxRetries`     | Maximum number of retries before giving up on an operation. Default is `3`. |
| `matchMode`      | Set to `auto` for automated matchmaking or `manual` for user input. |
| `fee`            | Entry fee per match (e.g., `0.1` ETH). |
| `maxGames`       | Maximum number of games the bot will play in a session. |

#### Example Configurations:

- **Standard Setup (No Proxy, Auto Matchmaking, Anti-Captcha):**

```json
{
  "useProxy": false,
  "antiCaptchaKey": "your-API-KEY",
  "defaultSolver": "anticaptcha",
  "matchMode": "auto",
  "fee": 0.1,
  "maxGames": 5
}
```

- **Manual Mode with Proxy Enabled:**

```json
{
  "useProxy": true,
  "twoCaptchaKey": "your-API-KEY",
  "defaultSolver": "twocaptcha",
  "matchMode": "manual",
  "fee": 0.01,
  "maxGames": 3
}
```

#### 📌 Step 5: Create a Screen Session (For Continuous Running)

```bash
screen -S fractionai-bot
```

#### 📌 Step 6: Start the Bot

```bash
npm start
```

---

### 🖥️ Windows Users

#### 📌 Step 1: Clone the Repository or Download as ZIP

- **Option 1 (Recommended):**

```powershell
git clone https://github.com/sinak1023/Fraction-Ai.git
cd Fraction-Ai
```

- **Option 2 (Download ZIP):**
  1. Go to the repository: [FractionAI-BOT GitHub](https://github.com/sinak1023/Fraction-Ai)
  2. Click on the **`Code`** button → Select **`Download ZIP`**
  3. Extract the ZIP file
  4. Open a terminal and navigate to the extracted folder:

```powershell
cd path\to\extracted-folder
```

#### 📌 Step 2: Install Dependencies

```powershell
npm install
```

#### 📌 Step 3: Configure Wallets (Edit `data.txt`)

Follow the same guidelines as in the Linux/macOS section.

#### 📌 Step 4: Adjust Configuration (`config.json`)

Follow the same guidelines as in the Linux/macOS section.

#### 📌 Step 5: Start the Bot

```powershell
npm start
```
---

## 🔎 Checking Fractals for All Wallets

You can use the `fetch-fractal.js` script to check Fractal balance for all wallets stored in `data.txt`.

### 📌 Steps to Run `fetch-fractal.js`

#### 🐧 Linux/macOS Users

```bash
node fetch-fractal.js
```

#### 🖥️ Windows Users

```powershell
node fetch-fractal.js
```

This script will:
- Load private keys from `data.txt`
- Optionally use proxies if enabled in `proxies.txt`
- Authenticate wallets
- Fetch Fractal balance for each wallet

---

## 🎮 Bot Controls

🛑 Press **`Q`** → Quit the bot.\
🔄 Press **`R`** → Refresh the dashboard.\
🧹 Press **`C`** → Clear the logs.

---

## ⚠️ Important Warnings

⚠️ **Use at your own risk.**\
🔑 **Only use test wallets – NEVER use your main wallet.**\
📖 **Make sure you fully understand the bot’s functionality.**

---


## Just keep Going on 
