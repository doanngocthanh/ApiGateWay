# 🚀 ApiGateWay - The Gateway to Your API Dreams! 

*Tired of managing APIs like a circus juggler? Welcome to your new best friend!* 🎪

[![ApiGateWay Live](https://img.shields.io/badge/Live-Demo-green?style=flat-square&logo=render&link=https://apigateway-p4xt.onrender.com)](https://apigateway-p4xt.onrender.com)
[![GitHub Repo stars](https://img.shields.io/github/stars/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay)
[![GitHub issues](https://img.shields.io/github/issues/doanngocthanh/ApiGateWay)](https://github.com/doanngocthanh/ApiGateWay/issues)
[![GitHub forks](https://img.shields.io/github/forks/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay/network/members)

<a href="https://buymeacoffee.com/ngocthanhdoan">
    <img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"/>
</a>

---

## 🎭 What's This All About?

Ever felt like managing APIs is like herding cats? 🐱 Well, say goodbye to the chaos! This ApiGateway is your digital bouncer, traffic controller, and personal assistant all rolled into one sleek package.

### 🌟 Why You'll Fall in Love With This Project:

- **🛡️ Security Guard Mode**: Protects your APIs like a mama bear protects her cubs
- **⚡ Lightning Fast**: Faster than your morning coffee kicks in
- **📊 Analytics Ninja**: Tracks everything (legally, of course!)
- **💳 Payment Wizard**: Handles subscriptions smoother than butter on hot toast
- **🎨 Pretty UI**: So beautiful, you'll want to frame it

---

## 🚀 Quick Start (Faster Than Making Instant Noodles!)

### Step 1: Grab Your Tools 🧰
```bash
mkdir api-management-service
cd api-management-service
npm init -y
npm install express express-rate-limit express-validator bcryptjs jsonwebtoken pg redis cors helmet morgan uuid axios dotenv
npm install --save-dev nodemon jest
```

### Step 2: Environment Setup (Don't Skip This! 😱)
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
# Pro tip: Don't use 'password123' as your password 🤦‍♂️
```

### Step 3: Launch Time! 🚁
```bash
# Docker lovers (recommended for the lazy... I mean efficient!)
docker-compose up -d

# Old school heroes
# Start PostgreSQL and Redis first, then:
npm run dev
```

### Step 4: Database Magic ✨
```bash
psql -h localhost -U postgres -d api_management -f migrations/init.sql
```

**Boom! 💥 You're ready to rule the API world!**

---

## 🎯 Features That'll Make You Go "WOW!"

### For Regular Humans 👥
- **Dashboard**: Your command center (feels like being a NASA operator)
- **API Keys**: Manage them like Pokemon cards
- **User Profiles**: Customize your digital identity
- **Subscription Plans**: Pick your poison (but in a good way)
- **Payment History**: Track where your money went (spoiler: it went to awesome APIs)

### For Admin Superheroes 🦸‍♀️
- **Super Dashboard**: See everything, control everything
- **Destination Management**: Route APIs like a GPS for data
- **Analytics**: Numbers that actually make sense
- **Payment Oversight**: Keep track of the money flow
- **User Management**: Be the benevolent dictator of your API kingdom

---

## 📸 Pretty Pictures (Because We All Love Screenshots!)

### 👤 Client Experience
Look at these beauties:

- **Dashboard**: ![Dashboard](images/user/dashboard.png)
  *Your mission control center - cleaner than your room!*

- **API Key Management**: ![Apikey](images/user/apikey.png)
  *Organize your keys better than your physical keychain*

- **Profile**: ![Profile](images/user/profile.png)
  *Make it yours, make it beautiful*

- **Plans**: ![Plans](images/user/plans.png)
  *Choose your adventure (and budget)*

- **Payment History**: ![Payment History](images/user/payment-history.png)
  *Financial transparency at its finest*

### 👑 Admin Power Tools
The control room of dreams:

- **Admin Dashboard**: ![Dashboard](images/admin/dashboad.png)
  *Command central - you're the captain now*

- **Destinations**: ![Destinations](images/admin/destinations.png)
  *Route APIs like a traffic controller*

- **Analytics**: ![Analytics](images/admin/analytics.png)
  *Data visualization that doesn't hurt your eyes*

- **Payments**: ![Payments](images/admin/payments.png)
  *Money talks, and now you can hear it clearly*

- **Users**: ![Users](images/admin/users.png)
  *Your digital citizens await your leadership*

---

## 🤝 Join the Fun! (We Need Heroes Like You!)

This project needs more awesome people like you! Here's how to jump in:

1. **🍴 Fork it** (the repo, not your dinner)
2. **🔧 Fix something** or **✨ add something cool**
3. **📤 Send a Pull Request** (we promise we don't bite)
4. **🎉 Celebrate** your contribution to making APIs less painful!

### 🏆 Hall of Fame
[![Contributors](https://img.shields.io/github/contributors/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/pulls)

---

## ☕ Fuel the Developer!

Like this project? Help me stay caffeinated and coding! 

<a href="https://buymeacoffee.com/ngocthanhdoan">
    <img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"/>
</a>

*Fun fact: This entire project was powered by coffee and the occasional energy drink! ☕⚡*

---

## 📊 Project Stats (Because Numbers Are Cool!)

[![License](https://img.shields.io/github/license/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/blob/main/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/commits/main)
[![Build Status](https://img.shields.io/github/actions/workflow/status/doanngocthanh/ApiGateWay/ci.yml?branch=main&style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/actions)
[![Code Size](https://img.shields.io/github/languages/code-size/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay)
[![Top Language](https://img.shields.io/github/languages/top/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay)

---

## 🎪 Fun Facts

- 🌟 This project has survived more coffee spills than you can imagine
- 🐛 Every bug fixed makes the internet a slightly better place
- 🚀 Built with love, caffeine, and the occasional late-night coding session
- 🎮 The admin dashboard is so satisfying to use, you'll want to refresh it just for fun

---

## 📞 Need Help? Have Ideas? Just Want to Chat?

- 🐛 **Found a bug?** Open an [issue](https://github.com/doanngocthanh/ApiGateWay/issues) (but be nice, bugs have feelings too!)
- 💡 **Got an idea?** We'd love to hear it!
- 🤔 **Confused?** Don't worry, we've all been there

---

*Remember: Great APIs start with great gateways! Let's make the web a more organized place, one API at a time! 🌐✨*

**Happy coding, fellow API wranglers! 🤠**
