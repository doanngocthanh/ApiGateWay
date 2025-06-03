# ApiGateWay
[![ApiGateWay Live](https://img.shields.io/badge/Live-Demo-green?style=flat-square&logo=render&link=https://apigateway-1k6n.onrender.com)](https://apigateway-1k6n.onrender.com)
[![GitHub Repo stars](https://img.shields.io/github/stars/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay)
[![GitHub issues](https://img.shields.io/github/issues/doanngocthanh/ApiGateWay)](https://github.com/doanngocthanh/ApiGateWay/issues)
[![GitHub forks](https://img.shields.io/github/forks/doanngocthanh/ApiGateWay?style=social)](https://github.com/doanngocthanh/ApiGateWay/network/members)

## 📋 Quick Start Instructions

1. **Initialize project:**
```bash
mkdir api-management-service
cd api-management-service
npm init -y
npm install express express-rate-limit express-validator bcryptjs jsonwebtoken pg redis cors helmet morgan uuid axios dotenv
npm install --save-dev nodemon jest
```

2. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. **Start services:**
```bash
# With Docker
docker-compose up -d

# Or manually start PostgreSQL and Redis, then:
npm run dev
```

4. **Initialize database:**
```bash
psql -h localhost -U postgres -d api_management -f migrations/init.sql
```
 
[![License](https://img.shields.io/github/license/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/blob/main/LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/commits/main)
[![Build Status](https://img.shields.io/github/actions/workflow/status/doanngocthanh/ApiGateWay/ci.yml?branch=main&style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/actions)
[![Code Size](https://img.shields.io/github/languages/code-size/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay)
[![Top Language](https://img.shields.io/github/languages/top/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay)
[![Contributors](https://img.shields.io/github/contributors/doanngocthanh/ApiGateWay?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/graphs/contributors)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/doanngocthanh/ApiGateWay/pulls)
## 📷 Project Images

Below are some images from the `images` folder to help you understand the project structure and features:

### Client Screenshots

- **Dashboard:**  
  ![Dashboard](images/user/dashboard.png)
- **API Key:**  
  ![Apikey](images/user/apikey.png)
- **Profile:**  
  ![Profile](images/user/profile.png)
- **Plans:**  
  ![Plans](images/user/plans.png)
- **Payment History:**  
  ![Payment History](images/user/payment-history.png)

### Admin Screenshots

- **Dashboard:**  
  ![Dashboard](images/admin/dashboad.png)
- **Destinations:**  
  ![Destinations](images/admin/destinations.png)
- **Analytics:**  
  ![Analytics](images/admin/analytics.png)
- **Payments:**  
  ![Payments](images/admin/payments.png)
- **Users:**  
  ![Users](images/admin/users.png)
 
> _Images are located in the `/images` directory._
